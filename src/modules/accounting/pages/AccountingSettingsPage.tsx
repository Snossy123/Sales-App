import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { AccountingSettings, BranchAccountingMap } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { PageHeader } from '../../../components/PageHeader'
import { ToastBanner } from '../../../components/ToastBanner'
import { AccountingSubNav } from '../components/AccountingSubNav'

type BranchMapState = Record<
  number,
  {
    sale_deposit_to: string
    sale_payment_account: string
    sell_payment_deposit_to: string
    sell_payment_payment_account: string
  }
>

export function AccountingSettingsPage() {
  const queryClient = useQueryClient()
  const [jePrefix, setJePrefix] = useState('JE')
  const [trPrefix, setTrPrefix] = useState('TR')
  const [branchMaps, setBranchMaps] = useState<BranchMapState>({})
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  const query = useQuery({
    queryKey: ['accounting', 'settings'],
    queryFn: async () => {
      const { data } = await api.get<AccountingSettings>('/accounting/settings')
      return data
    },
  })

  useEffect(() => {
    if (!query.data) return
    setJePrefix(query.data.module_settings.journal_entry_prefix ?? 'JE')
    setTrPrefix(query.data.module_settings.transfer_prefix ?? 'TR')

    const maps: BranchMapState = {}
    for (const branch of query.data.branches) {
      const m = branch.accounting_default_map ?? {}
      maps[branch.id] = {
        sale_deposit_to: String(m.sale?.deposit_to ?? ''),
        sale_payment_account: String(m.sale?.payment_account ?? ''),
        sell_payment_deposit_to: String(m.sell_payment?.deposit_to ?? ''),
        sell_payment_payment_account: String(m.sell_payment?.payment_account ?? ''),
      }
    }
    setBranchMaps(maps)
  }, [query.data])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        journal_entry_prefix: jePrefix,
        transfer_prefix: trPrefix,
        branch_maps: Object.entries(branchMaps).map(([branchId, map]) => ({
          branch_id: Number(branchId),
          accounting_default_map: {
            sale: {
              deposit_to: map.sale_deposit_to ? Number(map.sale_deposit_to) : null,
              payment_account: map.sale_payment_account ? Number(map.sale_payment_account) : null,
            },
            sell_payment: {
              deposit_to: map.sell_payment_deposit_to ? Number(map.sell_payment_deposit_to) : null,
              payment_account: map.sell_payment_payment_account
                ? Number(map.sell_payment_payment_account)
                : null,
            },
          } satisfies BranchAccountingMap,
        })),
      }
      const { data } = await api.put<AccountingSettings>('/accounting/settings', payload)
      return data
    },
    onSuccess: () => {
      setToast('تم حفظ الإعدادات')
      setError('')
      queryClient.invalidateQueries({ queryKey: ['accounting', 'settings'] })
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const createDefaultsMutation = useMutation({
    mutationFn: async () => {
      await api.post('/accounting/chart-of-accounts/create-default-accounts')
    },
    onSuccess: () => {
      setToast('تم إنشاء الحسابات الافتراضية')
      queryClient.invalidateQueries({ queryKey: ['accounting'] })
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const updateBranchMap = (
    branchId: number,
    field: keyof BranchMapState[number],
    value: string,
  ) => {
    setBranchMaps((prev) => ({
      ...prev,
      [branchId]: { ...prev[branchId], [field]: value },
    }))
  }

  const accountOptions = query.data?.accounts ?? []

  return (
    <div>
      <PageHeader
        title="إعدادات المحاسبة"
        subtitle="بادئات القيود وربط الحسابات الافتراضية لكل فرع"
        actions={
          <button
            type="button"
            onClick={() => createDefaultsMutation.mutate()}
            disabled={createDefaultsMutation.isPending}
            className="rounded-lg border border-outline-variant px-md py-sm text-sm font-medium hover:bg-surface-container-low disabled:opacity-60"
          >
            إنشاء حسابات افتراضية
          </button>
        }
      />
      <AccountingSubNav />

      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveMutation.mutate()
          }}
          className="flex flex-col gap-lg"
        >
          <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
            <h2 className="mb-md text-sm font-bold text-on-surface">إعدادات الوحدة</h2>
            <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
              <div>
                <label className="mb-xs block text-sm text-on-surface-variant">
                  بادئة قيود اليومية
                </label>
                <input
                  value={jePrefix}
                  onChange={(e) => setJePrefix(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant px-sm py-2 text-sm"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="mb-xs block text-sm text-on-surface-variant">
                  بادئة التحويلات
                </label>
                <input
                  value={trPrefix}
                  onChange={(e) => setTrPrefix(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant px-sm py-2 text-sm"
                  dir="ltr"
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
            <h2 className="mb-md text-sm font-bold text-on-surface">ربط الحسابات لكل فرع</h2>
            <div className="flex flex-col gap-md">
              {(query.data?.branches ?? []).map((branch) => {
                const map = branchMaps[branch.id]
                if (!map) return null
                return (
                  <div
                    key={branch.id}
                    className="rounded-lg border border-outline-variant/60 bg-surface-container-low p-md"
                  >
                    <h3 className="mb-sm font-medium text-on-surface">
                      {branch.name} ({branch.code})
                    </h3>
                    <div className="grid grid-cols-1 gap-sm lg:grid-cols-2">
                      <fieldset className="rounded-lg border border-outline-variant/40 p-sm">
                        <legend className="px-xs text-xs font-bold text-on-surface-variant">
                          بيع (sale)
                        </legend>
                        <div className="mt-sm flex flex-col gap-sm">
                          <select
                            value={map.sale_deposit_to}
                            onChange={(e) =>
                              updateBranchMap(branch.id, 'sale_deposit_to', e.target.value)
                            }
                            className="rounded border border-outline-variant px-sm py-1.5 text-sm"
                          >
                            <option value="">حساب الإيداع</option>
                            {accountOptions.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.gl_code ? `${acc.gl_code} — ` : ''}
                                {acc.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={map.sale_payment_account}
                            onChange={(e) =>
                              updateBranchMap(branch.id, 'sale_payment_account', e.target.value)
                            }
                            className="rounded border border-outline-variant px-sm py-1.5 text-sm"
                          >
                            <option value="">حساب الدفع</option>
                            {accountOptions.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.gl_code ? `${acc.gl_code} — ` : ''}
                                {acc.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </fieldset>
                      <fieldset className="rounded-lg border border-outline-variant/40 p-sm">
                        <legend className="px-xs text-xs font-bold text-on-surface-variant">
                          تحصيل (sell_payment)
                        </legend>
                        <div className="mt-sm flex flex-col gap-sm">
                          <select
                            value={map.sell_payment_deposit_to}
                            onChange={(e) =>
                              updateBranchMap(branch.id, 'sell_payment_deposit_to', e.target.value)
                            }
                            className="rounded border border-outline-variant px-sm py-1.5 text-sm"
                          >
                            <option value="">حساب الإيداع</option>
                            {accountOptions.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.gl_code ? `${acc.gl_code} — ` : ''}
                                {acc.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={map.sell_payment_payment_account}
                            onChange={(e) =>
                              updateBranchMap(
                                branch.id,
                                'sell_payment_payment_account',
                                e.target.value,
                              )
                            }
                            className="rounded border border-outline-variant px-sm py-1.5 text-sm"
                          >
                            <option value="">حساب الدفع</option>
                            {accountOptions.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.gl_code ? `${acc.gl_code} — ` : ''}
                                {acc.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </fieldset>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {error && (
            <p className="rounded-lg bg-error-container/40 px-sm py-xs text-sm text-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="self-start rounded-lg bg-primary px-lg py-sm text-sm font-bold text-on-primary disabled:opacity-60"
          >
            {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </form>
      </AsyncState>
    </div>
  )
}

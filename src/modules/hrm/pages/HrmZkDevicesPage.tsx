import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { Branch, PaginatedResponse, ZkDevice } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { StatusBadge } from '../../../components/StatusBadge'
import { ToastBanner } from '../../../components/ToastBanner'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

const emptyForm = {
  name: '',
  branch_id: '' as number | '',
  ip_address: '',
  port: '4370',
  comm_key: '',
  is_active: true,
}

function formatSyncStatus(status?: string | null): string {
  if (status === 'success') return 'ناجحة'
  if (status === 'failed') return 'فاشلة'
  return '—'
}

export function HrmZkDevicesPage() {
  const queryClient = useQueryClient()
  const [panelOpen, setPanelOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [toast, setToast] = useState('')

  const query = useQuery({
    queryKey: ['hrm', 'zk-devices'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ZkDevice>>('/hrm/zk-devices', {
        params: { per_page: 100, include: 'branch' },
      })
      return data.data
    },
  })

  const branchesQuery = useQuery({
    queryKey: ['branches', 'hrm-zk-devices'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', { params: { per_page: 100 } })
      return data.data
    },
    enabled: panelOpen || editId !== null,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        branch_id: Number(form.branch_id),
        ip_address: form.ip_address,
        port: form.port ? Number(form.port) : 4370,
        comm_key: form.comm_key || undefined,
        is_active: form.is_active,
      }
      if (editId) {
        const { data } = await api.put<ZkDevice>(`/hrm/zk-devices/${editId}`, payload)
        return data
      }
      const { data } = await api.post<ZkDevice>('/hrm/zk-devices', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm', 'zk-devices'] })
      setPanelOpen(false)
      setEditId(null)
      setForm(emptyForm)
      setToast('تم حفظ جهاز البصمة')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const testMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ message: string }>(`/hrm/zk-devices/${id}/test`)
      return data.message
    },
    onSuccess: (message) => setToast(message),
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const syncMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ message: string }>(`/hrm/zk-devices/${id}/sync`)
      return data.message
    },
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ['hrm', 'zk-devices'] })
      queryClient.invalidateQueries({ queryKey: ['hrm', 'attendance'] })
      setToast(message)
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const syncAllMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ imported: number; applied: number }>('/hrm/zk-devices/sync-all')
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['hrm', 'zk-devices'] })
      queryClient.invalidateQueries({ queryKey: ['hrm', 'attendance'] })
      setToast(`تمت المزامنة — مستورد: ${data.imported}، مطبّق: ${data.applied}`)
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const openEdit = (device: ZkDevice) => {
    setEditId(device.id)
    setForm({
      name: device.name,
      branch_id: device.branch_id,
      ip_address: device.ip_address,
      port: String(device.port ?? 4370),
      comm_key: device.comm_key ?? '',
      is_active: device.is_active ?? true,
    })
  }

  const usedBranchIds = new Set((query.data ?? []).map((d) => d.branch_id))

  return (
    <div>
      <PageHeader
        title="أجهزة البصمة ZK"
        subtitle="ربط جهاز بصمة لكل فرع ومزامنة سجلات الحضور"
        actions={
          <div className="flex flex-wrap gap-xs">
            <button
              type="button"
              onClick={() => syncAllMutation.mutate()}
              disabled={syncAllMutation.isPending}
              className="flex items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-sm font-medium disabled:opacity-50"
            >
              <Icon name="sync" size={18} />
              مزامنة الكل
            </button>
            <button
              type="button"
              onClick={() => {
                setPanelOpen(true)
                setEditId(null)
                setForm(emptyForm)
              }}
              className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
            >
              <Icon name="add" size={18} />
              جهاز جديد
            </button>
          </div>
        }
      />

      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<ZkDevice & Record<string, unknown>>
          data={(query.data ?? []) as (ZkDevice & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          pageSize={10}
          emptyMessage="لا توجد أجهزة بصمة مسجّلة"
          columns={[
            { key: 'name', header: 'الاسم' },
            {
              key: 'branch',
              header: 'الفرع',
              render: (row) => row.branch?.name_ar ?? row.branch?.name ?? '—',
            },
            {
              key: 'ip_address',
              header: 'IP',
              className: 'tabular-nums',
              render: (row) => `${row.ip_address}:${row.port ?? 4370}`,
            },
            {
              key: 'last_sync_at',
              header: 'آخر مزامنة',
              render: (row) =>
                row.last_sync_at
                  ? new Date(row.last_sync_at).toLocaleString('ar-EG')
                  : '—',
            },
            {
              key: 'last_sync_status',
              header: 'الحالة',
              render: (row) => (
                <StatusBadge
                  status={row.last_sync_status === 'success' ? 'active' : row.last_sync_status === 'failed' ? 'inactive' : 'default'}
                  label={formatSyncStatus(row.last_sync_status)}
                />
              ),
            },
            {
              key: 'is_active',
              header: 'مفعّل',
              render: (row) => (
                <StatusBadge status={row.is_active ? 'active' : 'inactive'} />
              ),
            },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <div className="flex flex-wrap gap-sm">
                  <button
                    type="button"
                    onClick={() => testMutation.mutate(row.id)}
                    disabled={testMutation.isPending}
                    className="text-xs text-primary hover:underline"
                  >
                    اختبار
                  </button>
                  <button
                    type="button"
                    onClick={() => syncMutation.mutate(row.id)}
                    disabled={syncMutation.isPending}
                    className="text-xs text-secondary hover:underline"
                  >
                    مزامنة
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className="text-xs text-on-surface-variant hover:underline"
                  >
                    تعديل
                  </button>
                </div>
              ),
            },
          ]}
        />
      </AsyncState>

      <Modal
        open={panelOpen || editId !== null}
        onClose={() => {
          setPanelOpen(false)
          setEditId(null)
        }}
        title={editId ? 'تعديل جهاز بصمة' : 'جهاز بصمة جديد'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveMutation.mutate()
          }}
          className="grid gap-sm sm:grid-cols-2"
        >
          <input
            placeholder="اسم الجهاز"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className={`${inputClass} sm:col-span-2`}
          />
          <select
            value={form.branch_id}
            onChange={(e) => setForm({ ...form, branch_id: e.target.value ? Number(e.target.value) : '' })}
            required
            disabled={Boolean(editId)}
            className={inputClass}
          >
            <option value="">الفرع</option>
            {(branchesQuery.data ?? []).map((b) => (
              <option
                key={b.id}
                value={b.id}
                disabled={!editId && usedBranchIds.has(b.id)}
              >
                {b.name_ar ?? b.name}
              </option>
            ))}
          </select>
          <input
            placeholder="IP"
            value={form.ip_address}
            onChange={(e) => setForm({ ...form, ip_address: e.target.value })}
            required
            dir="ltr"
            className={inputClass}
          />
          <input
            placeholder="Port"
            value={form.port}
            onChange={(e) => setForm({ ...form, port: e.target.value })}
            dir="ltr"
            className={inputClass}
          />
          <input
            placeholder="Comm Key (اختياري)"
            value={form.comm_key}
            onChange={(e) => setForm({ ...form, comm_key: e.target.value })}
            dir="ltr"
            className={`${inputClass} sm:col-span-2`}
          />
          <label className="flex items-center gap-xs text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            مفعّل
          </label>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="rounded-lg bg-secondary py-2 text-sm font-bold text-on-secondary sm:col-span-2"
          >
            حفظ
          </button>
        </form>
      </Modal>
    </div>
  )
}

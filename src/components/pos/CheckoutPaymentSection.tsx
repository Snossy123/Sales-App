import { PosSectionCard } from './PosSectionCard'
import type { useCheckoutPayment } from '../../hooks/useCheckoutPayment'

interface CheckoutPaymentSectionProps {
  payment: ReturnType<typeof useCheckoutPayment>
  number: number
  subtitle?: string
  showErrors: boolean
  error: string
}

export function CheckoutPaymentSection({ payment, number, subtitle, showErrors, error }: CheckoutPaymentSectionProps) {
  const {
    checkoutPaymentMethod, setCheckoutPaymentMethod,
    checkoutAccountId, setCheckoutAccountId,
    checkoutSenderNumber, setCheckoutSenderNumber,
    isCheckoutTransfer, checkoutAccountsQuery,
  } = payment

  return (
    <PosSectionCard number={number} title="طريقة تحصيل المبلغ عند التعاقد" subtitle={subtitle} contentClassName="space-y-sm p-sm sm:p-md">
      <label className="block text-sm">
        طريقة التحصيل
        <select className="mt-xs w-full rounded-lg border border-outline-variant bg-surface px-sm py-2" value={checkoutPaymentMethod} onChange={(event) => {
          setCheckoutPaymentMethod(event.target.value)
          setCheckoutAccountId('')
          setCheckoutSenderNumber('')
        }}>
          <option value="cash">نقدي</option>
          <option value="wallet">محفظة</option>
          <option value="instapay">انستا</option>
          <option value="bank_transfer">تحويل بنكي</option>
        </select>
      </label>
      {isCheckoutTransfer && <>
        <label className="block text-sm">
          {checkoutPaymentMethod === 'bank_transfer' ? 'حساب البنك المفعل' : 'رقم المحفظة / انستا المفعل'}
          <select className="mt-xs w-full rounded-lg border border-outline-variant bg-surface px-sm py-2" value={checkoutAccountId} onChange={(event) => setCheckoutAccountId(event.target.value ? Number(event.target.value) : '')}>
            <option value="">اختر الحساب</option>
            {(checkoutAccountsQuery.data ?? []).map((account) => <option key={account.id} value={account.id}>{account.beneficiary_name} — {account.account_number || account.phone}{account.bank_name ? ` (${account.bank_name})` : ''}</option>)}
          </select>
        </label>
        {checkoutAccountsQuery.isLoading && <p className="text-sm text-on-surface-variant">جاري تحميل الحسابات…</p>}
        {checkoutAccountsQuery.isError && <p role="alert" className="text-sm text-error">تعذر تحميل حسابات التحصيل. <button type="button" className="underline" onClick={() => void checkoutAccountsQuery.refetch()}>إعادة المحاولة</button></p>}
        <label className="block text-sm">
          رقم التحويل من العميل
          <input className="mt-xs w-full rounded-lg border border-outline-variant bg-surface px-sm py-2" dir="ltr" maxLength={50} value={checkoutSenderNumber} onChange={(event) => setCheckoutSenderNumber(event.target.value)} placeholder="01xxxxxxxxx" />
        </label>
      </>}
      {showErrors && error && <p role="alert" className="text-sm text-error">{error}</p>}
    </PosSectionCard>
  )
}

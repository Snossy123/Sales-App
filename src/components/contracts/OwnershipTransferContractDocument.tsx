import { ContractPrintBorder } from './ContractPrintBorder'
import { ContractPrintFooter } from './ContractPrintFooter'
import type { ReactNode } from 'react'
import type { Customer, SalesInvoice } from '../../api/types'
import {
  branchLabel,
  displayPersonName,
  fmtContractDate,
  fmtContractMoney,
  renewalTypeLabels,
  resolveSerial,
  resolveSim,
  resolveUsername,
  resolveVehicle,
} from '../../lib/contractFields'
import { contractKindLabel } from '../../lib/contractKinds'
import { buildOwnershipTransferFinancialBreakdown } from '../../lib/ownershipTransferFinancialBreakdown'
import {
  resolveOwnershipTransferDeviceLine,
  resolveOwnershipTransferNewOwner,
  resolveOwnershipTransferPreviousOwner,
} from '../../lib/ownershipTransferContract'
import { useAuthStore } from '../../stores/authStore'
import { Icon } from '../Icon'
import { ContractPrintHeader } from './ContractPrintHeader'
import '../../styles/installment-contract.css'

interface OwnershipTransferContractDocumentProps {
  invoice: SalesInvoice
}

function card(title: string, icon: string, children: ReactNode, className?: string) {
  return (
    <section className={`ic-ot-card${className ? ` ${className}` : ''}`}>
      <header className="ic-ot-card-title">
        <span>{title}</span>
        <span className="ic-ot-card-badge">
          <Icon name={icon} size={16} />
        </span>
      </header>
      <div className="ic-ot-card-body">{children}</div>
    </section>
  )
}

function infoRow(
  label: string,
  value: string,
  icon: string,
  opts?: { dir?: 'ltr' | 'rtl'; tone?: 'remaining'; wide?: boolean },
) {
  return (
    <div className={`ic-ot-row${opts?.tone ? ` ic-ot-row--${opts.tone}` : ''}${opts?.wide ? ' ic-ot-row--wide' : ''}`}>
      <span className="ic-ot-row-icon">
        <Icon name={icon} size={14} />
      </span>
      <span className="ic-ot-row-label">{label}</span>
      {opts?.wide ? null : (
        <span className="ic-ot-row-value" dir={opts?.dir}>
          {value}
        </span>
      )}
    </div>
  )
}

export function OwnershipTransferContractDocument({
  invoice,
}: OwnershipTransferContractDocumentProps) {
  const signerName = displayPersonName(useAuthStore((s) => s.user?.name))
  const previousOwner = resolveOwnershipTransferPreviousOwner(invoice)
  const newOwner = resolveOwnershipTransferNewOwner(invoice)
  const deviceLine = resolveOwnershipTransferDeviceLine(invoice)
  const sourceInvoice = invoice.source_invoice
  const branch = branchLabel(invoice)
  const branchDisplay = branch && branch !== '—' ? branch : ''
  const vehicle =
    resolveVehicle(deviceLine, invoice) ||
    resolveVehicle(deviceLine, sourceInvoice ?? undefined) ||
    sourceInvoice?.vehicle_info ||
    ''
  const renewalType =
    deviceLine?.renewal_type ?? invoice.renewal_type ?? sourceInvoice?.renewal_type
  const subscriptionExpiry =
    renewalType === 'permanent'
      ? renewalTypeLabels.permanent
      : fmtContractDate(
          deviceLine?.subscription_renewal_date ??
            invoice.subscription_renewal_date ??
            sourceInvoice?.subscription_renewal_date,
        )
  const financial = buildOwnershipTransferFinancialBreakdown(invoice)

  function moneyRow(label: string, amount: number, icon: string) {
    if (amount <= 0) return null
    return infoRow(label, fmtContractMoney(amount), icon)
  }

  return (
    <article className="installment-contract ownership-transfer-contract">
      <div className="ic-frame">
        <ContractPrintBorder src="/contract-frame-ot.svg" />

        <ContractPrintHeader
          title={contractKindLabel('ownership_transfer')}
          branchLabel={branchDisplay}
        />

        <div className="ic-ot-grid">
          {card(
            'بيانات المالك السابق',
            'person',
            <>
              {infoRow('الاسم :', previousOwner?.name ?? '', 'person')}
              {infoRow('الرقم القومي :', previousOwner?.national_id ?? '', 'badge', { dir: 'ltr' })}
              {infoRow('رقم الهاتف :', previousOwner?.phone ?? '', 'call', { dir: 'ltr' })}
            </>,
          )}
          {card(
            'بيانات المالك الجديد',
            'person',
            <>
              {infoRow('الاسم :', newOwner?.name ?? '', 'person')}
              {infoRow('الرقم القومي :', newOwner?.national_id ?? '', 'badge', { dir: 'ltr' })}
              {infoRow('رقم الهاتف :', newOwner?.phone ?? '', 'call', { dir: 'ltr' })}
              {infoRow('رقم الهاتف 2 :', newOwner?.phone_2?.trim() || '-', 'call', { dir: 'ltr' })}
            </>,
          )}
        </div>

        {card(
          'بيانات الجهاز والاشتراك',
          'settings',
          <>
            {infoRow(
              'السريال :',
              resolveSerial(deviceLine, newOwner as Customer | undefined),
              'barcode',
              { dir: 'ltr' },
            )}
            {infoRow(
              'رقم الشريحة :',
              resolveSim(deviceLine, newOwner as Customer | undefined),
              'sim_card',
              { dir: 'ltr' },
            )}
            {infoRow(
              'اسم المستخدم :',
              resolveUsername(deviceLine, newOwner as Customer | undefined),
              'person',
            )}
            {infoRow('المركبة :', vehicle, 'directions_car')}
            {infoRow(
              'تاريخ انتهاء الاشتراك :',
              subscriptionExpiry === '—' ? '' : subscriptionExpiry,
              'calendar_month',
            )}
          </>,
          'ic-ot-device',
        )}

        {card(
          'التفاصيل المالية',
          'payments',
          <>
            {infoRow('تاريخ النقل', financial.transferDate, 'calendar_month')}
            {moneyRow('رسوم نقل الملكية', financial.ownershipTransferFee, 'payments')}
            {moneyRow('تجديد الاشتراك', financial.subscriptionRenewalFee, 'autorenew')}
            {moneyRow('أقساط متبقية', financial.remainingInstallmentsOnSource, 'receipt_long')}
            {moneyRow('فك + تركيب', financial.disassemblyInstallationFee, 'build')}
            {infoRow('تم الدفع', fmtContractMoney(financial.paidAmount), 'check_circle')}
            {infoRow('باقي المبلغ', fmtContractMoney(financial.remainingBalance), 'account_balance_wallet', {
              tone: 'remaining',
            })}
            {financial.paymentScheduleText
              ? infoRow(financial.paymentScheduleText, '', 'calendar_month', { wide: true })
              : null}
          </>,
          'ic-ot-financial',
        )}

        <div className="ic-ot-terms">
          <p>
            أقر الطرفان بموافقتهما على نقل ملكية الجهاز والاشتراك المرتبط به من المالك السابق إلى
            المالك الجديد، ويلتزم المالك الجديد بجميع بنود التعاقد ومواعيد تجديد الاشتراك. يتحمل
            المالك الجديد رسوم نقل الملكية ورسوم البرمجة إن وجدت. لا يُعتد بنقل الملكية إلا بعد
            توقيع الطرفين واعتماد المؤسسة.
          </p>
          <span className="ic-ot-terms-icon" aria-hidden="true">
            <Icon name="description" size={22} />
          </span>
        </div>

        <div className="ic-signatures ic-signatures--triple">
          <div>
            توقيع المالك السابق
            <span className="ic-sign-line" />
          </div>
          <div>
            توقيع المالك الجديد
            <span className="ic-sign-line" />
          </div>
          <div>
            توقيع موظف المؤسسة
            <span className="ic-sign-line">
              {signerName ? <span className="ic-sign-name">{signerName}</span> : null}
            </span>
          </div>
        </div>

        <ContractPrintFooter reference={invoice.invoice_number} />
      </div>
    </article>
  )
}

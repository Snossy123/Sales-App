import type { DailyBranchReport } from '../../api/types'
import {
  TRANSACTION_ROW_COUNT,
  arabicDayName,
  branchDisplayName,
  formatReportHeaderDate,
  formatReportHeaderDateLong,
} from '../../lib/dailyBranchReport'
import '../../styles/daily-branch-report.css'

function fmtMoney(value: number | string | null | undefined): string {
  if (value == null || value === '') return ''
  return Number(value).toLocaleString('ar-EG')
}

interface Props {
  report: DailyBranchReport
}

export function DailyBranchReportPrintDocument({ report }: Props) {
  const branchName = branchDisplayName(report.branch)
  const transactions = report.transactions ?? []
  const transfers = report.transfers ?? []
  const attendance = report.attendance ?? []
  const expenseLines = report.expense_lines ?? []
  const movements = report.movements ?? []

  const transactionRows = Array.from({ length: TRANSACTION_ROW_COUNT }, (_, index) => {
    return transactions[index] ?? { customer_name: '', transaction_type: '', amount: 0 }
  })

  const transferRows = transfers.length > 0 ? transfers : [{ customer_name: '', amount: 0, reference: '' }]

  return (
    <>
      {/* Sheet 1 — المعاملات + فودافون كاش */}
      <section className="daily-report-sheet">
        <div className="dbr-header">
          <div className="dbr-logo">
            العراقي
          </div>
          <div className="dbr-title">
            بيان يومي فرع ( <span className="branch">{branchName}</span> ){' '}
            {arabicDayName(report.report_date)} اليوم {formatReportHeaderDate(report.report_date)}
          </div>
        </div>

        <div className="dbr-sheet1-grid">
          <div className="dbr-vf-box">
            <div className="dbr-vf-head">تحويلات فودافون كاش</div>
            <div className="dbr-vf-subhead">تفاصيل التحويلات</div>
            <table className="dbr-table">
              <thead>
                <tr>
                  <th className="dbr-num">#</th>
                  <th>اسم العميل</th>
                  <th>المبلغ</th>
                  <th>اخر ثلاث ارقام</th>
                </tr>
              </thead>
              <tbody>
                {transferRows.map((row, index) => (
                  <tr key={index}>
                    <td className="dbr-num">{index + 1}</td>
                    <td>{row.customer_name ?? ''}</td>
                    <td>{fmtMoney(row.amount)}</td>
                    <td>{row.reference ?? ''}</td>
                  </tr>
                ))}
                <tr className="dbr-total-row">
                  <td colSpan={2}>إجمالي مبلغ التحويلات</td>
                  <td>{fmtMoney(report.vodafone_transfers_total)}</td>
                  <td>عدد: {report.vodafone_transfers_count ?? 0}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <table className="dbr-table">
            <thead>
              <tr>
                <th className="dbr-num">#</th>
                <th>اسم العميل</th>
                <th>الحالة</th>
                <th>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {transactionRows.map((row, index) => (
                <tr key={index}>
                  <td className="dbr-num">{index + 1}</td>
                  <td>{row.customer_name ?? ''}</td>
                  <td>{row.transaction_type ?? ''}</td>
                  <td>{fmtMoney(row.amount)}</td>
                </tr>
              ))}
              <tr className="dbr-total-row">
                <td colSpan={3}>الاجمالي</td>
                <td>{fmtMoney(report.total_amount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="dbr-footer-red" />
      </section>

      {/* Sheet 2 — الملخص اليومي */}
      <section className="daily-report-sheet">
        <div className="dbr-header">
          <div className="dbr-logo">
            العراقي
          </div>
          <div className="dbr-title">
            بيان يومي — فرع ( <span className="branch">{branchName}</span> )
            <div className="date">{formatReportHeaderDateLong(report.report_date)}</div>
          </div>
        </div>

        <div className="dbr-sheet2-top">
          <table className="dbr-table">
            <thead>
              <tr>
                <th>اسم الموظف</th>
                <th>حضور</th>
                <th>انصراف</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }, (_, index) => {
                const row = attendance[index]
                return (
                  <tr key={index}>
                    <td>{row?.employee_name ?? ''}</td>
                    <td>{row?.check_in ?? ''}</td>
                    <td>{row?.check_out ?? ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <table className="dbr-table dbr-summary-table">
            <tbody>
              <tr>
                <td>الاجمالي</td>
                <td>{fmtMoney(report.total_amount)}</td>
              </tr>
              <tr>
                <td>المصروفات</td>
                <td>{fmtMoney(report.expenses_total)}</td>
              </tr>
              <tr>
                <td>الصافي</td>
                <td>{fmtMoney(report.net_amount)}</td>
              </tr>
              <tr>
                <td>تركيب</td>
                <td>{report.installations_count ?? 0}</td>
              </tr>
              <tr className="dbr-devices-row">
                <td rowSpan={1}>الاجهزة</td>
                <td>
                  <div>اجهزة فعلي: {report.devices_actual ?? 0}</div>
                  <div>({report.devices_reserved ?? 0} حجز)</div>
                  <div>اجهزة عملاء: {report.devices_customer ?? 0}</div>
                  <div>اجهزة السوفت: {report.devices_software ?? 0}</div>
                </td>
              </tr>
              <tr className="dbr-devices-row">
                <td>الاكسسوار</td>
                <td>
                  <div>شكرتون: {report.accessories_tape ?? 0}</div>
                  <div>افيز: {report.accessories_cable_ties ?? 0}</div>
                  <div>بلونه: {report.accessories_bulb ?? 0}</div>
                </td>
              </tr>
              <tr>
                <td>النسبة</td>
                <td>{report.percentage ?? ''}</td>
              </tr>
              <tr>
                <td>دخول اجهزة للفرع</td>
                <td>العدد: {report.devices_entering_count ?? ''}</td>
              </tr>
              <tr>
                <td>ملاحظات</td>
                <td style={{ minHeight: '12mm' }}>{report.notes ?? ''}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <table className="dbr-table" style={{ marginTop: '2mm' }}>
          <thead>
            <tr>
              <th>فودافون و إنستا باي</th>
              <th>عدد التحويلات</th>
              <th>اجمالي المبلغ</th>
              <th>ملاحظات اخرى</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>تحويلات</td>
              <td>{report.vodafone_transfers_count ?? 0}</td>
              <td>{fmtMoney(report.vodafone_transfers_total)}</td>
              <td>{report.vodafone_other_notes ?? ''}</td>
            </tr>
            <tr>
              <td>تجديد</td>
              <td colSpan={3}>{report.renewal_notes ?? ''}</td>
            </tr>
          </tbody>
        </table>

        <div className="dbr-section-title" style={{ marginTop: '2mm' }}>
          تحركات
        </div>
        <table className="dbr-table">
          <tbody>
            {Array.from({ length: 4 }, (_, index) => (
              <tr key={index}>
                <td className="dbr-num">{index + 1}</td>
                <td>{movements[index]?.description ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="dbr-section-title" style={{ marginTop: '2mm' }}>
          التفاصيل والمصروفات
        </div>
        <table className="dbr-table">
          <tbody>
            {Array.from({ length: 10 }, (_, index) => {
              const line = expenseLines[index]
              return (
                <tr key={index}>
                  <td className="dbr-num">{index + 1}</td>
                  <td>{line?.description ?? ''}</td>
                  <td style={{ width: '20%' }}>{fmtMoney(line?.amount)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="dbr-signatures">
          <div>
            توقيع المراجع
            <div>{report.reviewer_name ?? ''}</div>
            <div className="dbr-signature-line" />
          </div>
          <div>
            توقيع مدير الفرع
            <div>{report.branch_manager_name ?? ''}</div>
            <div className="dbr-signature-line" />
          </div>
        </div>
      </section>
    </>
  )
}

import type { ReactNode } from 'react'

interface ContractPrintHeaderProps {
  title: string
  branchLabel?: string
  extra?: ReactNode
}

export function ContractPrintHeader({ title, branchLabel, extra }: ContractPrintHeaderProps) {
  return (
    <header className="ic-header">
      <div className="ic-head-ar">
        <div className="ic-head-ar-top">مؤسسة</div>
        <div className="ic-head-ar-main">العراقى للتجارة</div>
        <div className="ic-head-ar-sub">{branchLabel ?? ''}</div>
      </div>
      <div className="ic-head-center">
        <div className="ic-brandwords">
          <span>Eleraqy</span>
          <span>Trading</span>
        </div>
        <img className="ic-logo-img" src="/contract/logo.png" alt="Eleraqy Trading" />
        <div className="ic-title-badge">{title}</div>
        {extra}
      </div>
      <div className="ic-head-en">
        <div className="ic-head-en-top">Company</div>
        <div className="ic-head-en-main">Eleraqy Trading</div>
        <div className="ic-head-en-sub">Security Systems</div>
      </div>
    </header>
  )
}

export function ContractPrintBorder({ src = '/contract-frame.svg' }: { src?: string }) {
  return <img className="ic-frame-border" src={src} alt="" aria-hidden="true" draggable={false} />
}

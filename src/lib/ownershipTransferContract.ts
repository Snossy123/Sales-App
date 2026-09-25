import type { Customer, SalesInvoice, SalesInvoiceLine } from '../api/types'

export type OwnershipTransferParty = Pick<Customer, 'id' | 'name' | 'phone'> &
  Partial<Pick<Customer, 'phone_2' | 'national_id' | 'username' | 'device_serial' | 'sim_number'>>

function isDeviceLine(line?: SalesInvoiceLine): boolean {
  if (!line) return false
  return (
    line.line_type === 'device' ||
    Boolean(line.serial_number || line.sim_number || line.username || line.product_unit_id)
  )
}

function firstDeviceLine(lines?: SalesInvoiceLine[]): SalesInvoiceLine | undefined {
  if (!lines?.length) return undefined
  return lines.find(isDeviceLine) ?? lines[0]
}

export function resolveOwnershipTransferPreviousOwner(
  invoice: SalesInvoice,
): OwnershipTransferParty | undefined {
  return invoice.ownership_transfer_record?.from_customer ?? invoice.source_invoice?.customer
}

export function resolveOwnershipTransferNewOwner(
  invoice: SalesInvoice,
): OwnershipTransferParty | undefined {
  return invoice.ownership_transfer_record?.to_customer ?? invoice.customer
}

export function resolveOwnershipTransferDeviceLine(
  invoice: SalesInvoice,
): SalesInvoiceLine | undefined {
  const transferLine = firstDeviceLine(invoice.lines)
  if (
    transferLine &&
    (transferLine.serial_number ||
      transferLine.sim_number ||
      transferLine.username ||
      transferLine.product_unit?.serial_number)
  ) {
    return transferLine
  }

  return firstDeviceLine(invoice.source_invoice?.lines) ?? transferLine
}

export function linesMissingStockUnit(
  lines: { productUnitId?: number | null }[],
  units: { id?: number | null }[],
  options: { manualDeviceEntry: boolean; allowNegativeInventory: boolean },
): boolean {
  if (options.manualDeviceEntry || options.allowNegativeInventory) return false
  return lines.some((line, index) => !(line.productUnitId || units[index]?.id))
}

export const MISSING_STOCK_UNIT_MESSAGE = 'يجب اختيار وحدة مخزون لكل جهاز'

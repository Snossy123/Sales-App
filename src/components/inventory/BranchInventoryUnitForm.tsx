import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../api/client'
import type { Customer, Employee, PaginatedResponse, ProductUnit, Warehouse } from '../../api/types'
import { Modal } from '../Modal'
import { CUSTODY_BUCKET_OPTIONS } from '../../lib/inventoryBuckets'
import { SearchableSelect } from '../SearchableSelect'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'

export function BranchInventoryUnitForm({ unit, branchId, onClose, onSuccess }: {
  unit: ProductUnit | null; branchId?: number | null; onClose: () => void; onSuccess: () => void
}) {
  const [form, setForm] = useState({
    warehouse_id: String(unit?.warehouse_id ?? ''), serial_number: unit?.serial_number || unit?.imei || '',
    physical_serial: unit?.physical_serial || '', username: unit?.username || '', sim_number: unit?.sim_number || '',
    inventory_bucket: unit?.inventory_bucket || 'custody_customer', custody_employee_id: String(unit?.custody_employee_id ?? ''),
    custody_customer_id: String(unit?.custody_customer_id ?? ''), notes: unit?.notes || '',
  })
  const [customerSearch, setCustomerSearch] = useState('')
  const [customer, setCustomer] = useState<{ id: number; name: string } | null>(unit?.custody_customer ?? null)
  const search = useDebouncedValue(customerSearch, 300)
  const warehouses = useQuery({ queryKey: ['warehouses', 'branch-unit-form', branchId], queryFn: async () => {
    const { data } = await api.get<PaginatedResponse<Warehouse>>('/warehouses', { params: { per_page: 100, ...(branchId ? { 'filter[branch_id]': branchId } : {}) } })
    return data.data.filter((warehouse) => warehouse.branch_id)
  } })
  const warehouseBranchId = warehouses.data?.find((warehouse) => String(warehouse.id) === form.warehouse_id)?.branch_id ?? branchId
  const employees = useQuery({ queryKey: ['employees', 'branch-unit-form', warehouseBranchId], queryFn: async () => {
    const { data } = await api.get<PaginatedResponse<Employee>>('/employees', { params: { per_page: 100, 'filter[branch_id]': warehouseBranchId } })
    return data.data
  }, enabled: Boolean(warehouseBranchId) })
  const customers = useQuery({ queryKey: ['customers', 'branch-unit-form', search], queryFn: async () => {
    const { data } = await api.get<PaginatedResponse<Customer>>('/customers', { params: { per_page: 20, 'filter[name]': search } })
    return data.data
  }, enabled: search.trim().length >= 2 })
  const mutation = useMutation({ mutationFn: async () => {
    const payload = { ...form, warehouse_id: Number(form.warehouse_id), custody_employee_id: Number(form.custody_employee_id) || null, custody_customer_id: Number(form.custody_customer_id) || null }
    if (unit) await api.put(`/inventory/branch/units/${unit.id}`, payload)
    else await api.post('/inventory/branch/units', payload)
  }, onSuccess })
  const inputClass = 'w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm'
  return <Modal open onClose={onClose} title={unit ? 'تعديل بيانات الجهاز' : 'إضافة جهاز لمخزون الفرع'}>
    <form className="max-h-[75vh] space-y-3 overflow-y-auto" onSubmit={(event) => { event.preventDefault(); mutation.mutate() }}>
      <label className="block text-sm">المخزن
        <select required disabled={Boolean(unit)} className={inputClass} value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value, custody_employee_id: '' })}>
          <option value="">اختر المخزن</option>
          {warehouses.data?.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name_ar || warehouse.name}</option>)}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        {([['serial_number', 'السريال'], ['physical_serial', 'السريال الفعلي'], ['username', 'اسم المستخدم'], ['sim_number', 'رقم الشريحة']] as const).map(([key, label]) => <label key={key} className="block text-sm">{label}<input required={key === 'serial_number'} className={inputClass} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}
      </div>
      <label className="block text-sm">التصنيف<select className={inputClass} value={form.inventory_bucket} onChange={(e) => setForm({ ...form, inventory_bucket: e.target.value })}><option value="new">مخزون متاح للبيع</option>{CUSTODY_BUCKET_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className="block text-sm">الموظف<select className={inputClass} value={form.custody_employee_id} onChange={(e) => setForm({ ...form, custody_employee_id: e.target.value })}><option value="">بدون موظف</option>{employees.data?.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
      <SearchableSelect options={customers.data ?? []} value={customer} label="العميل" placeholder="ابحث باسم العميل" loading={customers.isFetching} onSearchChange={setCustomerSearch} getOptionValue={(item) => item.id} getOptionLabel={(item) => item.name} onChange={(item) => { setCustomer(item); setForm({ ...form, custody_customer_id: item ? String(item.id) : '' }) }} />
      <label className="block text-sm">ملاحظات<textarea className={inputClass} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
      {(mutation.isError || warehouses.isError || employees.isError || customers.isError) && <p role="alert" className="text-sm text-error">{getErrorMessage(mutation.error || warehouses.error || employees.error || customers.error)}</p>}
      <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">إلغاء</button><button type="submit" disabled={mutation.isPending || !form.warehouse_id || (form.inventory_bucket === 'custody_customer' && !form.custody_customer_id)} className="rounded-lg bg-primary px-4 py-2 text-sm text-on-primary disabled:opacity-50">{mutation.isPending ? 'جارٍ الحفظ...' : 'حفظ'}</button></div>
    </form>
  </Modal>
}

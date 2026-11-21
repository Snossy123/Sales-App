import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { Customer, ReferralLead, SalesRep } from '../../../api/types'
import { userCanPerform, userHasPermission } from '../../../lib/access'
import { useAuthStore } from '../../../stores/authStore'

interface SaleCustomerResponse {
  customer: Customer
  sales_user: SalesRep | null
}

export function canStartReferralSale(lead: ReferralLead | undefined): boolean {
  return Boolean(lead?.referred_by_customer_id)
}

export function useStartReferralSale(lead: ReferralLead | undefined) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const canStart =
    canStartReferralSale(lead) &&
    (userCanPerform(user, 'sales.pos.new') || userHasPermission(user, 'sales.pos'))

  const start = async () => {
    if (!lead || !canStart) return
    setPending(true)
    setError('')
    try {
      const { data } = await api.post<SaleCustomerResponse>(
        `/crm/referral-leads/${lead.id}/sale-customer`,
      )
      await queryClient.invalidateQueries({ queryKey: ['referral-leads'] })
      await queryClient.invalidateQueries({ queryKey: ['crm-referral-lead', String(lead.id)] })
      const params = new URLSearchParams({ customer_id: String(data.customer.id) })
      if (data.sales_user?.id) params.set('sales_user_id', String(data.sales_user.id))
      navigate(`/pos?${params.toString()}`, {
        state: data.sales_user ? { referralSalesRep: data.sales_user } : undefined,
      })
    } catch (caught) {
      setError(getErrorMessage(caught))
      setPending(false)
    }
  }

  return { canStart, pending, error, start }
}

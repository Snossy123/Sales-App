import { useNavigate } from 'react-router-dom'
import { ExpenseRequestForm } from '../components/expenses/ExpenseRequestForm'
import { SalesPageShell } from '../components/SalesPageShell'

export function ExpenseNewPage() {
  const navigate = useNavigate()

  return (
    <SalesPageShell title="طلب مصروف" subtitle="إرسال طلب مصروف للمراجعة">
      <ExpenseRequestForm
        open
        onClose={() => navigate(-1)}
        onSuccess={() => navigate('/review/expenses')}
      />
    </SalesPageShell>
  )
}

import type { AccountingAccount, AccountPrimaryType } from '../api/types'

export const primaryTypeLabels: Record<AccountPrimaryType, string> = {
  asset: 'أصول',
  liability: 'خصوم',
  equity: 'حقوق ملكية',
  income: 'إيرادات',
  expense: 'مصروفات',
}

export function formatMoney(value: string | number | null | undefined): string {
  if (value == null || value === '') return '—'
  return `${Number(value).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = value.split('T')[0]
  try {
    return new Date(d).toLocaleDateString('ar-EG')
  } catch {
    return d
  }
}

export interface AccountTreeNode extends AccountingAccount {
  children: AccountTreeNode[]
}

export function buildAccountTree(accounts: AccountingAccount[]): AccountTreeNode[] {
  const byId = new Map<number, AccountTreeNode>()
  const roots: AccountTreeNode[] = []

  for (const account of accounts) {
    byId.set(account.id, { ...account, children: [] })
  }

  for (const node of byId.values()) {
    if (node.parent_account_id && byId.has(node.parent_account_id)) {
      byId.get(node.parent_account_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  const sortNodes = (nodes: AccountTreeNode[]) => {
    nodes.sort((a, b) => String(a.gl_code ?? '').localeCompare(String(b.gl_code ?? '')))
    nodes.forEach((n) => sortNodes(n.children))
  }
  sortNodes(roots)
  return roots
}

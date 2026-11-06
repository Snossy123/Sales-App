import { describe, expect, it } from 'vitest'
import type { AuthUser } from '../api/types'
import { userCanPerform } from './access'
import { getAllPermissions } from '../modules/admin/lib/permissionCatalog'

describe('custody voucher permissions', () => {
  it('lists all eight independent actions in their categories', () => {
    const catalog = getAllPermissions(['inventory.branch.receive', 'inventory.branch.issue'])
    for (const type of ['receive', 'issue']) {
      expect(catalog.some((permission) => permission.key === `inventory.branch.${type}`)).toBe(false)
      for (const action of ['view', 'add', 'edit', 'delete']) {
        expect(catalog.find((permission) => permission.key === `inventory.branch.${type}.${action}`)?.category).toBe(action)
      }
    }
  })
  it('requires explicit action permissions for branch managers', () => {
    const user = { roles: [{ name: 'BranchManager' }], permissions: ['inventory.branch.receive.view'] } as AuthUser
    expect(userCanPerform(user, 'inventory.branch.receive.view')).toBe(true)
    expect(userCanPerform(user, 'inventory.branch.receive.add')).toBe(false)
    expect(userCanPerform(user, 'inventory.branch.issue.view')).toBe(false)
  })
})

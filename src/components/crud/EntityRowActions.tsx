import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../Icon'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { useSoftDelete } from '../../lib/crud/useSoftDelete'
import type { EntityCrudConfig } from '../../lib/crud/types'
import type { DemoRole } from '../../api/types'
import { getUserRole } from '../../lib/permissions'
import { useAuthStore } from '../../stores/authStore'

interface EntityRowActionsProps<T extends { id: number }> {
  row: T
  config: EntityCrudConfig<T>
  queryKeys?: string[][]
  onEdit?: (row: T) => void
  showView?: boolean
}

function hasPermission(roles: DemoRole[] | undefined, userRole: DemoRole): boolean {
  if (!roles?.length) return false
  return roles.includes(userRole)
}

export function EntityRowActions<T extends { id: number }>({
  row,
  config,
  queryKeys,
  onEdit,
  showView = true,
}: EntityRowActionsProps<T>) {
  const user = useAuthStore((s) => s.user)
  const role = getUserRole(user)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const canRead = hasPermission(config.permissions.read ?? config.permissions.create, role)
  const canEdit = hasPermission(config.permissions.edit, role)
  const canDelete = hasPermission(config.permissions.delete, role)

  const deleteMutation = useSoftDelete({
    resource: config.resource,
    queryKeys: queryKeys ?? [[config.resource.split('/')[0]]],
    onSuccess: () => {
      setDeleteError('')
      setDeleteOpen(false)
    },
    onError: (message) => setDeleteError(message),
  })

  const editHref = config.editPath?.(row.id)
  const detailHref = config.detailPath?.(row.id)
  const useEditLink = canEdit && config.editMode === 'route' && editHref
  const useEditButton = canEdit && (config.editMode === 'modal' || config.editMode === 'inline') && onEdit

  return (
    <>
      <div className="flex flex-wrap items-center gap-md">
        {showView && canRead && detailHref && (
          <Link
            to={detailHref}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Icon name="visibility" size={18} />
            عرض
          </Link>
        )}
        {useEditLink && (
          <Link
            to={editHref}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Icon name="edit" size={18} />
            تعديل
          </Link>
        )}
        {useEditButton && (
          <button
            type="button"
            onClick={() => onEdit(row)}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Icon name="edit" size={18} />
            تعديل
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            disabled={deleteMutation.isPending}
            className="inline-flex items-center gap-1 text-sm text-error hover:underline disabled:opacity-50"
          >
            <Icon name="delete" size={18} />
            حذف
          </button>
        )}
      </div>
      {deleteError && <p className="mt-1 text-xs text-error">{deleteError}</p>}
      <DeleteConfirmDialog
        open={deleteOpen}
        message={config.deleteConfirmMessage?.(row) ?? `حذف "${config.label(row)}"؟`}
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(row.id)}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}

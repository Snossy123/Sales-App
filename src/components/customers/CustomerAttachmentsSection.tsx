import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../api/client'
import type { MediaFile } from '../../api/types'
import { Icon } from '../Icon'

export interface PendingAttachment {
  id: string
  file: File
  description: string
}

interface CustomerAttachmentsSectionProps {
  customerId?: number
  mode: 'create' | 'view'
  pendingFiles?: PendingAttachment[]
  onPendingChange?: (files: PendingAttachment[]) => void
  canManage?: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function CustomerAttachmentsSection({
  customerId,
  mode,
  pendingFiles = [],
  onPendingChange,
  canManage = true,
}: CustomerAttachmentsSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const [uploadError, setUploadError] = useState('')

  const mediaQuery = useQuery({
    queryKey: ['customer-media', customerId],
    queryFn: async () => {
      const { data } = await api.get<{ data: MediaFile[] }>(`/customers/${customerId}/media`)
      return data.data
    },
    enabled: mode === 'view' && Boolean(customerId),
  })

  const uploadMutation = useMutation({
    mutationFn: async (payload: { file: File; description?: string }) => {
      const formData = new FormData()
      formData.append('file', payload.file)
      if (payload.description) {
        formData.append('description', payload.description)
      }
      const { data } = await api.post<MediaFile>(`/customers/${customerId}/media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-media', customerId] })
      setUploadError('')
    },
    onError: (error) => setUploadError(getErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: async (mediaId: number) => {
      await api.delete(`/customers/${customerId}/media/${mediaId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-media', customerId] })
    },
  })

  const handleFileSelect = (files: FileList | null) => {
    if (!files?.length) return

    if (mode === 'create') {
      const next = [...pendingFiles]
      Array.from(files).forEach((file) => {
        next.push({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
          file,
          description: '',
        })
      })
      onPendingChange?.(next)
      return
    }

    if (!customerId) return
    Array.from(files).forEach((file) => {
      uploadMutation.mutate({ file })
    })
  }

  const updatePendingDescription = (id: string, description: string) => {
    onPendingChange?.(
      pendingFiles.map((item) => (item.id === id ? { ...item, description } : item)),
    )
  }

  const removePending = (id: string) => {
    onPendingChange?.(pendingFiles.filter((item) => item.id !== id))
  }

  const mediaItems = mediaQuery.data ?? []

  return (
    <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
      <div className="mb-sm flex flex-wrap items-center justify-between gap-sm">
        <h3 className="text-sm font-bold text-on-surface">المرفقات</h3>
        {canManage && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                handleFileSelect(e.target.files)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={mode === 'view' && uploadMutation.isPending}
              className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-sm py-1.5 text-sm font-medium text-on-surface hover:bg-surface-container disabled:opacity-50"
            >
              <Icon name="attach_file" size={18} />
              {mode === 'create' ? 'إضافة ملفات' : 'رفع مرفق'}
            </button>
          </>
        )}
      </div>

      <p className="mb-sm text-xs text-on-surface-variant">
        صور أو PDF — بحد أقصى 5MB لكل ملف
      </p>

      {uploadError && <p className="mb-sm text-sm text-error">{uploadError}</p>}

      {mode === 'create' && pendingFiles.length > 0 && (
        <ul className="space-y-sm">
          {pendingFiles.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-start gap-sm rounded border border-outline-variant p-sm"
            >
              <Icon name="description" size={20} className="mt-1 text-on-surface-variant no-flip" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.file.name}</p>
                <p className="text-xs text-on-surface-variant">{formatFileSize(item.file.size)}</p>
                <input
                  value={item.description}
                  onChange={(e) => updatePendingDescription(item.id, e.target.value)}
                  placeholder="وصف اختياري..."
                  className="mt-xs w-full rounded border border-outline-variant px-sm py-1 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => removePending(item.id)}
                className="text-error hover:opacity-80"
                aria-label="حذف"
              >
                <Icon name="close" size={20} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {mode === 'view' && (
        <>
          {mediaQuery.isLoading && (
            <p className="text-sm text-on-surface-variant">جاري تحميل المرفقات...</p>
          )}
          {!mediaQuery.isLoading && mediaItems.length === 0 && (
            <p className="text-sm text-on-surface-variant">لا توجد مرفقات</p>
          )}
          {mediaItems.length > 0 && (
            <ul className="space-y-sm">
              {mediaItems.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-sm rounded border border-outline-variant p-sm"
                >
                  <Icon name="description" size={20} className="text-on-surface-variant no-flip" />
                  <div className="min-w-0 flex-1">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm font-medium text-primary hover:underline"
                    >
                      {item.file_name}
                    </a>
                    <p className="text-xs text-on-surface-variant">
                      {formatFileSize(item.size)}
                      {item.description ? ` — ${item.description}` : ''}
                    </p>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(item.id)}
                      disabled={deleteMutation.isPending}
                      className="text-error hover:opacity-80 disabled:opacity-50"
                      aria-label="حذف"
                    >
                      <Icon name="delete" size={20} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

export async function uploadCustomerAttachments(
  customerId: number,
  pendingFiles: PendingAttachment[],
): Promise<void> {
  for (const item of pendingFiles) {
    const formData = new FormData()
    formData.append('file', item.file)
    if (item.description.trim()) {
      formData.append('description', item.description.trim())
    }
    await api.post(`/customers/${customerId}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }
}

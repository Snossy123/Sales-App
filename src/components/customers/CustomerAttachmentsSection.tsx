import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../api/client'
import type { MediaFile } from '../../api/types'
import { Icon } from '../Icon'
import { Modal } from '../Modal'
import { isImageMimeType, isPdfMimeType, resolveMediaUrl } from '../../lib/storageUrl'

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

function getMediaDisplayName(item: Pick<MediaFile, 'file_name' | 'description'>): string {
  const customName = item.description?.trim()
  return customName || item.file_name
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
  const [previewItem, setPreviewItem] = useState<MediaFile | null>(null)
  const [pendingUploads, setPendingUploads] = useState<PendingAttachment[]>([])

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
      const { data } = await api.post<MediaFile>(`/customers/${customerId}/media`, formData)
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

    const nextItems = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      description: '',
    }))

    if (mode === 'create') {
      onPendingChange?.([...pendingFiles, ...nextItems])
      return
    }

    setPendingUploads((prev) => [...prev, ...nextItems])
  }

  const updatePendingUploadDescription = (id: string, description: string) => {
    setPendingUploads((prev) =>
      prev.map((item) => (item.id === id ? { ...item, description } : item)),
    )
  }

  const removePendingUpload = (id: string) => {
    setPendingUploads((prev) => prev.filter((item) => item.id !== id))
  }

  const uploadPending = (item: PendingAttachment) => {
    if (!customerId) return
    uploadMutation.mutate(
      { file: item.file, description: item.description.trim() || undefined },
      {
        onSuccess: () => {
          setPendingUploads((prev) => prev.filter((p) => p.id !== item.id))
        },
      },
    )
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
  const previewUrl = previewItem ? resolveMediaUrl(previewItem.url) : undefined

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
        <ul className="mb-sm space-y-sm">
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

      {mode === 'view' && pendingUploads.length > 0 && (
        <ul className="mb-sm space-y-sm">
          {pendingUploads.map((item) => (
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
                  onChange={(e) => updatePendingUploadDescription(item.id, e.target.value)}
                  placeholder="وصف اختياري..."
                  className="mt-xs w-full rounded border border-outline-variant px-sm py-1 text-sm"
                />
              </div>
              <div className="flex items-center gap-xs">
                <button
                  type="button"
                  onClick={() => uploadPending(item)}
                  disabled={uploadMutation.isPending}
                  className="rounded-lg bg-primary px-sm py-1 text-xs font-bold text-on-primary disabled:opacity-50"
                >
                  رفع
                </button>
                <button
                  type="button"
                  onClick={() => removePendingUpload(item.id)}
                  disabled={uploadMutation.isPending}
                  className="text-error hover:opacity-80 disabled:opacity-50"
                  aria-label="حذف"
                >
                  <Icon name="close" size={20} />
                </button>
              </div>
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
                    <button
                      type="button"
                      onClick={() => setPreviewItem(item)}
                      className="truncate text-sm font-medium text-primary hover:underline"
                    >
                      {getMediaDisplayName(item)}
                    </button>
                    <p className="text-xs text-on-surface-variant">{formatFileSize(item.size)}</p>
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

      <Modal
        open={previewItem !== null}
        onClose={() => setPreviewItem(null)}
        title={previewItem ? getMediaDisplayName(previewItem) : 'معاينة المرفق'}
        size="lg"
      >
        {previewItem && previewUrl && (
          <div className="space-y-sm">
            {isImageMimeType(previewItem.mime_type) ? (
              <img
                src={previewUrl}
                alt={getMediaDisplayName(previewItem)}
                className="mx-auto max-h-[70vh] w-full rounded-lg object-contain"
              />
            ) : isPdfMimeType(previewItem.mime_type) ? (
              <iframe
                src={previewUrl}
                title={getMediaDisplayName(previewItem)}
                className="h-[70vh] w-full rounded-lg border border-outline-variant bg-surface-container-low"
              />
            ) : (
              <p className="text-sm text-on-surface-variant">لا تتوفر معاينة لهذا النوع من الملفات.</p>
            )}
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Icon name="open_in_new" size={16} />
              فتح في نافذة جديدة
            </a>
          </div>
        )}
      </Modal>
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
    await api.post(`/customers/${customerId}/media`, formData)
  }
}

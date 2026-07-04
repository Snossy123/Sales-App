import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import { ProfileAvatar, type ProfileAvatarVariant } from './ProfileAvatar'
import { ToastBanner } from './ToastBanner'

type ProfileEntityType = 'customer' | 'employee'

interface ProfilePhotoUploaderProps {
  entityType: ProfileEntityType
  entityId: number
  name: string
  photoUrl?: string | null
  variant: ProfileAvatarVariant
  canEdit?: boolean
  readOnlyHint?: string
  queryKeys?: string[][]
  onUpdated?: (photoUrl: string | null) => void
  layout?: 'horizontal' | 'vertical'
}

export function ProfilePhotoUploader({
  entityType,
  entityId,
  name,
  photoUrl,
  variant,
  canEdit = true,
  readOnlyHint,
  queryKeys = [],
  onUpdated,
  layout = 'horizontal',
}: ProfilePhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const [preview, setPreview] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const endpointBase = entityType === 'customer' ? `/customers/${entityId}` : `/employees/${entityId}`

  const invalidate = async (nextUrl: string | null) => {
    for (const key of queryKeys) {
      await queryClient.invalidateQueries({ queryKey: key })
    }
    onUpdated?.(nextUrl)
  }

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('photo', file)
      const { data } = await api.post<{ profile_photo_url: string }>(
        `${endpointBase}/profile-photo`,
        formData,
      )
      return data.profile_photo_url
    },
    onSuccess: async (url) => {
      setPreview(null)
      await invalidate(url)
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`${endpointBase}/profile-photo`)
    },
    onSuccess: async () => {
      setPreview(null)
      await invalidate(null)
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
    uploadMutation.mutate(file)
  }

  const displayUrl = preview ?? photoUrl
  const busy = uploadMutation.isPending || deleteMutation.isPending
  const isVertical = layout === 'vertical'

  return (
    <div
      className={`flex shrink-0 gap-md ${
        isVertical ? 'flex-col items-center text-center' : 'flex-wrap items-center'
      }`}
    >
      <ProfileAvatar name={name} photoUrl={displayUrl} variant={variant} size="lg" />

      {canEdit ? (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ''
            }}
          />
          <div className={`flex flex-wrap gap-sm ${isVertical ? 'justify-center' : ''}`}>
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="rounded-lg bg-primary px-md py-1.5 text-xs font-bold text-on-primary transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'جاري الرفع...' : 'تغيير الصورة'}
            </button>
            {photoUrl && (
              <button
                type="button"
                disabled={busy}
                onClick={() => deleteMutation.mutate()}
                className="rounded-lg border border-error/30 px-sm py-1.5 text-xs font-medium text-error transition-colors hover:bg-error/5 disabled:opacity-50"
              >
                حذف
              </button>
            )}
          </div>
          <p className="mt-1 text-[11px] leading-tight text-on-surface-variant">
            PNG أو JPG، بحد أقصى 2MB
          </p>
        </div>
      ) : readOnlyHint ? (
        <p className="text-sm text-on-surface-variant">{readOnlyHint}</p>
      ) : null}

      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}
    </div>
  )
}

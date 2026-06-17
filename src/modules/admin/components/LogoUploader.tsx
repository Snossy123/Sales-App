import { useRef, useState } from 'react'
import { Icon } from '../../../components/Icon'
import { resolvePublicStorageUrl } from '../../../lib/storageUrl'

interface LogoUploaderProps {
  logoUrl?: string | null
  onUpload: (file: File) => Promise<void>
  uploading?: boolean
}

export function LogoUploader({ logoUrl, onUpload, uploading }: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const displayUrl = preview ?? resolvePublicStorageUrl(logoUrl)

  const handleFile = async (file: File) => {
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
    await onUpload(file)
  }

  return (
    <div className="flex flex-wrap items-center gap-md">
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-outline-variant bg-surface-container">
        {displayUrl ? (
          <img src={displayUrl} alt="شعار المنظمة" className="h-full w-full object-contain" />
        ) : (
          <Icon name="image" size={32} className="text-on-surface-variant no-flip" />
        )}
      </div>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-outline-variant px-md py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container disabled:opacity-50"
        >
          {uploading ? 'جاري الرفع...' : 'رفع شعار'}
        </button>
        <p className="mt-1 text-xs text-on-surface-variant">PNG أو JPG، بحد أقصى 2MB</p>
      </div>
    </div>
  )
}

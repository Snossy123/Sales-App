import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'

export function BranchSetupPage() {
  const navigate = useNavigate()
  const [cloudUrl, setCloudUrl] = useState('https://gps.tiger-labtop.com/public')
  const [organizationId, setOrganizationId] = useState('1')
  const [branchId, setBranchId] = useState('1')
  const [key, setKey] = useState('')
  const [secret, setSecret] = useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/setup', {
        cloud_url: cloudUrl.trim(),
        organization_id: Number(organizationId),
        branch_id: Number(branchId),
        key: key.trim(),
        secret: secret.trim(),
      })
      return data
    },
    onSuccess: () => {
      navigate('/login', { replace: true })
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#eef3fb] px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-sm"
      >
        <h1 className="mb-2 text-xl font-bold">إعداد سيرفر الفرع</h1>
        <p className="mb-6 text-sm text-on-surface-variant">
          أدخل بيانات الاعتماد الصادرة من السحابة بأمر enroll على السحابة. اكتب رابط السحابة بدون /api/v1.
        </p>
        <label className="mb-3 block text-sm">
          رابط السحابة
          <input
            className="mt-1 w-full rounded-lg border border-outline-variant p-2"
            value={cloudUrl}
            onChange={(e) => setCloudUrl(e.target.value)}
            required
          />
        </label>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <label className="block text-sm">
            رقم المنظمة
            <input
              className="mt-1 w-full rounded-lg border border-outline-variant p-2"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            رقم الفرع
            <input
              className="mt-1 w-full rounded-lg border border-outline-variant p-2"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              required
            />
          </label>
        </div>
        <label className="mb-3 block text-sm">
          مفتاح الفرع
          <input
            className="mt-1 w-full rounded-lg border border-outline-variant p-2"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            required
            autoComplete="off"
          />
        </label>
        <label className="mb-4 block text-sm">
          سر الفرع
          <input
            type="password"
            className="mt-1 w-full rounded-lg border border-outline-variant p-2"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            required
            autoComplete="off"
          />
        </label>
        {mutation.isError && (
          <p className="mb-3 text-sm text-error">{getErrorMessage(mutation.error)}</p>
        )}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-xl bg-primary py-2 font-bold text-on-primary disabled:opacity-60"
        >
          {mutation.isPending ? 'جاري التنزيل من السحابة…' : 'حفظ وإعداد الفرع'}
        </button>
      </form>
    </div>
  )
}

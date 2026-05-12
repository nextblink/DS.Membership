// Form details page — metadata, image gallery with fullscreen viewer,
// status actions (Verify/Reject) for admin roles, linked member card,
// add/delete image actions for admin roles.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../../framework/api'
import auth from '../../framework/auth'

const ADMIN_ROLES = new Set(['SuperAdmin', 'Admin', 'LocalAdmin'])

const STATUS_CLASS = {
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Verified: 'bg-green-100 text-green-800 border-green-300',
  Rejected: 'bg-red-100 text-red-800 border-red-300',
}

function StatusBadge({ status }) {
  const cls = STATUS_CLASS[status] || 'bg-gray-100 text-gray-800 border-gray-300'
  return (
    <span className={`inline-block rounded border px-3 py-1 text-sm font-medium ${cls}`}>{status}</span>
  )
}

function imageUrl(img) {
  if (!img) return ''
  const path = img.url || img.filePath || img.path
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const base = api.defaults.baseURL || ''
  if (path.startsWith('/')) return `${base}${path}`
  return `${base}/${path}`
}

export default function FormDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const role = auth.getRole()
  const isAdmin = ADMIN_ROLES.has(role)

  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const [viewerIndex, setViewerIndex] = useState(null) // null = closed

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/forms/${id}`)
      setForm(res.data)
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load form')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const images = useMemo(() => {
    const list = form?.images || form?.Images || []
    return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }, [form])

  const closeViewer = useCallback(() => setViewerIndex(null), [])
  const nextImage = useCallback(() => {
    setViewerIndex((i) => (i == null ? i : (i + 1) % images.length))
  }, [images.length])
  const prevImage = useCallback(() => {
    setViewerIndex((i) => (i == null ? i : (i - 1 + images.length) % images.length))
  }, [images.length])

  useEffect(() => {
    if (viewerIndex == null) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeViewer()
      else if (e.key === 'ArrowRight') nextImage()
      else if (e.key === 'ArrowLeft') prevImage()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewerIndex, closeViewer, nextImage, prevImage])

  const setStatus = async (status) => {
    if (!isAdmin) return
    setBusy(true)
    try {
      await api.patch(`/api/forms/${id}/status`, { status })
      await load()
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Status update failed')
    } finally {
      setBusy(false)
    }
  }

  const onAddImages = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    e.target.value = ''
    setBusy(true)
    try {
      const fd = new FormData()
      files.forEach((f) => fd.append('files', f, f.name))
      await api.post(`/api/forms/${id}/images`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await load()
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Image upload failed')
    } finally {
      setBusy(false)
    }
  }

  const onDeleteImage = async (imageId) => {
    if (!isAdmin) return
    if (!confirm('Delete this image?')) return
    setBusy(true)
    try {
      await api.delete(`/api/forms/${id}/images/${imageId}`)
      await load()
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Image delete failed')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-body">Loading…</div>
  }
  if (error) {
    return <div className="p-6 text-sm text-red-600">{error}</div>
  }
  if (!form) {
    return <div className="p-6 text-sm text-body">Form not found.</div>
  }

  const member = form.member || form.Member
  const orgUnitName = form.orgUnitName || member?.orgUnit?.name || member?.orgUnitName || '—'
  const uploadedBy = form.createdByEmail || form.uploadedBy || form.createdBy?.email || '—'

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-black">
          Form {form.formNumber || `#${form.id}`}
        </h1>
        <button
          type="button"
          onClick={() => navigate('/forms')}
          className="rounded border border-stroke px-3 py-1 text-sm text-body hover:bg-gray-50"
        >
          Back to list
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded border border-stroke bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase text-body">Metadata</h2>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-body">Form Number</dt>
                <dd className="text-sm">{form.formNumber || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-body">Form Date</dt>
                <dd className="text-sm">{form.formDate ? String(form.formDate).slice(0, 10) : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-body">Municipal Board</dt>
                <dd className="text-sm">{form.municipalBoard || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-body">Scan Date</dt>
                <dd className="text-sm">{form.scanDate ? String(form.scanDate).slice(0, 10) : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-body">Org Unit</dt>
                <dd className="text-sm">{orgUnitName}</dd>
              </div>
              <div>
                <dt className="text-xs text-body">Uploaded By</dt>
                <dd className="text-sm">{uploadedBy}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="mb-1 text-xs text-body">Status</dt>
                <dd className="flex items-center gap-2">
                  <StatusBadge status={form.status} />
                  {isAdmin && form.status !== 'Verified' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setStatus('Verified')}
                      className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60"
                    >
                      Verify
                    </button>
                  )}
                  {isAdmin && form.status !== 'Rejected' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setStatus('Rejected')}
                      className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded border border-stroke bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase text-body">Images ({images.length})</h2>
              {isAdmin && (
                <label className="cursor-pointer rounded border border-stroke px-3 py-1 text-xs font-medium text-body hover:bg-gray-50">
                  + Add images
                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={onAddImages}
                  />
                </label>
              )}
            </div>
            {images.length === 0 ? (
              <p className="text-sm text-body">No images.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {images.map((img, idx) => {
                  const src = imageUrl(img)
                  const isImage = !img.fileName || !/\.pdf$/i.test(img.fileName)
                  return (
                    <li key={img.id} className="relative rounded border border-stroke bg-white p-2">
                      <button
                        type="button"
                        onClick={() => setViewerIndex(idx)}
                        className="block aspect-square w-full overflow-hidden rounded bg-gray-100"
                      >
                        {isImage ? (
                          <img src={src} alt={img.fileName || `image-${idx}`} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-body">PDF</div>
                        )}
                      </button>
                      <div className="mt-1 truncate text-xs" title={img.fileName}>
                        {idx + 1}. {img.fileName || `Image ${idx + 1}`}
                      </div>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => onDeleteImage(img.id)}
                          disabled={busy}
                          className="absolute right-1 top-1 rounded bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          ×
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded border border-stroke bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase text-body">Member</h2>
            {member ? (
              <Link
                to={`/members/${member.id}`}
                className="block rounded border border-stroke p-3 hover:bg-gray-50"
              >
                <div className="text-sm font-semibold text-primary">
                  {member.firstName} {member.lastName}
                </div>
                <div className="mt-1 text-xs text-body">JMBG: {member.jmbg}</div>
                {member.orgUnit?.name && (
                  <div className="text-xs text-body">Org Unit: {member.orgUnit.name}</div>
                )}
              </Link>
            ) : (
              <p className="text-sm text-body">No linked member.</p>
            )}
          </section>
        </aside>
      </div>

      {viewerIndex != null && images[viewerIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={closeViewer}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              closeViewer()
            }}
            className="absolute right-4 top-4 rounded bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20"
          >
            Close ✕
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  prevImage()
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-4 py-3 text-2xl text-white hover:bg-white/20"
                aria-label="Previous"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  nextImage()
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-4 py-3 text-2xl text-white hover:bg-white/20"
                aria-label="Next"
              >
                ›
              </button>
            </>
          )}
          <div className="max-h-full max-w-full" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const img = images[viewerIndex]
              const src = imageUrl(img)
              const isPdf = img.fileName && /\.pdf$/i.test(img.fileName)
              if (isPdf) {
                return (
                  <iframe
                    src={src}
                    title={img.fileName || 'PDF'}
                    className="h-[85vh] w-[85vw] rounded bg-white"
                  />
                )
              }
              return (
                <img
                  src={src}
                  alt={img.fileName || `image-${viewerIndex}`}
                  className="max-h-[90vh] max-w-[90vw] object-contain"
                />
              )
            })()}
            <div className="mt-2 text-center text-xs text-white/70">
              {viewerIndex + 1} / {images.length} — {images[viewerIndex].fileName}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

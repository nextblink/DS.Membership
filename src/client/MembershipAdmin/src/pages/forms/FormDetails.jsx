// Form details page — metadata, image gallery with fullscreen viewer,
// status actions (Verify/Reject) for admin roles, linked member card,
// add/delete image actions for admin roles.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'
import auth from '../../framework/auth'
import { formatDate } from '../../services/dateUtils'
import { useToast, ToastContainer } from '../../components/Toast'
import { useConfirm } from '../../components/ConfirmModal'

const ADMIN_ROLES = new Set(['SuperAdmin', 'Admin', 'LocalAdmin'])

// The API may return FormStatus as integer (0,1,2) or string ("Pending","Verified","Rejected")
// depending on the .NET JSON serializer configuration. Normalise to string here.
const STATUS_NAMES = { 0: 'Pending', 1: 'Verified', 2: 'Rejected' }
const STATUS_INTS = { Pending: 0, Verified: 1, Rejected: 2 }
function normaliseStatus(status) {
  if (typeof status === 'number') return STATUS_NAMES[status] ?? String(status)
  return status
}
// The PATCH /api/forms/:id/status endpoint requires integer enum value
function statusToInt(status) {
  if (typeof status === 'number') return status
  return STATUS_INTS[status] ?? 0
}

const STATUS_CLASS = {
  Pending: 'bg-warning-50 dark:bg-warning-500/10 text-warning-700 dark:text-warning-400 border-warning-200 dark:border-warning-700',
  Verified: 'bg-success-50 dark:bg-success-500/10 text-success-700 dark:text-success-400 border-success-200 dark:border-success-700',
  Rejected: 'bg-error-50 dark:bg-error-500/10 text-error-700 dark:text-error-400 border-error-200 dark:border-error-700',
}

function StatusBadge({ status }) {
  const { t } = useTranslation('enums')
  const s = normaliseStatus(status)
  const cls = STATUS_CLASS[s] || 'bg-gray-100 text-gray-800 border-gray-300'
  return (
    <span data-testid="status-badge" className={`inline-block rounded-full border px-3 py-1 text-theme-sm font-medium ${cls}`}>{t(`formStatus.${s.toLowerCase()}`, { defaultValue: s })}</span>
  )
}

function imageUrl(img) {
  if (!img) return ''
  let path = img.url || img.filePath || img.path
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  // FilePath is stored as "wwwroot/uploads/..." — strip the wwwroot prefix so
  // the path becomes "/uploads/..." which the static-files middleware serves.
  path = path.replace(/^wwwroot\//, '/')
  if (!path.startsWith('/')) path = `/${path}`
  const base = (api.defaults.baseURL || '').replace(/\/$/, '')
  return `${base}${path}`
}

export default function FormDetails() {
  const { t } = useTranslation(['forms', 'enums', 'common'])
  const { id } = useParams()
  const navigate = useNavigate()
  const role = auth.getRole()
  const isAdmin = ADMIN_ROLES.has(role)
  const toast = useToast()
  const { confirm, ConfirmDialog } = useConfirm()

  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const [viewerIndex, setViewerIndex] = useState(null) // null = closed

  // Member linking
  const [linkingMember, setLinkingMember] = useState(false)
  const [memberQuery, setMemberQuery] = useState('')
  const [memberSuggestions, setMemberSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [linkBusy, setLinkBusy] = useState(false)
  const memberSearchTimer = useRef(null)

  useEffect(() => {
    if (!linkingMember || !memberQuery || selectedMember) {
      setMemberSuggestions([])
      return
    }
    if (memberSearchTimer.current) clearTimeout(memberSearchTimer.current)
    memberSearchTimer.current = setTimeout(async () => {
      try {
        const res = await api.get('/api/members', { params: { firstName: memberQuery, pageSize: 10, page: 1 } })
        setMemberSuggestions(res.data?.items || [])
        setShowSuggestions(true)
      } catch {
        setMemberSuggestions([])
      }
    }, 300)
    return () => clearTimeout(memberSearchTimer.current)
  }, [memberQuery, selectedMember, linkingMember])

  const startLinking = () => {
    setSelectedMember(null)
    setMemberQuery('')
    setMemberSuggestions([])
    setLinkingMember(true)
  }

  const cancelLinking = () => {
    setLinkingMember(false)
    setSelectedMember(null)
    setMemberQuery('')
  }

  const pickMember = (m) => {
    setSelectedMember(m)
    setMemberQuery(`${m.firstName} ${m.lastName}`)
    setShowSuggestions(false)
  }

  const saveLink = async (memberId) => {
    setLinkBusy(true)
    try {
      const current = form
      await api.put(`/api/forms/${id}`, {
        formNumber: current.formNumber ?? null,
        formDate: current.formDate ?? null,
        municipalBoard: current.municipalBoard ?? null,
        memberId: memberId ?? null,
      })
      setLinkingMember(false)
      setSelectedMember(null)
      setMemberQuery('')
      toast.success(t('forms:toast.memberLinked'))
      await load()
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || t('forms:detail.linkFailed')
      toast.error(msg)
    } finally {
      setLinkBusy(false)
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/forms/${id}`)
      setForm(res.data)
    } catch (err) {
      setError(err?.response?.data?.message || err.message || t('forms:detail.loadFailed'))
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
      await api.patch(`/api/forms/${id}/status`, { status: statusToInt(status) })
      toast.success(status === 'Verified' ? t('forms:toast.statusVerified') : t('forms:toast.statusRejected'))
      await load()
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || t('forms:detail.statusUpdateFailed')
      toast.error(msg)
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
      toast.success(t('forms:toast.imageAdded'))
      await load()
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || t('forms:detail.imageUploadFailed')
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  const onDeleteImage = async (imageId) => {
    if (!isAdmin) return
    const ok = await confirm({ title: t('forms:detail.deleteImageTitle', 'Delete Image'), message: t('forms:detail.deleteImageConfirm') })
    if (!ok) return
    setBusy(true)
    try {
      await api.delete(`/api/forms/${id}/images/${imageId}`)
      toast.success(t('forms:toast.imageRemoved'))
      await load()
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || t('forms:detail.imageDeleteFailed')
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-theme-sm text-gray-500 dark:text-gray-400">{t('common:state.loading')}</div>
  }
  if (error) {
    return <div className="p-6 text-theme-sm text-error-500">{error}</div>
  }
  if (!form) {
    return <div className="p-6 text-theme-sm text-gray-500 dark:text-gray-400">{t('forms:detail.notFound')}</div>
  }

  const member = form.member || form.Member
  const orgUnitName = form.orgUnitName || member?.orgUnit?.name || member?.orgUnitName || '—'
  const uploadedBy = form.createdByEmail || form.uploadedBy || form.createdBy?.email || '—'

  return (
    <div className="p-6">
      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />
      <ConfirmDialog />
      <div className="mb-4 flex items-center justify-between">
        <h1 data-testid="form-title" className="text-2xl font-semibold text-brand-500 dark:text-brand-400">
          {t('forms:detail.formLabel')} {form.formNumber || `#${form.id}`}
        </h1>
        <div className="flex gap-2">
          {isAdmin && (
            <button
              data-testid="btn-delete-form"
              type="button"
              disabled={busy}
              onClick={async () => {
                const ok = await confirm({ title: t('forms:detail.deleteFormTitle', 'Delete Form'), message: t('forms:detail.deleteFormConfirm') })
                if (!ok) return
                setBusy(true)
                try {
                  await api.delete(`/api/forms/${id}`)
                  toast.success(t('forms:toast.deleted'))
                  navigate('/forms')
                } catch (err) {
                  const msg = err?.response?.data?.message || err.message || t('forms:detail.deleteFailed')
                  toast.error(msg)
                } finally {
                  setBusy(false)
                }
              }}
              className="rounded-lg bg-error-500 hover:bg-error-600 px-3 py-1.5 text-theme-sm font-medium text-white disabled:opacity-60"
            >
              {t('forms:detail.deleteForm')}
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/forms')}
            className="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-1.5 text-theme-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {t('forms:detail.backToList')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm p-4">
            <h2 className="mb-3 text-theme-sm font-semibold uppercase text-gray-500 dark:text-gray-400">{t('forms:detail.metadata')}</h2>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-theme-xs text-gray-500 dark:text-gray-400">{t('forms:detail.formNumber')}</dt>
                <dd className="text-theme-sm text-gray-900 dark:text-white">{form.formNumber || '—'}</dd>
              </div>
              <div>
                <dt className="text-theme-xs text-gray-500 dark:text-gray-400">{t('forms:detail.formDate')}</dt>
                <dd className="text-theme-sm text-gray-900 dark:text-white">{formatDate(form.formDate)}</dd>
              </div>
              <div>
                <dt className="text-theme-xs text-gray-500 dark:text-gray-400">{t('forms:detail.municipalBoard')}</dt>
                <dd className="text-theme-sm text-gray-900 dark:text-white">{form.municipalBoard || '—'}</dd>
              </div>
              <div>
                <dt className="text-theme-xs text-gray-500 dark:text-gray-400">{t('forms:detail.orgUnit')}</dt>
                <dd className="text-theme-sm text-gray-900 dark:text-white">{orgUnitName}</dd>
              </div>
              <div>
                <dt className="text-theme-xs text-gray-500 dark:text-gray-400">{t('forms:detail.uploadedBy')}</dt>
                <dd className="text-theme-sm text-gray-900 dark:text-white">{uploadedBy}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="mb-1 text-theme-xs text-gray-500 dark:text-gray-400">{t('forms:detail.status')}</dt>
                <dd className="flex items-center gap-2">
                  <StatusBadge status={form.status} />
                  {isAdmin && normaliseStatus(form.status) !== 'Verified' && (
                    <button
                      data-testid="btn-verify"
                      type="button"
                      disabled={busy}
                      onClick={() => setStatus('Verified')}
                      className="rounded-lg bg-success-500 hover:bg-success-600 px-3 py-1.5 text-theme-xs font-medium text-white disabled:opacity-60"
                    >
                      {t('forms:detail.verify')}
                    </button>
                  )}
                  {isAdmin && normaliseStatus(form.status) !== 'Rejected' && (
                    <button
                      data-testid="btn-reject"
                      type="button"
                      disabled={busy}
                      onClick={() => setStatus('Rejected')}
                      className="rounded-lg bg-error-500 hover:bg-error-600 px-3 py-1.5 text-theme-xs font-medium text-white disabled:opacity-60"
                    >
                      {t('forms:detail.reject')}
                    </button>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 data-testid="images-count-heading" className="text-theme-sm font-semibold uppercase text-gray-500 dark:text-gray-400">{t('forms:detail.images')} ({images.length})</h2>
              {isAdmin && (
                <label className="cursor-pointer rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-1.5 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                  {t('forms:detail.addImages')}
                  <input
                    data-testid="add-images-input"
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
              <p className="text-theme-sm text-gray-500 dark:text-gray-400">{t('forms:detail.noImages')}</p>
            ) : (
              <ul data-testid="gallery-list" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {images.map((img, idx) => {
                  const src = imageUrl(img)
                  const isImage = !img.fileName || !/\.pdf$/i.test(img.fileName)
                  return (
                    <li key={img.id} data-testid="gallery-item" className="relative rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2">
                      <button
                        type="button"
                        onClick={() => setViewerIndex(idx)}
                        className="block aspect-square w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
                      >
                        {isImage ? (
                          <img src={src} alt={img.fileName || `image-${idx}`} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-theme-xs text-gray-500 dark:text-gray-400">PDF</div>
                        )}
                      </button>
                      <div className="mt-1 truncate text-theme-xs text-gray-700 dark:text-gray-300" title={img.fileName}>
                        {idx + 1}. {img.fileName || `Image ${idx + 1}`}
                      </div>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => onDeleteImage(img.id)}
                          disabled={busy}
                          className="absolute right-1 top-1 rounded-lg bg-error-500 hover:bg-error-600 px-2 py-0.5 text-theme-xs font-medium text-white disabled:opacity-60"
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
          <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-theme-sm font-semibold uppercase text-gray-500 dark:text-gray-400">{t('forms:detail.member')}</h2>
              {isAdmin && !linkingMember && (
                <button
                  type="button"
                  onClick={startLinking}
                  className="text-theme-xs text-brand-500 hover:underline"
                >
                  {member ? t('forms:detail.memberChange') : t('forms:detail.memberLink')}
                </button>
              )}
            </div>

            {linkingMember ? (
              <div className="relative">
                {selectedMember ? (
                  <div className="mb-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-theme-sm">
                    <span className="font-medium">{selectedMember.firstName} {selectedMember.lastName}</span>
                    {' '}<span className="text-gray-500 dark:text-gray-400">— JMBG {selectedMember.jmbg}</span>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={memberQuery}
                      onChange={(e) => { setMemberQuery(e.target.value); setShowSuggestions(true) }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      placeholder={t('forms:upload.memberSearch')}
                      autoFocus
                      className="mb-2 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-theme-sm text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
                    />
                    {showSuggestions && memberSuggestions.length > 0 && (
                      <ul className="absolute z-10 mt-0 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm">
                        {memberSuggestions.map((m) => (
                          <li
                            key={m.id}
                            onMouseDown={(e) => { e.preventDefault(); pickMember(m) }}
                            className="cursor-pointer px-3 py-2 text-theme-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <span className="font-medium">{m.firstName} {m.lastName}</span>
                            {' '}<span className="text-theme-xs text-gray-500 dark:text-gray-400">— JMBG {m.jmbg}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!selectedMember || linkBusy}
                    onClick={() => saveLink(selectedMember.id)}
                    className="rounded-lg bg-brand-500 hover:bg-brand-600 px-3 py-1.5 text-theme-xs font-medium text-white disabled:opacity-50"
                  >
                    {linkBusy ? t('common:button.save') + '…' : t('common:button.save')}
                  </button>
                  {selectedMember && (
                    <button type="button" onClick={() => { setSelectedMember(null); setMemberQuery('') }} className="text-theme-xs text-gray-500 hover:underline">
                      {t('forms:upload.memberChange')}
                    </button>
                  )}
                  <button type="button" onClick={cancelLinking} className="text-theme-xs text-gray-500 hover:underline">
                    {t('common:button.cancel')}
                  </button>
                </div>
              </div>
            ) : member ? (
              <>
                <Link
                  data-testid="member-card"
                  to={`/members/${member.id}`}
                  className="block rounded-lg border border-gray-200 dark:border-gray-800 p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="text-theme-sm font-semibold text-brand-500">
                    {member.firstName} {member.lastName}
                  </div>
                  <div className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">JMBG: {member.jmbg}</div>
                  {member.orgUnitName && (
                    <div className="text-theme-xs text-gray-500 dark:text-gray-400">{t('forms:detail.orgUnitLabel')}: {member.orgUnitName}</div>
                  )}
                </Link>
                {isAdmin && (
                  <button
                    type="button"
                    disabled={linkBusy}
                    onClick={() => saveLink(null)}
                    className="mt-2 text-theme-xs text-error-500 hover:underline disabled:opacity-50"
                  >
                    {t('forms:detail.memberUnlink')}
                  </button>
                )}
              </>
            ) : (
              <p className="text-theme-sm text-gray-500 dark:text-gray-400">{t('forms:detail.noMember')}</p>
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
            className="absolute right-4 top-4 rounded-lg bg-white/10 px-3 py-1.5 text-theme-sm text-white hover:bg-white/20"
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
                    className="h-[85vh] w-[85vw] rounded-lg bg-white"
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
            <div className="mt-2 text-center text-theme-xs text-white/70">
              {viewerIndex + 1} / {images.length} — {images[viewerIndex].fileName}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

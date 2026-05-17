// Form upload page — metadata inputs, member typeahead, multi-image upload
// with drag-and-drop reordering. POST as multipart/form-data to /api/forms.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'
import { useToast, ToastContainer } from '../../components/Toast'

const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

function flattenOrgUnits(data) {
  const out = []
  const list = Array.isArray(data) ? data : data?.items ?? []
  function walk(nodes, depth) {
    for (const n of nodes) {
      out.push({ id: n.id, name: n.name, label: `${'— '.repeat(depth)}${n.name}` })
      if (n.children?.length) walk(n.children, depth + 1)
    }
  }
  walk(list, 0)
  return out
}

export default function FormUpload() {
  const { t } = useTranslation(['forms', 'common'])
  const navigate = useNavigate()
  const toast = useToast()

  const [meta, setMeta] = useState({
    formNumber: '',
    formDate: '',
    municipalBoard: '',
  })

  const [orgUnits, setOrgUnits] = useState([])

  useEffect(() => {
    api.get('/api/orgunits').then(r => setOrgUnits(flattenOrgUnits(r.data))).catch(() => {})
  }, [])

  // Member typeahead
  const [memberQuery, setMemberQuery] = useState('')
  const [memberSuggestions, setMemberSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const memberSearchTimer = useRef(null)

  // Files (each: { id, file, previewUrl, name, size })
  const [files, setFiles] = useState([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)
  const dragIndex = useRef(null)

  // Cleanup object URLs.
  useEffect(() => {
    return () => {
      files.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced member search
  useEffect(() => {
    if (memberSearchTimer.current) clearTimeout(memberSearchTimer.current)
    if (!memberQuery || selectedMember) {
      setMemberSuggestions([])
      return
    }
    memberSearchTimer.current = setTimeout(async () => {
      try {
        const res = await api.get('/api/members', {
          params: { firstName: memberQuery, pageSize: 10, page: 1 },
        })
        const data = res.data || {}
        setMemberSuggestions(data.items || [])
        setShowSuggestions(true)
      } catch {
        setMemberSuggestions([])
      }
    }, 300)
    return () => {
      if (memberSearchTimer.current) clearTimeout(memberSearchTimer.current)
    }
  }, [memberQuery, selectedMember])

  const onMemberPick = (m) => {
    setSelectedMember(m)
    setMemberQuery(`${m.firstName} ${m.lastName}`)
    setShowSuggestions(false)
  }

  const clearMember = () => {
    setSelectedMember(null)
    setMemberQuery('')
    setMemberSuggestions([])
  }

  const addFiles = (incoming) => {
    const list = Array.from(incoming || [])
    const accepted = []
    const errors = []
    for (const f of list) {
      if (!ACCEPTED.includes(f.type)) {
        errors.push(t('forms:upload.unsupportedType', { name: f.name }))
        continue
      }
      if (f.size > MAX_SIZE) {
        errors.push(t('forms:upload.exceedsMaxSize', { name: f.name }))
        continue
      }
      accepted.push({
        id: `${f.name}-${f.size}-${f.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file: f,
        previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
        name: f.name,
        size: f.size,
        type: f.type,
      })
    }
    if (errors.length) setError(errors.join('; '))
    else setError(null)
    setFiles((prev) => [...prev, ...accepted])
  }

  const removeFile = (id) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id)
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((f) => f.id !== id)
    })
  }

  // Drag-and-drop reorder using HTML5 native DnD
  const handleDragStart = (idx) => {
    dragIndex.current = idx
  }
  const handleDragOver = (e) => {
    e.preventDefault()
  }
  const handleDrop = (idx) => {
    const from = dragIndex.current
    dragIndex.current = null
    if (from == null || from === idx) return
    setFiles((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(idx, 0, moved)
      return next
    })
  }

  // Drop zone for new files
  const onZoneDragEnter = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }
  const onZoneDragLeave = (e) => {
    e.preventDefault()
    setIsDragOver(false)
  }
  const onZoneDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    if (files.length === 0) {
      setError(t('forms:upload.validation.imagesRequired'))
      return
    }

    const fd = new FormData()
    if (meta.formNumber) fd.append('formNumber', meta.formNumber)
    if (meta.formDate) fd.append('formDate', meta.formDate)
    if (meta.municipalBoard) fd.append('municipalBoard', meta.municipalBoard)
    if (selectedMember?.id) fd.append('memberId', String(selectedMember.id))
    files.forEach((f) => fd.append('files', f.file, f.name))

    setSubmitting(true)
    try {
      const res = await api.post('/api/forms', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const form = res.data || {}
      const newId = form.id ?? form.Id
      toast.success(t('forms:toast.created'))
      if (newId) navigate(`/forms/${newId}`)
      else navigate('/forms')
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.title || err.message || t('forms:upload.uploadFailed')
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />
      <h1 className="mb-4 text-2xl font-semibold text-brand-500 dark:text-brand-400">{t('forms:upload.title')}</h1>

      <form onSubmit={submit} className="space-y-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm p-4">
          <h2 className="mb-3 text-theme-sm font-semibold uppercase text-gray-500 dark:text-gray-400">{t('forms:upload.metadata')}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-theme-xs font-medium text-gray-600 dark:text-gray-400">{t('forms:upload.formNumber')}</label>
              <input
                data-testid="upload-formNumber"
                type="text"
                value={meta.formNumber}
                onChange={(e) => setMeta({ ...meta, formNumber: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-theme-sm text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-theme-xs font-medium text-gray-600 dark:text-gray-400">{t('forms:upload.formDate')}</label>
              <input
                type="date"
                value={meta.formDate}
                onChange={(e) => setMeta({ ...meta, formDate: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-theme-sm text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-theme-xs font-medium text-gray-600 dark:text-gray-400">{t('forms:upload.municipalBoard')}</label>
              <select
                value={meta.municipalBoard}
                onChange={(e) => setMeta({ ...meta, municipalBoard: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-theme-sm text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
              >
                <option value=""></option>
                {orgUnits.map(u => (
                  <option key={u.id} value={u.name}>{u.label}</option>
                ))}
              </select>
            </div>
            <div className="relative sm:col-span-2">
              <label className="mb-1 block text-theme-xs font-medium text-gray-600 dark:text-gray-400">{t('forms:upload.member')}</label>
              {selectedMember ? (
                <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-3 py-2.5 text-theme-sm">
                  <span>
                    <strong>
                      {selectedMember.firstName} {selectedMember.lastName}
                    </strong>{' '}
                    <span className="text-gray-500 dark:text-gray-400">— JMBG {selectedMember.jmbg}</span>
                  </span>
                  <button type="button" onClick={clearMember} className="text-theme-xs text-brand-500 hover:underline">
                    {t('forms:upload.memberChange')}
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={memberQuery}
                    onChange={(e) => {
                      setMemberQuery(e.target.value)
                      setShowSuggestions(true)
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder={t('forms:upload.memberSearch')}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-theme-sm text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
                  />
                  {showSuggestions && memberSuggestions.length > 0 && (
                    <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm">
                      {memberSuggestions.map((m) => (
                        <li
                          key={m.id}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            onMemberPick(m)
                          }}
                          className="cursor-pointer px-3 py-2 text-theme-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <span className="font-medium">
                            {m.firstName} {m.lastName}
                          </span>{' '}
                          <span className="text-theme-xs text-gray-500 dark:text-gray-400">— JMBG {m.jmbg}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm p-4">
          <h2 className="mb-3 text-theme-sm font-semibold uppercase text-gray-500 dark:text-gray-400">{t('forms:upload.images')}</h2>

          <div
            data-testid="upload-dropzone"
            onDragEnter={onZoneDragEnter}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragOver(true)
            }}
            onDragLeave={onZoneDragLeave}
            onDrop={onZoneDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center ${
              isDragOver ? 'border-brand-500 bg-brand-500/5' : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
            }`}
          >
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">{t('forms:upload.dropzone')}</p>
            <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">{t('forms:upload.dropzoneHint')}</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {files.length > 0 && (
            <>
              <p className="mt-3 text-theme-xs text-gray-500 dark:text-gray-400">
                {t('forms:upload.filesSelected', { count: files.length })}
              </p>
              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {files.map((f, idx) => (
                  <li
                    key={f.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(idx)}
                    className="relative cursor-move rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2"
                  >
                    <div className="aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                      {f.previewUrl ? (
                        <img src={f.previewUrl} alt={f.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-theme-xs text-gray-500 dark:text-gray-400">
                          PDF
                        </div>
                      )}
                    </div>
                    <div className="mt-1 truncate text-theme-xs text-gray-700 dark:text-gray-300" title={f.name}>
                      {idx + 1}. {f.name}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(f.id)}
                      className="absolute right-1 top-1 rounded-lg bg-error-500 hover:bg-error-600 px-2 py-0.5 text-theme-xs font-medium text-white"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {error && <div className="rounded-lg border border-error-200 dark:border-error-700 bg-error-50 dark:bg-error-500/10 p-3 text-theme-sm text-error-700 dark:text-error-400">{error}</div>}

        <div className="flex gap-2">
          <button
            data-testid="upload-submit-btn"
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand-500 hover:bg-brand-600 px-5 py-2.5 text-theme-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? t('forms:upload.uploading') : t('forms:upload.submit')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/forms')}
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-5 py-2.5 text-theme-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {t('common:button.cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}

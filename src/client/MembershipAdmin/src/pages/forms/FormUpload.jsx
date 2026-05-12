// Form upload page — metadata inputs, member typeahead, multi-image upload
// with drag-and-drop reordering. POST as multipart/form-data to /api/forms.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'

const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function FormUpload() {
  const { t } = useTranslation(['forms', 'common'])
  const navigate = useNavigate()

  const [meta, setMeta] = useState({
    formNumber: '',
    formDate: '',
    municipalBoard: '',
    scanDate: todayIso(),
  })

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
    if (!meta.scanDate) {
      setError(t('forms:upload.validation.scanDateRequired'))
      return
    }
    if (files.length === 0) {
      setError(t('forms:upload.validation.imagesRequired'))
      return
    }

    const fd = new FormData()
    if (meta.formNumber) fd.append('formNumber', meta.formNumber)
    if (meta.formDate) fd.append('formDate', meta.formDate)
    if (meta.municipalBoard) fd.append('municipalBoard', meta.municipalBoard)
    fd.append('scanDate', meta.scanDate)
    if (selectedMember?.id) fd.append('memberId', String(selectedMember.id))
    files.forEach((f) => fd.append('files', f.file, f.name))

    setSubmitting(true)
    try {
      const res = await api.post('/api/forms', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const form = res.data || {}
      const newId = form.id ?? form.Id
      if (newId) navigate(`/forms/${newId}`)
      else navigate('/forms')
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.title || err.message || t('forms:upload.uploadFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-semibold text-black">{t('forms:upload.title')}</h1>

      <form onSubmit={submit} className="space-y-6">
        <div className="rounded border border-stroke bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase text-body">{t('forms:upload.metadata')}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-body">{t('forms:upload.formNumber')}</label>
              <input
                data-testid="upload-formNumber"
                type="text"
                value={meta.formNumber}
                onChange={(e) => setMeta({ ...meta, formNumber: e.target.value })}
                className="w-full rounded border border-stroke px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-body">{t('forms:upload.formDate')}</label>
              <input
                type="date"
                value={meta.formDate}
                onChange={(e) => setMeta({ ...meta, formDate: e.target.value })}
                className="w-full rounded border border-stroke px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-body">{t('forms:upload.municipalBoard')}</label>
              <input
                type="text"
                value={meta.municipalBoard}
                onChange={(e) => setMeta({ ...meta, municipalBoard: e.target.value })}
                className="w-full rounded border border-stroke px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-body">
                {t('forms:upload.scanDateRequired')}
              </label>
              <input
                data-testid="upload-scanDate"
                type="date"
                required
                value={meta.scanDate}
                onChange={(e) => setMeta({ ...meta, scanDate: e.target.value })}
                className="w-full rounded border border-stroke px-3 py-2 text-sm"
              />
            </div>
            <div className="relative sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-body">{t('forms:upload.member')}</label>
              {selectedMember ? (
                <div className="flex items-center justify-between rounded border border-stroke bg-gray-50 px-3 py-2 text-sm">
                  <span>
                    <strong>
                      {selectedMember.firstName} {selectedMember.lastName}
                    </strong>{' '}
                    <span className="text-body">— JMBG {selectedMember.jmbg}</span>
                  </span>
                  <button type="button" onClick={clearMember} className="text-xs text-primary hover:underline">
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
                    className="w-full rounded border border-stroke px-3 py-2 text-sm"
                  />
                  {showSuggestions && memberSuggestions.length > 0 && (
                    <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded border border-stroke bg-white shadow">
                      {memberSuggestions.map((m) => (
                        <li
                          key={m.id}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            onMemberPick(m)
                          }}
                          className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-100"
                        >
                          <span className="font-medium">
                            {m.firstName} {m.lastName}
                          </span>{' '}
                          <span className="text-xs text-body">— JMBG {m.jmbg}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="rounded border border-stroke bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase text-body">{t('forms:upload.images')}</h2>

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
            className={`flex cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed p-8 text-center ${
              isDragOver ? 'border-primary bg-primary/5' : 'border-stroke bg-gray-50'
            }`}
          >
            <p className="text-sm text-body">{t('forms:upload.dropzone')}</p>
            <p className="mt-1 text-xs text-body">{t('forms:upload.dropzoneHint')}</p>
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
              <p className="mt-3 text-xs text-body">
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
                    className="relative cursor-move rounded border border-stroke bg-white p-2"
                  >
                    <div className="aspect-square overflow-hidden rounded bg-gray-100">
                      {f.previewUrl ? (
                        <img src={f.previewUrl} alt={f.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-body">
                          PDF
                        </div>
                      )}
                    </div>
                    <div className="mt-1 truncate text-xs" title={f.name}>
                      {idx + 1}. {f.name}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(f.id)}
                      className="absolute right-1 top-1 rounded bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-700"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {error && <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="flex gap-2">
          <button
            data-testid="upload-submit-btn"
            type="submit"
            disabled={submitting}
            className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-60"
          >
            {submitting ? t('forms:upload.uploading') : t('forms:upload.submit')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/forms')}
            className="rounded border border-stroke px-5 py-2 text-sm font-medium text-body hover:bg-gray-50"
          >
            {t('common:button.cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}

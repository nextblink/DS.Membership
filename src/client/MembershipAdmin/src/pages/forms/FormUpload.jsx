// src/client/MembershipAdmin/src/pages/forms/FormUpload.jsx
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'
import { useToast, ToastContainer } from '../../components/Toast'

const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024

export default function FormUpload() {
  const { t } = useTranslation(['forms', 'common'])
  const navigate = useNavigate()
  const toast = useToast()

  const [files, setFiles] = useState([])
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const dragIndex = useRef(null)

  function addFiles(fileList) {
    const next = []
    for (const f of fileList) {
      if (!ACCEPTED.includes(f.type)) {
        toast.error(`${f.name}: ${t('forms:upload.validation.typeNotAllowed')}`)
        continue
      }
      if (f.size > MAX_SIZE) {
        toast.error(`${f.name}: ${t('forms:upload.validation.tooLarge')}`)
        continue
      }
      next.push({
        id: `${f.name}-${f.size}-${Date.now()}`,
        file: f,
        previewUrl: ACCEPTED.slice(0, 3).includes(f.type) ? URL.createObjectURL(f) : null,
        name: f.name,
      })
    }
    setFiles((prev) => [...prev, ...next])
  }

  const handleFiles = (e) => { if (e.target.files?.length) addFiles(e.target.files) }
  const removeFile = (id) => setFiles((prev) => prev.filter((f) => f.id !== id))

  const handleDragStart = (idx) => { dragIndex.current = idx }
  const handleDragOver = (e) => { e.preventDefault() }
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

  const onZoneDragEnter = (e) => { e.preventDefault(); setIsDragOver(true) }
  const onZoneDragLeave = (e) => { e.preventDefault(); setIsDragOver(false) }
  const onZoneDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files)
  }

  const handleExtract = async () => {
    if (files.length === 0) return
    setError(null)
    setExtracting(true)
    try {
      const fd = new FormData()
      fd.append('file', files[0].file, files[0].name)
      const res = await api.post('/api/forms/extract', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      navigate('/members/new', {
        state: { extracted: res.data, files: files.map((f) => f.file) },
      })
    } catch (err) {
      const msg = err?.response?.data?.message || t('forms:extract.error')
      setError(msg)
      toast.error(msg)
    } finally {
      setExtracting(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />
      <h1 className="text-2xl font-semibold text-brand-500 dark:text-brand-400 mb-6">
        {t('forms:upload.title')}
      </h1>

      {error && (
        <div className="mb-4 rounded-lg border border-error-300 dark:border-error-700 bg-error-50 dark:bg-error-500/10 px-4 py-3 text-theme-sm text-error-600">
          {error}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragEnter={onZoneDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={onZoneDragLeave}
        onDrop={onZoneDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          isDragOver
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
            : 'border-gray-300 dark:border-gray-700 hover:border-brand-400'
        }`}
      >
        <svg className="mx-auto mb-3 h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">{t('forms:upload.dropzone')}</p>
        <p className="mt-1 text-theme-xs text-gray-400">{t('forms:upload.dropzoneHint')}</p>
        <input ref={fileInputRef} type="file" multiple accept={ACCEPTED.join(',')}
          className="hidden" onChange={handleFiles} />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-theme-xs text-gray-500 dark:text-gray-400">
            {t('forms:upload.filesSelected', { count: files.length })}
          </p>
          <div className="flex flex-wrap gap-3">
            {files.map((f, idx) => (
              <div
                key={f.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(idx)}
                className="relative rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-2 w-24"
              >
                {f.previewUrl ? (
                  <img src={f.previewUrl} alt={f.name} className="h-16 w-full object-cover rounded" />
                ) : (
                  <div className="flex h-16 items-center justify-center rounded bg-gray-100 dark:bg-gray-700 text-theme-xs font-bold text-gray-500">PDF</div>
                )}
                <p className="mt-1 truncate text-[10px] text-gray-500">{f.name}</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeFile(f.id) }}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error-500 text-white text-xs leading-none hover:bg-error-600"
                >×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={handleExtract}
          disabled={files.length === 0 || extracting}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 hover:bg-brand-600 px-5 py-2.5 text-theme-sm font-medium text-white disabled:opacity-50"
        >
          {extracting ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              {t('forms:extract.loading')}
            </>
          ) : t('forms:extract.button')}
        </button>
        <button
          type="button"
          onClick={() => navigate('/members/new')}
          className="text-theme-sm text-gray-500 dark:text-gray-400 hover:text-brand-500 underline"
        >
          {t('forms:extract.manualEntry')}
        </button>
      </div>
    </div>
  )
}

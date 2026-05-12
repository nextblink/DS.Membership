import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7226'

export default function MobileUpload() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [files, setFiles] = useState([])
  const [status, setStatus] = useState('idle') // idle | uploading | success | error
  const [errorMsg, setErrorMsg] = useState(null)
  const inputRef = useRef(null)

  if (!token) {
    return (
      <Shell>
        <p className="text-sm text-danger text-center">Invalid upload link.</p>
      </Shell>
    )
  }

  const handleFiles = (e) => {
    setFiles(Array.from(e.target.files || []))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (files.length === 0) return

    setStatus('uploading')
    setErrorMsg(null)

    const fd = new FormData()
    files.forEach((f) => fd.append('files', f))

    try {
      const res = await fetch(
        `${API_BASE}/api/public/forms/upload?token=${encodeURIComponent(token)}`,
        { method: 'POST', body: fd }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.message || 'Upload failed. Please try again.')
        setStatus('error')
        return
      }
      setStatus('success')
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 py-8">
          <svg className="h-16 w-16 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-semibold text-black">Photos uploaded!</p>
          <p className="text-sm text-body text-center">
            You can close this page. Continue on your desktop.
          </p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <h1 className="text-xl font-semibold text-black mb-6 text-center">Upload Photos</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3 rounded-sm border-2 border-dashed border-stroke bg-gray-2 p-8 text-body hover:border-primary hover:text-primary"
        >
          <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm font-medium">
            {files.length > 0
              ? `${files.length} photo${files.length > 1 ? 's' : ''} selected`
              : 'Tap to choose photos'}
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={handleFiles}
        />

        {errorMsg && (
          <p className="text-sm text-danger text-center">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={files.length === 0 || status === 'uploading'}
          className="w-full rounded-md bg-primary py-3 text-sm font-semibold text-white hover:bg-opacity-90 disabled:opacity-50"
        >
          {status === 'uploading' ? 'Uploading…' : 'Upload'}
        </button>
      </form>
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-whiten px-4 py-12">
      <div className="w-full max-w-sm rounded-sm border border-stroke bg-white p-6 shadow-default">
        {children}
      </div>
    </div>
  )
}

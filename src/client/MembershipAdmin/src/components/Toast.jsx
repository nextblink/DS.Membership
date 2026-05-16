import { useState, useCallback, useEffect } from 'react'

let _id = 0

export function useToast() {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const add = useCallback((message, type = 'success') => {
    const id = ++_id
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  const success = useCallback((msg) => add(msg, 'success'), [add])
  const error   = useCallback((msg) => add(msg, 'error'),   [add])

  return { toasts, dismiss, success, error }
}

export function ToastContainer({ toasts, dismiss }) {
  if (!toasts.length) return null
  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>
  )
}

function Toast({ toast, onDismiss }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const show = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(show)
  }, [])

  const isSuccess = toast.type === 'success'

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-theme-md transition-all duration-300 bg-white dark:bg-gray-900 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      } ${
        isSuccess
          ? 'border-success-200 dark:border-success-700'
          : 'border-error-200 dark:border-error-700'
      }`}
    >
      {isSuccess ? (
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-success-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
        </svg>
      ) : (
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-error-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>
        </svg>
      )}
      <p className={`flex-1 text-theme-sm ${isSuccess ? 'text-success-700 dark:text-success-400' : 'text-error-700 dark:text-error-400'}`}>
        {toast.message}
      </p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="mt-0.5 shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        aria-label="Dismiss"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  )
}

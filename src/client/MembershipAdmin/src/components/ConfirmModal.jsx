import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

// Reusable confirm modal.
// Usage:
//   const { confirm, ConfirmDialog } = useConfirm()
//   ...
//   const ok = await confirm({ title: 'Delete', message: 'Are you sure?' })
//   if (!ok) return
//   ...
//   return <>{/* your JSX */}<ConfirmDialog /></>

export function useConfirm() {
  const [state, setState] = useState(null) // { title, message, resolve }

  const confirm = useCallback(({ title, message } = {}) =>
    new Promise((resolve) => {
      setState({ title, message, resolve })
    }), [])

  const handleConfirm = () => {
    state?.resolve(true)
    setState(null)
  }

  const handleCancel = () => {
    state?.resolve(false)
    setState(null)
  }

  const ConfirmDialog = () =>
    state ? (
      <ConfirmModal
        title={state.title}
        message={state.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    ) : null

  return { confirm, ConfirmDialog }
}

export function ConfirmModal({
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmVariant = 'danger',
  confirmDisabled = false,
  error,
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation('common')

  const confirmCls =
    confirmVariant === 'danger'
      ? 'rounded-lg bg-error-500 hover:bg-error-600 px-4 py-2 text-theme-sm font-medium text-white disabled:opacity-50'
      : 'rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2 text-theme-sm font-medium text-white disabled:opacity-50'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xl">
        {title && (
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        )}
        <div className="px-6 py-5">
          {message && <p className="mb-4 text-theme-sm text-gray-900 dark:text-white">{message}</p>}
          {error && (
            <div className="mb-4 rounded-lg border border-error-300 dark:border-error-700 bg-error-50 dark:bg-error-500/10 px-4 py-2 text-theme-sm text-error-500">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-theme-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {cancelLabel || t('button.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmDisabled}
              className={confirmCls}
            >
              {confirmLabel || t('button.delete')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

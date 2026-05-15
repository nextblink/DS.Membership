import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'

function extractError(e) {
  return (
    e?.response?.data?.message ||
    e?.response?.data?.title ||
    (typeof e?.response?.data === 'string' ? e.response.data : null) ||
    e?.message ||
    null
  )
}

function FunctionModal({ item, onClose, onSaved }) {
  const { t } = useTranslation(['functions', 'common'])
  const [name, setName] = useState(item?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const isEdit = !!item

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    setError(null)
    try {
      if (isEdit) {
        await api.put(`/api/functions/${item.id}`, { id: item.id, name: trimmed })
      } else {
        await api.post('/api/functions', { name: trimmed })
      }
      await onSaved()
      onClose()
    } catch (err) {
      setError(extractError(err) || t(isEdit ? 'error.updateFailed' : 'error.createFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xl">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <h2 className="text-base font-semibold text-brand-500 dark:text-brand-400">
            {isEdit ? t('modal.editTitle') : t('modal.addTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5">
          <label className="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
            {t('form.name')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('placeholder')}
            autoFocus
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-theme-sm text-gray-900 dark:text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
            data-testid="function-name-input"
          />
          {error && (
            <p className="mt-2 text-theme-xs text-error-500">{error}</p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-theme-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {t('common:button.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2 text-theme-sm font-medium text-white disabled:opacity-50"
              data-testid="function-save-btn"
            >
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Functions() {
  const { t } = useTranslation(['functions', 'common'])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [modal, setModal] = useState(null) // null | 'add' | { id, name }

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/functions')
      const data = res.data
      setItems(Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [])
    } catch (e) {
      setError(extractError(e) || t('state.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(item) {
    if (!window.confirm(t('confirm.delete'))) return
    setDeletingId(item.id)
    setError(null)
    try {
      await api.delete(`/api/functions/${item.id}`)
      await load()
    } catch (e) {
      setError(extractError(e) || (e?.response?.status === 409 ? t('error.deleteInUse') : t('error.deleteFailed')))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      {error && (
        <div data-testid="functions-error" className="mb-4 rounded-lg border border-error-300 dark:border-error-700 bg-error-50 dark:bg-error-500/10 px-4 py-3 text-theme-sm text-error-500">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <h2 className="text-xl font-semibold text-brand-500 dark:text-brand-400">{t('title')}</h2>
          <button
            type="button"
            onClick={() => setModal('add')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-theme-sm font-medium text-white"
            data-testid="functions-add-btn"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('add')}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-left">
                <th className="px-4 py-3 text-theme-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('table.name')}</th>
                <th className="w-40 px-4 py-3 text-right text-theme-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-theme-sm text-gray-500 dark:text-gray-400">
                    {t('common:state.loading')}
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-theme-sm text-gray-500 dark:text-gray-400">
                    {t('state.noFunctions')}
                  </td>
                </tr>
              )}

              {!loading && items.map((item) => {
                const isDeleting = deletingId === item.id
                return (
                  <tr key={item.id} data-testid={`functions-row-${item.id}`} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-theme-sm text-gray-900 dark:text-white">{item.name}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setModal(item)}
                          disabled={isDeleting}
                          className="inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-theme-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
                          data-testid={`functions-edit-btn-${item.id}`}
                        >
                          {t('edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          disabled={isDeleting}
                          className="inline-flex items-center rounded-lg border border-error-300 dark:border-error-700 px-3 py-1.5 text-theme-xs font-medium text-error-500 hover:bg-error-500 hover:text-white disabled:opacity-40"
                          data-testid={`functions-delete-btn-${item.id}`}
                        >
                          {isDeleting ? t('deleting') : t('delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <FunctionModal
          item={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}

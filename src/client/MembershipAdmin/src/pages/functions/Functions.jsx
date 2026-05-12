import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'

export default function Functions() {
  const { t } = useTranslation(['functions', 'common'])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Inline add row
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  // Inline edit state: { [id]: editedName }
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/functions')
      const data = res.data
      // Tolerant to either an array or a paged envelope
      const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []
      setItems(list)
    } catch (e) {
      setError(extractError(e) || t('state.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function extractError(e) {
    return (
      e?.response?.data?.message ||
      e?.response?.data?.title ||
      (typeof e?.response?.data === 'string' ? e.response.data : null) ||
      e?.message ||
      null
    )
  }

  async function handleAdd(e) {
    e?.preventDefault?.()
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    setError(null)
    try {
      await api.post('/api/functions', { name })
      setNewName('')
      await load()
    } catch (e) {
      setError(extractError(e) || t('error.createFailed'))
    } finally {
      setAdding(false)
    }
  }

  function startEdit(item) {
    setEditingId(item.id)
    setEditName(item.name ?? '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
  }

  async function saveEdit(id) {
    const name = editName.trim()
    if (!name) return
    setSavingId(id)
    setError(null)
    try {
      await api.put(`/api/functions/${id}`, { id, name })
      setEditingId(null)
      setEditName('')
      await load()
    } catch (e) {
      setError(extractError(e) || t('error.updateFailed'))
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm(t('confirm.delete'))) return
    setDeletingId(id)
    setError(null)
    try {
      await api.delete(`/api/functions/${id}`)
      await load()
    } catch (e) {
      if (e?.response?.status === 409) {
        setError(extractError(e) || t('error.deleteInUse'))
      } else {
        setError(extractError(e) || t('error.deleteFailed'))
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      {error && (
        <div data-testid="functions-error" className="mb-4 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
        <div className="flex items-center justify-between border-b border-stroke px-5 pt-6 pb-4">
          <h2 className="text-xl font-semibold text-black">{t('title')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-2 text-left">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-body">{t('table.name')}</th>
                <th className="w-64 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-body">
                  {t('table.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Inline add row */}
              <tr data-testid="functions-add-row" className="border-t border-stroke bg-gray-2">
                <td className="px-4 py-3">
                  <form onSubmit={handleAdd}>
                    <input
                      data-testid="functions-add-input"
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder={t('placeholder')}
                      className="w-full rounded-sm border border-stroke bg-white px-3 py-2 text-sm text-black focus:border-primary focus:outline-none"
                      disabled={adding}
                    />
                  </form>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    data-testid="functions-add-btn"
                    type="button"
                    onClick={handleAdd}
                    disabled={adding || !newName.trim()}
                    className="inline-flex items-center rounded-sm bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {adding ? t('adding') : t('add')}
                  </button>
                </td>
              </tr>

              {loading && (
                <tr className="border-t border-stroke">
                  <td className="px-4 py-6 text-sm text-body" colSpan={2}>
                    {t('common:state.loading')}
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr className="border-t border-stroke">
                  <td className="px-4 py-6 text-sm text-body" colSpan={2}>
                    {t('state.noFunctions')}
                  </td>
                </tr>
              )}

              {!loading &&
                items.map((item) => {
                  const isEditing = editingId === item.id
                  const isSaving = savingId === item.id
                  const isDeleting = deletingId === item.id
                  return (
                    <tr key={item.id} data-testid={`functions-row-${item.id}`} className="border-t border-stroke">
                      <td className="px-4 py-3 text-sm text-black">
                        {isEditing ? (
                          <input
                            data-testid={`functions-edit-input-${item.id}`}
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full rounded-sm border border-stroke bg-white px-3 py-2 text-sm text-black focus:border-primary focus:outline-none"
                            disabled={isSaving}
                            autoFocus
                          />
                        ) : (
                          item.name
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <button
                              data-testid={`functions-save-btn-${item.id}`}
                              type="button"
                              onClick={() => saveEdit(item.id)}
                              disabled={isSaving || !editName.trim()}
                              className="inline-flex items-center rounded-sm bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isSaving ? t('saving') : t('save')}
                            </button>
                            <button
                              data-testid={`functions-cancel-btn-${item.id}`}
                              type="button"
                              onClick={cancelEdit}
                              disabled={isSaving}
                              className="inline-flex items-center rounded-sm border border-stroke bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {t('cancel')}
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              data-testid={`functions-edit-btn-${item.id}`}
                              type="button"
                              onClick={() => startEdit(item)}
                              disabled={isDeleting}
                              className="inline-flex items-center rounded-sm border border-stroke bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {t('edit')}
                            </button>
                            <button
                              data-testid={`functions-delete-btn-${item.id}`}
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              disabled={isDeleting}
                              className="inline-flex items-center rounded-sm border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isDeleting ? t('deleting') : t('delete')}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

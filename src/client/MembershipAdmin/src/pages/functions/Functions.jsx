import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'
import auth from '../../framework/auth'
import { useToast, ToastContainer } from '../../components/Toast'
import { useConfirm } from '../../components/ConfirmModal'
import { useCyrillicInput } from '../../hooks/useCyrillicInput'

function extractError(e) {
  return (
    e?.response?.data?.message ||
    e?.response?.data?.title ||
    (typeof e?.response?.data === 'string' ? e.response.data : null) ||
    e?.message ||
    null
  )
}

function FunctionModal({ item, onClose, onSaved, onSuccess }) {
  const { t } = useTranslation(['functions', 'common'])
  const [name, setName] = useState(item?.name ?? '')
  const cyrNameOnChange = useCyrillicInput(setName)
  const [committeeType, setCommitteeType] = useState(item?.committeeType ?? 'Municipal')
  const [sortOrder, setSortOrder] = useState(item?.sortOrder ?? 0)
  const [maxPeople, setMaxPeople] = useState(item?.maxNumberOfPeople ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const isEdit = !!item

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    setError(null)
    const payload = {
      name: trimmed,
      committeeType: committeeType === '' ? null : committeeType,
      sortOrder: Number(sortOrder) || 0,
      maxNumberOfPeople: maxPeople !== '' ? Number(maxPeople) : null,
    }
    try {
      if (isEdit) {
        await api.put(`/api/functions/${item.id}`, { id: item.id, ...payload })
      } else {
        await api.post('/api/functions', payload)
      }
      await onSaved()
      onSuccess(isEdit ? t('toast.saved') : t('toast.created'))
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
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
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
            onChange={cyrNameOnChange}
            placeholder={t('placeholder')}
            autoFocus
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-theme-sm text-gray-900 dark:text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
          />
          <div className="mt-4">
            <label className="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
              {t('table.type')}
            </label>
            <select
              value={committeeType}
              onChange={e => setCommitteeType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-theme-sm text-gray-900 dark:text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
            >
              <option value="Municipal">{t('orgUnitType.Municipal')}</option>
              <option value="City">{t('orgUnitType.City')}</option>
              <option value="MainCommittee">{t('orgUnitType.MainCommittee')}</option>
              <option value="ExecutiveCommittee">{t('orgUnitType.ExecutiveCommittee')}</option>
              <option value="Presidency">{t('orgUnitType.Presidency')}</option>
            </select>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                {t('form.sortOrder')}
              </label>
              <input
                type="number"
                min="0"
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-theme-sm text-gray-900 dark:text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                {t('table.maxPeople')}
              </label>
              <input
                type="number"
                min="0"
                value={maxPeople}
                onChange={e => setMaxPeople(e.target.value)}
                placeholder="—"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-theme-sm text-gray-900 dark:text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
              />
            </div>
          </div>
          {error && <p className="mt-2 text-theme-xs text-error-500">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-theme-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              {t('common:button.cancel')}
            </button>
            <button type="submit" disabled={saving || !name.trim()}
              className="rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2 text-theme-sm font-medium text-white disabled:opacity-50">
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const TYPE_COLORS = {
  'City':               'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Municipal':          'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  'MainCommittee':      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'ExecutiveCommittee': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  'Presidency':         'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  'null':               'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

export default function Functions() {
  const { t } = useTranslation(['functions', 'common'])
  const toast = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [modal, setModal] = useState(null)
  const [typeFilter, setTypeFilter] = useState('Municipal')

  const isSuperAdmin = auth.getRole() === 'SuperAdmin'

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
    const ok = await confirm({ title: t('common:button.delete'), message: `${t('confirm.delete')} "${item.name}"?` })
    if (!ok) return
    setDeletingId(item.id)
    setError(null)
    try {
      await api.delete(`/api/functions/${item.id}`)
      await load()
      toast.success(t('toast.deleted'))
    } catch (e) {
      setError(extractError(e) || (e?.response?.status === 409 ? t('error.deleteInUse') : t('error.deleteFailed')))
      toast.error(extractError(e) || (e?.response?.status === 409 ? t('error.deleteInUse') : t('error.deleteFailed')))
    } finally {
      setDeletingId(null)
    }
  }

  const typeLabel = (type) => t(`orgUnitType.${type == null ? 'null' : type}`)

  const filtered = typeFilter ? items.filter(i => i.committeeType === typeFilter) : items

  return (
    <div>
      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />
      <ConfirmDialog />
      {error && (
        <div className="mb-4 rounded-lg border border-error-300 dark:border-error-700 bg-error-50 dark:bg-error-500/10 px-4 py-3 text-theme-sm text-error-500">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <h2 className="text-xl font-semibold text-brand-500 dark:text-brand-400">{t('title')}</h2>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setModal('add')}
              className="inline-flex items-center gap-1 rounded-md bg-brand-500 hover:bg-brand-600 px-2.5 py-1 text-theme-xs font-medium text-white"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('add')}
            </button>
          )}
        </div>

        {/* Filter bar */}
        <div className="border-b border-gray-200 dark:border-gray-800 bg-brand-50 dark:bg-brand-500/[0.06] px-6 py-3 flex flex-wrap items-center gap-1.5">
            {[
              { key: 'Municipal',          label: t('orgUnitType.Municipal'),          color: '#0d9488' },
              { key: 'City',               label: t('orgUnitType.City'),               color: '#3b82f6' },
              { key: 'MainCommittee',      label: t('orgUnitType.MainCommittee'),      color: '#a855f7' },
              { key: 'ExecutiveCommittee', label: t('orgUnitType.ExecutiveCommittee'), color: '#f97316' },
              { key: 'Presidency',         label: t('orgUnitType.Presidency'),         color: '#ef4444' },
            ].map(({ key, label, color }) => {
              const active = typeFilter === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTypeFilter(prev => prev === key ? '' : key)}
                  style={active ? { background: color, borderColor: color, color: '#fff' } : {}}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-theme-xs font-medium border transition-colors
                    ${active ? '' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'}`}
                >
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: active ? '#fff' : color }} />
                  {label}
                </button>
              )
            })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-left">
                <th className="px-4 py-3 text-theme-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('table.name')}</th>
                <th className="px-4 py-3 text-theme-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('table.type')}</th>
                <th className="w-28 px-4 py-3 text-center text-theme-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('table.maxPeople')}</th>
                {isSuperAdmin && (
                  <th className="w-40 px-4 py-3" />
                )}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={isSuperAdmin ? 4 : 3} className="px-4 py-6 text-theme-sm text-gray-500 dark:text-gray-400">
                    {t('common:state.loading')}
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 4 : 3} className="px-4 py-6 text-theme-sm text-gray-500 dark:text-gray-400">
                    {t('state.noFunctions')}
                  </td>
                </tr>
              )}

              {!loading && filtered.map((item) => {
                const isDeleting = deletingId === item.id
                const typeKey = item.committeeType == null ? 'null' : item.committeeType
                return (
                  <tr key={item.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-theme-sm text-gray-900 dark:text-white">{item.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${TYPE_COLORS[typeKey]}`}>
                        {typeLabel(item.committeeType)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                      {item.maxNumberOfPeople ?? '—'}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setModal(item)}
                            disabled={isDeleting}
                            className="inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-theme-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
                          >
                            {t('edit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            disabled={isDeleting}
                            className="inline-flex items-center rounded-lg border border-error-300 dark:border-error-700 px-3 py-1.5 text-theme-xs font-medium text-error-500 hover:bg-error-500 hover:text-white disabled:opacity-40"
                          >
                            {isDeleting ? t('deleting') : t('delete')}
                          </button>
                        </div>
                      </td>
                    )}
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
          onSuccess={(msg) => toast.success(msg)}
        />
      )}
    </div>
  )
}

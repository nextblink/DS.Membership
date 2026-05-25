import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'
import { useToast, ToastContainer } from '../../components/Toast'
import { useCyrillicInput } from '../../hooks/useCyrillicInput'

function typeBadgeClass() {
  return 'inline-flex rounded-full bg-brand-50 dark:bg-brand-500/10 px-2.5 py-0.5 text-theme-xs font-medium text-brand-600 dark:text-brand-400'
}

function MemberBar({ count, max }) {
  if (!max) return <span className="text-theme-sm text-gray-700 dark:text-gray-300">{count}</span>
  const pct = Math.min(100, (count / max) * 100)
  const color = pct >= 90 ? '#f04438' : pct >= 60 ? '#f79009' : '#4ABEA0'
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-16 text-right text-theme-xs font-semibold tabular-nums" style={{ color }}>
        {count} / {max}
      </span>
    </div>
  )
}

function EditBodyModal({ body, onClose, onSave }) {
  const { t } = useTranslation(['committees', 'common'])
  const [name, setName] = useState(body.name ?? '')
  const cyrNameOnChange = useCyrillicInput(setName)
  const [maxMembers, setMaxMembers] = useState(body.maxMembers ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError(t('committees:form.nameRequired')); return }
    setSubmitting(true)
    setError(null)
    try {
      await onSave({ name: name.trim(), maxMembers: maxMembers !== '' ? Number(maxMembers) : null, isTrustful: body.isTrustful })
      onClose()
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || t('committees:error.saveFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-theme-sm text-gray-900 dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xl">
        <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <h3 className="text-base font-semibold text-brand-500 dark:text-brand-400">{t('committees:modal.editTitle')}</h3>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="mb-4">
            <label className="mb-2 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">{t('committees:form.name')}</label>
            <input type="text" value={name} onChange={cyrNameOnChange} autoFocus className={inputCls} />
          </div>
          <div className="mb-4">
            <label className="mb-2 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">{t('committees:form.maxMembers')}</label>
            <input type="number" min="0" value={maxMembers} onChange={e => setMaxMembers(e.target.value)} className={inputCls} />
          </div>
          {error && <p className="mb-3 text-theme-sm text-error-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={submitting}
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-theme-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              {t('committees:action.cancel')}
            </button>
            <button type="submit" disabled={submitting}
              className="rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-theme-sm font-medium text-white disabled:opacity-50">
              {submitting ? t('committees:action.saving') : t('committees:action.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddBodyModal({ open, onClose, onSubmit, onSuccess, onError }) {
  const { t } = useTranslation(['committees', 'common'])
  const [name, setName] = useState('')
  const cyrNameOnChange = useCyrillicInput(setName)
  const [maxMembers, setMaxMembers] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) { setName(''); setMaxMembers(''); setError(null) }
  }, [open])

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError(t('committees:form.nameRequired')); return }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ name: name.trim(), maxMembers: maxMembers !== '' ? Number(maxMembers) : null, isTrustful: true })
      onSuccess?.()
      onClose()
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || t('committees:error.saveFailed')
      setError(msg)
      onError?.(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-theme-sm text-gray-900 dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xl">
        <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <h3 className="text-base font-semibold text-brand-500 dark:text-brand-400">{t('committees:modal.addRootTitle')}</h3>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="mb-4">
            <label className="mb-2 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">{t('committees:form.name')}</label>
            <input type="text" value={name} onChange={cyrNameOnChange} autoFocus className={inputCls} />
          </div>
          <div className="mb-4">
            <label className="mb-2 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">{t('committees:form.maxMembers')}</label>
            <input type="number" min="0" value={maxMembers} onChange={e => setMaxMembers(e.target.value)} className={inputCls} />
          </div>
          {error && <p className="mb-3 text-theme-sm text-error-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={submitting}
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-theme-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              {t('committees:action.cancel')}
            </button>
            <button type="submit" disabled={submitting}
              className="rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-theme-sm font-medium text-white disabled:opacity-50">
              {submitting ? t('committees:action.saving') : t('committees:action.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CommitteeBodies() {
  const { t } = useTranslation(['committees', 'common'])
  const toast = useToast()
  const [bodies, setBodies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [addOpen, setAddOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/committees/bodies')
      setBodies(res.data)
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || t('committees:state.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  const handleSaveEdit = useCallback(async (payload) => {
    const body = editTarget
    await api.put(`/api/committees/${body.id}`, {
      name: payload.name,
      type: body.type,
      parentId: body.parentId ?? null,
      municipalityId: null,
      voterCount: 0,
      trusteeId: body.trusteeId ?? null,
      isTrustful: payload.isTrustful,
      maxMembers: payload.maxMembers,
    })
    setBodies(prev => prev.map(b => b.id === body.id ? { ...b, ...payload } : b))
    toast.success(t('committees:toast.saved'))
  }, [editTarget, toast, t])

  const handleCreate = useCallback(async (payload) => {
    const res = await api.post('/api/committees', {
      name: payload.name,
      type: 2, // MainCommittee as default for manually created bodies
      voterCount: 0,
      isTrustful: payload.isTrustful,
      maxMembers: payload.maxMembers ?? null,
    })
    setBodies(prev => [...prev, res.data])
  }, [])

  const handleDelete = useCallback(async (body) => {
    if (!window.confirm(t('committees:action.deleteConfirm'))) return
    try {
      await api.delete(`/api/committees/${body.id}`)
      setBodies(prev => prev.filter(b => b.id !== body.id))
      toast.success(t('committees:toast.deleted'))
    } catch (err) {
      const msg = err?.response?.status === 409
        ? t('committees:error.deleteRestricted')
        : err?.response?.data?.message || err?.message || t('committees:error.deleteFailed')
      toast.error(msg)
    }
  }, [t, toast])

  return (
    <div>
      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <h2 className="text-xl font-semibold text-brand-500 dark:text-brand-400">{t('common:nav.bodies')}</h2>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center rounded-md bg-brand-500 hover:bg-brand-600 px-2.5 py-1 text-theme-xs font-medium text-white"
          >
            {t('committees:action.addRoot')}
          </button>
        </div>

        {loading && <p className="p-6 text-theme-sm text-gray-500 dark:text-gray-400">{t('common:state.loading')}</p>}
        {error && <p className="p-6 text-theme-sm text-error-500">{error}</p>}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-theme-xs uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">{t('committees:form.type')}</th>
                  <th className="px-4 py-3">{t('committees:form.name')}</th>
                  <th className="px-4 py-3">{t('committees:form.chairman')}</th>
                  <th className="px-4 py-3 text-right">{t('committees:stats.members')}</th>
                  <th className="px-4 py-3 text-right">{t('committees:action.edit')}</th>
                </tr>
              </thead>
              <tbody>
                {bodies.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                      {t('common:state.noData')}
                    </td>
                  </tr>
                )}
                {bodies.map(body => (
                  <tr key={body.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <span className={typeBadgeClass()}>
                        {t(`committees:type.${body.type.toLowerCase()}`, body.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-theme-sm font-medium text-gray-900 dark:text-white">{body.name}</td>
                    <td className="px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">{body.trusteeName ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <MemberBar count={body.memberCount} max={body.maxMembers} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button type="button" onClick={() => setEditTarget(body)}
                          className="rounded-md border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-theme-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                          {t('committees:action.edit')}
                        </button>
                        <button type="button" onClick={() => handleDelete(body)}
                          className="rounded-md border border-error-200 dark:border-error-700 px-2.5 py-1 text-theme-xs font-medium text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-500/10">
                          {t('committees:action.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddBodyModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleCreate}
        onSuccess={() => toast.success(t('committees:toast.created'))}
        onError={msg => toast.error(msg)}
      />

      {editTarget && (
        <EditBodyModal
          body={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  )
}

// Create + edit campaign form (edit mode when :id route param is present).
// Field styling mirrors pages/members/MemberForm.jsx conventions.
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import callCenterApi from '../../services/callCenterApi'

const sectionClass = 'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-theme-sm mb-6'
const labelClass = 'block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1'
const inputClass =
  'w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-theme-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'
const errorClass = 'text-[11px] text-error-500 mt-0.5'

function emptyForm() {
  return { name: '', description: '', startDate: '', isActive: true }
}

export default function CampaignForm() {
  const { t } = useTranslation(['callcenter', 'common'])
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [form, setForm] = useState(emptyForm())
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [nameError, setNameError] = useState(null)

  useEffect(() => {
    if (!isEdit) return
    let cancelled = false
    setLoading(true)
    callCenterApi
      .getCampaign(id)
      .then((c) => {
        if (cancelled) return
        setForm({
          name: c.name ?? '',
          description: c.description ?? '',
          startDate: c.startDate ?? '',
          isActive: !!c.isActive,
        })
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.response?.data?.message || t('callcenter:campaigns.loadOneFailed'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit])

  const set = (k) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [k]: value }))
    if (k === 'name') setNameError(null)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setNameError(t('callcenter:campaigns.form.nameRequired'))
      return
    }
    setSubmitting(true)
    setError(null)
    const body = {
      name: form.name.trim(),
      description: form.description?.trim() || null,
      startDate: form.startDate || null,
      isActive: !!form.isActive,
    }
    try {
      if (isEdit) await callCenterApi.updateCampaign(id, body)
      else await callCenterApi.createCampaign(body)
      navigate('/callcenter/campaigns')
    } catch (err) {
      setError(err?.response?.data?.message || t('callcenter:campaigns.saveFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-theme-sm text-gray-500 dark:text-gray-400">{t('common:state.loading')}</div>
    )
  }

  return (
    <form onSubmit={submit} className="max-w-2xl">
      <h1 className="text-xl font-semibold text-brand-500 dark:text-brand-400 mb-6">
        {isEdit ? t('callcenter:campaigns.edit') : t('callcenter:campaigns.new')}
      </h1>

      {error && (
        <div className="mb-4 rounded-lg border border-error-200 dark:border-error-700 bg-error-50 dark:bg-error-500/10 px-4 py-3 text-theme-sm text-error-600 dark:text-error-400">
          {error}
        </div>
      )}

      <section className={sectionClass}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>
              {t('callcenter:campaigns.form.name')}<span className="text-error-500 ml-0.5">*</span>
            </label>
            <input className={inputClass} value={form.name} onChange={set('name')} />
            {nameError && <p className={errorClass}>{nameError}</p>}
          </div>
          <div>
            <label className={labelClass}>{t('callcenter:campaigns.form.start')}</label>
            <input type="date" className={inputClass} value={form.startDate} onChange={set('startDate')} />
          </div>
        </div>

        <div className="mb-4">
          <label className={labelClass}>{t('callcenter:campaigns.form.description')}</label>
          <textarea className={inputClass} rows={4} value={form.description} onChange={set('description')} />
        </div>

        <div>
          <label className="flex items-center gap-2 text-theme-xs text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
            {t('callcenter:campaigns.form.active')}
          </label>
        </div>
      </section>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand-500 hover:bg-brand-600 px-5 py-2.5 text-theme-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? t('callcenter:campaigns.form.saving') : t('common:button.save')}
        </button>
        <button
          type="button"
          onClick={() => navigate('/callcenter/campaigns')}
          className="rounded-lg border border-gray-300 dark:border-gray-700 px-5 py-2.5 text-theme-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {t('common:button.cancel')}
        </button>
      </div>
    </form>
  )
}

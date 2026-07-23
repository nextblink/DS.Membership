// Create + edit pool form (edit mode when :id route param is present).
// Field styling mirrors pages/callcenter/CampaignForm.jsx conventions.
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import callCenterApi from '../../services/callCenterApi'
import api from '../../framework/api'
import { CALL_OUTCOME, toEnumKey } from '../../services/callScript'

const sectionClass = 'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-theme-sm mb-6'
const labelClass = 'block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1'
const inputClass =
  'w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-theme-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'
const errorClass = 'text-[11px] text-error-500 mt-0.5'

function emptyForm() {
  return {
    name: '',
    campaignId: '',
    filterCity: '',
    filterMunicipalityId: '',
    filterOutcome: '',
    isActive: true,
  }
}

// UserDto has no single "name" field (firstName/lastName/email only) — compose a
// display label the same way pages/users/Users.jsx does.
function userLabel(u) {
  const full = [u.firstName, u.lastName].filter(Boolean).join(' ')
  return full || u.email || u.id
}

export default function PoolForm() {
  const { t } = useTranslation(['callcenter', 'common', 'enums'])
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [form, setForm] = useState(emptyForm())
  const [users, setUsers] = useState([])
  const [selectedOps, setSelectedOps] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [nameError, setNameError] = useState(null)
  const [campaignError, setCampaignError] = useState(null)

  useEffect(() => {
    callCenterApi
      .listCampaigns(1, 100)
      .then((d) => setCampaigns(d.items ?? []))
      .catch(() => setCampaigns([]))

    api
      .get('/api/users')
      .then((r) => setUsers(Array.isArray(r.data) ? r.data : r.data?.items || []))
      .catch(() => setUsers([]))
  }, [])

  useEffect(() => {
    if (!isEdit) return
    let cancelled = false
    setLoading(true)
    callCenterApi
      .getPool(id)
      .then((p) => {
        if (cancelled) return
        setForm({
          name: p.name ?? '',
          campaignId: p.campaignId,
          filterCity: p.filterCity ?? '',
          filterMunicipalityId: p.filterMunicipalityId ?? '',
          // Backend serializes CallOutcome as its string name (e.g. "NoAnswer") via
          // JsonStringEnumConverter (see Program.cs), but the <select> below uses
          // CALL_OUTCOME's numeric ordinals as option values (same convention as
          // ContactList.jsx/CallQueue.jsx). Map name -> ordinal here so the existing
          // filter shows as selected instead of falling through to "—", and so a
          // later Number(form.filterOutcome) on submit doesn't come out NaN.
          filterOutcome:
            p.filterOutcome != null && p.filterOutcome in CALL_OUTCOME
              ? String(CALL_OUTCOME[p.filterOutcome])
              : '',
          isActive: !!p.isActive,
        })
        setSelectedOps((p.operators ?? []).map((o) => o.userId))
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.response?.data?.message || t('callcenter:pools.loadOneFailed'))
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
    if (k === 'campaignId') setCampaignError(null)
  }

  const toggleOp = (userId) => {
    setSelectedOps((s) => (s.includes(userId) ? s.filter((x) => x !== userId) : [...s, userId]))
  }

  const removeOperator = async (userId) => {
    if (!isEdit) {
      // Not yet persisted: just drop it from the local selection.
      setSelectedOps((s) => s.filter((x) => x !== userId))
      return
    }
    try {
      await callCenterApi.removeOperator(id, userId)
      setSelectedOps((s) => s.filter((x) => x !== userId))
    } catch (err) {
      setError(err?.response?.data?.message || t('callcenter:pools.removeOperatorFailed'))
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    let valid = true
    if (!form.name.trim()) {
      setNameError(t('callcenter:pools.nameRequired'))
      valid = false
    }
    if (!form.campaignId) {
      setCampaignError(t('callcenter:pools.campaignRequired'))
      valid = false
    }
    if (!valid) return

    setSubmitting(true)
    setError(null)
    try {
      let poolId = id
      if (isEdit) {
        await callCenterApi.updatePool(id, {
          name: form.name.trim(),
          isActive: !!form.isActive,
          filterCity: form.filterCity?.trim() || null,
          filterMunicipalityId: form.filterMunicipalityId ? Number(form.filterMunicipalityId) : null,
          filterOutcome: form.filterOutcome === '' ? null : Number(form.filterOutcome),
        })
      } else {
        const created = await callCenterApi.createPool({
          name: form.name.trim(),
          campaignId: Number(form.campaignId),
          filterCity: form.filterCity?.trim() || null,
          filterMunicipalityId: form.filterMunicipalityId ? Number(form.filterMunicipalityId) : null,
          filterOutcome: form.filterOutcome === '' ? null : Number(form.filterOutcome),
        })
        poolId = created.id
      }
      await callCenterApi.setOperators(poolId, selectedOps)
      navigate('/callcenter/pools')
    } catch (err) {
      setError(err?.response?.data?.message || t('callcenter:pools.saveFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-theme-sm text-gray-500 dark:text-gray-400">{t('common:state.loading')}</div>
  }

  return (
    <form onSubmit={submit} className="max-w-2xl">
      <h1 className="text-xl font-semibold text-brand-500 dark:text-brand-400 mb-6">
        {isEdit ? t('callcenter:pools.edit') : t('callcenter:pools.new')}
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
              {t('callcenter:pools.name')}<span className="text-error-500 ml-0.5">*</span>
            </label>
            <input className={inputClass} value={form.name} onChange={set('name')} />
            {nameError && <p className={errorClass}>{nameError}</p>}
          </div>
          <div>
            <label className={labelClass}>
              {t('callcenter:pools.campaign')}<span className="text-error-500 ml-0.5">*</span>
            </label>
            <select
              className={inputClass}
              disabled={isEdit}
              value={form.campaignId}
              onChange={set('campaignId')}
            >
              <option value="">—</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {campaignError && <p className={errorClass}>{campaignError}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className={labelClass}>{t('callcenter:pools.filterCity')}</label>
            <input className={inputClass} value={form.filterCity} onChange={set('filterCity')} />
          </div>
          <div>
            <label className={labelClass}>{t('callcenter:pools.filterMunicipality')}</label>
            <input
              type="number"
              className={inputClass}
              value={form.filterMunicipalityId}
              onChange={set('filterMunicipalityId')}
            />
          </div>
          <div>
            <label className={labelClass}>{t('callcenter:pools.filterOutcome')}</label>
            <select className={inputClass} value={form.filterOutcome} onChange={set('filterOutcome')}>
              <option value="">—</option>
              {Object.entries(CALL_OUTCOME).map(([k, v]) => (
                <option key={v} value={v}>
                  {t(`enums:callOutcome.${toEnumKey(k)}`, k)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isEdit && (
          <div>
            <label className="flex items-center gap-2 text-theme-xs text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
              {t('callcenter:campaigns.form.active')}
            </label>
          </div>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className="text-theme-sm font-medium text-gray-900 dark:text-white mb-3">{t('callcenter:pools.operatorsSection')}</h2>
        {users.length === 0 ? (
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">{t('callcenter:pools.noUsers')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-theme-xs text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={selectedOps.includes(u.id)}
                    onChange={() => toggleOp(u.id)}
                  />
                  {userLabel(u)}
                </label>
                {selectedOps.includes(u.id) && (
                  <button
                    type="button"
                    onClick={() => removeOperator(u.id)}
                    className="text-theme-xs font-medium text-error-600 dark:text-error-400 hover:underline"
                  >
                    {t('callcenter:pools.removeOperator')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand-500 hover:bg-brand-600 px-5 py-2.5 text-theme-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? t('callcenter:pools.saving') : t('common:button.save')}
        </button>
        <button
          type="button"
          onClick={() => navigate('/callcenter/pools')}
          className="rounded-lg border border-gray-300 dark:border-gray-700 px-5 py-2.5 text-theme-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {t('common:button.cancel')}
        </button>
      </div>
    </form>
  )
}

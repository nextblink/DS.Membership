// Contact import page: pick a campaign, upload a CSV/xlsx file, show the import summary.
// Field/card styling mirrors pages/callcenter/CampaignForm.jsx conventions.
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import callCenterApi from '../../services/callCenterApi'

const sectionClass = 'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-theme-sm mb-6'
const labelClass = 'block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1'
const inputClass =
  'w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-theme-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'
const errorClass = 'text-[11px] text-error-500 mt-0.5'

export default function ContactImport() {
  const { t } = useTranslation(['callcenter', 'common'])
  const [campaigns, setCampaigns] = useState([])
  const [campaignId, setCampaignId] = useState('')
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    let cancelled = false
    callCenterApi
      .listCampaigns(1, 100)
      .then((d) => {
        if (!cancelled) setCampaigns(d.items ?? [])
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.message || t('callcenter:import.loadCampaignsFailed'))
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setFormError(null)
    if (!campaignId || !file) {
      setFormError(t('callcenter:import.requiredFields'))
      return
    }
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const data = await callCenterApi.importContacts(campaignId, file)
      setResult(data)
    } catch (err) {
      setError(err?.response?.data?.message || t('callcenter:import.importFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="max-w-2xl">
      <h1 className="text-xl font-semibold text-brand-500 dark:text-brand-400 mb-6">{t('callcenter:import.title')}</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-error-200 dark:border-error-700 bg-error-50 dark:bg-error-500/10 px-4 py-3 text-theme-sm text-error-600 dark:text-error-400">
          {error}
        </div>
      )}

      <section className={sectionClass}>
        <p className="text-theme-xs text-gray-500 dark:text-gray-400 mb-4">{t('callcenter:import.expectedColumns')}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>
              {t('callcenter:import.campaign')}<span className="text-error-500 ml-0.5">*</span>
            </label>
            <select
              className={inputClass}
              value={campaignId}
              onChange={(e) => {
                setCampaignId(e.target.value)
                setFormError(null)
              }}
            >
              <option value="">—</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              {t('callcenter:import.file')}<span className="text-error-500 ml-0.5">*</span>
            </label>
            <input
              type="file"
              accept=".csv,.xlsx"
              className={inputClass}
              onChange={(e) => {
                setFile(e.target.files[0] ?? null)
                setFormError(null)
              }}
            />
          </div>
        </div>

        {formError && <p className={errorClass}>{formError}</p>}
      </section>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand-500 hover:bg-brand-600 px-5 py-2.5 text-theme-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? t('callcenter:import.submitting') : t('callcenter:import.submit')}
        </button>
      </div>

      {result && (
        <section className={`${sectionClass} mt-6`}>
          <p className="text-theme-sm text-gray-900 dark:text-white mb-2">
            {t('callcenter:import.resultSummary', { imported: result.imported, skipped: result.skipped })}
          </p>
          {result.errors?.length > 0 && (
            <ul className="text-theme-xs text-error-600 dark:text-error-400 list-disc pl-5 space-y-0.5">
              {result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </section>
      )}
    </form>
  )
}

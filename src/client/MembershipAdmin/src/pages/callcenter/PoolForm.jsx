// Create + edit pool form (edit mode when :id route param is present).
// Field styling mirrors pages/callcenter/CampaignForm.jsx conventions.
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AutoComplete } from 'primereact/autocomplete'
import callCenterApi from '../../services/callCenterApi'
import api from '../../framework/api'
import { CALL_OUTCOME, toEnumKey } from '../../services/callScript'
import { makeScriptMatcher } from '../../services/transliteration'

const sectionClass = 'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-theme-sm mb-6'
const labelClass = 'block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1'
const inputClass =
  'w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-theme-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'
const errorClass = 'text-[11px] text-error-500 mt-0.5'

// Flattens the Municipality tree (city -> children) into a single sorted list for the AutoComplete.
const flattenMunicipalities = (nodes) =>
  (nodes ?? [])
    .flatMap((n) => [{ id: n.id, name: n.name }, ...flattenMunicipalities(n.children)])
    .sort((a, b) => a.name.localeCompare(b.name))

function emptyForm() {
  return {
    name: '',
    campaignId: '',
    // filterCity is intentionally not editable from this form (removed per request), but is
    // still carried through load/submit unchanged so editing a pool never silently wipes a
    // legacy value set some other way (e.g. directly in the DB) — same lesson as the
    // filterOutcome silent-wipe bug fixed earlier in this form.
    filterCity: '',
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

  const [municipalities, setMunicipalities] = useState([])
  const [municipalitySuggestions, setMunicipalitySuggestions] = useState([])
  const [selectedMunicipalities, setSelectedMunicipalities] = useState([])
  // Pool's filterMunicipalityIds may load before the flattened municipality list does (two
  // independent effects) — stash the raw ids here and resolve them to {id,name} objects once
  // both are available, rather than assuming a load order.
  const [pendingMunicipalityIds, setPendingMunicipalityIds] = useState(null)

  useEffect(() => {
    callCenterApi
      .listCampaigns(1, 100)
      .then((d) => setCampaigns(d.items ?? []))
      .catch(() => setCampaigns([]))

    api
      .get('/api/users')
      .then((r) => setUsers(Array.isArray(r.data) ? r.data : r.data?.items || []))
      .catch(() => setUsers([]))

    callCenterApi
      .listMunicipalities()
      .then((tree) => setMunicipalities(flattenMunicipalities(tree)))
      .catch(() => setMunicipalities([]))
  }, [])

  useEffect(() => {
    if (pendingMunicipalityIds && municipalities.length) {
      setSelectedMunicipalities(municipalities.filter((m) => pendingMunicipalityIds.includes(m.id)))
      setPendingMunicipalityIds(null)
    }
  }, [municipalities, pendingMunicipalityIds])

  // Live "how many contacts would this match" preview — recomputed whenever the campaign,
  // selected municipalities, or outcome filter change. Read-only (no stamping): the actual
  // contact count a pool ends up with is the real thing, computed by the backend when contacts
  // are stamped on save/refresh and shown on the pools list — this is only a preview to help
  // pick municipalities before committing.
  const [matchCount, setMatchCount] = useState(null)
  const [matchCountLoading, setMatchCountLoading] = useState(false)

  useEffect(() => {
    if (!form.campaignId) {
      setMatchCount(null)
      return
    }
    let cancelled = false
    setMatchCountLoading(true)
    callCenterApi
      .previewPoolContactCount(
        Number(form.campaignId),
        selectedMunicipalities.map((m) => m.id),
        form.filterOutcome === '' ? undefined : Number(form.filterOutcome)
      )
      .then((count) => {
        if (!cancelled) setMatchCount(count)
      })
      .catch(() => {
        if (!cancelled) setMatchCount(null)
      })
      .finally(() => {
        if (!cancelled) setMatchCountLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.campaignId, form.filterOutcome, selectedMunicipalities])

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
        setPendingMunicipalityIds(p.filterMunicipalityIds ?? [])
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

  const searchMunicipalities = (e) => {
    const matches = makeScriptMatcher(e.query.trim())
    setMunicipalitySuggestions(municipalities.filter((m) => matches(m.name)))
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
          filterMunicipalityIds: selectedMunicipalities.map((m) => m.id),
          filterOutcome: form.filterOutcome === '' ? null : Number(form.filterOutcome),
        })
      } else {
        const created = await callCenterApi.createPool({
          name: form.name.trim(),
          campaignId: Number(form.campaignId),
          filterCity: form.filterCity?.trim() || null,
          filterMunicipalityIds: selectedMunicipalities.map((m) => m.id),
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>{t('callcenter:pools.filterMunicipality')}</label>
            <AutoComplete
              value={selectedMunicipalities}
              suggestions={municipalitySuggestions}
              completeMethod={searchMunicipalities}
              onChange={(e) => setSelectedMunicipalities(e.value)}
              field="name"
              multiple
              dropdown
              disabled={!form.campaignId}
              placeholder={
                form.campaignId ? t('callcenter:pools.filterMunicipality') : t('callcenter:pools.chooseCampaignFirst')
              }
              pt={{
                // `root` is the actual flex row in AutoComplete's DOM (root > [container, dropdown
                // button] as siblings) — the single-select AutoComplete above puts its flex/stretch
                // layout here for the same reason. Putting it on `container` instead (as an earlier
                // version of this did) leaves `root` an unstyled block, so `container` and the
                // dropdown button stack instead of sitting side-by-side, which is what pushed the
                // chevron out of place. No fixed height here (unlike the single-select's h-[31px])
                // since chips can wrap to multiple lines — items-stretch lets the button match
                // whatever height the chip container ends up with.
                root: { className: 'w-full flex items-stretch' },
                container: {
                  // `min-h-[31px]` matches the single-select input's fixed h-[31px] as a concrete
                  // baseline height. Without it, the button's `h-full` (height: 100%) resolves
                  // against `root`, whose own height is only ever implicit (derived from content) —
                  // a percentage height against an indefinite-height ancestor computes to `auto` per
                  // spec, so the button silently fell back to its own natural (icon-sized) height
                  // instead of matching the input row, which is what looked mismatched.
                  className:
                    `${inputClass} flex-1 min-w-0 min-h-[31px] flex flex-wrap items-center gap-1 py-1 rounded-r-none data-[p-disabled=true]:opacity-50 data-[p-disabled=true]:cursor-not-allowed`,
                },
                token: {
                  className:
                    'flex items-center gap-1 rounded bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 px-1.5 py-0.5 text-theme-xs',
                },
                tokenLabel: { className: 'leading-none' },
                removeTokenIcon: { className: 'cursor-pointer w-3 h-3' },
                inputToken: { className: 'flex-1 min-w-[80px]' },
                input: { className: 'w-full bg-transparent border-0 outline-none text-theme-xs text-gray-900 dark:text-white p-0' },
                loadingIcon: { className: 'hidden' },
                dropdownButton: {
                  root: {
                    // No height class here (deliberately not h-full): `root` has no fixed height
                    // since chips can wrap to multiple lines, and `height: 100%` against an
                    // indefinite-height ancestor is a *percentage*, not `auto` — flexbox's
                    // automatic stretch (align-items: stretch, inherited from `root`) only kicks in
                    // when a flex item's cross-size is literally `auto`, so an explicit `h-full`
                    // here actually opts OUT of stretch and the button collapses to its icon's
                    // natural size instead of matching the chip container. Leaving height unset
                    // keeps it `auto` and lets stretch do its job.
                    className:
                      'shrink-0 flex items-center justify-center rounded-r-md rounded-l-none border border-l-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400',
                  },
                },
                panel: {
                  className:
                    'mt-1 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm',
                },
                list: { className: 'max-h-60 overflow-y-auto py-1' },
                item: {
                  className:
                    'px-3 py-1.5 text-theme-xs cursor-pointer text-gray-700 dark:text-gray-300 ' +
                    'hover:bg-brand-50 dark:hover:bg-brand-500/10 ' +
                    'data-[p-highlight=true]:bg-brand-50 dark:data-[p-highlight=true]:bg-brand-500/10 ' +
                    'data-[p-highlight=true]:text-brand-600 dark:data-[p-highlight=true]:text-brand-400',
                },
                emptyMessage: { className: 'px-3 py-1.5 text-theme-xs text-gray-500 dark:text-gray-400' },
              }}
            />
            {form.campaignId && (
              <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                {matchCountLoading
                  ? t('callcenter:pools.matchCountLoading')
                  : t('callcenter:pools.matchCount', { count: matchCount ?? 0 })}
              </p>
            )}
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

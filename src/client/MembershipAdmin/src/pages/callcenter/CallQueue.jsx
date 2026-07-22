// Operator landing page: a selectable table of the operator's own callable
// contacts (server-side scope-filtered via ApplyCallContactScope), replacing the
// earlier blind "call next" button. Mirrors ContactList.jsx's table/pagination
// markup and its corrected outcome/final-status enum label logic.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import callCenterApi from '../../services/callCenterApi'
import { CALL_OUTCOME, toEnumKey } from '../../services/callScript'

// Enum values mirror the backend Enums.cs ordinals (ContactFinalStatus).
const FINAL_STATUS = { ActiveMember: 0, InactiveMember: 1, Sympathizer: 2, NoCooperation: 3 }

const PAGE_SIZE = 20

export default function CallQueue() {
  const { t } = useTranslation(['callcenter', 'common', 'enums'])
  const navigate = useNavigate()
  const location = useLocation()
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ items: [], totalCount: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 1 })
  const [loading, setLoading] = useState(false)
  const [claimingId, setClaimingId] = useState(null)
  // Seed the error banner with a one-time warning passed from MemberCreate.jsx
  // when the call contact was created as a member but the server-side
  // conversion link (setConverted) failed to save.
  const [error, setError] = useState(
    location.state?.conversionWarning ? t('callcenter:queue.conversionWarning') : null
  )

  // The API serializes enums as their string member name (JsonStringEnumConverter in
  // Program.cs), so lastOutcome/finalStatus arrive as e.g. "NoAnswer", not a numeric
  // ordinal. Translate the value via enums.json, falling back to the raw value.
  const outcomeLabel = (value) => {
    if (value === null || value === undefined || value === '') return '-'
    return value in CALL_OUTCOME ? t(`enums:callOutcome.${toEnumKey(value)}`, value) : String(value)
  }

  const finalStatusLabel = (value) => {
    if (value === null || value === undefined || value === '') return '-'
    return value in FINAL_STATUS ? t(`enums:contactFinalStatus.${toEnumKey(value)}`, value) : String(value)
  }

  const refreshKey = useMemo(() => page, [page])

  const load = () => {
    let cancelled = false
    setLoading(true)
    callCenterApi
      .listContacts({ page, pageSize: PAGE_SIZE, unresolvedOnly: true })
      .then((d) => {
        if (cancelled) return
        setData({
          items: d.items ?? [],
          totalCount: d.totalCount ?? 0,
          page: d.page ?? 1,
          pageSize: d.pageSize ?? PAGE_SIZE,
          totalPages: d.totalPages ?? 1,
        })
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.response?.data?.message || t('callcenter:queue.loadFailed'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }

  useEffect(() => {
    const cancel = load()
    return cancel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  const callContact = async (contactId) => {
    setClaimingId(contactId)
    setError(null)
    try {
      await callCenterApi.claim(contactId)
      navigate(`/callcenter/call/${contactId}`)
    } catch (err) {
      const status = err?.response?.status
      const code = err?.response?.data?.error
      if (status === 409 && code === 'already_claimed') {
        setError(t('callcenter:queue.alreadyClaimed'))
      } else if (status === 409 && code === 'already_resolved') {
        setError(t('callcenter:queue.alreadyResolved'))
      } else {
        setError(err?.response?.data?.message || t('callcenter:queue.claimFailed'))
      }
      load()
    } finally {
      setClaimingId(null)
    }
  }

  const totalPages = data.totalPages || 1

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h1 className="text-xl font-semibold text-brand-500 dark:text-brand-400">{t('callcenter:queue.title')}</h1>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-error-200 dark:border-error-700 bg-error-50 dark:bg-error-500/10 px-4 py-3 text-theme-sm text-error-600 dark:text-error-400">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-theme-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">{t('callcenter:queue.columns.name')}</th>
              <th className="px-4 py-3">{t('callcenter:queue.columns.phone')}</th>
              <th className="px-4 py-3">{t('callcenter:queue.columns.place')}</th>
              <th className="px-4 py-3 w-24 whitespace-nowrap">{t('callcenter:queue.columns.tries')}</th>
              <th className="px-4 py-3 w-32 whitespace-nowrap">{t('callcenter:queue.columns.outcome')}</th>
              <th className="px-4 py-3 w-32 whitespace-nowrap">{t('callcenter:queue.columns.status')}</th>
              <th className="px-4 py-3 w-28 whitespace-nowrap"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                  {t('common:state.loading')}
                </td>
              </tr>
            )}
            {!loading && data.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                  {t('callcenter:queue.empty')}
                </td>
              </tr>
            )}
            {!loading &&
              data.items.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3 text-theme-sm text-gray-900 dark:text-white">
                    {c.firstName} {c.lastName}
                  </td>
                  <td className="px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">{c.phoneNumber}</td>
                  <td className="px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">{c.municipalityName ?? c.city ?? '-'}</td>
                  <td className="px-4 py-3 w-24 whitespace-nowrap text-theme-sm text-gray-700 dark:text-gray-300">
                    {c.attemptCount}
                  </td>
                  <td className="px-4 py-3 w-32 whitespace-nowrap text-theme-sm text-gray-700 dark:text-gray-300">
                    {outcomeLabel(c.lastOutcome)}
                  </td>
                  <td className="px-4 py-3 w-32 whitespace-nowrap text-theme-sm text-gray-700 dark:text-gray-300">
                    {finalStatusLabel(c.finalStatus)}
                  </td>
                  <td className="px-4 py-3 w-28 whitespace-nowrap text-theme-sm text-right">
                    <button
                      type="button"
                      disabled={claimingId === c.id}
                      onClick={() => callContact(c.id)}
                      className="rounded-lg bg-brand-500 hover:bg-brand-600 px-3 py-1.5 text-theme-xs font-medium text-white disabled:opacity-50"
                    >
                      {claimingId === c.id ? t('callcenter:queue.claiming') : t('callcenter:queue.call')}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="text-theme-xs text-gray-500 dark:text-gray-400">
          {t('common:pagination.summary', { count: data.totalCount, page: data.page, total: totalPages })}
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={data.page <= 1}
            onClick={() => setPage(data.page - 1)}
            className="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-1.5 text-theme-xs text-gray-600 dark:text-gray-400 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {t('common:button.prev')}
          </button>
          <button
            type="button"
            disabled={data.page >= totalPages}
            onClick={() => setPage(data.page + 1)}
            className="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-1.5 text-theme-xs text-gray-600 dark:text-gray-400 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {t('common:button.next')}
          </button>
        </div>
      </div>
    </div>
  )
}

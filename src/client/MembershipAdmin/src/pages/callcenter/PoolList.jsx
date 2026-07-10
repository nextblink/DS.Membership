// Pool list: filter by campaign, table with New/Refresh/Edit/Delete actions.
// Mirrors the card/table markup from pages/callcenter/CampaignList.jsx.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import callCenterApi from '../../services/callCenterApi'

export default function PoolList() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [campaignId, setCampaignId] = useState('')
  const [pools, setPools] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshMsg, setRefreshMsg] = useState(null)
  const [refreshingId, setRefreshingId] = useState(null)

  useEffect(() => {
    callCenterApi
      .listCampaigns(1, 100)
      .then((d) => setCampaigns(d.items ?? []))
      .catch(() => setCampaigns([]))
  }, [])

  const load = () => {
    setLoading(true)
    setError(null)
    callCenterApi
      .listPools(campaignId || undefined)
      .then((d) => setPools(Array.isArray(d) ? d : d?.items || []))
      .catch((err) => {
        setError(err?.response?.data?.message || 'Учитавање није успело.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId])

  const campaignName = (id) => campaigns.find((c) => c.id === id)?.name || `#${id}`

  const refresh = async (id) => {
    setRefreshingId(id)
    setRefreshMsg(null)
    try {
      const r = await callCenterApi.refreshPool(id)
      setRefreshMsg(`Додато ${r.added}, укупно у групи ${r.totalInPool}.`)
      load()
    } catch (err) {
      setError(err?.response?.data?.message || 'Освежавање није успело.')
    } finally {
      setRefreshingId(null)
    }
  }

  const remove = async (id) => {
    if (!window.confirm('Обрисати групу?')) return
    await callCenterApi.deletePool(id)
    load()
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h1 className="text-xl font-semibold text-brand-500 dark:text-brand-400">Групе за позивање</h1>
        <button
          type="button"
          onClick={() => navigate('/callcenter/pools/new')}
          className="inline-flex items-center gap-1 rounded-md bg-brand-500 hover:bg-brand-600 px-2.5 py-1 text-theme-xs font-medium text-white"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Нова група
        </button>
      </div>

      {/* Filter + refresh bar */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-brand-50 dark:bg-brand-500/[0.06] px-6 py-4">
        <div className="flex items-end gap-3">
          <div className="w-64">
            <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">Кампања</label>
            <select
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-theme-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              <option value="">Све кампање</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={load}
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-theme-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Освежи листу
          </button>
        </div>
        {refreshMsg && <p className="mt-2 text-theme-xs text-success-600 dark:text-success-400">{refreshMsg}</p>}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-theme-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Назив</th>
              <th className="px-4 py-3 w-48">Кампања</th>
              <th className="px-4 py-3 w-28 whitespace-nowrap">Контаката</th>
              <th className="px-4 py-3 w-28 whitespace-nowrap">Оператера</th>
              <th className="px-4 py-3 w-24 whitespace-nowrap">Активна</th>
              <th className="px-4 py-3 w-56"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                  Учитавање...
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-theme-sm text-error-500">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && pools.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                  Нема група.
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              pools.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3 text-theme-sm text-gray-900 dark:text-white">{p.name}</td>
                  <td className="px-4 py-3 w-48 text-theme-sm text-gray-700 dark:text-gray-300">
                    {campaignName(p.campaignId)}
                  </td>
                  <td className="px-4 py-3 w-28 whitespace-nowrap text-theme-sm text-gray-700 dark:text-gray-300">
                    {p.contactCount ?? 0}
                  </td>
                  <td className="px-4 py-3 w-28 whitespace-nowrap text-theme-sm text-gray-700 dark:text-gray-300">
                    {p.operators?.length ?? 0}
                  </td>
                  <td className="px-4 py-3 w-24 whitespace-nowrap text-theme-sm text-gray-700 dark:text-gray-300">
                    {p.isActive ? 'Да' : 'Не'}
                  </td>
                  <td className="px-4 py-3 w-56 text-right">
                    <button
                      type="button"
                      disabled={refreshingId === p.id}
                      onClick={() => refresh(p.id)}
                      className="mr-3 text-theme-xs font-medium text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50"
                    >
                      {refreshingId === p.id ? 'Освежавање...' : 'Освежи'}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/callcenter/pools/${p.id}/edit`)}
                      className="mr-3 text-theme-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      Измени
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(p.id)}
                      className="text-theme-xs font-medium text-error-600 dark:text-error-400 hover:underline"
                    >
                      Обриши
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

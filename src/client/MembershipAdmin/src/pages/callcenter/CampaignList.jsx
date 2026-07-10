// Campaign list: paged table with New/Edit/Delete actions.
// Mirrors the card/table/pagination markup from pages/members/MembersList.jsx.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import callCenterApi from '../../services/callCenterApi'
import { formatDate } from '../../services/dateUtils'

const PAGE_SIZE_DEFAULT = 20

export default function CampaignList() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ items: [], totalCount: 0, page: 1, pageSize: PAGE_SIZE_DEFAULT, totalPages: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = () => {
    setLoading(true)
    setError(null)
    callCenterApi
      .listCampaigns(page, PAGE_SIZE_DEFAULT)
      .then((d) => {
        setData({
          items: d.items ?? [],
          totalCount: d.totalCount ?? 0,
          page: d.page ?? 1,
          pageSize: d.pageSize ?? PAGE_SIZE_DEFAULT,
          totalPages: d.totalPages ?? 0,
        })
      })
      .catch((err) => {
        setError(err?.response?.data?.message || 'Учитавање није успело.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const remove = async (id) => {
    if (!window.confirm('Обрисати кампању?')) return
    await callCenterApi.deleteCampaign(id)
    load()
  }

  const totalPages = data.totalPages || Math.max(1, Math.ceil(data.totalCount / data.pageSize))

  const paginationBar = (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="text-theme-xs text-gray-500 dark:text-gray-400">
        Страна {data.page} од {totalPages} ({data.totalCount} укупно)
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={data.page <= 1}
          onClick={() => setPage(data.page - 1)}
          className="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-1.5 text-theme-xs text-gray-600 dark:text-gray-400 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Претходна
        </button>
        <button
          type="button"
          disabled={data.page >= totalPages}
          onClick={() => setPage(data.page + 1)}
          className="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-1.5 text-theme-xs text-gray-600 dark:text-gray-400 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Следећа
        </button>
      </div>
    </div>
  )

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h1 className="text-xl font-semibold text-brand-500 dark:text-brand-400">Кампање</h1>
        <button
          type="button"
          onClick={() => navigate('/callcenter/campaigns/new')}
          className="inline-flex items-center gap-1 rounded-md bg-brand-500 hover:bg-brand-600 px-2.5 py-1 text-theme-xs font-medium text-white"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Нова кампања
        </button>
      </div>

      {/* Pagination header */}
      <div className="border-b border-gray-200 dark:border-gray-800">{paginationBar}</div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-theme-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Назив</th>
              <th className="px-4 py-3 w-36 whitespace-nowrap">Почетак</th>
              <th className="px-4 py-3 w-24 whitespace-nowrap">Активна</th>
              <th className="px-4 py-3 w-28 whitespace-nowrap">Контаката</th>
              <th className="px-4 py-3 w-40"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                  Учитавање...
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-theme-sm text-error-500">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                  Нема кампања.
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              data.items.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3 text-theme-sm text-gray-900 dark:text-white">{c.name}</td>
                  <td className="px-4 py-3 w-36 whitespace-nowrap text-theme-sm text-gray-700 dark:text-gray-300">
                    {c.startDate ? formatDate(c.startDate) : '-'}
                  </td>
                  <td className="px-4 py-3 w-24 whitespace-nowrap text-theme-sm text-gray-700 dark:text-gray-300">
                    {c.isActive ? 'Да' : 'Не'}
                  </td>
                  <td className="px-4 py-3 w-28 whitespace-nowrap text-theme-sm text-gray-700 dark:text-gray-300">
                    {c.contactCount ?? 0}
                  </td>
                  <td className="px-4 py-3 w-40 text-right">
                    <button
                      type="button"
                      onClick={() => navigate(`/callcenter/campaigns/${c.id}/edit`)}
                      className="mr-3 text-theme-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      Измени
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
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

      {/* Pagination footer */}
      <div className="border-t border-gray-200 dark:border-gray-800">{paginationBar}</div>
    </div>
  )
}

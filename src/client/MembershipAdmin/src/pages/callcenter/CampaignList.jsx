// Campaign list: paged table with New/Edit/Delete actions.
// Mirrors the card/table/pagination markup from pages/members/MembersList.jsx.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Column } from 'primereact/column'
import callCenterApi from '../../services/callCenterApi'
import { formatDate } from '../../services/dateUtils'
import { useToast, ToastContainer } from '../../components/Toast'
import ServerDataTable, { columnHeaderPt, columnBodyPt } from '../../components/ServerDataTable'

const PAGE_SIZE_DEFAULT = 20

export default function CampaignList() {
  const { t } = useTranslation(['callcenter', 'common'])
  const navigate = useNavigate()
  const toast = useToast()
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
        setError(err?.response?.data?.message || t('callcenter:campaigns.loadFailed'))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const remove = async (id) => {
    if (!window.confirm(t('callcenter:campaigns.confirmDelete'))) return
    try {
      await callCenterApi.deleteCampaign(id)
      load()
    } catch (err) {
      toast.error(err?.response?.data?.message || t('callcenter:campaigns.deleteFailed'))
    }
  }

  const totalPages = data.totalPages || Math.max(1, Math.ceil(data.totalCount / data.pageSize))

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm overflow-hidden">
      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h1 className="text-xl font-semibold text-brand-500 dark:text-brand-400">{t('callcenter:campaigns.title')}</h1>
        <button
          type="button"
          onClick={() => navigate('/callcenter/campaigns/new')}
          className="inline-flex items-center gap-1 rounded-md bg-brand-500 hover:bg-brand-600 px-2.5 py-1 text-theme-xs font-medium text-white"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('callcenter:campaigns.new')}
        </button>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-error-200 dark:border-error-700 bg-error-50 dark:bg-error-500/10 px-4 py-3 text-theme-sm text-error-600 dark:text-error-400">
          {error}
        </div>
      )}

      <ServerDataTable
        items={data.items}
        page={page}
        pageSize={data.pageSize}
        totalCount={data.totalCount}
        totalPages={totalPages}
        loading={loading}
        onPageChange={setPage}
        emptyMessage={t('callcenter:campaigns.empty')}
        summaryText={t('common:pagination.summary', { count: data.totalCount, page: data.page, total: totalPages })}
      >
        <Column
          header={t('callcenter:campaigns.columns.name')}
          field="name"
          pt={{ headerCell: columnHeaderPt(), bodyCell: columnBodyPt('text-gray-900 dark:text-white') }}
        />
        <Column
          header={t('callcenter:campaigns.columns.start')}
          body={(c) => (c.startDate ? formatDate(c.startDate) : '-')}
          pt={{ headerCell: columnHeaderPt('w-36 whitespace-nowrap'), bodyCell: columnBodyPt('w-36 whitespace-nowrap') }}
        />
        <Column
          header={t('callcenter:campaigns.columns.active')}
          body={(c) => (c.isActive ? t('common:bool.yes') : t('common:bool.no'))}
          pt={{ headerCell: columnHeaderPt('w-24 whitespace-nowrap'), bodyCell: columnBodyPt('w-24 whitespace-nowrap') }}
        />
        <Column
          header={t('callcenter:campaigns.columns.contacts')}
          body={(c) => c.contactCount ?? 0}
          pt={{ headerCell: columnHeaderPt('w-28 whitespace-nowrap'), bodyCell: columnBodyPt('w-28 whitespace-nowrap') }}
        />
        <Column
          header=""
          body={(c) => (
            <>
              <button
                type="button"
                onClick={() => navigate(`/callcenter/campaigns/${c.id}/edit`)}
                className="mr-3 text-theme-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
              >
                {t('common:button.edit')}
              </button>
              <button
                type="button"
                onClick={() => remove(c.id)}
                className="text-theme-xs font-medium text-error-600 dark:text-error-400 hover:underline"
              >
                {t('common:button.delete')}
              </button>
            </>
          )}
          pt={{ headerCell: columnHeaderPt('w-40'), bodyCell: { className: 'px-4 py-3 w-40 text-right' } }}
        />
      </ServerDataTable>
    </div>
  )
}

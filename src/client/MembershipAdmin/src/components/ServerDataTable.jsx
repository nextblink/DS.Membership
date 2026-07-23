// Shared PrimeReact DataTable wrapper for server-paginated list pages. Extracted from the
// original pages/callcenter/CallQueue.jsx implementation so every list page shares the same
// unstyled-PrimeReact-via-`pt` look instead of duplicating the classNames/paginator plumbing.
import { DataTable } from 'primereact/datatable'

export const tableClassNames = {
  root: { className: 'text-sm' },
  wrapper: { className: 'overflow-x-auto' },
  table: { className: 'w-full text-left' },
  thead: { className: 'bg-gray-50 dark:bg-gray-800/50 text-theme-xs uppercase text-gray-500 dark:text-gray-400' },
  headerRow: {},
  tbody: {},
  bodyRow: { className: 'border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30' },
  emptyMessage: { className: 'px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400' },
}

const pageNavButtonClass =
  'rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-1.5 text-theme-xs text-gray-600 dark:text-gray-400 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800'
const pageNavIconClass = 'w-3 h-3'

export const paginatorClassNames = {
  root: { className: 'flex items-center gap-1.5 border-t border-gray-200 dark:border-gray-800 px-6 py-4' },
  left: { className: 'mr-auto' },
  firstPageButton: { className: pageNavButtonClass },
  firstPageIcon: { className: pageNavIconClass },
  prevPageButton: { className: pageNavButtonClass },
  prevPageIcon: { className: pageNavIconClass },
  nextPageButton: { className: pageNavButtonClass },
  nextPageIcon: { className: pageNavIconClass },
  lastPageButton: { className: pageNavButtonClass },
  lastPageIcon: { className: pageNavIconClass },
  pages: { className: 'flex items-center gap-1' },
  pageButton: (opts) => ({
    className:
      'rounded-lg border px-3 py-1.5 text-theme-xs ' +
      (opts?.context?.active
        ? 'border-brand-500 bg-brand-500 text-white'
        : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'),
  }),
}

export const columnHeaderPt = (extra = '') => ({ className: `px-4 py-3 ${extra}`.trim() })
export const columnBodyPt = (extra = '') => ({ className: `px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300 ${extra}`.trim() })

/**
 * Server-paginated DataTable: page is 1-based, pageSize fixed per page, onPageChange(nextPage)
 * fires on paginator navigation. Mirrors the {items,totalCount,page,pageSize,totalPages} API
 * contract used across the app's list endpoints.
 */
export default function ServerDataTable({
  items,
  page,
  pageSize,
  totalCount,
  totalPages,
  loading,
  onPageChange,
  emptyMessage,
  summaryText,
  children,
  ...rest
}) {
  return (
    <DataTable
      value={items}
      dataKey="id"
      loading={loading}
      emptyMessage={emptyMessage}
      lazy
      paginator
      paginatorPosition="both"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
      paginatorLeft={summaryText ? <span className="text-theme-xs text-gray-500 dark:text-gray-400">{summaryText}</span> : undefined}
      first={(page - 1) * pageSize}
      rows={pageSize}
      totalRecords={totalCount}
      onPage={(e) => onPageChange((e.page ?? 0) + 1)}
      pt={{ ...tableClassNames, paginator: paginatorClassNames }}
      {...rest}
    >
      {children}
    </DataTable>
  )
}

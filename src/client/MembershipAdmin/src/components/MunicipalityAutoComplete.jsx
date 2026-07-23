// Reusable municipality picker: PrimeReact AutoComplete (unstyled, Tailwind via `pt`) over the
// flattened Municipality tree, matched with transliteration-aware search. Extracted from
// pages/callcenter/CallQueue.jsx's original inline implementation.
import { useEffect, useState } from 'react'
import { AutoComplete } from 'primereact/autocomplete'
import callCenterApi from '../services/callCenterApi'
import { makeScriptMatcher } from '../services/transliteration'

const flattenMunicipalities = (nodes) =>
  (nodes ?? [])
    .flatMap((n) => [{ id: n.id, name: n.name }, ...flattenMunicipalities(n.children)])
    .sort((a, b) => a.name.localeCompare(b.name))

const inputClass =
  'w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-theme-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'

/**
 * value: the selected municipality's id (or '') — the parent owns the filter state.
 * onChange(id): fired on select/clear with the new id ('' when cleared).
 */
export default function MunicipalityAutoComplete({ value, onChange, placeholder }) {
  const [municipalities, setMunicipalities] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    callCenterApi
      .listMunicipalities()
      .then((tree) => setMunicipalities(flattenMunicipalities(tree)))
      .catch(() => setMunicipalities([]))
  }, [])

  // Keep the displayed value in sync when the id is cleared externally (e.g. a "Clear filters"
  // button resetting the parent's filter state directly).
  useEffect(() => {
    if (!value) setSelected(null)
  }, [value])

  const search = (e) => {
    const matches = makeScriptMatcher(e.query.trim())
    setSuggestions(municipalities.filter((m) => matches(m.name)))
  }

  const commit = (m) => {
    setSelected(m)
    onChange(m?.id ?? '')
  }

  return (
    <AutoComplete
      value={selected}
      suggestions={suggestions}
      completeMethod={search}
      onChange={(e) => {
        setSelected(e.value)
        if (!e.value) commit(null)
      }}
      onSelect={(e) => commit(e.value)}
      onClear={() => commit(null)}
      field="name"
      dropdown
      forceSelection
      placeholder={placeholder}
      pt={{
        root: { className: 'w-full flex items-stretch h-[31px]' },
        input: { root: { className: `${inputClass} flex-1 min-w-0 h-full leading-none rounded-r-none` } },
        loadingIcon: { className: 'hidden' },
        dropdownButton: {
          root: {
            className:
              'shrink-0 h-full flex items-center justify-center rounded-r-md rounded-l-none border border-l-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400',
          },
        },
        panel: {
          className: 'mt-1 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm',
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
  )
}

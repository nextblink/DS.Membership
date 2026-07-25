// Formats an ISO date string (yyyy-MM-dd) to dd/MM/yyyy for display.
export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const parts = String(dateStr).split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return dateStr
}

// The API serializes DateTime values that carry no Kind, so timestamps arrive
// without a Z or offset even though they are UTC. Date() would read those as
// local time and show them hours early, so tag them as UTC before parsing.
export function formatDateTime(value) {
  if (!value) return ''
  const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(value)
  const d = new Date(hasZone ? value : `${value}Z`)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('sr-RS')
}

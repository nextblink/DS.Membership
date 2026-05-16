// Formats an ISO date string (yyyy-MM-dd) to dd/MM/yyyy for display.
export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const parts = String(dateStr).split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return dateStr
}

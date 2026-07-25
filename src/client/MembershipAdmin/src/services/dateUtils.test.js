import { describe, it, expect } from 'vitest'
import { formatDateTime } from './dateUtils'

describe('formatDateTime', () => {
  it('returns empty string for null/undefined/empty input', () => {
    expect(formatDateTime(null)).toBe('')
    expect(formatDateTime(undefined)).toBe('')
    expect(formatDateTime('')).toBe('')
  })

  it('treats an offset-less string as UTC, not local time', () => {
    const offsetless = '2026-07-25T18:04:07.7508666'
    const result = formatDateTime(offsetless)
    // If it were (incorrectly) parsed as local time, the naive `new Date(...)`
    // parse would produce a different rendering than treating it as UTC
    // (unless the host machine happens to run in UTC).
    const naiveLocalResult = new Date(offsetless).toLocaleString('sr-RS')
    const expectedUtcResult = new Date(`${offsetless}Z`).toLocaleString('sr-RS')
    expect(result).toBe(expectedUtcResult)
    // Sanity check the test itself is meaningful in this environment: the two
    // interpretations should differ unless the runner's TZ is UTC.
    if (new Date().getTimezoneOffset() !== 0) {
      expect(result).not.toBe(naiveLocalResult)
    }
  })

  it('leaves a string already carrying a Z unchanged in meaning', () => {
    const zoned = '2026-07-25T18:04:07.750Z'
    expect(formatDateTime(zoned)).toBe(new Date(zoned).toLocaleString('sr-RS'))
  })

  it('leaves a string already carrying a numeric offset unchanged in meaning', () => {
    const zoned = '2026-07-25T18:04:07.750+02:00'
    expect(formatDateTime(zoned)).toBe(new Date(zoned).toLocaleString('sr-RS'))
  })
})

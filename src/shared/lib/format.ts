import dayjs from 'dayjs'

/**
 * Date/time formatting helpers. BE returns Instant as ISO-8601 string
 * (e.g., `"2026-06-07T03:00:00Z"`). Display uses local timezone via dayjs default.
 *
 * For BE-side reference: ARCHITECTURE_DECISIONS specifies `Instant` + `timestamptz`
 * with display format `YYYY-MM-DD HH:mm:ss [GMT]Z`. The `[GMT]Z` suffix is mostly
 * relevant for raw exports; for UI tables, plain local time is cleaner.
 */

const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'
const DATE_FORMAT = 'YYYY-MM-DD'

type DateInput = string | number | Date | dayjs.Dayjs | null | undefined

/** Format as `YYYY-MM-DD HH:mm:ss`. Returns empty string for null/undefined/invalid input. */
export function formatDateTime(value: DateInput): string {
  if (value == null) return ''
  const d = dayjs(value)
  return d.isValid() ? d.format(DATE_TIME_FORMAT) : ''
}

/** Format as `YYYY-MM-DD`. */
export function formatDate(value: DateInput): string {
  if (value == null) return ''
  const d = dayjs(value)
  return d.isValid() ? d.format(DATE_FORMAT) : ''
}

const BYTE_UNITS = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'] as const

/** Format byte count as human-readable size (e.g. `1.23 KB`, `4.56 MB`). */
export function formatBytes(bytes: number, decimals = 2): string {
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), BYTE_UNITS.length - 1)
  const value = bytes / Math.pow(k, i)

  return `${parseFloat(value.toFixed(dm))} ${BYTE_UNITS[i]}`
}

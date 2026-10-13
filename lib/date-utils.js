/**
 * Returns today's date in local calendar YYYY-MM-DD format.
 */
export function getLocalTodayString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Returns tomorrow's date in local calendar YYYY-MM-DD format.
 */
export function getTomorrowString() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return getLocalTodayString(d)
}

/**
 * Validates YYYY-MM-DD date string.
 */
export function isValidDateString(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false
  const [y, m, d] = str.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

/**
 * Counts calendar days inclusively between fromDate and toDate.
 */
export function countDays(fromDate, toDate) {
  if (!isValidDateString(fromDate) || !isValidDateString(toDate)) return 1
  const [y1, m1, d1] = fromDate.split('-').map(Number)
  const [y2, m2, d2] = toDate.split('-').map(Number)
  const start = Date.UTC(y1, m1 - 1, d1)
  const end = Date.UTC(y2, m2 - 1, d2)
  if (end < start) return 0
  const diffMs = end - start
  return Math.round(diffMs / 86400000) + 1
}

/**
 * Returns array of dates between fromDate and toDate inclusive.
 */
export function getDatesInRange(fromDate, toDate) {
  if (!isValidDateString(fromDate)) return []
  if (!toDate || !isValidDateString(toDate)) toDate = fromDate

  const dates = []
  const [y1, m1, d1] = fromDate.split('-').map(Number)
  const [y2, m2, d2] = toDate.split('-').map(Number)
  const cur = new Date(y1, m1 - 1, d1)
  const end = new Date(y2, m2 - 1, d2)

  while (cur <= end) {
    dates.push(getLocalTodayString(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

/**
 * Checks if two time intervals overlap (start-inclusive, end-exclusive).
 */
export function isTimeIntervalOverlap(s1, e1, s2, e2) {
  return s1 < e2 && e1 > s2
}

export const HALL_OPERATIONAL_HOURS = {
  startTime: '08:00',
  endTime: '22:00',
}

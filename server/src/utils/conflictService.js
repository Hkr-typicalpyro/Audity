import Reservation from '../models/Reservation.js'
import Blackout from '../models/Blackout.js'

/**
 * Standard operational hours for halls across the complex.
 * Used when bookingType is 'full-day'.
 */
export const HALL_OPERATIONAL_HOURS = {
  startTime: '08:00',
  endTime: '22:00',
}

/**
 * Predefined named slots for backwards-compatibility with legacy slotId.
 */
export const PRESET_SLOTS = {
  morning:   { id: 'morning', label: 'MORNING', startTime: '09:00', endTime: '12:00' },
  afternoon: { id: 'afternoon', label: 'AFTERNOON', startTime: '13:00', endTime: '16:00' },
  evening:   { id: 'evening', label: 'EVENING', startTime: '17:00', endTime: '20:00' },
}

/**
 * In-memory mutex map to serialize reservation/blackout conflict checks
 * for the same hall and prevent race conditions.
 */
const hallLocks = new Map()

export async function withHallLock(hallId, fn) {
  const key = hallId ? hallId.toString() : 'global'
  while (hallLocks.has(key)) {
    await hallLocks.get(key)
  }
  let release
  const promise = new Promise((resolve) => {
    release = resolve
  })
  hallLocks.set(key, promise)
  try {
    return await fn()
  } finally {
    hallLocks.delete(key)
    release()
  }
}

/**
 * Returns today's date string in local calendar format (YYYY-MM-DD).
 * Avoids UTC timezone conversion shifts.
 */
export function getLocalTodayString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
 * Validates 24-hour HH:mm time string.
 */
export function isValidTimeString(str) {
  return typeof str === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(str)
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
 * Returns an array of calendar date strings (YYYY-MM-DD) inclusive of fromDate and toDate.
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
 * Start-inclusive and end-exclusive interval overlap check.
 * [s1, e1) overlaps [s2, e2) iff s1 < e2 && e1 > s2.
 * Handled as lexicographical HH:mm comparison.
 */
export function isTimeIntervalOverlap(s1, e1, s2, e2) {
  return s1 < e2 && e1 > s2
}

/**
 * Centralized validation for booking request inputs.
 */
export function validateBookingInput({ fromDate, toDate, bookingType = 'timed', startTime, endTime }) {
  if (!fromDate) {
    return { valid: false, status: 400, message: 'From Date is required' }
  }
  if (!toDate) {
    return { valid: false, status: 400, message: 'To Date is required' }
  }
  if (!isValidDateString(fromDate)) {
    return { valid: false, status: 400, message: 'From Date must be a valid date in YYYY-MM-DD format' }
  }
  if (!isValidDateString(toDate)) {
    return { valid: false, status: 400, message: 'To Date must be a valid date in YYYY-MM-DD format' }
  }

  const today = getLocalTodayString()
  if (fromDate < today) {
    return { valid: false, status: 400, message: 'Booking date cannot be in the past' }
  }
  if (toDate < fromDate) {
    return { valid: false, status: 400, message: 'To Date cannot be earlier than From Date' }
  }

  const type = bookingType || 'timed'
  if (type !== 'timed' && type !== 'full-day') {
    return { valid: false, status: 400, message: "bookingType must be 'timed' or 'full-day'" }
  }

  if (type === 'timed') {
    if (!startTime || !endTime) {
      return { valid: false, status: 400, message: 'From Time and To Time are required for timed bookings' }
    }
    if (!isValidTimeString(startTime) || !isValidTimeString(endTime)) {
      return { valid: false, status: 400, message: 'Times must be valid 24-hour HH:mm format' }
    }
    if (startTime >= endTime) {
      return { valid: false, status: 400, message: 'End time must be later than start time' }
    }
  }

  return { valid: true }
}

/**
 * Centralized conflict checker against confirmed reservations and blackouts.
 */
export async function checkHallConflict({
  hallId,
  fromDate,
  toDate,
  bookingType = 'timed',
  startTime,
  endTime,
  excludeReservationId = null,
  session = null,
}) {
  const datesToBook = getDatesInRange(fromDate, toDate)
  const opts = session ? { session } : {}

  // Effective time bounds for this request on each affected day
  const effectiveStart = bookingType === 'full-day' ? HALL_OPERATIONAL_HOURS.startTime : startTime
  const effectiveEnd   = bookingType === 'full-day' ? HALL_OPERATIONAL_HOURS.endTime   : endTime

  // 1. Check Owner Blackouts
  const blackouts = await Blackout.find(
    {
      hall: hallId,
      $or: [
        { date: { $in: datesToBook } },
        { fromDate: { $lte: toDate }, toDate: { $gte: fromDate } },
      ],
    },
    null,
    opts
  ).lean()

  for (const blk of blackouts) {
    const blkDates = blk.fromDate && blk.toDate
      ? getDatesInRange(blk.fromDate, blk.toDate)
      : [blk.date]

    for (const d of datesToBook) {
      if (blkDates.includes(d)) {
        // Date coincides
        const blkSlot = PRESET_SLOTS[blk.slotId]
        const blkStart = blk.startTime || blkSlot?.startTime || HALL_OPERATIONAL_HOURS.startTime
        const blkEnd   = blk.endTime   || blkSlot?.endTime   || HALL_OPERATIONAL_HOURS.endTime
        const isFullDayBlackout = !blk.slotId || blk.slotId === 'all-day' || blk.slotId === 'full-day'

        if (bookingType === 'full-day' || isFullDayBlackout) {
          return {
            hasConflict: true,
            status: 409,
            message: `Hall is blacked out on ${d}: ${blk.reason}${blk.note ? ` — ${blk.note}` : ''}`,
            date: d,
            conflictType: 'BLACKOUT',
          }
        }

        // Both have time intervals: check start-inclusive, end-exclusive overlap
        if (isTimeIntervalOverlap(effectiveStart, effectiveEnd, blkStart, blkEnd)) {
          return {
            hasConflict: true,
            status: 409,
            message: `Hall is blacked out on ${d} (${blkStart}–${blkEnd}): ${blk.reason}`,
            date: d,
            conflictType: 'BLACKOUT',
          }
        }
      }
    }
  }

  // 2. Check Confirmed Reservations
  const resQuery = {
    hall: hallId,
    status: 'CONFIRMED',
    $or: [
      { date: { $in: datesToBook } },
      { fromDate: { $lte: toDate }, toDate: { $gte: fromDate } },
    ],
  }
  if (excludeReservationId) {
    resQuery._id = { $ne: excludeReservationId }
  }

  const existingReservations = await Reservation.find(resQuery, null, opts).lean()

  for (const res of existingReservations) {
    const rFrom = res.fromDate || res.date
    const rTo   = res.toDate || rFrom
    const rDates = getDatesInRange(rFrom, rTo)
    const rType = res.bookingType || 'timed'
    const rSlot = PRESET_SLOTS[res.slotId]
    const rStart = res.startTime || rSlot?.startTime || HALL_OPERATIONAL_HOURS.startTime
    const rEnd   = res.endTime   || rSlot?.endTime   || HALL_OPERATIONAL_HOURS.endTime

    for (const d of datesToBook) {
      if (rDates.includes(d)) {
        // Date coincides
        if (bookingType === 'full-day' || rType === 'full-day') {
          return {
            hasConflict: true,
            status: 409,
            message: `Hall is already reserved on ${d} by ${res.organiserName || 'another organiser'}${rType === 'full-day' ? ' (Full day)' : ` (${rStart}–${rEnd})`}`,
            date: d,
            conflictType: 'RESERVATION',
          }
        }

        // Both are timed bookings
        if (isTimeIntervalOverlap(effectiveStart, effectiveEnd, rStart, rEnd)) {
          return {
            hasConflict: true,
            status: 409,
            message: `Hall is already reserved on ${d} (${rStart}–${rEnd}) by ${res.organiserName || 'another organiser'}`,
            date: d,
            conflictType: 'RESERVATION',
          }
        }
      }
    }
  }

  return { hasConflict: false }
}

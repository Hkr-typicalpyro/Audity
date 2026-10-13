import Blackout from '../models/Blackout.js'
import Hall from '../models/Hall.js'
import Reservation from '../models/Reservation.js'
import User from '../models/User.js'
import {
  getLocalTodayString,
  isValidDateString,
  checkHallConflict,
  withHallLock,
  PRESET_SLOTS,
  HALL_OPERATIONAL_HOURS,
} from '../utils/conflictService.js'

function transformBlackout(blk) {
  const obj = blk.toJSON ? blk.toJSON() : blk
  return {
    id: obj._id.toString(),
    _id: obj._id.toString(),
    hallId: obj.hall?._id ? obj.hall._id.toString() : obj.hall?.toString(),
    hallCode: obj.hallCode || '',
    date: obj.date,
    fromDate: obj.fromDate || obj.date,
    toDate: obj.toDate || obj.date,
    slotId: obj.slotId,
    startTime: obj.startTime || '',
    endTime: obj.endTime || '',
    reason: obj.reason,
    note: obj.note || '',
    createdBy: obj.createdBy?._id ? obj.createdBy._id.toString() : obj.createdBy?.toString(),
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  }
}

// GET /api/blackouts — all authenticated users (needed for availability inspections)
export const getBlackouts = async (req, res) => {
  try {
    const blackouts = await Blackout.find().sort({ date: 1, slotId: 1 }).lean()
    res.status(200).json({
      success: true,
      count: blackouts.length,
      blackouts: blackouts.map((b) => transformBlackout(b)),
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch blackouts' })
  }
}

// POST /api/blackouts — owner only
export const createBlackout = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('role')
    if (!user || user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Forbidden — only owners can create blackouts' })
    }

    const { hallId, date, slotId, reason, note } = req.body
    if (!hallId || !date || !slotId) {
      return res.status(400).json({ success: false, message: 'hallId, date, and slotId are required' })
    }

    if (!isValidDateString(date)) {
      return res.status(400).json({ success: false, message: 'date must be a valid date in YYYY-MM-DD format' })
    }

    const today = getLocalTodayString()
    if (date < today) {
      return res.status(400).json({ success: false, message: 'Cannot create blackout in the past' })
    }

    const hall = await Hall.findById(hallId)
    if (!hall) {
      return res.status(404).json({ success: false, message: 'Hall not found' })
    }

    const slot = PRESET_SLOTS[slotId] || {
      startTime: req.body.startTime || HALL_OPERATIONAL_HOURS.startTime,
      endTime: req.body.endTime || HALL_OPERATIONAL_HOURS.endTime,
    }

    const result = await withHallLock(hall._id, async () => {
      // Check if duplicate blackout already exists
      const existingBlackout = await Blackout.findOne({ hall: hall._id, date, slotId })
      if (existingBlackout) {
        return { conflict: true, status: 409, message: 'Blackout already exists for this hall, date, and slot' }
      }

      // Check conflict against any active confirmed reservation (single-day, multi-day, full-day, timed)
      const conflictCheck = await checkHallConflict({
        hallId: hall._id,
        fromDate: date,
        toDate: date,
        bookingType: slotId === 'full-day' ? 'full-day' : 'timed',
        startTime: slot.startTime,
        endTime: slot.endTime,
      })

      if (conflictCheck.hasConflict && conflictCheck.conflictType === 'RESERVATION') {
        return {
          conflict: true,
          status: 409,
          message: 'Cannot create blackout: Hall is already reserved for a confirmed event during this date and time slot',
        }
      }

      const blackout = await Blackout.create({
        hall: hall._id,
        hallCode: hall.code,
        date,
        fromDate: date,
        toDate: date,
        slotId,
        startTime: slot.startTime,
        endTime: slot.endTime,
        reason: (reason || 'MAINTENANCE').trim(),
        note: (note || '').trim(),
        createdBy: req.user.id,
      })

      return { conflict: false, blackout: transformBlackout(blackout) }
    })

    if (result.conflict) {
      return res.status(result.status).json({ success: false, message: result.message })
    }

    res.status(201).json({
      success: true,
      blackout: result.blackout,
    })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to create blackout' })
  }
}

// DELETE /api/blackouts/:blackoutId — owner only
export const deleteBlackout = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('role')
    if (!user || user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Forbidden — only owners can remove blackouts' })
    }

    const blackout = await Blackout.findByIdAndDelete(req.params.blackoutId)
    if (!blackout) {
      return res.status(404).json({ success: false, message: 'Blackout not found' })
    }

    res.status(200).json({
      success: true,
      message: 'Blackout removed successfully',
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete blackout' })
  }
}

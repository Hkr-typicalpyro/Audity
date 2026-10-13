import mongoose from 'mongoose'
import Reservation from '../models/Reservation.js'
import Hall from '../models/Hall.js'
import User from '../models/User.js'
import Payment from '../models/Payment.js'
import PlatformSettings from '../models/PlatformSettings.js'
import {
  validateBookingInput,
  checkHallConflict,
  withHallLock,
  countDays,
  PRESET_SLOTS,
  HALL_OPERATIONAL_HOURS,
} from '../utils/conflictService.js'

export function transformReservation(res) {
  const obj = res.toJSON ? res.toJSON() : res
  const fromDate = obj.fromDate || obj.date
  const toDate = obj.toDate || fromDate
  const bookingType = obj.bookingType || 'timed'

  return {
    id: obj._id.toString(),
    _id: obj._id.toString(),
    hallId: obj.hall?._id ? obj.hall._id.toString() : obj.hall?.toString(),
    hallName: obj.hallName,
    bookingType,
    fromDate,
    toDate,
    date: fromDate, // backwards-compatible mirror
    slotId: obj.slotId,
    startTime: obj.startTime,
    endTime: obj.endTime,
    eventId: obj.event?._id ? obj.event._id.toString() : obj.event?.toString(),
    organiser: obj.organiserName,
    organiserName: obj.organiserName,
    organiserId: obj.organiser?._id ? obj.organiser._id.toString() : obj.organiser?.toString(),
    amount: obj.amount,
    status: obj.status,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  }
}

// GET /api/reservations — Organiser (own) and Owner (all). Attendee -> 403.
export const getReservations = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('role')
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' })
    }

    if (user.role === 'attendee') {
      return res.status(403).json({ success: false, message: 'Forbidden — attendees cannot read hall reservations' })
    }

    const query = user.role === 'organiser' ? { organiser: req.user.id } : {}
    const reservations = await Reservation.find(query).sort({ fromDate: 1, startTime: 1 }).lean()

    res.status(200).json({
      success: true,
      count: reservations.length,
      reservations: reservations.map((r) => transformReservation(r)),
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch reservations' })
  }
}

// POST /api/reservations — Organiser or Owner (Direct Reservation Creation)
export const createReservation = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSingleton()
    if (!settings.hallRentalEnabled) {
      return res.status(403).json({ success: false, message: 'Hall rentals are currently disabled' })
    }

    const {
      hallId,
      date,
      slotId,
      method,
    } = req.body

    const fromDate = req.body.fromDate || date
    const toDate = req.body.toDate || fromDate
    const bookingType = req.body.bookingType || (slotId === 'full-day' ? 'full-day' : 'timed')

    let startTime = req.body.startTime
    let endTime = req.body.endTime

    if (bookingType === 'full-day') {
      startTime = HALL_OPERATIONAL_HOURS.startTime
      endTime = HALL_OPERATIONAL_HOURS.endTime
    } else if (slotId && PRESET_SLOTS[slotId] && (!startTime || !endTime)) {
      startTime = PRESET_SLOTS[slotId].startTime
      endTime = PRESET_SLOTS[slotId].endTime
    }

    // 1. Validate inputs (dates, times, booking-type)
    const validation = validateBookingInput({
      fromDate,
      toDate,
      bookingType,
      startTime,
      endTime,
    })
    if (!validation.valid) {
      return res.status(validation.status).json({
        success: false,
        message: validation.message,
      })
    }

    // 2. Validate Hall
    if (!hallId) {
      return res.status(400).json({ success: false, message: 'hallId is required' })
    }
    const hall = await Hall.findById(hallId)
    if (!hall) {
      return res.status(404).json({ success: false, message: 'Hall not found' })
    }
    if (!hall.isActive) {
      return res.status(400).json({ success: false, message: 'Cannot reserve a disabled hall' })
    }

    // 3. User verification
    const organiserUser = await User.findById(req.user.id).select('name')
    if (!organiserUser) {
      return res.status(401).json({ success: false, message: 'Organiser user not found' })
    }

    // 4. Lock hall and perform conflict detection + persistence
    const result = await withHallLock(hall._id, async () => {
      // Conflict check
      const conflictCheck = await checkHallConflict({
        hallId: hall._id,
        fromDate,
        toDate,
        bookingType,
        startTime,
        endTime,
      })
      if (conflictCheck.hasConflict) {
        return {
          conflict: true,
          status: conflictCheck.status,
          message: conflictCheck.message,
        }
      }

      const daysCount = countDays(fromDate, toDate)
      const rentalAmount = hall.rentalFee * daysCount

      let session = null
      try {
        session = await mongoose.startSession()
        session.startTransaction()
      } catch (err) {
        session = null
      }
      const opts = session ? { session } : {}

      try {
        const [reservation] = await Reservation.create(
          [
            {
              hall: hall._id,
              hallName: hall.name,
              bookingType,
              fromDate,
              toDate,
              date: fromDate,
              slotId: bookingType === 'full-day' ? 'full-day' : (slotId || 'custom'),
              startTime,
              endTime,
              event: null,
              organiser: organiserUser._id,
              organiserName: organiserUser.name,
              amount: rentalAmount,
              status: 'CONFIRMED',
            },
          ],
          opts
        )

        const paymentId = `pay-r-${Date.now().toString(36)}-${Math.floor(1000 + Math.random() * 8999)}`
        const [payment] = await Payment.create(
          [
            {
              customId: paymentId,
              type: 'HALL_RENTAL',
              user: organiserUser._id,
              event: null,
              refId: reservation._id.toString(),
              amount: rentalAmount,
              method: method || 'NETBANKING',
              status: 'PAID',
            },
          ],
          opts
        )

        if (session) {
          await session.commitTransaction()
          session.endSession()
        }

        return {
          conflict: false,
          reservation: transformReservation(reservation),
          payment: payment.toJSON ? payment.toJSON() : payment,
        }
      } catch (err) {
        if (session) {
          await session.abortTransaction()
          session.endSession()
        }
        throw err
      }
    })

    if (result.conflict) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      })
    }

    res.status(201).json({
      success: true,
      reservation: result.reservation,
      payment: result.payment,
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create reservation',
    })
  }
}

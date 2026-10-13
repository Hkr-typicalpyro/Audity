import mongoose from 'mongoose'
import Event from '../models/Event.js'
import Hall from '../models/Hall.js'
import User from '../models/User.js'
import Reservation from '../models/Reservation.js'
import Blackout from '../models/Blackout.js'
import Ticket from '../models/Ticket.js'
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

/**
 * Transform a Mongoose Event document into the shape the frontend expects.
 */
function transformEvent(event) {
  const obj = event.toJSON ? event.toJSON() : event
  const fromDate = obj.fromDate || obj.date
  const toDate = obj.toDate || fromDate
  const bookingType = obj.bookingType || 'timed'

  return {
    id: obj._id.toString(),
    _id: obj._id.toString(),
    title: obj.title,
    description: obj.description,
    category: obj.category,
    hallId: obj.hall?._id ? obj.hall._id.toString() : obj.hall?.toString(),
    hallCode: obj.hallCode,
    hallName: obj.hallName,
    floor: obj.floor,
    entranceGate: obj.entranceGate,
    bookingType,
    fromDate,
    toDate,
    date: fromDate, // mirror for backwards compatibility
    startTime: obj.startTime,
    endTime: obj.endTime,
    slotId: obj.slotId,
    maxCapacity: obj.maxCapacity,
    registeredCount: obj.registeredCount,
    ticketPrice: obj.ticketPrice,
    organiser: obj.organiserName,
    organiserName: obj.organiserName,
    organiserId: obj.organiser ? obj.organiser.toString() : null,
    status: obj.status,
    cancellationReason: obj.cancellationReason,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  }
}

function transformReservation(res) {
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
    date: fromDate,
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

function transformPayment(p) {
  const obj = p.toJSON ? p.toJSON() : p
  return {
    id: obj.customId || obj._id.toString(),
    _id: obj._id.toString(),
    type: obj.type,
    refId: obj.refId ? obj.refId.toString() : '',
    amount: obj.amount,
    method: obj.method || 'NETBANKING',
    status: obj.status,
    user: obj.user?._id ? obj.user._id.toString() : obj.user?.toString(),
    event: obj.event?._id ? obj.event._id.toString() : obj.event?.toString(),
    createdAt: (obj.createdAt || new Date()).toISOString(),
    updatedAt: obj.updatedAt,
  }
}

// GET /api/events — authenticated (attendee, organiser, owner)
export const getEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .sort({ fromDate: 1, startTime: 1 })
      .lean()

    res.status(200).json({
      success: true,
      count: events.length,
      events: events.map((e) => transformEvent(e)),
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events',
    })
  }
}

// GET /api/events/:eventId — authenticated
export const getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId).lean()

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      })
    }

    res.status(200).json({
      success: true,
      event: transformEvent(event),
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event',
    })
  }
}

// POST /api/events — organiser or owner (Transactional Hall Rental & Publish)
export const createEvent = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSingleton()
    if (!settings.hallRentalEnabled) {
      return res.status(403).json({ success: false, message: 'Hall rentals are currently disabled' })
    }

    const {
      title,
      description,
      category,
      hallId,
      date,
      slotId,
      ticketPrice,
      maxCapacity,
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

    // 1. Validate required event fields
    if (!title || !description || !category || !hallId) {
      return res.status(400).json({
        success: false,
        message: 'title, description, category, hallId are required',
      })
    }

    // 2. Validate dates and time range
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

    // 3. Validate hall exists and is active
    const hall = await Hall.findById(hallId)
    if (!hall) {
      return res.status(404).json({
        success: false,
        message: 'Hall not found',
      })
    }
    if (!hall.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create event in a disabled hall',
      })
    }

    // 4. Validate capacity
    const capacity = Number(maxCapacity)
    if (!capacity || capacity < 1) {
      return res.status(400).json({
        success: false,
        message: 'maxCapacity must be at least 1',
      })
    }
    if (capacity > hall.capacity) {
      return res.status(400).json({
        success: false,
        message: `maxCapacity (${capacity}) exceeds hall capacity (${hall.capacity})`,
      })
    }

    // 5. Load authenticated organiser from JWT
    const organiserUser = await User.findById(req.user.id).select('name')
    if (!organiserUser) {
      return res.status(401).json({
        success: false,
        message: 'Organiser user not found',
      })
    }

    // 6. Concurrency-safe conflict check and atomic creation
    const daysCount = countDays(fromDate, toDate)
    const rentalAmount = hall.rentalFee * daysCount

    const result = await withHallLock(hall._id, async () => {
      // Check conflict
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

      let session = null
      try {
        session = await mongoose.startSession()
        session.startTransaction()
      } catch (err) {
        session = null
      }
      const opts = session ? { session } : {}

      try {
        const [event] = await Event.create([
          {
            title: title.trim(),
            description: description.trim(),
            category,
            hall: hall._id,
            hallCode: hall.code,
            hallName: hall.name,
            floor: hall.floor,
            entranceGate: hall.entranceGate,
            bookingType,
            fromDate,
            toDate,
            date: fromDate,
            startTime,
            endTime,
            slotId: bookingType === 'full-day' ? 'full-day' : (slotId || 'custom'),
            maxCapacity: Math.min(capacity, hall.capacity),
            registeredCount: 0,
            ticketPrice: Number(ticketPrice) || 0,
            organiser: organiserUser._id,
            organiserName: organiserUser.name,
            status: 'PUBLISHED',
            cancellationReason: null,
          },
        ], opts)

        const [reservation] = await Reservation.create([
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
            event: event._id,
            organiser: organiserUser._id,
            organiserName: organiserUser.name,
            amount: rentalAmount,
            status: 'CONFIRMED',
          },
        ], opts)

        const paymentId = `pay-r-${Date.now().toString(36)}-${Math.floor(1000 + Math.random() * 8999)}`
        const [payment] = await Payment.create([
          {
            customId: paymentId,
            type: 'HALL_RENTAL',
            user: organiserUser._id,
            event: event._id,
            refId: reservation._id.toString(),
            amount: rentalAmount,
            method: method || 'NETBANKING',
            status: 'PAID',
          },
        ], opts)

        if (session) {
          await session.commitTransaction()
          session.endSession()
        }

        return {
          conflict: false,
          event: transformEvent(event),
          reservation: transformReservation(reservation),
          payment: transformPayment(payment),
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
      event: result.event,
      reservation: result.reservation,
      payment: result.payment,
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create event and reservation',
    })
  }
}

// PATCH /api/events/:eventId — owning organiser or owner
export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId)
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      })
    }

    const user = await User.findById(req.user.id).select('role')
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' })
    }

    // Organisers may only edit their own events
    if (user.role === 'organiser') {
      if (!event.organiser || event.organiser.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden — you can only edit your own events',
        })
      }
    }

    // Whitelist updatable fields
    const allowed = ['title', 'description', 'category', 'ticketPrice', 'maxCapacity']
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        event[field] = req.body[field]
      }
    }

    await event.save({ runValidators: true })

    res.status(200).json({
      success: true,
      event: transformEvent(event),
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update event',
    })
  }
}

// PATCH /api/events/:eventId/cancel — owner only (Transactional event cancellation & refunds)
export const cancelEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId)
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      })
    }

    if (event.status === 'CANCELLED') {
      return res.status(409).json({
        success: false,
        message: 'Event is already cancelled',
      })
    }

    const reason = (req.body.reason || '').trim() || 'Cancelled by complex owner'

    let session = null
    try {
      session = await mongoose.startSession()
      session.startTransaction()
    } catch (err) {
      session = null
    }
    const opts = session ? { session } : {}

    try {
      event.status = 'CANCELLED'
      event.cancellationReason = reason
      event.registeredCount = 0
      await event.save(opts)

      // Release active reservation
      await Reservation.updateMany({ event: event._id, status: 'CONFIRMED' }, { $set: { status: 'RELEASED' } }, opts)

      // Find and cancel confirmed tickets, voiding and refunding
      const confirmedTickets = await Ticket.find({ event: event._id, status: 'CONFIRMED' }, null, opts)
      const ticketCustomIds = confirmedTickets.map((t) => t.customId)

      if (confirmedTickets.length > 0) {
        await Ticket.updateMany({ event: event._id, status: 'CONFIRMED' }, { $set: { status: 'CANCELLED', checkedIn: false } }, opts)
        await Payment.updateMany({ refId: { $in: ticketCustomIds }, type: 'TICKET', status: 'PAID' }, { $set: { status: 'REFUNDED' } }, opts)
      }

      if (session) {
        await session.commitTransaction()
        session.endSession()
      }

      res.status(200).json({
        success: true,
        event: transformEvent(event),
        refundedTicketsCount: confirmedTickets.length,
      })
    } catch (err) {
      if (session) {
        await session.abortTransaction()
        session.endSession()
      }
      throw err
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel event',
    })
  }
}

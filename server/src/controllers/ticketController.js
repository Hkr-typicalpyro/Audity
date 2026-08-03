import mongoose from 'mongoose'
import Ticket from '../models/Ticket.js'
import Event from '../models/Event.js'
import User from '../models/User.js'
import Payment from '../models/Payment.js'
import PlatformSettings from '../models/PlatformSettings.js'

export function transformTicket(ticket, reqUserId) {
  const obj = ticket.toJSON ? ticket.toJSON() : ticket
  const attendeeId = obj.attendee?._id ? obj.attendee._id.toString() : obj.attendee?.toString()
  return {
    id: obj.customId || obj._id.toString(),
    _id: obj._id.toString(),
    customId: obj.customId || obj._id.toString(),
    eventId: obj.event?._id ? obj.event._id.toString() : obj.event?.toString(),
    attendeeId,
    attendeeName: obj.attendeeName,
    attendeeEmail: obj.attendeeEmail,
    quantity: obj.quantity,
    amount: obj.amount,
    bookedAt: (obj.bookedAt || obj.createdAt || new Date()).toISOString(),
    status: obj.status,
    checkedIn: Boolean(obj.checkedIn),
    checkedInAt: obj.checkedInAt || null,
    ownedByUser: Boolean(reqUserId && attendeeId && reqUserId.toString() === attendeeId.toString()),
  }
}

// POST /api/events/:eventId/book — attendee only (Atomic ticket booking)
export const bookTicket = async (req, res) => {
  let session = null
  try {
    const settings = await PlatformSettings.getSingleton()
    if (!settings.ticketSalesEnabled) {
      return res.status(403).json({ success: false, message: 'Ticket sales are currently disabled' })
    }

    const { eventId } = req.params
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ success: false, message: 'Invalid Event ID' })
    }

    const qty = Number(req.body.quantity)
    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive integer' })
    }

    // Role check: only attendees book tickets
    const user = await User.findById(req.user.id).select('role name email')
    if (!user) return res.status(401).json({ success: false, message: 'User not found' })
    if (user.role !== 'attendee') {
      return res.status(403).json({ success: false, message: 'Forbidden — only attendees can book tickets' })
    }

    const initialEvent = await Event.findById(eventId)
    if (!initialEvent) {
      return res.status(404).json({ success: false, message: 'Event not found' })
    }
    if (initialEvent.status !== 'PUBLISHED') {
      return res.status(409).json({ success: false, message: 'Event is not bookable (cancelled or unpublished)' })
    }
    if (initialEvent.registeredCount + qty > initialEvent.maxCapacity) {
      return res.status(409).json({ success: false, message: 'Sold out or insufficient remaining seats' })
    }

    let retries = 3
    while (retries > 0) {
      retries--
      try {
        session = await mongoose.startSession()
        session.startTransaction()
        const opts = { session }

        // Re-verify remaining capacity atomically within transaction session
        const updatedEvent = await Event.findOneAndUpdate(
          {
            _id: eventId,
            status: 'PUBLISHED',
            registeredCount: { $lte: initialEvent.maxCapacity - qty },
          },
          { $inc: { registeredCount: qty } },
          { returnDocument: 'after', ...opts },
        )

        if (!updatedEvent) {
          await session.abortTransaction()
          session.endSession()
          return res.status(409).json({
            success: false,
            message: 'Sold out or insufficient remaining seats for requested quantity',
          })
        }

        const amount = qty * (updatedEvent.ticketPrice || 0)
        const customTicketId = `AUD-${updatedEvent._id.toString().slice(-4).toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-3)}${Math.floor(100 + Math.random() * 900)}`

        const [ticket] = await Ticket.create(
          [
            {
              customId: customTicketId,
              event: updatedEvent._id,
              attendee: user._id,
              attendeeName: user.name,
              attendeeEmail: user.email,
              quantity: qty,
              amount,
              status: 'CONFIRMED',
              checkedIn: false,
              bookedAt: new Date(),
            },
          ],
          opts,
        )

        const paymentId = `pay-t-${Date.now().toString(36)}-${Math.floor(1000 + Math.random() * 8999)}`
        await Payment.create(
          [
            {
              customId: paymentId,
              type: 'TICKET',
              user: user._id,
              event: updatedEvent._id,
              refId: customTicketId,
              amount,
              method: req.body.method || 'UPI',
              status: 'PAID',
            },
          ],
          opts,
        )

        await session.commitTransaction()
        session.endSession()

        return res.status(201).json({
          success: true,
          ticket: transformTicket(ticket, req.user.id),
        })
      } catch (innerErr) {
        if (session) {
          if (session.inTransaction()) await session.abortTransaction()
          session.endSession()
          session = null
        }
        if (
          (innerErr.hasErrorLabel && innerErr.hasErrorLabel('TransientTransactionError')) ||
          (innerErr.message && innerErr.message.includes('Write conflict')) ||
          innerErr.code === 251
        ) {
          if (retries === 0) {
            return res.status(409).json({ success: false, message: 'Sold out or insufficient remaining seats due to concurrent contention' })
          }
          await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 60) + 15))
          continue
        }
        throw innerErr
      }
    }
  } catch (error) {
    if (session && session.inTransaction()) await session.abortTransaction()
    if (session) session.endSession()
    res.status(500).json({ success: false, message: error.message || 'Booking failed' })
  }
}

// GET /api/tickets/me — authenticated user's tickets
export const getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ attendee: req.user.id })
      .sort({ bookedAt: -1 })
      .lean()

    res.status(200).json({
      success: true,
      count: tickets.length,
      tickets: tickets.map((t) => transformTicket(t, req.user.id)),
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch tickets' })
  }
}

// GET /api/tickets — organiser (own events) or owner (all tickets)
export const getTickets = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('role')
    if (!user) return res.status(401).json({ success: false, message: 'User not found' })

    if (user.role === 'attendee') {
      return res.status(403).json({ success: false, message: 'Forbidden — attendees cannot access full roster' })
    }

    let query = {}
    if (user.role === 'organiser') {
      const myEvents = await Event.find({ organiser: req.user.id }).select('_id').lean()
      const eventIds = myEvents.map((e) => e._id)
      query = { event: { $in: eventIds } }
    }

    const tickets = await Ticket.find(query).sort({ bookedAt: -1 }).lean()
    res.status(200).json({
      success: true,
      count: tickets.length,
      tickets: tickets.map((t) => transformTicket(t, req.user.id)),
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch roster tickets' })
  }
}

// PATCH /api/tickets/:ticketId/cancel — attendee cancels own ticket (or owner)
export const cancelTicket = async (req, res) => {
  try {
    const rawId = (req.params.ticketId || '').trim()
    let ticket = await Ticket.findOne({ customId: new RegExp(`^${rawId}$`, 'i') })
    if (!ticket && mongoose.Types.ObjectId.isValid(rawId)) {
      ticket = await Ticket.findById(rawId)
    }
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' })
    }

    const user = await User.findById(req.user.id).select('role')
    if (!user) return res.status(401).json({ success: false, message: 'User not found' })

    if (ticket.attendee.toString() !== req.user.id && user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Forbidden — you can only cancel your own tickets' })
    }

    if (ticket.status === 'CANCELLED') {
      return res.status(409).json({ success: false, message: 'Ticket is already cancelled' })
    }

    if (ticket.checkedIn) {
      return res.status(409).json({ success: false, message: 'Cannot cancel a ticket that is checked in' })
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
      ticket.status = 'CANCELLED'
      ticket.checkedIn = false
      await ticket.save(opts)

      // Release seat inventory
      await Event.findOneAndUpdate(
        { _id: ticket.event },
        { $inc: { registeredCount: -ticket.quantity } },
        opts,
      )
      await Event.findOneAndUpdate(
        { _id: ticket.event, registeredCount: { $lt: 0 } },
        { $set: { registeredCount: 0 } },
        opts,
      )

      // Simulate payment refund
      await Payment.updateMany(
        { refId: ticket.customId, type: 'TICKET', status: 'PAID' },
        { $set: { status: 'REFUNDED' } },
        opts,
      )

      if (session) {
        await session.commitTransaction()
        session.endSession()
      }

      res.status(200).json({
        success: true,
        ticket: transformTicket(ticket, req.user.id),
      })
    } catch (err) {
      if (session) {
        await session.abortTransaction()
        session.endSession()
      }
      throw err
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Cancellation failed' })
  }
}

// PATCH /api/tickets/:ticketId/checkin — owning organiser or owner
export const checkInTicket = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('role')
    if (!user || user.role === 'attendee') {
      return res.status(403).json({ success: false, ok: false, code: 'FORBIDDEN', message: 'Forbidden — attendees cannot check in tickets' })
    }

    const rawId = (req.params.ticketId || '').trim()
    let ticket = await Ticket.findOne({ customId: new RegExp(`^${rawId}$`, 'i') })
    if (!ticket && mongoose.Types.ObjectId.isValid(rawId)) {
      ticket = await Ticket.findById(rawId)
    }

    if (!ticket) {
      return res.status(404).json({ success: false, ok: false, code: 'INVALID', message: 'INVALID TICKET' })
    }

    // If organiser, check event ownership
    if (user.role === 'organiser') {
      const event = await Event.findById(ticket.event).select('organiser')
      if (!event || !event.organiser || event.organiser.toString() !== req.user.id) {
        return res.status(403).json({ success: false, ok: false, code: 'FORBIDDEN', message: 'Forbidden — can only check in attendees for your own events' })
      }
    }

    if (ticket.status === 'CANCELLED') {
      return res.status(409).json({ success: false, ok: false, code: 'CANCELLED', message: 'TICKET CANCELLED' })
    }
    if (ticket.checkedIn) {
      return res.status(409).json({ success: false, ok: false, code: 'DUPLICATE', message: 'ALREADY CHECKED IN', ticket: transformTicket(ticket, req.user.id) })
    }

    ticket.checkedIn = true
    ticket.checkedInAt = new Date()
    await ticket.save()

    res.status(200).json({
      success: true,
      ok: true,
      code: 'OK',
      message: 'CHECKED IN',
      ticket: transformTicket(ticket, req.user.id),
    })
  } catch (error) {
    res.status(500).json({ success: false, ok: false, code: 'ERROR', message: 'Check-in failed' })
  }
}

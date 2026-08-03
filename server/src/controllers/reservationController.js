import Reservation from '../models/Reservation.js'
import User from '../models/User.js'

function transformReservation(res) {
  const obj = res.toJSON ? res.toJSON() : res
  return {
    id: obj._id.toString(),
    _id: obj._id.toString(),
    hallId: obj.hall?._id ? obj.hall._id.toString() : obj.hall?.toString(),
    hallName: obj.hallName,
    date: obj.date,
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
    const reservations = await Reservation.find(query).sort({ date: 1, startTime: 1 }).lean()

    res.status(200).json({
      success: true,
      count: reservations.length,
      reservations: reservations.map((r) => transformReservation(r)),
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch reservations' })
  }
}

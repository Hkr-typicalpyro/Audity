import Payment from '../models/Payment.js'
import User from '../models/User.js'
import Event from '../models/Event.js'

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

// GET /api/payments — Role scoped payment ledger records
export const getPayments = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('role')
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' })
    }

    let query = {}
    if (user.role === 'attendee') {
      query = { user: req.user.id }
    } else if (user.role === 'organiser') {
      // Organiser sees their own payments or payments associated with their events
      const myEvents = await Event.find({ organiser: req.user.id }).select('_id').lean()
      const eventIds = myEvents.map((e) => e._id)
      query = { $or: [{ user: req.user.id }, { event: { $in: eventIds } }] }
    } else if (user.role === 'owner') {
      query = {} // Owner sees complete financial ledger
    }

    const payments = await Payment.find(query).sort({ createdAt: -1 }).lean()
    res.status(200).json({
      success: true,
      count: payments.length,
      payments: payments.map((p) => transformPayment(p)),
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch payments' })
  }
}

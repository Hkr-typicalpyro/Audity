import mongoose from 'mongoose'

const reservationSchema = new mongoose.Schema(
  {
    // Hall reference — real MongoDB ObjectId
    hall: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hall',
      required: [true, 'Hall reference is required'],
    },

    // Denormalized display fields
    hallName: {
      type: String,
      required: [true, 'Hall name is required'],
      trim: true,
    },

    date: {
      type: String, // YYYY-MM-DD
      required: [true, 'Date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'],
    },

    slotId: {
      type: String,
      required: [true, 'Slot ID is required'],
      enum: {
        values: ['morning', 'afternoon', 'evening'],
        message: 'slotId must be one of: morning, afternoon, evening',
      },
    },

    startTime: {
      type: String,
      required: [true, 'Start time is required'],
    },

    endTime: {
      type: String,
      required: [true, 'End time is required'],
    },

    // Linked event (when reservation is created alongside an event)
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      default: null,
    },

    // Authenticated User ObjectId (who reserved the hall)
    organiser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organiser reference is required'],
    },

    // Denormalized organiser display name for UI matching and display
    organiserName: {
      type: String,
      required: [true, 'Organiser name is required'],
      trim: true,
    },

    amount: {
      type: Number,
      required: [true, 'Rental amount is required'],
      min: [0, 'Amount cannot be negative'],
    },

    status: {
      type: String,
      enum: {
        values: ['CONFIRMED', 'RELEASED', 'CANCELLED'],
        message: 'Status must be CONFIRMED, RELEASED, or CANCELLED',
      },
      default: 'CONFIRMED',
    },
  },
  {
    timestamps: true,
  }
)

// Indexes for fast conflict checking and querying
reservationSchema.index({ hall: 1, date: 1, slotId: 1, status: 1 })
reservationSchema.index({ organiser: 1, status: 1 })
reservationSchema.index({ event: 1 })

// Virtual: expose _id as id for frontend compatibility
reservationSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString()
    return ret
  },
})

const Reservation = mongoose.model('Reservation', reservationSchema)

export default Reservation

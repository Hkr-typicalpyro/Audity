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

    bookingType: {
      type: String,
      enum: {
        values: ['timed', 'full-day'],
        message: 'bookingType must be timed or full-day',
      },
      default: 'timed',
    },

    fromDate: {
      type: String, // YYYY-MM-DD
      match: [/^\d{4}-\d{2}-\d{2}$/, 'From date must be YYYY-MM-DD format'],
    },

    toDate: {
      type: String, // YYYY-MM-DD
      match: [/^\d{4}-\d{2}-\d{2}$/, 'To date must be YYYY-MM-DD format'],
    },

    date: {
      type: String, // YYYY-MM-DD (legacy / mirror of fromDate)
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'],
    },

    slotId: {
      type: String,
      default: 'custom',
    },

    startTime: {
      type: String,
      default: '08:00',
    },

    endTime: {
      type: String,
      default: '22:00',
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

// Pre-validate hook to ensure compatibility across fromDate/toDate and legacy date
reservationSchema.pre('validate', function () {
  if (!this.fromDate && this.date) {
    this.fromDate = this.date
  }
  if (!this.toDate) {
    this.toDate = this.fromDate || this.date
  }
  if (!this.date && this.fromDate) {
    this.date = this.fromDate
  }
  if (this.bookingType === 'full-day') {
    if (!this.startTime) this.startTime = '08:00'
    if (!this.endTime) this.endTime = '22:00'
    if (!this.slotId) this.slotId = 'full-day'
  }
})

// Indexes for fast conflict checking and querying
reservationSchema.index({ hall: 1, fromDate: 1, toDate: 1, status: 1 })
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

import mongoose from 'mongoose'

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
    },

    description: {
      type: String,
      required: [true, 'Event description is required'],
      trim: true,
    },

    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['TECH', 'CULTURAL', 'CORPORATE', 'WORKSHOP'],
        message: 'Category must be one of: TECH, CULTURAL, CORPORATE, WORKSHOP',
      },
    },

    // Hall reference — real MongoDB ObjectId
    hall: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hall',
      required: [true, 'Hall reference is required'],
    },

    // Denormalized hall fields for display (populated from hall at creation)
    hallCode: { type: String, required: true },
    hallName: { type: String, required: true },
    floor:    { type: String, required: true },
    entranceGate: { type: String, required: true },

    bookingType: {
      type: String,
      enum: {
        values: ['timed', 'full-day'],
        message: 'bookingType must be timed or full-day',
      },
      default: 'timed',
    },

    fromDate: {
      type: String, // stored as YYYY-MM-DD
    },

    toDate: {
      type: String, // stored as YYYY-MM-DD
    },

    date: {
      type: String, // stored as YYYY-MM-DD string (matches frontend expectation)
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'],
    },

    startTime: {
      type: String,
      default: '08:00',
    },

    endTime: {
      type: String,
      default: '22:00',
    },

    slotId: {
      type: String,
      default: 'custom',
    },

    maxCapacity: {
      type: Number,
      required: [true, 'Max capacity is required'],
      min: [1, 'Capacity must be at least 1'],
    },

    registeredCount: {
      type: Number,
      default: 0,
      min: [0, 'Registered count cannot be negative'],
    },

    ticketPrice: {
      type: Number,
      required: [true, 'Ticket price is required'],
      min: [0, 'Ticket price cannot be negative'],
    },

    // Organiser — authenticated User ObjectId for events created through the API.
    organiser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Denormalized organiser display name — always stored for display.
    organiserName: {
      type: String,
      required: [true, 'Organiser name is required'],
      trim: true,
    },

    status: {
      type: String,
      enum: {
        values: ['PUBLISHED', 'CANCELLED'],
        message: 'Status must be PUBLISHED or CANCELLED',
      },
      default: 'PUBLISHED',
    },

    cancellationReason: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

// Pre-validate hook to ensure compatibility across fromDate/toDate and legacy date
eventSchema.pre('validate', function () {
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

// Virtual: expose _id as id for frontend compatibility
eventSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString()
    return ret
  },
})

const Event = mongoose.model('Event', eventSchema)

export default Event

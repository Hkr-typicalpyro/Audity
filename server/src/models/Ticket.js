import mongoose from 'mongoose'

const ticketSchema = new mongoose.Schema(
  {
    // Custom formatted ticket string used in UI and QR scans (e.g. AUD-1001-4821)
    customId: {
      type: String,
      required: [true, 'Custom ID is required'],
      unique: true,
      trim: true,
    },

    // Event reference — real MongoDB ObjectId
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event reference is required'],
    },

    // Authenticated Attendee User ObjectId (who booked the tickets)
    attendee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Attendee reference is required'],
    },

    // Denormalized attendee info at time of booking
    attendeeName: {
      type: String,
      required: [true, 'Attendee name is required'],
      trim: true,
    },
    attendeeEmail: {
      type: String,
      required: [true, 'Attendee email is required'],
      trim: true,
      lowercase: true,
    },

    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },

    // Authoritatively calculated amount (quantity * event.ticketPrice)
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },

    status: {
      type: String,
      enum: {
        values: ['CONFIRMED', 'CANCELLED'],
        message: 'Status must be CONFIRMED or CANCELLED',
      },
      default: 'CONFIRMED',
    },

    checkedIn: {
      type: Boolean,
      default: false,
    },

    checkedInAt: {
      type: Date,
      default: null,
    },

    bookedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes for fast retrieval by attendee, event, and checkin searches
ticketSchema.index({ attendee: 1, status: 1 })
ticketSchema.index({ event: 1, status: 1 })

ticketSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret.customId || ret._id.toString()
    return ret
  },
})

const Ticket = mongoose.model('Ticket', ticketSchema)

export default Ticket

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
    // These avoid the need to always populate the hall relation in list views.
    hallCode: { type: String, required: true },
    hallName: { type: String, required: true },
    floor:    { type: String, required: true },
    entranceGate: { type: String, required: true },

    date: {
      type: String, // stored as YYYY-MM-DD string (matches frontend expectation)
      required: [true, 'Date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'],
    },

    startTime: {
      type: String,
      required: [true, 'Start time is required'],
    },

    endTime: {
      type: String,
      required: [true, 'End time is required'],
    },

    slotId: {
      type: String,
      required: [true, 'Slot ID is required'],
      enum: {
        values: ['morning', 'afternoon', 'evening'],
        message: 'slotId must be one of: morning, afternoon, evening',
      },
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
    // May be null for seeded legacy data that has no corresponding user.
    organiser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Denormalized organiser display name — always stored for display.
    // For API-created events this is populated from the authenticated user.
    // For seeded data it preserves the original mock organiser name.
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

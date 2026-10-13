import mongoose from 'mongoose'

const blackoutSchema = new mongoose.Schema(
  {
    // Hall reference — real MongoDB ObjectId
    hall: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hall',
      required: [true, 'Hall reference is required'],
    },

    hallCode: {
      type: String,
      required: false,
      trim: true,
    },

    date: {
      type: String, // YYYY-MM-DD
      required: [true, 'Date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'],
    },

    fromDate: {
      type: String,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'From date must be YYYY-MM-DD format'],
    },

    toDate: {
      type: String,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'To date must be YYYY-MM-DD format'],
    },

    slotId: {
      type: String,
      default: 'custom',
    },

    startTime: {
      type: String,
      required: false,
    },

    endTime: {
      type: String,
      required: false,
    },

    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
      default: 'MAINTENANCE',
    },

    note: {
      type: String,
      default: '',
      trim: true,
    },

    // Authenticated Owner User ObjectId (who created the blackout)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'createdBy reference is required'],
    },
  },
  {
    timestamps: true,
  }
)

blackoutSchema.pre('validate', function () {
  if (!this.fromDate && this.date) {
    this.fromDate = this.date
  }
  if (!this.toDate) {
    this.toDate = this.fromDate || this.date
  }
})

// Index for availability checking
blackoutSchema.index({ hall: 1, date: 1, slotId: 1 })
blackoutSchema.index({ hall: 1, fromDate: 1, toDate: 1 })

blackoutSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString()
    return ret
  },
})

const Blackout = mongoose.model('Blackout', blackoutSchema)

export default Blackout

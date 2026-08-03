import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema(
  {
    customId: {
      type: String,
      required: [true, 'Custom payment ID is required'],
      unique: true,
      trim: true,
    },

    type: {
      type: String,
      required: [true, 'Payment type is required'],
      enum: {
        values: ['TICKET', 'HALL_RENTAL', 'REFUND'],
        message: 'Type must be TICKET, HALL_RENTAL, or REFUND',
      },
    },

    // User ObjectId (who paid or received refund)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },

    // Event ObjectId if associated
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      default: null,
    },

    // Reference ID to Ticket customId or Reservation ObjectId string
    refId: {
      type: String,
      required: [true, 'refId is required'],
      trim: true,
    },

    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },

    method: {
      type: String,
      default: 'UPI',
      trim: true,
    },

    status: {
      type: String,
      enum: {
        values: ['PAID', 'REFUNDED', 'FAILED'],
        message: 'Status must be PAID, REFUNDED, or FAILED',
      },
      default: 'PAID',
    },
  },
  {
    timestamps: true,
  }
)

// Indexes for ledger queries and status filtering
paymentSchema.index({ user: 1 })
paymentSchema.index({ refId: 1 })
paymentSchema.index({ type: 1, status: 1 })

paymentSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret.customId || ret._id.toString()
    return ret
  },
})

const Payment = mongoose.model('Payment', paymentSchema)

export default Payment

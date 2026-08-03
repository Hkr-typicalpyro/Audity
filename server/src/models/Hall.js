import mongoose from 'mongoose'

const hallSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Hall code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: [true, 'Hall name is required'],
      trim: true,
    },

    floor: {
      type: String,
      required: [true, 'Floor is required'],
      trim: true,
    },

    entranceGate: {
      type: String,
      required: [true, 'Entrance gate is required'],
      trim: true,
    },

    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
    },

    rentalFee: {
      type: Number,
      required: [true, 'Rental fee is required'],
      min: [0, 'Rental fee cannot be negative'],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

const Hall = mongoose.model('Hall', hallSchema)

export default Hall
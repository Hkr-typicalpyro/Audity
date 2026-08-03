import mongoose from 'mongoose'

const platformSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'global',
      unique: true,
      required: true,
      immutable: true,
      trim: true,
    },
    ticketSalesEnabled: {
      type: Boolean,
      default: true,
      required: [true, 'ticketSalesEnabled status is required'],
    },
    hallRentalEnabled: {
      type: Boolean,
      default: true,
      required: [true, 'hallRentalEnabled status is required'],
    },
  },
  {
    timestamps: true,
  }
)

platformSettingsSchema.statics.getSingleton = async function () {
  const doc = await this.findOneAndUpdate(
    { key: 'global' },
    { $setOnInsert: { key: 'global', ticketSalesEnabled: true, hallRentalEnabled: true } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  )
  return doc
}

const PlatformSettings = mongoose.model('PlatformSettings', platformSettingsSchema)

export default PlatformSettings

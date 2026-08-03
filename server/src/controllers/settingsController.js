import PlatformSettings from '../models/PlatformSettings.js'

/**
 * GET /api/settings
 * Authenticated access to global platform settings.
 */
export const getSettings = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSingleton()
    res.status(200).json({
      success: true,
      settings: {
        id: settings._id.toString(),
        key: settings.key,
        ticketSalesEnabled: settings.ticketSalesEnabled,
        hallRentalEnabled: settings.hallRentalEnabled,
        updatedAt: settings.updatedAt,
      },
    })
  } catch (err) {
    console.error('getSettings error:', err.message)
    res.status(500).json({ success: false, message: 'Server error retrieving platform settings' })
  }
}

/**
 * PATCH /api/settings
 * Owner-only mutation of whitelisted platform control switches.
 */
export const updateSettings = async (req, res) => {
  try {
    const { ticketSalesEnabled, hallRentalEnabled } = req.body

    // Validate that at least one valid whitelisted field is present
    if (ticketSalesEnabled === undefined && hallRentalEnabled === undefined) {
      return res.status(400).json({
        success: false,
        message: 'No valid settings fields provided for update',
      })
    }

    const updates = {}
    if (ticketSalesEnabled !== undefined) {
      if (typeof ticketSalesEnabled !== 'boolean') {
        return res.status(400).json({ success: false, message: 'ticketSalesEnabled must be a boolean' })
      }
      updates.ticketSalesEnabled = ticketSalesEnabled
    }

    if (hallRentalEnabled !== undefined) {
      if (typeof hallRentalEnabled !== 'boolean') {
        return res.status(400).json({ success: false, message: 'hallRentalEnabled must be a boolean' })
      }
      updates.hallRentalEnabled = hallRentalEnabled
    }

    const settings = await PlatformSettings.findOneAndUpdate(
      { key: 'global' },
      { $set: updates },
      { returnDocument: 'after' }
    )

    if (!settings) {
      // In case singleton was never initialized
      const newSettings = await PlatformSettings.getSingleton()
      if (updates.ticketSalesEnabled !== undefined) newSettings.ticketSalesEnabled = updates.ticketSalesEnabled
      if (updates.hallRentalEnabled !== undefined) newSettings.hallRentalEnabled = updates.hallRentalEnabled
      await newSettings.save()
      return res.status(200).json({
        success: true,
        settings: {
          id: newSettings._id.toString(),
          key: newSettings.key,
          ticketSalesEnabled: newSettings.ticketSalesEnabled,
          hallRentalEnabled: newSettings.hallRentalEnabled,
          updatedAt: newSettings.updatedAt,
        },
      })
    }

    res.status(200).json({
      success: true,
      settings: {
        id: settings._id.toString(),
        key: settings.key,
        ticketSalesEnabled: settings.ticketSalesEnabled,
        hallRentalEnabled: settings.hallRentalEnabled,
        updatedAt: settings.updatedAt,
      },
    })
  } catch (err) {
    console.error('updateSettings error:', err.message)
    res.status(500).json({ success: false, message: 'Server error updating platform settings' })
  }
}

import Hall from '../models/Hall.js'

// GET /api/halls — authenticated
export const getHalls = async (req, res) => {
  try {
    const halls = await Hall.find().sort({ code: 1 })

    res.status(200).json({
      success: true,
      count: halls.length,
      halls,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch halls',
    })
  }
}

// POST /api/halls — owner only
export const createHall = async (req, res) => {
  try {
    const { code, name, floor, entranceGate, capacity, rentalFee } = req.body

    const hall = await Hall.create({ code, name, floor, entranceGate, capacity, rentalFee })

    res.status(201).json({
      success: true,
      hall,
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Hall code already exists',
      })
    }

    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create hall',
    })
  }
}

// PATCH /api/halls/:hallId — owner only
export const updateHall = async (req, res) => {
  try {
    const { hallId } = req.params

    // Only allow these specific fields — never spread arbitrary req.body
    const { code, name, floor, entranceGate, capacity, rentalFee } = req.body
    const updates = {}
    if (code !== undefined) updates.code = code
    if (name !== undefined) updates.name = name
    if (floor !== undefined) updates.floor = floor
    if (entranceGate !== undefined) updates.entranceGate = entranceGate
    if (capacity !== undefined) updates.capacity = capacity
    if (rentalFee !== undefined) updates.rentalFee = rentalFee

    const hall = await Hall.findByIdAndUpdate(
      hallId,
      updates,
      {
        returnDocument: 'after', // return updated document
        runValidators: true,     // run Mongoose schema validators
      }
    )

    if (!hall) {
      return res.status(404).json({
        success: false,
        message: 'Hall not found',
      })
    }

    res.status(200).json({
      success: true,
      hall,
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Hall code already exists',
      })
    }

    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update hall',
    })
  }
}

// PATCH /api/halls/:hallId/status — owner only
export const setHallStatus = async (req, res) => {
  try {
    const { hallId } = req.params
    const { isActive } = req.body

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean',
      })
    }

    const hall = await Hall.findByIdAndUpdate(
      hallId,
      { isActive },
      { returnDocument: 'after' }
    )

    if (!hall) {
      return res.status(404).json({
        success: false,
        message: 'Hall not found',
      })
    }

    res.status(200).json({
      success: true,
      hall,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update hall status',
    })
  }
}
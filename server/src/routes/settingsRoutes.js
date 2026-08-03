import { Router } from 'express'
import protect from '../middleware/authMiddleware.js'
import authorizeRoles from '../middleware/roleMiddleware.js'
import { getSettings, updateSettings } from '../controllers/settingsController.js'

const router = Router()

// GET /api/settings — any authenticated user
router.get('/', protect, getSettings)

// PATCH /api/settings — owner only
router.patch('/', protect, authorizeRoles('owner'), updateSettings)

export default router

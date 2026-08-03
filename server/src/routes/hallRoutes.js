import { Router } from 'express'
import protect from '../middleware/authMiddleware.js'
import authorizeRoles from '../middleware/roleMiddleware.js'

import {
  getHalls,
  createHall,
  updateHall,
  setHallStatus,
} from '../controllers/hallController.js'

const router = Router()

// GET /api/halls — any authenticated user
router.get('/', protect, getHalls)

// POST /api/halls — owner only
router.post('/', protect, authorizeRoles('owner'), createHall)

// PATCH /api/halls/:hallId/status — owner only
// IMPORTANT: must be registered BEFORE the generic /:hallId route
// otherwise Express will treat "status" as the hallId parameter value
router.patch('/:hallId/status', protect, authorizeRoles('owner'), setHallStatus)

// PATCH /api/halls/:hallId — owner only
router.patch('/:hallId', protect, authorizeRoles('owner'), updateHall)

export default router
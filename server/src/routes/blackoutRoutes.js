import { Router } from 'express'
import protect from '../middleware/authMiddleware.js'
import authorizeRoles from '../middleware/roleMiddleware.js'
import {
  getBlackouts,
  createBlackout,
  deleteBlackout,
} from '../controllers/blackoutController.js'

const router = Router()

// GET /api/blackouts — authenticated (all roles for slot inspection)
router.get('/', protect, getBlackouts)

// POST /api/blackouts — owner only
router.post('/', protect, authorizeRoles('owner'), createBlackout)

// DELETE /api/blackouts/:blackoutId — owner only
router.delete('/:blackoutId', protect, authorizeRoles('owner'), deleteBlackout)

export default router

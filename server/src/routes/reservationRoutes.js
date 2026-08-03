import { Router } from 'express'
import protect from '../middleware/authMiddleware.js'
import authorizeRoles from '../middleware/roleMiddleware.js'
import { getReservations } from '../controllers/reservationController.js'

const router = Router()

// GET /api/reservations — organiser and owner only (attendee -> 403)
router.get('/', protect, authorizeRoles('organiser', 'owner'), getReservations)

export default router

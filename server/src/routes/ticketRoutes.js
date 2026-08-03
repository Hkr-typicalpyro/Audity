import { Router } from 'express'
import protect from '../middleware/authMiddleware.js'
import authorizeRoles from '../middleware/roleMiddleware.js'
import {
  getMyTickets,
  getTickets,
  cancelTicket,
  checkInTicket,
} from '../controllers/ticketController.js'

const router = Router()

// GET /api/tickets/me — authenticated (attendee sees own tickets)
router.get('/me', protect, getMyTickets)

// GET /api/tickets — organiser or owner only
router.get('/', protect, authorizeRoles('organiser', 'owner'), getTickets)

// PATCH /api/tickets/:ticketId/cancel — authenticated (attendee cancels own, or owner)
router.patch('/:ticketId/cancel', protect, cancelTicket)

// PATCH /api/tickets/:ticketId/checkin — organiser or owner only
router.patch('/:ticketId/checkin', protect, authorizeRoles('organiser', 'owner'), checkInTicket)

export default router

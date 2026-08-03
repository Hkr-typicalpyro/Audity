import { Router } from 'express'
import protect from '../middleware/authMiddleware.js'
import authorizeRoles from '../middleware/roleMiddleware.js'
import {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  cancelEvent,
} from '../controllers/eventController.js'
import { bookTicket } from '../controllers/ticketController.js'

const router = Router()

// GET /api/events — authenticated (all roles)
router.get('/', protect, getEvents)

// GET /api/events/:eventId — authenticated
router.get('/:eventId', protect, getEvent)

// POST /api/events — organiser or owner
router.post('/', protect, authorizeRoles('organiser', 'owner'), createEvent)

// POST /api/events/:eventId/book — attendee only (Atomic ticket booking)
router.post('/:eventId/book', protect, authorizeRoles('attendee'), bookTicket)

// PATCH /api/events/:eventId — organiser (own events only) or owner
router.patch('/:eventId', protect, authorizeRoles('organiser', 'owner'), updateEvent)

// PATCH /api/events/:eventId/cancel — owner only
router.patch('/:eventId/cancel', protect, authorizeRoles('owner'), cancelEvent)

export default router

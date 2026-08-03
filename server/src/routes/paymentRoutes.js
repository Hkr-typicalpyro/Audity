import { Router } from 'express'
import protect from '../middleware/authMiddleware.js'
import { getPayments } from '../controllers/paymentController.js'

const router = Router()

// GET /api/payments — authenticated (all roles, scoped by role in controller)
router.get('/', protect, getPayments)

export default router

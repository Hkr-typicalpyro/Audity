import { Router } from 'express';
import protect from '../middleware/authMiddleware.js';
import authorizeRoles from '../middleware/roleMiddleware.js';
import {
  applyForOrganiser,
  listApplications,
  approveApplication,
  rejectApplication,
} from '../controllers/organiserController.js';

const router = Router();

// POST /api/organiser/apply — authenticated attendees only
router.post('/apply', protect, authorizeRoles('attendee'), applyForOrganiser);

// GET /api/organiser/applications — owner only
router.get('/applications', protect, authorizeRoles('owner'), listApplications);

// PATCH /api/organiser/applications/:userId/approve — owner only
router.patch(
  '/applications/:userId/approve',
  protect,
  authorizeRoles('owner'),
  approveApplication
);

// PATCH /api/organiser/applications/:userId/reject — owner only
router.patch(
  '/applications/:userId/reject',
  protect,
  authorizeRoles('owner'),
  rejectApplication
);

export default router;

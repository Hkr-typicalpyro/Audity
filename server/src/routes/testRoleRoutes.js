import { Router } from 'express';
import protect from '../middleware/authMiddleware.js';
import authorizeRoles from '../middleware/roleMiddleware.js';

const router = Router();

/**
 * TEMPORARY ROLE TEST ROUTES — Step 5
 * These routes exist only to verify the authorization middleware during
 * development. Remove or gate behind an env flag before production.
 */

// GET /api/test/attendee — any authenticated user (attendee | organiser | owner)
router.get(
  '/attendee',
  protect,
  authorizeRoles('attendee', 'organiser', 'owner'),
  (_req, res) => {
    res.json({
      success: true,
      message: 'Attendee route — access granted',
      allowedRoles: ['attendee', 'organiser', 'owner'],
    });
  }
);

// GET /api/test/organiser — organiser and owner only
router.get(
  '/organiser',
  protect,
  authorizeRoles('organiser', 'owner'),
  (_req, res) => {
    res.json({
      success: true,
      message: 'Organiser route — access granted',
      allowedRoles: ['organiser', 'owner'],
    });
  }
);

// GET /api/test/owner — owner only
router.get(
  '/owner',
  protect,
  authorizeRoles('owner'),
  (_req, res) => {
    res.json({
      success: true,
      message: 'Owner route — access granted',
      allowedRoles: ['owner'],
    });
  }
);

export default router;

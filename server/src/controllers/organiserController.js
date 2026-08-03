import User from '../models/User.js';

/**
 * Builds a safe user object — never includes password or __v.
 */
const safeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone ?? null,
  role: user.role,
  organiserStatus: user.organiserStatus,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// ---------------------------------------------------------------------------
// POST /api/organiser/apply
// Access: authenticated attendees only
// ---------------------------------------------------------------------------
export const applyForOrganiser = async (req, res) => {
  try {
    // Load full user — req.user.id is set by protect middleware.
    // We never trust role/organiserStatus from req.body.
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Belt-and-suspenders: authorizeRoles('attendee') already blocks non-attendees,
    // but guard here too in case the route is called without that middleware.
    if (user.role !== 'attendee') {
      return res.status(409).json({
        success: false,
        message: 'Only attendees may apply to become an organiser',
      });
    }

    if (user.organiserStatus === 'pending') {
      return res.status(409).json({
        success: false,
        message: 'Application already pending',
      });
    }

    if (user.organiserStatus === 'approved') {
      // Edge-case: role wasn't updated but status is approved — treat as conflict
      return res.status(409).json({
        success: false,
        message: 'Already an organiser',
      });
    }

    // organiserStatus is 'none' or 'rejected' — allow application
    user.organiserStatus = 'pending';
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Organiser application submitted',
      user: safeUser(user),
    });
  } catch (error) {
    console.error('applyForOrganiser error:', error.message);
    res.status(500).json({ success: false, message: 'Server error during application' });
  }
};

// ---------------------------------------------------------------------------
// GET /api/organiser/applications
// Access: owner only
// ---------------------------------------------------------------------------
export const listApplications = async (_req, res) => {
  try {
    const applicants = await User.find({ organiserStatus: 'pending' }).select('-password -__v');

    return res.status(200).json({
      success: true,
      count: applicants.length,
      applications: applicants.map(safeUser),
    });
  } catch (error) {
    console.error('listApplications error:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching applications' });
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/organiser/applications/:userId/approve
// Access: owner only
// ---------------------------------------------------------------------------
export const approveApplication = async (req, res) => {
  try {
    const target = await User.findById(req.params.userId);

    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (target.organiserStatus !== 'pending') {
      return res.status(409).json({
        success: false,
        message: `Cannot approve — current status is '${target.organiserStatus}'`,
      });
    }

    // Never trust body; set both fields explicitly
    target.role = 'organiser';
    target.organiserStatus = 'approved';
    await target.save();

    return res.status(200).json({
      success: true,
      message: 'Application approved — user is now an organiser',
      user: safeUser(target),
    });
  } catch (error) {
    console.error('approveApplication error:', error.message);
    res.status(500).json({ success: false, message: 'Server error during approval' });
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/organiser/applications/:userId/reject
// Access: owner only
// ---------------------------------------------------------------------------
export const rejectApplication = async (req, res) => {
  try {
    const target = await User.findById(req.params.userId);

    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (target.organiserStatus !== 'pending') {
      return res.status(409).json({
        success: false,
        message: `Cannot reject — current status is '${target.organiserStatus}'`,
      });
    }

    // Role remains 'attendee'; only status changes
    target.organiserStatus = 'rejected';
    await target.save();

    return res.status(200).json({
      success: true,
      message: 'Application rejected',
      user: safeUser(target),
    });
  } catch (error) {
    console.error('rejectApplication error:', error.message);
    res.status(500).json({ success: false, message: 'Server error during rejection' });
  }
};

import User from '../models/User.js';

/**
 * Factory that returns an Express middleware which checks whether the
 * authenticated user's role (loaded fresh from MongoDB) is in the
 * allowedRoles list.
 *
 * Must run AFTER the `protect` middleware, which attaches req.user.id.
 *
 * Response codes:
 *   401 — no/invalid token (handled upstream by protect)
 *   403 — valid token but role not permitted
 *
 * @param  {...string} allowedRoles  One or more role strings from the User schema enum.
 * @returns {Function} Express middleware
 */
const authorizeRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      // Load the canonical role from the database — never trust the JWT payload
      // or anything the client may have supplied.
      const user = await User.findById(req.user.id).select('role isActive');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Not authorised — user no longer exists',
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Not authorised — account is deactivated',
        });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: `Forbidden — requires one of: ${allowedRoles.join(', ')}`,
        });
      }

      // Attach the DB-verified role so downstream handlers can use it
      req.user.role = user.role;
      next();
    } catch (error) {
      console.error('authorizeRoles error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Server error during authorization',
      });
    }
  };
};

export default authorizeRoles;

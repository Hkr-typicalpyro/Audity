import jwt from 'jsonwebtoken';

/**
 * Express middleware that verifies a Bearer JWT from the Authorization header.
 * Attaches { id } to req.user on success, returns 401 otherwise.
 */
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Not authorised — no token provided',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorised — token invalid or expired',
    });
  }
};

export default protect;

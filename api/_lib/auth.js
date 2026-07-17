const jwt = require('jsonwebtoken');

function getJwtSecret() {
  return process.env.JWT_SECRET || 'fallback_secret_key_123';
}

function readBearerToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.split(' ')[1];
}

function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret());
}

function requireAuth(req, res, options = {}) {
  const token = readBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return null;
  }

  let user;
  try {
    user = verifyAccessToken(token);
  } catch (_error) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
    return null;
  }

  const requiredRoles = options.roles || [];
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    res.status(403).json({ error: 'Forbidden: Insufficient role' });
    return null;
  }

  return user;
}

module.exports = {
  getJwtSecret,
  readBearerToken,
  requireAuth,
  verifyAccessToken,
};

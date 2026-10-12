export function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({
    error: 'Authentication required',
    message: 'You must be logged in to access this resource.'
  });
}

export function requireAdmin(req, res, next) {
  if (req.session && req.session.userId && req.session.userRole === 'admin') {
    return next();
  }
  return res.status(403).json({
    error: 'Forbidden',
    message: 'Administrator privileges are required for this action.'
  });
}

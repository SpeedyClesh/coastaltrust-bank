const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');

const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = getDb();
    const user = db.prepare('SELECT id, email, role, status FROM users WHERE id = ?').get(decoded.userId);
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (user.status === 'suspended') return res.status(403).json({ message: 'Account suspended' });
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') return res.status(401).json({ message: 'Token expired' });
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const adminAuth = (req, res, next) => {
  auth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    next();
  });
};

const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const db = getDb();
      const user = db.prepare('SELECT id, email, role, status FROM users WHERE id = ?').get(decoded.userId);
      if (user) req.user = user;
    }
  } catch {}
  next();
};

module.exports = { auth, adminAuth, optionalAuth };

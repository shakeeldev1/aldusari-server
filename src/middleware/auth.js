import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

export async function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Sign in to continue.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const admin = await Admin.findById(payload.sub).select('name email');
    if (!admin) return res.status(401).json({ message: 'Admin account was not found.' });
    req.admin = admin;
    next();
  } catch { return res.status(401).json({ message: 'Your session has expired. Please sign in again.' }); }
}

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import Admin from '../models/Admin.js';
import { requireAdmin } from '../middleware/auth.js';
import { hashToken, issueAccessToken, issueRefreshToken, publicAdmin } from '../utils/tokens.js';

const router = Router();
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many sign-in attempts. Please try again later.' } });
const refreshLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many session refresh attempts.' } });
const refreshCookie = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', path: '/api/auth', maxAge: Number(process.env.REFRESH_TOKEN_DAYS || 30) * 24 * 60 * 60 * 1000 };
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(origin => origin.trim().replace(/\/+$/, ''));
function sameOriginForBrowser(req, res, next) {
  const origin = req.get('origin');
  if (origin && !allowedOrigins.includes(origin)) return res.status(403).json({ message: 'This origin is not allowed to manage admin sessions.' });
  next();
}

router.post('/login', loginLimit, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const admin = await Admin.findOne({ email }).select('+passwordHash');
    if (!admin || !(await bcrypt.compare(String(req.body.password || ''), admin.passwordHash))) return res.status(401).json({ message: 'Email or password is incorrect.' });
    const refreshToken = issueRefreshToken(admin);
    admin.refreshTokenHash = hashToken(refreshToken);
    await admin.save();
    res.cookie('adminRefreshToken', refreshToken, refreshCookie);
    res.json({ admin: publicAdmin(admin), accessToken: issueAccessToken(admin) });
  } catch (error) { next(error); }
});

router.post('/refresh', refreshLimit, sameOriginForBrowser, async (req, res) => {
  const refreshToken = req.cookies?.adminRefreshToken;
  if (!refreshToken) return res.status(401).json({ message: 'Refresh token is required.' });
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    if (payload.type !== 'refresh') return res.status(401).json({ message: 'Invalid refresh token.' });
    const admin = await Admin.findById(payload.sub).select('+refreshTokenHash');
    if (!admin?.refreshTokenHash || admin.refreshTokenHash !== hashToken(refreshToken)) return res.status(401).json({ message: 'Refresh token is invalid or has already been used.' });
    const nextRefreshToken = issueRefreshToken(admin);
    admin.refreshTokenHash = hashToken(nextRefreshToken);
    await admin.save();
    res.cookie('adminRefreshToken', nextRefreshToken, refreshCookie);
    res.json({ admin: publicAdmin(admin), accessToken: issueAccessToken(admin) });
  } catch { res.status(401).json({ message: 'Refresh token is invalid or expired.' }); }
});

router.post('/logout', sameOriginForBrowser, requireAdmin, async (req, res, next) => {
  try { await Admin.findByIdAndUpdate(req.admin._id, { $unset: { refreshTokenHash: 1 } }); res.clearCookie('adminRefreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', path: '/api/auth' }); res.json({ message: 'Signed out.' }); }
  catch (error) { next(error); }
});
router.get('/me', requireAdmin, (req, res) => res.json({ admin: publicAdmin(req.admin) }));
export default router;

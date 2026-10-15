import { Router } from 'express';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
import { requireAdmin } from '../middleware/auth.js';
import { hashToken, issueAccessToken, issueRefreshToken, publicAdmin } from '../utils/tokens.js';

const router = Router();
router.use(requireAdmin);

function normalizeProfile(body) {
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  if (name.length < 2 || name.length > 80) throw Object.assign(new Error('Name must be between 2 and 80 characters.'), { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw Object.assign(new Error('Enter a valid email address.'), { status: 400 });
  return { name, email };
}
function handleDuplicateEmail(error, res) {
  if (error.code === 11000) return res.status(409).json({ message: 'An admin with that email already exists.' });
  return null;
}

router.get('/', async (_req, res, next) => {
  try {
    const admins = await Admin.find().select('name email createdAt').sort({ createdAt: 1 });
    res.json({ admins: admins.map(admin => ({ ...publicAdmin(admin), createdAt: admin.createdAt })) });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, email } = normalizeProfile(req.body);
    const password = String(req.body.password || '');
    if (password.length < 10 || password.length > 128) return res.status(400).json({ message: 'Password must be between 10 and 128 characters.' });
    const admin = await Admin.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
    res.status(201).json({ admin: publicAdmin(admin) });
  } catch (error) { if (handleDuplicateEmail(error, res)) return; next(error); }
});

router.put('/me', async (req, res, next) => {
  try {
    const { name, email } = normalizeProfile(req.body);
    const admin = await Admin.findById(req.admin._id).select('+passwordHash +refreshTokenHash');
    if (!admin) return res.status(404).json({ message: 'Admin account was not found.' });
    const newPassword = String(req.body.newPassword || '');
    let accessToken;
    if (newPassword) {
      if (!req.body.currentPassword || !(await bcrypt.compare(String(req.body.currentPassword), admin.passwordHash))) return res.status(400).json({ message: 'Your current password is incorrect.' });
      if (newPassword.length < 10 || newPassword.length > 128) return res.status(400).json({ message: 'New password must be between 10 and 128 characters.' });
      admin.passwordHash = await bcrypt.hash(newPassword, 12);
      const refreshToken = issueRefreshToken(admin);
      admin.refreshTokenHash = hashToken(refreshToken);
      const days = Number(process.env.REFRESH_TOKEN_DAYS || 30);
      res.cookie('adminRefreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', path: '/api/auth', maxAge: days * 24 * 60 * 60 * 1000 });
      accessToken = issueAccessToken(admin);
    }
    admin.name = name;
    admin.email = email;
    await admin.save();
    res.json({ admin: publicAdmin(admin), ...(accessToken ? { accessToken } : {}) });
  } catch (error) { if (handleDuplicateEmail(error, res)) return; next(error); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { name, email } = normalizeProfile(req.body);
    const admin = await Admin.findByIdAndUpdate(req.params.id, { name, email }, { new: true, runValidators: true }).select('name email');
    if (!admin) return res.status(404).json({ message: 'Admin account was not found.' });
    res.json({ admin: publicAdmin(admin) });
  } catch (error) { if (handleDuplicateEmail(error, res)) return; next(error); }
});

export default router;

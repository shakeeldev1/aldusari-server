import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

export const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');
export function issueAccessToken(admin) {
  return jwt.sign({ sub: admin._id.toString(), role: 'admin' }, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.ACCESS_TOKEN_TTL || '15m' });
}
export function issueRefreshToken(admin) {
  const days = Number(process.env.REFRESH_TOKEN_DAYS || 30);
  return jwt.sign({ sub: admin._id.toString(), type: 'refresh', nonce: crypto.randomUUID() }, process.env.JWT_REFRESH_SECRET, { expiresIn: `${days}d` });
}
export const publicAdmin = admin => ({ id: admin._id, name: admin.name, email: admin.email });

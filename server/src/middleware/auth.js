import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { HttpError } from './error.js';

const JWT_OPTIONS = { issuer: 'mma301-music', audience: 'mma301-music-app' };

export function signToken(user) {
  return jwt.sign({ version: user.tokenVersion }, process.env.JWT_SECRET, {
    ...JWT_OPTIONS,
    algorithm: 'HS256',
    subject: user.id,
    expiresIn: '7d',
  });
}

export async function requireAuth(req, res, next) {
  const [scheme, token] = (req.get('authorization') ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new HttpError(401, 'Bạn cần đăng nhập');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { ...JWT_OPTIONS, algorithms: ['HS256'] });
  } catch {
    throw new HttpError(401, 'Phiên đăng nhập không hợp lệ');
  }

  const user = await User.findById(payload.sub);
  if (!user?.isActive || user.tokenVersion !== payload.version) {
    throw new HttpError(401, 'Phiên đăng nhập không hợp lệ');
  }
  req.user = user;
  next();
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) throw new HttpError(403, 'Bạn không có quyền thực hiện thao tác này');
  next();
};

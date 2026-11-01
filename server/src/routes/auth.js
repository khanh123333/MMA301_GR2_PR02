import bcrypt from 'bcrypt';
import { Router } from 'express';
import { parseEmail, parsePassword, parseText } from '../lib/validate.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { User } from '../models/User.js';

const router = Router();

const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 15 });
// Compared against when the email is unknown, so response time does not reveal which emails exist
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role });

router.post('/auth/register', authLimit, async (req, res) => {
  const { name, email, password, role = 'LISTENER' } = req.body ?? {};
  if (role !== 'LISTENER' && role !== 'ARTIST') throw new HttpError(400, 'Vai trò không hợp lệ');

  const user = await User.create({
    name: parseText(name, 'Tên', { max: 50 }),
    email: parseEmail(email),
    passwordHash: await bcrypt.hash(parsePassword(password), 10),
    role,
  });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post('/auth/login', authLimit, async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new HttpError(400, 'Vui lòng nhập email và mật khẩu');
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  const matches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !matches) throw new HttpError(401, 'Email hoặc mật khẩu không đúng');
  if (!user.isActive) throw new HttpError(403, 'Tài khoản đã bị khóa');

  res.json({ token: signToken(user), user: publicUser(user) });
});

router.post('/auth/logout', requireAuth, async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  res.status(204).end();
});

router.get('/me', requireAuth, (req, res) => res.json(publicUser(req.user)));

export default router;

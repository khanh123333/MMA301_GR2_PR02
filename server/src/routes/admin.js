import { Router } from 'express';
import { isObjectId, parseBoolean, parsePage } from '../lib/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { Track } from '../models/Track.js';
import { User } from '../models/User.js';
import { localTrackDto } from '../services/tracks.js';

const router = Router();

const adminUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

const adminTrack = (req, track) => ({
  ...localTrackDto(req, track),
  artistId: track.artist,
  genre: track.genre,
  isHidden: track.isHidden,
  createdAt: track.createdAt,
});

router.use(requireAuth, requireRole('ADMIN'));

router.get('/users', async (req, res) => {
  const { page, limit, skip } = parsePage(req.query);
  const [users, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(),
  ]);
  res.json({ items: users.map(adminUser), total, page, limit });
});

router.patch('/users/:id', async (req, res) => {
  const isActive = parseBoolean(req.body?.isActive, 'isActive');
  const user = isObjectId(req.params.id) ? await User.findById(req.params.id) : null;
  if (!user) throw new HttpError(404, 'Không tìm thấy người dùng');
  if (user.role === 'ADMIN') throw new HttpError(403, 'Không thể khóa tài khoản Admin');

  user.isActive = isActive;
  await user.save();
  res.json(adminUser(user));
});

router.get('/tracks', async (req, res) => {
  const { page, limit, skip } = parsePage(req.query);
  const [tracks, total] = await Promise.all([
    Track.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Track.countDocuments(),
  ]);
  res.json({ items: tracks.map((track) => adminTrack(req, track)), total, page, limit });
});

router.patch('/tracks/:id', async (req, res) => {
  const isHidden = parseBoolean(req.body?.isHidden, 'isHidden');
  const track = isObjectId(req.params.id)
    ? await Track.findByIdAndUpdate(req.params.id, { isHidden }, { returnDocument: 'after' })
    : null;
  if (!track) throw new HttpError(404, 'Không tìm thấy bài hát');
  res.json(adminTrack(req, track));
});

router.get('/stats', async (req, res) => {
  const [roles, tracks, hiddenTracks] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    Track.countDocuments(),
    Track.countDocuments({ isHidden: true }),
  ]);
  const count = (role) => roles.find((row) => row._id === role)?.count ?? 0;
  res.json({
    users: { LISTENER: count('LISTENER'), ARTIST: count('ARTIST'), ADMIN: count('ADMIN') },
    tracks,
    hiddenTracks,
  });
});

export default router;

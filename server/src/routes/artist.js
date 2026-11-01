import { rm } from 'node:fs/promises';
import { Router } from 'express';
import { isObjectId, parsePage, parseText } from '../lib/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { uploadCover, uploadTrackFiles } from '../middleware/upload.js';
import { Track } from '../models/Track.js';
import { audioDir, coverDir, inspectAudio, inspectCover, removeFile, storeFile } from '../services/storage.js';
import { localTrackDto } from '../services/tracks.js';

const router = Router();

const MAX_TRACKS_PER_ARTIST = 50;

const uploadLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, key: (req) => req.user.id });

const artistTrackDto = (req, track) => ({
  ...localTrackDto(req, track),
  genre: track.genre,
  isHidden: track.isHidden,
  createdAt: track.createdAt,
});

const parseGenre = (value) => (value === undefined || value === '' ? '' : parseText(value, 'Thể loại', { max: 50 }));

async function checkQuota(req, res, next) {
  // shortcut: concurrent uploads can pass this count together, the upload rate limit keeps the overshoot small
  const count = await Track.countDocuments({ artist: req.user._id });
  if (count >= MAX_TRACKS_PER_ARTIST) throw new HttpError(409, `Mỗi nghệ sĩ chỉ được tải tối đa ${MAX_TRACKS_PER_ARTIST} bài`);
  next();
}

// Other artists' tracks answer 404, so ids cannot be probed
async function loadOwned(req, res, next) {
  req.track = isObjectId(req.params.id) ? await Track.findOne({ _id: req.params.id, artist: req.user._id }) : null;
  if (!req.track) throw new HttpError(404, 'Không tìm thấy bài hát');
  next();
}

// Whatever was not moved into storage is still in tmp and must not pile up there
const removeTemp = (files) => Promise.all(files.map((file) => rm(file.path, { force: true })));

router.use(requireAuth, requireRole('ARTIST'));

router.get('/', async (req, res) => {
  const { page, limit, skip } = parsePage(req.query);
  const filter = { artist: req.user._id };
  const [tracks, total] = await Promise.all([
    Track.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Track.countDocuments(filter),
  ]);
  res.json({ items: tracks.map((track) => artistTrackDto(req, track)), total, page, limit });
});

router.post('/', uploadLimit, checkQuota, uploadTrackFiles, async (req, res) => {
  const audio = req.files?.audio?.[0];
  const cover = req.files?.cover?.[0];

  try {
    const title = parseText(req.body?.title, 'Tên bài hát', { max: 200 });
    const genre = parseGenre(req.body?.genre);
    if (!audio) throw new HttpError(400, 'Vui lòng chọn file audio');
    const { extension, duration } = await inspectAudio(audio.path);
    const coverExtension = cover ? await inspectCover(cover) : null;

    const audioFile = await storeFile(audio.path, audioDir, extension);
    const coverFile = cover ? await storeFile(cover.path, coverDir, coverExtension) : null;
    try {
      const track = await Track.create({
        artist: req.user._id,
        artistName: req.user.name,
        title,
        genre,
        duration,
        audioFile,
        coverFile,
        fileSize: audio.size,
      });
      res.status(201).json(artistTrackDto(req, track));
    } catch (err) {
      await removeFile(audioDir, audioFile);
      await removeFile(coverDir, coverFile);
      throw err;
    }
  } finally {
    await removeTemp([audio, cover].filter(Boolean));
  }
});

router.patch('/:id', loadOwned, uploadCover, async (req, res) => {
  const { track } = req;
  const cover = req.files?.cover?.[0];

  try {
    if (req.body?.title !== undefined) track.title = parseText(req.body.title, 'Tên bài hát', { max: 200 });
    if (req.body?.genre !== undefined) track.genre = parseGenre(req.body.genre);

    const oldCover = track.coverFile;
    if (cover) track.coverFile = await storeFile(cover.path, coverDir, await inspectCover(cover));
    try {
      await track.save();
    } catch (err) {
      if (cover) await removeFile(coverDir, track.coverFile);
      throw err;
    }
    if (cover) await removeFile(coverDir, oldCover);

    res.json(artistTrackDto(req, track));
  } finally {
    await removeTemp([cover].filter(Boolean));
  }
});

router.delete('/:id', loadOwned, async (req, res) => {
  const { track } = req;
  await track.deleteOne();
  await removeFile(audioDir, track.audioFile);
  await removeFile(coverDir, track.coverFile);
  res.status(204).end();
});

export default router;

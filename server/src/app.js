import express from 'express';
import mongoose from 'mongoose';
import { errorHandler, HttpError } from './middleware/error.js';
import adminRouter from './routes/admin.js';
import artistRouter from './routes/artist.js';
import authRouter from './routes/auth.js';
import libraryRouter from './routes/library.js';
import playlistsRouter from './routes/playlists.js';
import tracksRouter from './routes/tracks.js';
import { coverDir } from './services/storage.js';

export const app = express();

// Auth is a Bearer header, never a cookie, so allowing any origin exposes nothing a script could not already send
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method !== 'OPTIONS') return next();
  res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE');
  res.set('Access-Control-Allow-Headers', 'Authorization,Content-Type');
  res.status(204).end();
});

app.use(express.json());
// Only covers are static: audio must go through the stream route so hidden tracks stay unreachable.
app.use('/uploads/covers', express.static(coverDir));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.use('/api', authRouter);
app.use('/api/tracks', tracksRouter);
app.use('/api/me', libraryRouter);
app.use('/api/playlists', playlistsRouter);
app.use('/api/artist/tracks', artistRouter);
app.use('/api/admin', adminRouter);

app.use((req, res, next) => next(new HttpError(404, 'Không tìm thấy')));
app.use(errorHandler);

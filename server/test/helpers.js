import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, afterEach, before } from 'node:test';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

// Must be set before storage.js loads, which is why the app is imported dynamically below.
const uploadDir = mkdtempSync(path.join(os.tmpdir(), 'music-server-test-'));
process.env.UPLOAD_DIR = uploadDir;
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';

const { app } = await import('../src/app.js');
const { signToken } = await import('../src/middleware/auth.js');
const { User } = await import('../src/models/User.js');
const { Track } = await import('../src/models/Track.js');
const { Favorite, Playlist, PlayHistory } = await import('../src/models/library.js');

export { Favorite, Playlist, PlayHistory, Track, User, uploadDir };

// The app's calls to Audius go through globalThis.fetch, so tests stub it and keep the real one for local requests.
export const realFetch = globalThis.fetch;
export const stubAudius = (handler) => {
  globalThis.fetch = async (url) => handler(String(url));
};

export function audiusTrack(id, overrides = {}) {
  return {
    id,
    title: `Audius ${id}`,
    duration: 100,
    is_streamable: true,
    user: { name: 'Audius artist' },
    artwork: { '480x480': `https://cdn/${id}.jpg` },
    ...overrides,
  };
}

let passwordHash;
let userCount = 0;

export async function createUser(fields = {}) {
  passwordHash ??= await bcrypt.hash('password123', 4);
  userCount += 1;
  const user = await User.create({ name: `User ${userCount}`, email: `user${userCount}@test.dev`, passwordHash, ...fields });
  return { user, token: signToken(user) };
}

// A valid MPEG1 Layer 3 stream: 40 silent frames at 128 kbps, 44.1 kHz, about one second.
export function mp3Bytes() {
  const frame = Buffer.alloc(417);
  Buffer.from([0xff, 0xfb, 0x90, 0x00]).copy(frame);
  return Buffer.concat(Array(40).fill(frame));
}

export const pngBytes = () => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);

/** Starts the app against a throwaway database and returns an api() helper. */
export function setupApi() {
  let server;
  let base;

  before(async () => {
    await mongoose.connect(`mongodb://127.0.0.1:27017/mma301_music_test_${process.pid}`, {
      serverSelectionTimeoutMS: 3000,
    });
    await Promise.all([User, Track, Favorite, Playlist, PlayHistory].map((model) => model.init()));
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    base = `http://127.0.0.1:${server.address().port}`;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    server.close();
    rmSync(uploadDir, { recursive: true, force: true });
  });

  return async function api(route, { token, json, form, ...init } = {}) {
    const headers = { ...init.headers };
    if (token) headers.authorization = `Bearer ${token}`;
    if (json !== undefined) headers['content-type'] = 'application/json';
    const body = json !== undefined ? JSON.stringify(json) : form;
    return realFetch(`${base}${route}`, { ...init, headers, body, redirect: 'manual' });
  };
}

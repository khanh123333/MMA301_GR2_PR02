import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { createUser, mp3Bytes, pngBytes, setupApi, Track, uploadDir } from './helpers.js';

const api = setupApi();

function trackForm({ title = 'Bài mới', audio = mp3Bytes(), cover, genre } = {}) {
  const form = new FormData();
  if (title !== undefined) form.append('title', title);
  if (genre) form.append('genre', genre);
  if (audio) form.append('audio', new Blob([audio]), 'song.mp3');
  if (cover) form.append('cover', new Blob([cover]), 'cover.png');
  return form;
}

const upload = (token, options) => api('/api/artist/tracks', { method: 'POST', token, form: trackForm(options) });
const files = (dir) => readdirSync(path.join(uploadDir, dir));

test('only artists can upload', async () => {
  assert.equal((await upload(undefined)).status, 401);
  const { token } = await createUser({ role: 'LISTENER' });
  assert.equal((await upload(token)).status, 403);
  const admin = await createUser({ role: 'ADMIN' });
  assert.equal((await upload(admin.token)).status, 403);
});

test('upload reads duration from the file, stores it and makes it streamable with Range', async () => {
  const { user, token } = await createUser({ role: 'ARTIST', name: 'Nghệ sĩ A' });
  const res = await upload(token, { title: 'Bài một', genre: 'Pop', cover: pngBytes() });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.source, 'LOCAL');
  assert.equal(body.artist, 'Nghệ sĩ A');
  assert.equal(body.duration, 1);
  assert.match(body.artwork, /\/uploads\/covers\/.+\.png$/);

  const stored = await Track.findById(body.id);
  assert.equal(String(stored.artist), user.id);
  assert.match(stored.audioFile, /^[0-9a-f-]{36}\.mp3$/);

  const partial = await api(`/api/tracks/local/${body.id}/stream`, { headers: { range: 'bytes=0-99' } });
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get('content-type'), 'audio/mpeg');
  assert.equal((await partial.arrayBuffer()).byteLength, 100);

  const cover = await api(new URL(body.artwork).pathname);
  assert.equal(cover.status, 200);
  assert.equal(cover.headers.get('content-type'), 'image/png');
});

test('audio files are not reachable as static files', async () => {
  const { token } = await createUser({ role: 'ARTIST' });
  const { id } = await (await upload(token)).json();
  const { audioFile } = await Track.findById(id);
  assert.equal((await api(`/uploads/audio/${audioFile}`)).status, 404);
  assert.equal((await api(`/uploads/covers/../audio/${audioFile}`)).status, 404);
});

test('upload rejects a fake audio file or cover and leaves nothing on disk', async () => {
  const { token } = await createUser({ role: 'ARTIST' });
  const before = { audio: files('audio').length, covers: files('covers').length };

  assert.equal((await upload(token, { audio: Buffer.from('<script>alert(1)</script>'.repeat(50)) })).status, 400);
  assert.equal((await upload(token, { cover: Buffer.from('<svg onload=alert(1)>') })).status, 400);
  assert.equal((await upload(token, { audio: null })).status, 400);
  assert.equal((await upload(token, { title: '   ' })).status, 400);

  assert.equal(files('audio').length, before.audio);
  assert.equal(files('covers').length, before.covers);
  assert.deepEqual(files('tmp'), []);
});

test('upload enforces the 20 MB audio and 5 MB cover limits', async () => {
  const { token } = await createUser({ role: 'ARTIST' });
  assert.equal((await upload(token, { audio: Buffer.alloc(20 * 1024 * 1024 + 1) })).status, 400);
  const bigPng = Buffer.concat([pngBytes(), Buffer.alloc(5 * 1024 * 1024)]);
  assert.equal((await upload(token, { cover: bigPng })).status, 400);
  assert.deepEqual(files('tmp'), []);
});

test('an artist cannot exceed 50 tracks', async () => {
  const { user, token } = await createUser({ role: 'ARTIST' });
  await Track.insertMany(
    Array.from({ length: 50 }, (_, i) => ({ artist: user._id, artistName: 'A', title: `T${i}`, duration: 1, audioFile: 'x.mp3', fileSize: 1 })),
  );
  assert.equal((await upload(token)).status, 409);
});

test('artist lists and edits own tracks, replacing the cover removes the old file', async () => {
  const { token } = await createUser({ role: 'ARTIST' });
  const { id, artwork } = await (await upload(token, { cover: pngBytes() })).json();
  const oldCover = path.join(uploadDir, 'covers', path.basename(new URL(artwork).pathname));
  assert.ok(existsSync(oldCover));

  const form = new FormData();
  form.append('title', 'Tên mới');
  form.append('cover', new Blob([pngBytes()]), 'new.png');
  const res = await api(`/api/artist/tracks/${id}`, { method: 'PATCH', token, form });
  assert.equal(res.status, 200);
  const updated = await res.json();
  assert.equal(updated.title, 'Tên mới');
  assert.notEqual(updated.artwork, artwork);
  assert.ok(!existsSync(oldCover));

  const json = await api(`/api/artist/tracks/${id}`, { method: 'PATCH', token, json: { genre: 'Rock', isHidden: true } });
  const patched = await json.json();
  assert.equal(patched.genre, 'Rock');
  // Hiding is an Admin action, the extra field must be ignored
  assert.equal(patched.isHidden, false);

  const list = await (await api('/api/artist/tracks', { token })).json();
  assert.equal(list.total, 1);
  assert.equal(list.items[0].id, id);
});

test("an artist cannot edit or delete another artist's track", async () => {
  const owner = await createUser({ role: 'ARTIST' });
  const other = await createUser({ role: 'ARTIST' });
  const { id } = await (await upload(owner.token)).json();
  const route = `/api/artist/tracks/${id}`;

  assert.equal((await api(route, { method: 'PATCH', token: other.token, json: { title: 'Hacked' } })).status, 404);
  assert.equal((await api(route, { method: 'DELETE', token: other.token })).status, 404);
  assert.equal((await Track.findById(id)).title, 'Bài mới');
});

test('delete removes the track and its files, stream then answers 404', async () => {
  const { token } = await createUser({ role: 'ARTIST' });
  const { id } = await (await upload(token, { cover: pngBytes() })).json();
  const { audioFile, coverFile } = await Track.findById(id);

  assert.equal((await api(`/api/artist/tracks/${id}`, { method: 'DELETE', token })).status, 204);
  assert.ok(!existsSync(path.join(uploadDir, 'audio', audioFile)));
  assert.ok(!existsSync(path.join(uploadDir, 'covers', coverFile)));
  assert.equal((await api(`/api/tracks/local/${id}/stream`)).status, 404);
});

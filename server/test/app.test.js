import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { audiusTrack, createUser, realFetch, setupApi, stubAudius, Track } from './helpers.js';
import { errorHandler } from '../src/middleware/error.js';
import { rateLimit } from '../src/middleware/rateLimit.js';

const api = setupApi();

const localTrack = (user, fields = {}) =>
  Track.create({ artist: user._id, artistName: 'Sơn Tùng', title: 'Lạc trôi', duration: 10, audioFile: 'none.mp3', fileSize: 1, ...fields });

test('health reports the database', async () => {
  const res = await api('/api/health');
  assert.deepEqual(await res.json(), { status: 'ok', db: 'connected' });
});

test('browsers may call the API from another origin', async () => {
  const simple = await api('/api/health');
  assert.equal(simple.headers.get('access-control-allow-origin'), '*');

  // A preflight carries no token, so it must not reach requireAuth
  const preflight = await api('/api/me/favorites/audius/abc', { method: 'OPTIONS' });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), '*');
  assert.match(preflight.headers.get('access-control-allow-methods'), /DELETE/);
  assert.match(preflight.headers.get('access-control-allow-headers'), /Authorization/);
});

test('unknown routes answer JSON 404', async () => {
  const res = await api('/api/nope');
  assert.equal(res.status, 404);
  assert.ok((await res.json()).error);
});

test('malformed JSON is a 400, not a 500', async () => {
  const res = await api('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, form: '{oops' });
  assert.equal(res.status, 400);
});

test('search requires q', async () => {
  assert.equal((await api('/api/tracks/search')).status, 400);
  assert.equal((await api('/api/tracks/search?q=a&q=b')).status, 400);
});

test('search lists visible local tracks first and drops non-streamable Audius tracks', async () => {
  const { user } = await createUser({ role: 'ARTIST' });
  const visible = await localTrack(user, { title: 'zebra one' });
  await localTrack(user, { title: 'zebra hidden', isHidden: true });
  stubAudius(() => Response.json({ data: [audiusTrack('a'), audiusTrack('b', { is_streamable: false })] }));

  const tracks = await (await api('/api/tracks/search?q=ZEBRA')).json();
  assert.deepEqual(tracks.map((track) => track.id), [visible.id, 'a']);
  assert.deepEqual(tracks[1], {
    source: 'AUDIUS', id: 'a', title: 'Audius a', artist: 'Audius artist', artwork: 'https://cdn/a.jpg', duration: 100,
  });
});

test('search treats q as text, not as a regex', async () => {
  stubAudius(() => Response.json({ data: [] }));
  const res = await api(`/api/tracks/search?q=${encodeURIComponent('.*(')}`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), []);
});

test('search still returns local tracks when Audius is down', async () => {
  const { user } = await createUser({ role: 'ARTIST' });
  const track = await localTrack(user, { title: 'offline song' });
  stubAudius(() => new Response('', { status: 500 }));

  const res = await api('/api/tracks/search?q=offline');
  assert.equal(res.status, 200);
  assert.deepEqual((await res.json()).map((row) => row.id), [track.id]);
});

test('trending answers 502 when Audius is down', async () => {
  stubAudius(() => {
    throw new Error('network down');
  });
  assert.equal((await api('/api/tracks/trending')).status, 502);
});

test('stream redirects Audius tracks', async () => {
  const res = await api('/api/tracks/audius/YmJWK/stream');
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), 'https://api.audius.co/v1/tracks/YmJWK/stream');
});

test('stream rejects ids that could alter the upstream path and unknown sources', async () => {
  assert.equal((await api('/api/tracks/audius/..%2Fusers/stream')).status, 400);
  assert.equal((await api('/api/tracks/spotify/abc/stream')).status, 400);
  assert.equal((await api('/api/tracks/local/not-an-object-id/stream')).status, 400);
});

test('rate limit blocks after the maximum and recovers after the window', async () => {
  const limited = express();
  limited.get('/', rateLimit({ windowMs: 50, max: 2 }), (req, res) => res.end());
  limited.use(errorHandler);
  const server = await new Promise((resolve) => {
    const s = limited.listen(0, () => resolve(s));
  });
  const url = `http://127.0.0.1:${server.address().port}/`;

  try {
    assert.equal((await realFetch(url)).status, 200);
    assert.equal((await realFetch(url)).status, 200);
    assert.equal((await realFetch(url)).status, 429);
    await new Promise((resolve) => {
      setTimeout(resolve, 60);
    });
    assert.equal((await realFetch(url)).status, 200);
  } finally {
    server.close();
  }
});

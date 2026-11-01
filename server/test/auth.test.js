import assert from 'node:assert/strict';
import { test } from 'node:test';
import jwt from 'jsonwebtoken';
import { createUser, setupApi, User } from './helpers.js';

const api = setupApi();

const register = (json) => api('/api/auth/register', { method: 'POST', json });
const validUser = { name: 'An', email: 'An@Test.dev', password: 'password123' };

test('register creates a listener by default and never returns the hash', async () => {
  const res = await register(validUser);
  assert.equal(res.status, 201);
  const { token, user } = await res.json();
  assert.ok(token);
  assert.deepEqual(Object.keys(user).sort(), ['email', 'id', 'name', 'role']);
  assert.equal(user.email, 'an@test.dev');
  assert.equal(user.role, 'LISTENER');
});

test('register can choose ARTIST but never ADMIN', async () => {
  const artist = await register({ ...validUser, email: 'artist@test.dev', role: 'ARTIST' });
  assert.equal((await artist.json()).user.role, 'ARTIST');
  const admin = await register({ ...validUser, email: 'admin@test.dev', role: 'ADMIN' });
  assert.equal(admin.status, 400);
});

test('register rejects duplicate email, weak password and non-string input', async () => {
  await register({ ...validUser, email: 'dup@test.dev' });
  assert.equal((await register({ ...validUser, email: 'DUP@test.dev' })).status, 409);
  assert.equal((await register({ ...validUser, email: 'p@test.dev', password: 'short' })).status, 400);
  assert.equal((await register({ ...validUser, email: 'p@test.dev', password: 'é'.repeat(40) })).status, 400);
  assert.equal((await register({ ...validUser, email: { $gt: '' } })).status, 400);
});

test('login checks the password, ignores email case, and refuses locked accounts', async () => {
  await createUser({ email: 'login@test.dev' });
  await createUser({ email: 'locked@test.dev', isActive: false });
  const login = (json) => api('/api/auth/login', { method: 'POST', json });

  assert.equal((await login({ email: 'LOGIN@test.dev', password: 'password123' })).status, 200);
  assert.equal((await login({ email: 'login@test.dev', password: 'wrong-password' })).status, 401);
  assert.equal((await login({ email: 'ghost@test.dev', password: 'password123' })).status, 401);
  assert.equal((await login({ email: 'locked@test.dev', password: 'password123' })).status, 403);
  assert.equal((await login({ email: { $gt: '' }, password: 'x' })).status, 400);
});

test('/me requires a valid token', async () => {
  const { user, token } = await createUser();
  assert.equal((await api('/api/me')).status, 401);
  assert.equal((await api('/api/me', { token: 'garbage' })).status, 401);
  assert.equal((await (await api('/api/me', { token })).json()).id, user.id);
});

test('tokens signed with another secret or algorithm are rejected', async () => {
  const { user } = await createUser();
  const options = { subject: user.id, issuer: 'mma301-music', audience: 'mma301-music-app' };
  const forged = jwt.sign({ version: 0 }, 'another-secret', options);
  const none = jwt.sign({ version: 0 }, '', { ...options, algorithm: 'none' });
  assert.equal((await api('/api/me', { token: forged })).status, 401);
  assert.equal((await api('/api/me', { token: none })).status, 401);
});

test('logout invalidates existing tokens', async () => {
  const { token } = await createUser();
  assert.equal((await api('/api/auth/logout', { method: 'POST', token })).status, 204);
  assert.equal((await api('/api/me', { token })).status, 401);
});

test('locking a user invalidates their token immediately', async () => {
  const { user, token } = await createUser();
  await User.updateOne({ _id: user._id }, { isActive: false });
  assert.equal((await api('/api/me', { token })).status, 401);
});

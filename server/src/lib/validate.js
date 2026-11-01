import { HttpError } from '../middleware/error.js';

export const isObjectId = (value) => /^[a-f\d]{24}$/i.test(value);

export function parseText(value, label, { min = 1, max }) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length < min || text.length > max) {
    throw new HttpError(400, `${label} phải có từ ${min} đến ${max} ký tự`);
  }
  return text;
}

export function parseEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'Email không hợp lệ');
  }
  return email;
}

export function parsePassword(value) {
  // bcrypt silently ignores everything past 72 bytes
  if (typeof value !== 'string' || value.length < 8 || Buffer.byteLength(value) > 72) {
    throw new HttpError(400, 'Mật khẩu phải có ít nhất 8 ký tự và không quá 72 byte');
  }
  return value;
}

export function parseBoolean(value, label) {
  if (typeof value !== 'boolean') throw new HttpError(400, `${label} phải là true hoặc false`);
  return value;
}

export function parsePage(query) {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { open, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { parseFile } from 'music-metadata';
import { HttpError } from '../middleware/error.js';

const root = process.env.UPLOAD_DIR ?? path.join(import.meta.dirname, '../../data/uploads');

export const audioDir = path.join(root, 'audio');
export const coverDir = path.join(root, 'covers');
export const tmpDir = path.join(root, 'tmp');

for (const dir of [audioDir, coverDir, tmpDir]) mkdirSync(dir, { recursive: true });

const MAX_COVER_SIZE = 5 * 1024 * 1024;

// Reads the file itself: the mimetype and filename sent by the client are not trusted.
export async function inspectAudio(filePath) {
  let format;
  try {
    ({ format } = await parseFile(filePath, { duration: true }));
  } catch {
    throw new HttpError(400, 'File audio không hợp lệ');
  }

  const { container = '', codec = '', duration } = format;
  const isMp3 = container === 'MPEG' && codec.includes('Layer 3');
  const isM4a = /^(M4A|mp4|mp42|isom)/i.test(container) && codec.includes('AAC');
  if ((!isMp3 && !isM4a) || !(duration > 0)) throw new HttpError(400, 'Chỉ hỗ trợ audio MP3 hoặc M4A');

  return { extension: isMp3 ? '.mp3' : '.m4a', duration: Math.round(duration) };
}

export async function inspectCover({ path: filePath, size }) {
  if (size > MAX_COVER_SIZE) throw new HttpError(400, 'Ảnh bìa không được vượt quá 5 MB');

  const file = await open(filePath);
  const head = Buffer.alloc(12);
  try {
    await file.read(head, 0, 12, 0);
  } finally {
    await file.close();
  }

  if (head.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return '.jpg';
  if (head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return '.png';
  if (head.toString('latin1', 0, 4) === 'RIFF' && head.toString('latin1', 8, 12) === 'WEBP') return '.webp';
  throw new HttpError(400, 'Ảnh bìa phải là JPG, PNG hoặc WebP');
}

export async function storeFile(tmpPath, dir, extension) {
  const name = `${randomUUID()}${extension}`;
  await rename(tmpPath, path.join(dir, name));
  return name;
}

export async function removeFile(dir, name) {
  if (!name) return;
  try {
    await rm(path.join(dir, name), { force: true });
  } catch (err) {
    console.error(`Could not delete ${name}`, err);
  }
}

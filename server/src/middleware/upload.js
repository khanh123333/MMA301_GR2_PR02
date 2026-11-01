import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { tmpDir } from '../services/storage.js';

const upload = multer({
  storage: multer.diskStorage({
    destination: tmpDir,
    // The client's filename is never used on disk
    filename: (req, file, cb) => cb(null, randomUUID()),
  }),
  limits: { fileSize: 20 * 1024 * 1024, files: 2, fields: 10, fieldSize: 1024 },
});

export const uploadTrackFiles = upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]);

export const uploadCover = upload.fields([{ name: 'cover', maxCount: 1 }]);

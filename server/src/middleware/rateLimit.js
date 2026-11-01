import { HttpError } from './error.js';

// shortcut: counters live in this process and reset on restart, move to a shared store if the server runs multiple instances
export function rateLimit({ windowMs, max, key = (req) => req.ip }) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    for (const [k, hit] of hits) {
      if (hit.resetAt <= now) hits.delete(k);
    }

    const k = key(req);
    const hit = hits.get(k) ?? { count: 0, resetAt: now + windowMs };
    hit.count += 1;
    hits.set(k, hit);

    if (hit.count > max) throw new HttpError(429, 'Bạn thao tác quá nhiều lần, vui lòng thử lại sau');
    next();
  };
}

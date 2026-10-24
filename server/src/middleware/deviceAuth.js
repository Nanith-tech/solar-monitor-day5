import { timingSafeEqual } from 'node:crypto';
import { HttpError } from './errorHandler.js';

export function deviceAuth(config) {
  const expected = Buffer.from(config.deviceKey);
  return (req, res, next) => {
    const supplied = Buffer.from(req.get('X-Device-Key') || '');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      return next(new HttpError(401, 'UNAUTHORIZED', 'A valid X-Device-Key is required.'));
    }
    next();
  };
}

import { AppError } from '../../shared/errors/AppError.js';

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB

export function isPng(buf) {
  return (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  );
}

export function isJpeg(buf) {
  return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

export function isWebp(buf) {
  return (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  );
}

export function validateStoreLogo(logo) {
  if (logo === null || logo === undefined || logo === '') {
    return true;
  }

  if (typeof logo !== 'string') {
    throw new AppError('Logo must be a string URL or image data', 400, 'INVALID_LOGO');
  }

  const trimmed = logo.trim();

  // If HTTP/HTTPS URL
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      new URL(trimmed);
      return true;
    } catch {
      throw new AppError('Invalid logo URL', 400, 'INVALID_LOGO_URL');
    }
  }

  // Must be Data URL
  const dataUrlRegex = /^data:image\/([a-zA-Z0-9+.-]+);base64,(.*)$/s;
  const match = dataUrlRegex.exec(trimmed);
  if (!match) {
    throw new AppError(
      'Unsupported logo format. Must be an HTTP(S) URL or base64 image data URL (PNG, JPEG, WebP).',
      400,
      'INVALID_IMAGE_FORMAT'
    );
  }

  const base64Content = match[2].replace(/\s/g, '');
  const buffer = Buffer.from(base64Content, 'base64');

  if (buffer.length > MAX_LOGO_BYTES) {
    throw new AppError(
      `Logo image exceeds maximum allowed size of 2MB (received ${(buffer.length / (1024 * 1024)).toFixed(2)}MB).`,
      400,
      'IMAGE_TOO_LARGE'
    );
  }

  if (buffer.length < 12) {
    throw new AppError('Invalid or corrupted image data.', 400, 'INVALID_IMAGE_DATA');
  }

  // Validate magic bytes — do NOT trust declared MIME type alone
  const isAllowedImage = isPng(buffer) || isJpeg(buffer) || isWebp(buffer);
  if (!isAllowedImage) {
    throw new AppError(
      'Unsupported image file format. Only PNG, JPEG, and WebP images are allowed.',
      400,
      'UNSUPPORTED_IMAGE_TYPE'
    );
  }

  return true;
}

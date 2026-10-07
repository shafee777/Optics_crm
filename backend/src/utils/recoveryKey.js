import crypto from 'node:crypto';

// Unambiguous alphanumeric charset (32 chars: excludes 0, O, 1, I)
const CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generates a cryptographically secure 16-character recovery key
 * formatted in 4 blocks of 4 characters: 'XXXX-XXXX-XXXX-XXXX'.
 * @returns {string} Plaintext recovery key
 */
export function generateRecoveryKey() {
  const bytes = crypto.randomBytes(16);
  let keyChars = '';
  for (let i = 0; i < 16; i++) {
    keyChars += CHARSET[bytes[i] % CHARSET.length];
  }
  return `${keyChars.slice(0, 4)}-${keyChars.slice(4, 8)}-${keyChars.slice(8, 12)}-${keyChars.slice(12, 16)}`;
}

/**
 * Normalizes user-supplied recovery key input.
 * Strips whitespace, hyphens, and non-alphanumeric characters,
 * converts to uppercase, and formats into canonical 'XXXX-XXXX-XXXX-XXXX'.
 * @param {string} input
 * @returns {string} Normalized canonical recovery key
 */
export function normalizeRecoveryKey(input) {
  if (!input || typeof input !== 'string') return '';
  const cleaned = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length !== 16) {
    return cleaned;
  }
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}`;
}

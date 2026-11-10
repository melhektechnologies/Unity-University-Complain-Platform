import crypto from 'crypto';

/**
 * Unambiguous character set for tracking references (omits 0, O, 1, I, L)
 */
const REFERENCE_CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * Generates an institutional tracking reference: e.g. UU-2026-X8M2KP
 */
export function generateTrackingReference(year = new Date().getFullYear()): string {
  const bytes = crypto.randomBytes(6);
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    randomPart += REFERENCE_CHARSET[bytes[i] % REFERENCE_CHARSET.length];
  }
  return `UU-${year}-${randomPart}`;
}

/**
 * Generates a tracking secret passcode with at least 128 bits of cryptographic entropy.
 * 16 bytes = 128 bits. Formatted as 4-4-4-4 for student legibility: e.g. a7f2-9c1e-3b4d-8e6f
 */
export function generateTrackingPasscode(): { cleartextPasscode: string; entropyBits: number } {
  const bytes = crypto.randomBytes(16); // 128 bits
  const hex = bytes.toString('hex'); // 32 hex chars
  const formatted = `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;

  return {
    cleartextPasscode: formatted,
    entropyBits: 128,
  };
}

/**
 * Hashes the passcode using cryptographic scrypt with a unique 128-bit salt.
 * Output format: scrypt$saltHex$derivedKeyHex
 */
export function hashPasscode(passcode: string): string {
  const cleanPasscode = passcode.trim().toLowerCase();
  const salt = crypto.randomBytes(16); // 128-bit random salt
  const derivedKey = crypto.scryptSync(cleanPasscode, salt, 64);

  return `scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

/**
 * Constant-time verification of a cleartext passcode against the stored hash.
 * Prevents timing attacks.
 */
export function verifyPasscode(passcode: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') {
      return false;
    }

    const salt = Buffer.from(parts[1], 'hex');
    const expectedKey = Buffer.from(parts[2], 'hex');

    const cleanPasscode = passcode.trim().toLowerCase();
    const actualKey = crypto.scryptSync(cleanPasscode, salt, 64);

    return crypto.timingSafeEqual(expectedKey, actualKey);
  } catch {
    return false;
  }
}

/**
 * In-memory sliding-window rate limiter for public tracking lookups.
 * Limit: 5 failed attempts per client key per 15 minutes.
 */
interface RateLimitEntry {
  attempts: number;
  blockedUntil: number | null;
  lastAttemptAt: number;
}

export class TrackingRateLimiter {
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly blockDurationMs: number;

  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000, blockDurationMs = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.blockDurationMs = blockDurationMs;
  }

  public check(clientKey: string, now = Date.now()): { allowed: boolean; remaining: number; retryAfterSeconds?: number } {
    const entry = this.store.get(clientKey);

    if (!entry) {
      return { allowed: true, remaining: this.maxAttempts };
    }

    // Check active block
    if (entry.blockedUntil && entry.blockedUntil > now) {
      const retryAfterSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    // Check window expiration
    if (now - entry.lastAttemptAt > this.windowMs) {
      this.store.delete(clientKey);
      return { allowed: true, remaining: this.maxAttempts };
    }

    const remaining = Math.max(0, this.maxAttempts - entry.attempts);
    return { allowed: entry.attempts < this.maxAttempts, remaining };
  }

  public recordFailure(clientKey: string, now = Date.now()): void {
    const entry = this.store.get(clientKey);

    if (!entry || now - entry.lastAttemptAt > this.windowMs) {
      this.store.set(clientKey, {
        attempts: 1,
        blockedUntil: null,
        lastAttemptAt: now,
      });
      return;
    }

    entry.attempts += 1;
    entry.lastAttemptAt = now;

    if (entry.attempts >= this.maxAttempts) {
      entry.blockedUntil = now + this.blockDurationMs;
    }
  }

  public recordSuccess(clientKey: string): void {
    this.store.delete(clientKey);
  }

  public clear(): void {
    this.store.clear();
  }
}

export const defaultTrackingLimiter = new TrackingRateLimiter();


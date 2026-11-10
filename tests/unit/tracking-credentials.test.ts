import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateTrackingReference,
  generateTrackingPasscode,
  hashPasscode,
  verifyPasscode,
  TrackingRateLimiter,
} from '../../src/lib/tracking/credentials';

describe('Tracking Credentials Cryptographic Security', () => {
  it('generates institutional tracking reference matching UU-YYYY-XXXXXX format', () => {
    const year = 2026;
    const ref = generateTrackingReference(year);

    expect(ref).toMatch(/^UU-2026-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);

    // Verify entropy and uniqueness over 50 generations
    const set = new Set<string>();
    for (let i = 0; i < 50; i++) {
      set.add(generateTrackingReference(year));
    }
    expect(set.size).toBe(50);
  });

  it('generates secret passcode with at least 128 bits of entropy', () => {
    const { cleartextPasscode, entropyBits } = generateTrackingPasscode();

    expect(entropyBits).toBeGreaterThanOrEqual(128);
    // 4 groups of 4 hex chars = 16 bytes = 128 bits
    expect(cleartextPasscode).toMatch(/^[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}$/);
  });

  it('hashes passcode using salted cryptographic scrypt and verifies correctly', () => {
    const { cleartextPasscode } = generateTrackingPasscode();
    const hash1 = hashPasscode(cleartextPasscode);
    const hash2 = hashPasscode(cleartextPasscode);

    // Each hash must have a unique random salt
    expect(hash1).not.toBe(hash2);
    expect(hash1.startsWith('scrypt$')).toBe(true);

    // Valid verification
    expect(verifyPasscode(cleartextPasscode, hash1)).toBe(true);
    expect(verifyPasscode(cleartextPasscode, hash2)).toBe(true);

    // Case-insensitivity and whitespace trimming
    expect(verifyPasscode(`  ${cleartextPasscode.toUpperCase()}  `, hash1)).toBe(true);

    // Invalid passcode rejection
    expect(verifyPasscode('wrong-passcode-00', hash1)).toBe(false);
    expect(verifyPasscode('0000-0000-0000-0000', hash1)).toBe(false);
  });

  it('rejects malformed or tampered stored hashes gracefully without throwing', () => {
    expect(verifyPasscode('test-code', 'invalid_hash_string')).toBe(false);
    expect(verifyPasscode('test-code', 'scrypt$bad_salt$bad_key')).toBe(false);
    expect(verifyPasscode('test-code', '')).toBe(false);
  });
});

describe('Tracking Verification Rate Limiter (Brute-Force Protection)', () => {
  let limiter: TrackingRateLimiter;

  beforeEach(() => {
    // 5 attempts allowed, 15 min window, 15 min block
    limiter = new TrackingRateLimiter(5, 15 * 60 * 1000, 15 * 60 * 1000);
  });

  it('allows lookups within threshold and tracks remaining attempts', () => {
    const clientKey = '192.168.1.100';

    expect(limiter.check(clientKey).allowed).toBe(true);
    expect(limiter.check(clientKey).remaining).toBe(5);

    limiter.recordFailure(clientKey);
    expect(limiter.check(clientKey).allowed).toBe(true);
    expect(limiter.check(clientKey).remaining).toBe(4);
  });

  it('blocks client after 5 consecutive failed attempts and calculates retryAfter', () => {
    const clientKey = '10.0.0.5';
    const startTime = 1000000;

    for (let i = 0; i < 5; i++) {
      limiter.recordFailure(clientKey, startTime);
    }

    const check = limiter.check(clientKey, startTime);
    expect(check.allowed).toBe(false);
    expect(check.remaining).toBe(0);
    expect(check.retryAfterSeconds).toBe(15 * 60); // 900 seconds
  });

  it('resets failure count upon successful credential verification', () => {
    const clientKey = '172.16.0.2';

    limiter.recordFailure(clientKey);
    limiter.recordFailure(clientKey);
    expect(limiter.check(clientKey).remaining).toBe(3);

    limiter.recordSuccess(clientKey);
    expect(limiter.check(clientKey).allowed).toBe(true);
    expect(limiter.check(clientKey).remaining).toBe(5);
  });
});


import { describe, it, expect } from 'vitest';
import {
  STATUS_TRANSITIONS,
  type LeanComplaintStatus,
} from '../../src/lib/complaints/status';

function isValidTransition(from: LeanComplaintStatus, to: LeanComplaintStatus): boolean {
  if (from === to) return true;
  return STATUS_TRANSITIONS[from].includes(to);
}

describe('Lean Student Affairs status machine', () => {
  it('allows the simple officer workflow', () => {
    expect(isValidTransition('NEW', 'UNDER_REVIEW')).toBe(true);
    expect(isValidTransition('UNDER_REVIEW', 'IN_PROGRESS')).toBe(true);
    expect(isValidTransition('UNDER_REVIEW', 'AWAITING_RESPONSE')).toBe(true);
    expect(isValidTransition('UNDER_REVIEW', 'RESOLVED')).toBe(true);
    expect(isValidTransition('IN_PROGRESS', 'RESOLVED')).toBe(true);
    expect(isValidTransition('AWAITING_RESPONSE', 'IN_PROGRESS')).toBe(true);
    expect(isValidTransition('RESOLVED', 'CLOSED')).toBe(true);
  });

  it('rejects skipped or reverse transitions', () => {
    expect(isValidTransition('NEW', 'RESOLVED')).toBe(false);
    expect(isValidTransition('NEW', 'CLOSED')).toBe(false);
    expect(isValidTransition('NEW', 'IN_PROGRESS')).toBe(false);
    expect(isValidTransition('RESOLVED', 'UNDER_REVIEW')).toBe(false);
    expect(isValidTransition('CLOSED', 'NEW')).toBe(false);
  });
});

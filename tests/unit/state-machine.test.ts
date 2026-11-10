import { describe, it, expect } from 'vitest';
import type { ComplaintStatus } from '../../src/lib/validation/schemas';

/**
 * Permitted transitions mirroring public.validate_status_transition() in 0006_state_machine_guard.sql
 */
const PERMITTED_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  NEW: ['UNDER_REVIEW', 'ESCALATED'],
  UNDER_REVIEW: ['ASSIGNED', 'ESCALATED', 'RESOLVED'],
  ASSIGNED: ['IN_PROGRESS', 'ESCALATED', 'UNDER_REVIEW'],
  IN_PROGRESS: ['AWAITING_RESPONSE', 'ESCALATED', 'RESOLVED'],
  AWAITING_RESPONSE: ['IN_PROGRESS', 'ESCALATED', 'CLOSED'],
  ESCALATED: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['UNDER_REVIEW', 'ASSIGNED'],
};

export function isValidTransition(from: ComplaintStatus, to: ComplaintStatus): boolean {
  if (from === to) return true; // Idempotent no-op
  const allowed = PERMITTED_TRANSITIONS[from];
  return !!allowed && allowed.includes(to);
}

describe('Complaint Lifecycle State Machine Guard', () => {
  it('allows all approved lifecycle transitions', () => {
    // Valid standard journey: NEW -> UNDER_REVIEW -> ASSIGNED -> IN_PROGRESS -> RESOLVED -> CLOSED
    expect(isValidTransition('NEW', 'UNDER_REVIEW')).toBe(true);
    expect(isValidTransition('UNDER_REVIEW', 'ASSIGNED')).toBe(true);
    expect(isValidTransition('ASSIGNED', 'IN_PROGRESS')).toBe(true);
    expect(isValidTransition('IN_PROGRESS', 'RESOLVED')).toBe(true);
    expect(isValidTransition('RESOLVED', 'CLOSED')).toBe(true);

    // Clarification loop: IN_PROGRESS -> AWAITING_RESPONSE -> IN_PROGRESS
    expect(isValidTransition('IN_PROGRESS', 'AWAITING_RESPONSE')).toBe(true);
    expect(isValidTransition('AWAITING_RESPONSE', 'IN_PROGRESS')).toBe(true);

    // Escalation paths
    expect(isValidTransition('NEW', 'ESCALATED')).toBe(true);
    expect(isValidTransition('UNDER_REVIEW', 'ESCALATED')).toBe(true);
    expect(isValidTransition('ASSIGNED', 'ESCALATED')).toBe(true);
    expect(isValidTransition('IN_PROGRESS', 'ESCALATED')).toBe(true);

    // Reopening paths
    expect(isValidTransition('RESOLVED', 'REOPENED')).toBe(true);
    expect(isValidTransition('CLOSED', 'REOPENED')).toBe(true);
    expect(isValidTransition('REOPENED', 'UNDER_REVIEW')).toBe(true);
    expect(isValidTransition('REOPENED', 'ASSIGNED')).toBe(true);
  });

  it('rejects illegal status skipping or backwards transitions', () => {
    // Cannot skip directly from NEW to CLOSED
    expect(isValidTransition('NEW', 'CLOSED')).toBe(false);

    // Cannot skip directly from NEW to RESOLVED
    expect(isValidTransition('NEW', 'RESOLVED')).toBe(false);

    // Cannot skip directly from NEW to IN_PROGRESS (must be triaged and assigned)
    expect(isValidTransition('NEW', 'IN_PROGRESS')).toBe(false);

    // Cannot jump from ASSIGNED directly to CLOSED
    expect(isValidTransition('ASSIGNED', 'CLOSED')).toBe(false);

    // Cannot jump from RESOLVED back to IN_PROGRESS without formal REOPENED state
    expect(isValidTransition('RESOLVED', 'IN_PROGRESS')).toBe(false);

    // Cannot jump from CLOSED back to ASSIGNED directly
    expect(isValidTransition('CLOSED', 'ASSIGNED')).toBe(false);
  });
});


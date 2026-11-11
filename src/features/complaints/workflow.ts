import { CAPABILITIES, type Capability, type StaffUserContext } from '@/lib/auth/roles';
import { hasCapability } from '@/lib/auth/guards';

export const COMPLAINT_STATUSES = [
  'NEW',
  'UNDER_REVIEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'AWAITING_RESPONSE',
  'ESCALATED',
  'RESOLVED',
  'CLOSED',
] as const;

export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  NEW: 'New',
  UNDER_REVIEW: 'Under review',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  AWAITING_RESPONSE: 'Awaiting response',
  ESCALATED: 'Escalated',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const STATUS_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  NEW: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['IN_PROGRESS', 'AWAITING_RESPONSE', 'ESCALATED', 'CLOSED'],
  ASSIGNED: ['IN_PROGRESS', 'AWAITING_RESPONSE', 'ESCALATED'],
  IN_PROGRESS: ['AWAITING_RESPONSE', 'RESOLVED', 'ESCALATED'],
  AWAITING_RESPONSE: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  ESCALATED: ['IN_PROGRESS', 'RESOLVED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
};

export const STATUS_CAPABILITIES: Record<ComplaintStatus, Capability> = {
  NEW: CAPABILITIES.TRIAGE_CATEGORIZE,
  UNDER_REVIEW: CAPABILITIES.TRIAGE_CATEGORIZE,
  ASSIGNED: CAPABILITIES.ASSIGN_HANDLER,
  IN_PROGRESS: CAPABILITIES.TRIAGE_CATEGORIZE,
  AWAITING_RESPONSE: CAPABILITIES.DRAFT_PUBLIC_UPDATE,
  ESCALATED: CAPABILITIES.ESCALATE_CASE,
  RESOLVED: CAPABILITIES.RESOLVE_CASE,
  CLOSED: CAPABILITIES.CLOSE_CASE,
};

export function getAvailableStatusTransitions(
  currentStatus: string,
  staff: StaffUserContext
): ComplaintStatus[] {
  if (!COMPLAINT_STATUSES.includes(currentStatus as ComplaintStatus)) {
    return [];
  }

  return STATUS_TRANSITIONS[currentStatus as ComplaintStatus].filter((status) =>
    hasCapability(staff, STATUS_CAPABILITIES[status])
  );
}

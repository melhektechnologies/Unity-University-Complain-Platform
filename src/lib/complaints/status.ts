/** Four public workflow states used by the Student Affairs MVP. */
export const COMPLAINT_STATUSES = ['NEW', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED'] as const;

export type PublicComplaintStatus = (typeof COMPLAINT_STATUSES)[number];
/** Legacy workflow values remain typed so history rows can be mapped safely. */
export type LeanComplaintStatus = PublicComplaintStatus | 'IN_PROGRESS' | 'AWAITING_RESPONSE';

export const STATUS_LABEL: Record<LeanComplaintStatus, string> = {
  NEW: 'Submitted',
  UNDER_REVIEW: 'On Review',
  IN_PROGRESS: 'On Review',
  AWAITING_RESPONSE: 'On Review',
  RESOLVED: 'Solved',
  CLOSED: 'Closed',
};

export const STATUS_BADGE: Record<LeanComplaintStatus, string> = {
  NEW: 'submitted',
  UNDER_REVIEW: 'under-review',
  IN_PROGRESS: 'under-review',
  AWAITING_RESPONSE: 'under-review',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
};

export const STATUS_HINT: Record<PublicComplaintStatus, string> = {
  NEW: 'The complaint has reached Student Affairs.',
  UNDER_REVIEW: 'Student Affairs is reviewing the complaint.',
  RESOLVED: 'The issue has been addressed.',
  CLOSED: 'The complaint has been completed.',
};

export const STATUS_TRANSITIONS: Record<LeanComplaintStatus, readonly LeanComplaintStatus[]> = {
  NEW: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['IN_PROGRESS', 'AWAITING_RESPONSE', 'RESOLVED'],
  IN_PROGRESS: ['RESOLVED'],
  AWAITING_RESPONSE: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
};

/**
 * Safely maps database-era workflow values into the four public states.
 * Unknown database values are never exposed to students or staff screens.
 */
const LEGACY_STATUS_MAP: Record<string, PublicComplaintStatus> = {
  ASSIGNED: 'UNDER_REVIEW',
  IN_PROGRESS: 'UNDER_REVIEW',
  AWAITING_RESPONSE: 'UNDER_REVIEW',
  ESCALATED: 'UNDER_REVIEW',
  REOPENED: 'UNDER_REVIEW',
};

export function isLeanStatus(status: string): status is PublicComplaintStatus {
  return (COMPLAINT_STATUSES as readonly string[]).includes(status);
}

export function toPublicStatus(status: string): PublicComplaintStatus {
  if (isLeanStatus(status)) return status;
  if (status === 'RESOLVED') return 'RESOLVED';
  if (status === 'CLOSED') return 'CLOSED';
  if (status === 'NEW') return 'NEW';
  return LEGACY_STATUS_MAP[status] ?? 'UNDER_REVIEW';
}

export function getStatusLabel(status: string): string {
  return STATUS_LABEL[toPublicStatus(status)];
}

export function getStatusBadge(status: string): string {
  return STATUS_BADGE[toPublicStatus(status)];
}

/** Legacy statuses can be advanced only along transitions allowed by live SQL. */
export function availableStatusTransitions(status: string): readonly PublicComplaintStatus[] {
  if (isLeanStatus(status)) {
    switch (status) {
      case 'NEW': return ['UNDER_REVIEW'];
      case 'UNDER_REVIEW': return ['RESOLVED', 'CLOSED'];
      case 'RESOLVED': return ['CLOSED'];
      case 'CLOSED': return [];
    }
  }
  switch (status) {
    case 'IN_PROGRESS':
      return ['RESOLVED'];
    case 'AWAITING_RESPONSE':
      return ['RESOLVED', 'CLOSED'];
    default:
      return [];
  }
}

export const STATUS_TIMELINE: readonly PublicComplaintStatus[] = [
  'NEW',
  'UNDER_REVIEW',
  'RESOLVED',
  'CLOSED',
];

export function timelineIndex(status: PublicComplaintStatus): number {
  return STATUS_TIMELINE.indexOf(status);
}

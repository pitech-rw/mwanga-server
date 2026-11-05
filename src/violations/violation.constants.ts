export const VIOLATION_STATUSES = [
  'open',
  'under_review',
  'resolved',
  'dismissed',
] as const;

export const VIOLATION_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

export type ViolationStatusName = (typeof VIOLATION_STATUSES)[number];
export type ViolationSeverityName = (typeof VIOLATION_SEVERITIES)[number];

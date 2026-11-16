export const INCIDENT_STATUSES = [
  'open',
  'awaiting_swapper',
  'awaiting_review',
  'damaged',
  'dismissed',
] as const;

export const INCIDENT_MESSAGE_KINDS = [
  'initial',
  'question',
  'reply',
  'resolution',
  'note',
] as const;

export const OPEN_INCIDENT_STATUSES = ['open', 'awaiting_swapper', 'awaiting_review'] as const;
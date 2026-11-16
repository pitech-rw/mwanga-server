import { describe, expect, it } from 'vitest';
import { OPEN_INCIDENT_STATUSES } from './incident.constants.js';

describe('OPEN_INCIDENT_STATUSES', () => {
  it('includes dialogue states but not terminal states', () => {
    expect(OPEN_INCIDENT_STATUSES).toContain('open');
    expect(OPEN_INCIDENT_STATUSES).toContain('awaiting_swapper');
    expect(OPEN_INCIDENT_STATUSES).toContain('awaiting_review');
    expect(OPEN_INCIDENT_STATUSES).not.toContain('damaged');
    expect(OPEN_INCIDENT_STATUSES).not.toContain('dismissed');
  });
});
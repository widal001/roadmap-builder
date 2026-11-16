import { describe, expect, it } from 'vitest';

import {
  EMPTY_FEATURE_STATUSES,
  applyFeatureStatuses,
  parseSavedStatuses,
  serializeStatuses,
  withFeatureStatus,
} from '@/lib/roadmap/feature-statuses';
import { makeFeature } from '@/lib/test-support/plan-fixtures';

describe('withFeatureStatus', () => {
  it('records a status that differs from the catalog', () => {
    const statuses = withFeatureStatus(EMPTY_FEATURE_STATUSES, 'a', 'done', 'backlog');

    expect(statuses).toEqual({ a: 'done' });
  });

  it('drops the entry when the status returns to what the catalog says', () => {
    const changed = withFeatureStatus(EMPTY_FEATURE_STATUSES, 'a', 'done', 'backlog');

    expect(withFeatureStatus(changed, 'a', 'backlog', 'backlog')).toEqual({});
  });

  it('returns the same record when nothing changes', () => {
    const changed = withFeatureStatus(EMPTY_FEATURE_STATUSES, 'a', 'done', 'backlog');

    expect(withFeatureStatus(changed, 'a', 'done', 'backlog')).toBe(changed);
    expect(withFeatureStatus(changed, 'b', 'backlog', 'backlog')).toBe(changed);
  });

  it('leaves other features alone', () => {
    const statuses = withFeatureStatus(
      withFeatureStatus(EMPTY_FEATURE_STATUSES, 'a', 'done', 'backlog'),
      'b',
      'in_review',
      'backlog',
    );

    expect(statuses).toEqual({ a: 'done', b: 'in_review' });
  });
});

describe('applyFeatureStatuses', () => {
  const features = [makeFeature('a'), makeFeature('b')];

  it('returns the features untouched when nothing has been changed', () => {
    expect(applyFeatureStatuses(features, EMPTY_FEATURE_STATUSES)).toBe(features);
  });

  it('applies an override to the feature it names', () => {
    const applied = applyFeatureStatuses(features, { a: 'done' });

    expect(applied.map((f) => f.status)).toEqual(['done', 'backlog']);
  });

  it('keeps the original object for features it does not change', () => {
    const applied = applyFeatureStatuses(features, { a: 'done' });

    expect(applied[1]).toBe(features[1]);
  });

  it('ignores an override for a feature that is not in the list', () => {
    expect(applyFeatureStatuses(features, { ghost: 'done' }).map((f) => f.status)).toEqual([
      'backlog',
      'backlog',
    ]);
  });
});

describe('saving', () => {
  it('reads back what it wrote', () => {
    expect(parseSavedStatuses(serializeStatuses({ a: 'done' }))).toEqual({ a: 'done' });
  });

  it('treats an unreadable value as no changes at all', () => {
    expect(parseSavedStatuses('{ not json')).toEqual({});
    expect(parseSavedStatuses(null)).toEqual({});
    expect(parseSavedStatuses('[]')).toEqual({});
  });

  it('rejects a status that is no longer configured', () => {
    expect(parseSavedStatuses(JSON.stringify({ a: 'shipped' }))).toEqual({});
  });
});

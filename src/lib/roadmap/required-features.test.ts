import { describe, expect, it } from 'vitest';

import { missingPrerequisites } from '@/lib/roadmap/required-features';
import { fid, makeFeature, makeRoadmap } from '@/lib/test-support/plan-fixtures';

/** A roadmap holding one milestone with the given features in it. */
const roadmapWith = (...featureIds: string[]) => makeRoadmap([{ id: 'chosen', featureIds }]);

const emptyRoadmap = makeRoadmap();

describe('missingPrerequisites', () => {
  it('reports nothing for a feature with no dependencies', () => {
    const feature = makeFeature('solo');

    const result = missingPrerequisites(feature, [feature], emptyRoadmap);

    expect(result.missing).toEqual([]);
    expect(result.additionalCents).toBe(0);
  });

  it('reports a blocker that is not in the roadmap', () => {
    const blocker = makeFeature('blocker', { size: 'm' });
    const feature = makeFeature('f', { blockedBy: [fid('blocker')] });

    const result = missingPrerequisites(feature, [feature, blocker], emptyRoadmap);

    expect(result.missing.map((f) => f.id)).toEqual(['blocker']);
    expect(result.additionalCents).toBe(1_000_000);
  });

  it('ignores a blocker that is already in the roadmap', () => {
    const blocker = makeFeature('blocker');
    const feature = makeFeature('f', { blockedBy: [fid('blocker')] });

    const result = missingPrerequisites(feature, [feature, blocker], roadmapWith('blocker'));

    expect(result.missing).toEqual([]);
  });

  it('does not care which milestone holds the blocker', () => {
    const blocker = makeFeature('blocker');
    const feature = makeFeature('f', { blockedBy: [fid('blocker')] });
    const roadmap = makeRoadmap([
      { id: 'elsewhere', featureIds: ['blocker'] },
      { id: 'chosen', featureIds: ['f'] },
    ]);

    expect(missingPrerequisites(feature, [feature, blocker], roadmap).missing).toEqual([]);
  });

  it('ignores a blocker that has already been delivered', () => {
    const blocker = makeFeature('blocker', { status: 'done' });
    const feature = makeFeature('f', { blockedBy: [fid('blocker')] });

    const result = missingPrerequisites(feature, [feature, blocker], emptyRoadmap);

    expect(result.missing).toEqual([]);
  });

  it('follows the chain, because a blocker can have its own blocker', () => {
    const deep = makeFeature('deep', { size: 's' });
    const middle = makeFeature('middle', { blockedBy: [fid('deep')], size: 's' });
    const feature = makeFeature('f', { blockedBy: [fid('middle')] });

    const result = missingPrerequisites(feature, [feature, middle, deep], emptyRoadmap);

    expect(result.missing.map((f) => f.id)).toEqual(['middle', 'deep']);
    expect(result.additionalCents).toBe(1_000_000);
  });

  it('stops at a satisfied blocker rather than walking past it', () => {
    const deep = makeFeature('deep');
    const middle = makeFeature('middle', { blockedBy: [fid('deep')] });
    const feature = makeFeature('f', { blockedBy: [fid('middle')] });

    const result = missingPrerequisites(feature, [feature, middle, deep], roadmapWith('middle'));

    expect(result.missing).toEqual([]);
  });

  it('reports a shared blocker only once', () => {
    const shared = makeFeature('shared');
    const a = makeFeature('a', { blockedBy: [fid('shared')] });
    const feature = makeFeature('f', { blockedBy: [fid('a'), fid('shared')] });

    const result = missingPrerequisites(feature, [feature, a, shared], emptyRoadmap);

    expect(result.missing.map((f) => f.id)).toEqual(['a', 'shared']);
  });

  it('ignores a blockedBy pointing at a feature that no longer exists', () => {
    const feature = makeFeature('f', { blockedBy: [fid('ghost')] });

    expect(missingPrerequisites(feature, [feature], emptyRoadmap).missing).toEqual([]);
  });
});

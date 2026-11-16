import { describe, expect, it } from 'vitest';

import { parseSavedRoadmap, serializeRoadmap, startingRoadmap } from '@/lib/roadmap/saved-roadmap';
import { createEmptyRoadmap, isEmptyRoadmap, newCustomMilestoneId } from '@/lib/roadmap/types';
import { makeRoadmap } from '@/lib/test-support/plan-fixtures';

const saved = makeRoadmap([
  { id: 'first', featureIds: ['a', 'b'] },
  {
    id: newCustomMilestoneId(0),
    featureIds: ['c'],
    details: { title: 'Ours', description: 'Work we care about.', deadline: null },
  },
]);

describe('parseSavedRoadmap', () => {
  it('reads back what serializeRoadmap wrote', () => {
    expect(parseSavedRoadmap(serializeRoadmap(saved))).toEqual(saved);
  });

  it('returns null for nothing saved', () => {
    expect(parseSavedRoadmap(null)).toBeNull();
    expect(parseSavedRoadmap(undefined)).toBeNull();
    expect(parseSavedRoadmap('')).toBeNull();
  });

  it('returns null for malformed JSON rather than throwing', () => {
    expect(parseSavedRoadmap('{ not json')).toBeNull();
  });

  it('returns null for JSON that is not an object', () => {
    expect(parseSavedRoadmap('"a string"')).toBeNull();
    expect(parseSavedRoadmap('null')).toBeNull();
  });

  it('returns null for a version we do not recognize', () => {
    // Version 1 is the format `details` replaced, so a roadmap saved by an
    // older build is discarded rather than half-read.
    expect(parseSavedRoadmap(JSON.stringify({ ...saved, version: 1 }))).toBeNull();
    expect(parseSavedRoadmap(JSON.stringify({ ...saved, version: 99 }))).toBeNull();
  });

  it('returns null when a required field is missing', () => {
    const { catalogHash: _dropped, ...withoutHash } = saved;

    expect(parseSavedRoadmap(JSON.stringify(withoutHash))).toBeNull();
  });

  it('returns null when a milestone has the wrong shape', () => {
    const wrong = { ...saved, milestones: [{ id: 'first', featureIds: 'a' }] };

    expect(parseSavedRoadmap(JSON.stringify(wrong))).toBeNull();
  });

  it('accepts an empty roadmap', () => {
    const empty = createEmptyRoadmap('testhash');

    expect(parseSavedRoadmap(serializeRoadmap(empty))).toEqual(empty);
  });
});

describe('startingRoadmap', () => {
  it('keeps a roadmap assembled from the catalog currently loaded', () => {
    expect(startingRoadmap(saved, 'testhash')).toBe(saved);
  });

  it('starts over when the catalog has changed underneath it', () => {
    const starting = startingRoadmap(saved, 'newhash');

    expect(isEmptyRoadmap(starting)).toBe(true);
    expect(starting.catalogHash).toBe('newhash');
  });

  it('starts empty when nothing was saved', () => {
    expect(startingRoadmap(null, 'testhash')).toEqual(createEmptyRoadmap('testhash'));
    expect(startingRoadmap(undefined, 'testhash')).toEqual(createEmptyRoadmap('testhash'));
  });
});

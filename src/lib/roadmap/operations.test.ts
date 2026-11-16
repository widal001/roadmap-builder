import { describe, expect, it } from 'vitest';

import * as roadmapOps from '@/lib/roadmap/operations';
import { createEmptyRoadmap, isEmptyRoadmap, newCustomMilestoneId } from '@/lib/roadmap/types';
import type { MilestoneDetails, Roadmap } from '@/lib/roadmap/types';

const empty = createEmptyRoadmap('testhash');

const details: MilestoneDetails = {
  title: 'Our own milestone',
  description: 'Work we care about.',
  deadline: null,
};

/** A roadmap with two catalog milestones, each holding two features. */
function withTwoMilestones(): Roadmap {
  return roadmapOps.addMilestone(roadmapOps.addMilestone(empty, 'first', ['a', 'b']), 'second', [
    'c',
    'd',
  ]);
}

describe('adding and removing milestones', () => {
  it('brings the suggested features along with the milestone', () => {
    const roadmap = roadmapOps.addMilestone(empty, 'first', ['a', 'b']);

    expect(roadmap.milestones).toEqual([{ id: 'first', featureIds: ['a', 'b'] }]);
  });

  it('adds milestones in the order they were chosen', () => {
    const roadmap = withTwoMilestones();

    expect(roadmap.milestones.map((m) => m.id)).toEqual(['first', 'second']);
  });

  it('returns the same roadmap when the milestone is already in it', () => {
    const roadmap = roadmapOps.addMilestone(empty, 'first', ['a']);

    expect(roadmapOps.addMilestone(roadmap, 'first', ['a'])).toBe(roadmap);
  });

  it('takes a feature off another milestone rather than duplicating it', () => {
    const roadmap = roadmapOps.addMilestone(
      roadmapOps.addMilestone(empty, 'first', ['shared', 'a']),
      'second',
      ['shared'],
    );

    expect(roadmapOps.findMilestone(roadmap, 'first')!.featureIds).toEqual(['a']);
    expect(roadmapOps.findMilestone(roadmap, 'second')!.featureIds).toEqual(['shared']);
  });

  it('removes a milestone and everything in it', () => {
    const roadmap = roadmapOps.removeMilestone(withTwoMilestones(), 'first');

    expect(roadmap.milestones.map((m) => m.id)).toEqual(['second']);
    expect(roadmapOps.allFeatureIds(roadmap)).toEqual(['c', 'd']);
  });

  it('returns the same roadmap when removing a milestone that is not in it', () => {
    const roadmap = withTwoMilestones();

    expect(roadmapOps.removeMilestone(roadmap, 'ghost')).toBe(roadmap);
  });

  it('can be emptied back to where it started', () => {
    const roadmap = roadmapOps.removeMilestone(
      roadmapOps.removeMilestone(withTwoMilestones(), 'first'),
      'second',
    );

    expect(isEmptyRoadmap(roadmap)).toBe(true);
  });
});

describe('adding and removing features', () => {
  it('appends a feature to the milestone it is added to', () => {
    const roadmap = roadmapOps.addFeature(withTwoMilestones(), 'first', 'new');

    expect(roadmapOps.findMilestone(roadmap, 'first')!.featureIds).toEqual(['a', 'b', 'new']);
  });

  it('leaves a feature in only one milestone when it is moved across', () => {
    const roadmap = roadmapOps.addFeature(withTwoMilestones(), 'second', 'a');

    expect(roadmapOps.findMilestone(roadmap, 'first')!.featureIds).toEqual(['b']);
    expect(roadmapOps.findMilestone(roadmap, 'second')!.featureIds).toEqual(['c', 'd', 'a']);
    expect(roadmapOps.allFeatureIds(roadmap).filter((id) => id === 'a')).toHaveLength(1);
  });

  it('returns the same roadmap when the feature is already in that milestone', () => {
    const roadmap = withTwoMilestones();

    expect(roadmapOps.addFeature(roadmap, 'first', 'a')).toBe(roadmap);
  });

  it('returns the same roadmap when the milestone is not in the roadmap', () => {
    const roadmap = withTwoMilestones();

    expect(roadmapOps.addFeature(roadmap, 'ghost', 'a')).toBe(roadmap);
  });

  it('removes a feature from a milestone', () => {
    const roadmap = roadmapOps.removeFeature(withTwoMilestones(), 'first', 'a');

    expect(roadmapOps.findMilestone(roadmap, 'first')!.featureIds).toEqual(['b']);
  });

  it('returns the same roadmap when the feature is not on that milestone', () => {
    const roadmap = withTwoMilestones();

    expect(roadmapOps.removeFeature(roadmap, 'first', 'c')).toBe(roadmap);
  });

  it('puts a removed feature back where it was asked to go', () => {
    const removed = roadmapOps.removeFeature(withTwoMilestones(), 'first', 'a');
    const restored = roadmapOps.addFeature(removed, 'first', 'a');

    expect(roadmapOps.findMilestone(restored, 'first')!.featureIds).toEqual(['b', 'a']);
  });
});

describe('client-built milestones', () => {
  const id = newCustomMilestoneId(0);

  it('starts empty, because nothing was proposed for it', () => {
    const roadmap = roadmapOps.createCustomMilestone(empty, id, details);

    expect(roadmap.milestones).toEqual([{ id, featureIds: [], details }]);
  });

  it('refuses an ID that could collide with a catalog milestone', () => {
    expect(roadmapOps.createCustomMilestone(empty, 'family-experience', details)).toBe(empty);
  });

  it('refuses to create the same milestone twice', () => {
    const roadmap = roadmapOps.createCustomMilestone(empty, id, details);

    expect(roadmapOps.createCustomMilestone(roadmap, id, details)).toBe(roadmap);
  });

  it('holds features like any other milestone, and lets go of them again', () => {
    const created = roadmapOps.createCustomMilestone(empty, id, details);
    const filled = roadmapOps.addFeature(created, id, 'a');

    expect(roadmapOps.findMilestone(filled, id)!.featureIds).toEqual(['a']);
    expect(roadmapOps.allFeatureIds(roadmapOps.removeMilestone(filled, id))).toEqual([]);
  });
});

describe('changing a milestone’s details', () => {
  const id = newCustomMilestoneId(0);

  it('changes a milestone that came off the menu', () => {
    const roadmap = roadmapOps.setMilestoneDetails(
      roadmapOps.addMilestone(empty, 'first', ['a']),
      'first',
      { title: 'Phase one', status: 'active' },
    );

    expect(roadmapOps.findMilestone(roadmap, 'first')!.details).toEqual({
      title: 'Phase one',
      status: 'active',
    });
  });

  it('keeps the features where they were', () => {
    const roadmap = roadmapOps.setMilestoneDetails(withTwoMilestones(), 'first', {
      title: 'Phase one',
    });

    expect(roadmapOps.findMilestone(roadmap, 'first')!.featureIds).toEqual(['a', 'b']);
  });

  it('merges with details already set rather than replacing them', () => {
    const named = roadmapOps.setMilestoneDetails(
      roadmapOps.addMilestone(empty, 'first', []),
      'first',
      {
        title: 'Phase one',
      },
    );
    const roadmap = roadmapOps.setMilestoneDetails(named, 'first', { status: 'active' });

    expect(roadmapOps.findMilestone(roadmap, 'first')!.details).toEqual({
      title: 'Phase one',
      status: 'active',
    });
  });

  it('clears a target date when asked to, which an absent field does not', () => {
    const dated = roadmapOps.setMilestoneDetails(
      roadmapOps.addMilestone(empty, 'first', []),
      'first',
      {
        deadline: '2027-06-30',
      },
    );

    const untouched = roadmapOps.setMilestoneDetails(dated, 'first', { title: 'Phase one' });
    const cleared = roadmapOps.setMilestoneDetails(dated, 'first', { deadline: null });

    expect(roadmapOps.findMilestone(untouched, 'first')!.details!.deadline).toBe('2027-06-30');
    expect(roadmapOps.findMilestone(cleared, 'first')!.details!.deadline).toBeNull();
  });

  it('renames a milestone the client built', () => {
    const roadmap = roadmapOps.setMilestoneDetails(
      roadmapOps.createCustomMilestone(empty, id, details),
      id,
      { title: 'Renamed' },
    );

    expect(roadmapOps.findMilestone(roadmap, id)!.details!.title).toBe('Renamed');
  });

  it('returns the same roadmap when nothing changes', () => {
    const roadmap = roadmapOps.createCustomMilestone(empty, id, details);

    expect(roadmapOps.setMilestoneDetails(roadmap, id, { ...details })).toBe(roadmap);
    expect(roadmapOps.setMilestoneDetails(roadmap, id, {})).toBe(roadmap);
  });

  it('returns the same roadmap for a milestone that is not in it', () => {
    const roadmap = withTwoMilestones();

    expect(roadmapOps.setMilestoneDetails(roadmap, 'ghost', { title: 'Phase one' })).toBe(roadmap);
  });
});

describe('reordering', () => {
  it('moves a milestone to an earlier position', () => {
    const roadmap = roadmapOps.moveMilestone(withTwoMilestones(), 'second', 0);

    expect(roadmap.milestones.map((m) => m.id)).toEqual(['second', 'first']);
  });

  it('clamps a position past the end of the list', () => {
    const roadmap = roadmapOps.moveMilestone(withTwoMilestones(), 'first', 99);

    expect(roadmap.milestones.map((m) => m.id)).toEqual(['second', 'first']);
  });

  it('keeps each milestone and its features together', () => {
    const roadmap = roadmapOps.moveMilestone(withTwoMilestones(), 'second', 0);

    expect(roadmap.milestones[0]!.featureIds).toEqual(['c', 'd']);
  });

  it('returns the same roadmap when the milestone is already there', () => {
    const roadmap = withTwoMilestones();

    expect(roadmapOps.moveMilestone(roadmap, 'first', 0)).toBe(roadmap);
  });

  it('returns the same roadmap for a milestone that is not in it', () => {
    const roadmap = withTwoMilestones();

    expect(roadmapOps.moveMilestone(roadmap, 'ghost', 0)).toBe(roadmap);
  });
});

describe('queries', () => {
  it('reports which milestone holds a feature', () => {
    expect(roadmapOps.milestoneHolding(withTwoMilestones(), 'c')).toBe('second');
  });

  it('reports null for a feature still on the menu', () => {
    expect(roadmapOps.milestoneHolding(withTwoMilestones(), 'ghost')).toBeNull();
  });

  it('lists every feature in the roadmap, in milestone order', () => {
    expect(roadmapOps.allFeatureIds(withTwoMilestones())).toEqual(['a', 'b', 'c', 'd']);
  });

  it('reports whether a milestone has been chosen', () => {
    const roadmap = withTwoMilestones();

    expect(roadmapOps.containsMilestone(roadmap, 'first')).toBe(true);
    expect(roadmapOps.containsMilestone(roadmap, 'ghost')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { buildCatalog, hashCatalog } from '@/lib/data/build-catalog';
import { ContentValidationError } from '@/lib/data/validate-content';
import {
  makeFeatureEntry,
  makeMilestoneEntry,
  makeProgramEntry,
} from '@/lib/test-support/plan-fixtures';

const program = makeProgramEntry();

describe('ordering', () => {
  it('sorts milestones and features by position', () => {
    const catalog = buildCatalog({
      program,
      milestones: [
        makeMilestoneEntry('b', { position: 2 }),
        makeMilestoneEntry('a', { position: 1 }),
      ],
      features: [makeFeatureEntry('y', { position: 2 }), makeFeatureEntry('x', { position: 1 })],
    });

    expect(catalog.milestones.map((m) => m.id)).toEqual(['a', 'b']);
    expect(catalog.features.map((f) => f.id)).toEqual(['x', 'y']);
  });
});

describe('deriving blocking from blockedBy', () => {
  it('fills in the reverse of every blockedBy list', () => {
    const catalog = buildCatalog({
      program,
      milestones: [],
      features: [
        makeFeatureEntry('upstream'),
        makeFeatureEntry('downstream', { blockedBy: ['upstream'] }),
      ],
    });

    const upstream = catalog.features.find((f) => f.id === 'upstream')!;
    const downstream = catalog.features.find((f) => f.id === 'downstream')!;

    expect(upstream.blocking).toEqual(['downstream']);
    expect(upstream.blockedBy).toEqual([]);
    expect(downstream.blockedBy).toEqual(['upstream']);
    expect(downstream.blocking).toEqual([]);
  });

  it('records every dependent when several features share an upstream', () => {
    const catalog = buildCatalog({
      program,
      milestones: [],
      features: [
        makeFeatureEntry('shared'),
        makeFeatureEntry('a', { blockedBy: ['shared'] }),
        makeFeatureEntry('b', { blockedBy: ['shared'] }),
      ],
    });

    expect(catalog.features.find((f) => f.id === 'shared')!.blocking).toEqual(['a', 'b']);
  });
});

describe('validation', () => {
  it('rejects a blockedBy pointing at a feature that does not exist', () => {
    const build = () =>
      buildCatalog({
        program,
        milestones: [],
        features: [makeFeatureEntry('a', { blockedBy: ['ghost'] })],
      });

    expect(build).toThrow(ContentValidationError);
    expect(build).toThrow(/blockedBy "ghost" does not exist/);
  });

  it('rejects a milestone reference that does not exist', () => {
    const build = () =>
      buildCatalog({
        program,
        milestones: [],
        features: [makeFeatureEntry('a', { milestone: 'ghost' })],
      });

    expect(build).toThrow(/milestone "ghost" does not exist/);
  });

  it('rejects a dependency cycle and names the features in it', () => {
    const build = () =>
      buildCatalog({
        program,
        milestones: [],
        features: [
          makeFeatureEntry('a', { blockedBy: ['c'] }),
          makeFeatureEntry('b', { blockedBy: ['a'] }),
          makeFeatureEntry('c', { blockedBy: ['b'] }),
        ],
      });

    expect(build).toThrow(ContentValidationError);
    expect(build).toThrow(/dependency cycle/);
  });

  it('rejects a feature that depends on itself', () => {
    const build = () =>
      buildCatalog({
        program,
        milestones: [],
        features: [makeFeatureEntry('a', { blockedBy: ['a'] })],
      });

    expect(build).toThrow(/dependency cycle/);
  });

  it('reports every problem at once rather than one per build', () => {
    try {
      buildCatalog({
        program,
        milestones: [],
        features: [
          makeFeatureEntry('a', { blockedBy: ['ghost'] }),
          makeFeatureEntry('b', { milestone: 'nowhere' }),
        ],
      });
      expect.unreachable('expected validation to fail');
    } catch (error) {
      expect((error as ContentValidationError).problems).toHaveLength(2);
    }
  });

  it('accepts a long chain of dependencies that is not a cycle', () => {
    const features = Array.from({ length: 50 }, (_, i) =>
      makeFeatureEntry(`f${i}`, { blockedBy: i === 0 ? [] : [`f${i - 1}`] }),
    );

    expect(() => buildCatalog({ program, milestones: [], features })).not.toThrow();
  });
});

describe('hashCatalog', () => {
  const raw = {
    program,
    milestones: [makeMilestoneEntry('m1')],
    features: [makeFeatureEntry('f1')],
  };

  it('is stable for the same content', () => {
    expect(hashCatalog(raw)).toBe(hashCatalog(raw));
  });

  it('is eight characters long', () => {
    expect(hashCatalog(raw)).toHaveLength(8);
  });

  it('changes when a milestone is renamed', () => {
    const changed = {
      ...raw,
      milestones: [makeMilestoneEntry('m1', { title: 'Renamed' })],
    };

    expect(hashCatalog(changed)).not.toBe(hashCatalog(raw));
  });

  it('changes when a feature is assigned to a different milestone', () => {
    const changed = { ...raw, features: [makeFeatureEntry('f1', { milestone: 'm1' })] };

    expect(hashCatalog(changed)).not.toBe(hashCatalog(raw));
  });

  it('does not change when entries are merely reordered on disk', () => {
    const a = {
      program,
      milestones: [],
      features: [makeFeatureEntry('f1'), makeFeatureEntry('f2')],
    };
    const b = {
      program,
      milestones: [],
      features: [makeFeatureEntry('f2'), makeFeatureEntry('f1')],
    };

    expect(hashCatalog(a)).toBe(hashCatalog(b));
  });
});

describe('the program entry', () => {
  it('falls back to a placeholder title when content has none', () => {
    const catalog = buildCatalog({ program: undefined, milestones: [], features: [] });

    expect(catalog.program.title).toBe('Untitled program');
  });
});

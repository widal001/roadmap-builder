/**
 * Builders for test data.
 *
 * Each builder fills in sensible defaults so a test only states the fields it
 * actually cares about. That keeps the tests readable and stops an added field
 * from forcing an edit to every fixture.
 */

import { toFeatureId, toMilestoneId } from '@/types/brand';
import { ROADMAP_VERSION, type Roadmap, type RoadmapMilestone } from '@/lib/roadmap/types';
import type { Catalog, Feature, Milestone, Program } from '@/types/domain';

export function makeFeature(id: string, overrides: Partial<Feature> = {}): Feature {
  return {
    id: toFeatureId(id),
    title: `Feature ${id}`,
    summary: '',
    category: 'platform',
    milestoneId: null,
    blockedBy: [],
    blocking: [],
    tags: [],
    size: 'm',
    status: 'backlog',
    position: 1,
    ...overrides,
  };
}

export function makeMilestone(id: string, overrides: Partial<Milestone> = {}): Milestone {
  return {
    id: toMilestoneId(id),
    title: `Milestone ${id}`,
    description: '',
    deadline: null,
    tags: [],
    status: 'planned',
    position: 1,
    ...overrides,
  };
}

export function makeProgram(overrides: Partial<Program> = {}): Program {
  return { title: 'Test program', ...overrides };
}

export function makeCatalog(overrides: Partial<Catalog> = {}): Catalog {
  return {
    hash: 'testhash',
    program: makeProgram(),
    milestones: [],
    features: [],
    tags: [],
    ...overrides,
  };
}

/** A roadmap already holding the given milestones, pointed at a catalog. */
export function makeRoadmap(
  milestones: readonly RoadmapMilestone[] = [],
  catalogHash = 'testhash',
): Roadmap {
  return { version: ROADMAP_VERSION, catalogHash, milestones };
}

/** Shorthand for branding a feature ID in a test expectation. */
export const fid = toFeatureId;
/** Shorthand for branding a milestone ID in a test expectation. */
export const mid = toMilestoneId;

// ---------------------------------------------------------------------------
// Content entry builders
//
// These mirror what the content collections hand to buildCatalog, so the data
// layer can be tested without loading Astro's content layer.
// ---------------------------------------------------------------------------

import type {
  ContentEntry,
  FeatureData,
  MilestoneData,
  ProgramData,
} from '@/lib/data/build-catalog';

export function makeFeatureEntry(
  id: string,
  overrides: Partial<FeatureData> = {},
): ContentEntry<FeatureData> {
  return {
    id,
    data: {
      title: `Feature ${id}`,
      category: 'platform',
      milestone: null,
      size: 'm',
      status: 'backlog',
      position: 1,
      tags: [],
      blockedBy: [],
      ...overrides,
    },
  };
}

export function makeMilestoneEntry(
  id: string,
  overrides: Partial<MilestoneData> = {},
): ContentEntry<MilestoneData> {
  return {
    id,
    data: {
      title: `Milestone ${id}`,
      description: '',
      deadline: null,
      position: 1,
      status: 'planned',
      tags: [],
      ...overrides,
    },
  };
}

export function makeProgramEntry(overrides: Partial<ProgramData> = {}): ContentEntry<ProgramData> {
  return {
    id: 'program',
    data: { title: 'Test program', ...overrides },
  };
}

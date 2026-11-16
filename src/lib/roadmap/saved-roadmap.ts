/**
 * Reading and vetting the roadmap saved in localStorage.
 *
 * Anything coming out of storage is untrusted: it may be from an older version
 * of the app, from a catalog that has since changed, or simply corrupt. These
 * functions never throw, so a bad saved value can't stop the page rendering.
 */

import { z } from 'zod';
import { ROADMAP_VERSION, createEmptyRoadmap, type Roadmap } from '@/lib/roadmap/types';
import { MILESTONE_STATUS_IDS } from '@/config/statuses';

/** The localStorage key. Includes a version so a future format can coexist. */
export const ROADMAP_STORAGE_KEY = 'roadmap-builder:roadmap:v2';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses a saved roadmap.
 *
 * Returns null when the value is missing, isn't valid JSON, doesn't match the
 * expected shape, or carries a version we don't recognize.
 */
export function parseSavedRoadmap(raw: string | null | undefined): Roadmap | null {
  if (!raw) return null;

  try {
    const result = savedRoadmapSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    // Malformed JSON. A saved value we can't read is the same as none.
    return null;
  }
}

/** Serializes a roadmap for storage. */
export function serializeRoadmap(roadmap: Roadmap | null): string {
  return JSON.stringify(roadmap);
}

/**
 * Chooses the roadmap to start from.
 *
 * Keeps the saved roadmap when it was assembled from the catalog currently
 * loaded. Otherwise starts empty, because a roadmap built from a different
 * menu would quietly show the client prices for work that has changed.
 */
export function startingRoadmap(saved: Roadmap | null | undefined, catalogHash: string): Roadmap {
  if (saved && saved.catalogHash === catalogHash) return saved;
  return createEmptyRoadmap(catalogHash);
}

// ---------------------------------------------------------------------------
// Schema
//
// Mirrors Roadmap. Feature and milestone IDs are checked for shape only; an ID
// that no longer exists in the catalog is dropped when the roadmap is
// resolved, which is a content change rather than a corrupt save. A status
// that is no longer configured is rejected instead, because nothing would
// render it.
// ---------------------------------------------------------------------------

const milestoneDetailsSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  deadline: z.string().nullable().optional(),
  status: z.enum(MILESTONE_STATUS_IDS as unknown as [string, ...string[]]).optional(),
});

const savedRoadmapSchema = z.object({
  version: z.literal(ROADMAP_VERSION),
  catalogHash: z.string().min(1),
  milestones: z.array(
    z.object({
      id: z.string().min(1),
      featureIds: z.array(z.string()),
      details: milestoneDetailsSchema.optional(),
    }),
  ),
}) as unknown as z.ZodType<Roadmap>;

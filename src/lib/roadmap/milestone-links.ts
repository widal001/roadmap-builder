/**
 * Where a milestone lives in the site.
 *
 * Changing a milestone always happens on one page, whether it came off the
 * menu or the client built it, so the editor takes the milestone in a query
 * parameter rather than in the path. Reading about a milestone is different: a
 * milestone off the menu is written in content and has a prerendered page,
 * while a client-built one exists only in their browser and has nothing to
 * read beyond what they typed.
 *
 * That difference is a consequence of the roadmap model, so it is settled here
 * once rather than re-derived by every component that links to a milestone.
 */

import { isCustomMilestoneId } from '@/lib/roadmap/types';

/** The page that changes a milestone, and builds a new one when given no ID. */
const MILESTONE_EDITOR_PATH = '/milestones/edit/';

/** The page that changes what's in a milestone and what it's called. */
export function milestoneEditHref(id: string): string {
  return `${MILESTONE_EDITOR_PATH}?id=${encodeURIComponent(id)}`;
}

/** The same page, with nothing in it yet. */
export function newMilestoneHref(): string {
  return MILESTONE_EDITOR_PATH;
}

/** The page that shows a milestone and what's in it. */
export function milestoneHref(id: string): string {
  return isCustomMilestoneId(id) ? milestoneEditHref(id) : `/milestones/${id}/`;
}

/**
 * Reading display names out of the label config.
 *
 * Components call these instead of writing entity or field names directly.
 */

import { LABELS } from '@/config/labels';
import type { EntityKey, LabelConfig, Plurality } from '@/types/labels';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * The display name for an entity.
 *
 * @example label('feature', 'plural') // "Features"
 */
export function label(entity: EntityKey, plurality: Plurality = 'singular'): string {
  return LABELS[entity][plurality];
}

/**
 * The display name for one of an entity's fields.
 *
 * Falls back to a humanized version of the field name when the config doesn't
 * override it, so a newly added field still renders something sensible.
 */
export function fieldLabel<K extends EntityKey>(
  entity: K,
  field: keyof LabelConfig[K]['fields'] & string,
): string {
  const configured = (LABELS[entity].fields as Record<string, string | undefined>)[field];
  return configured ?? humanize(field);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Turns a field name like `milestoneId` into `Milestone id`. */
function humanize(field: string): string {
  const spaced = field.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

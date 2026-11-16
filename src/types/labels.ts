/**
 * Types for the label configuration.
 *
 * The UI never writes entity or field names directly. It asks the label config,
 * so a deployment for a different client or a different domain can rename
 * everything the user sees without touching application code.
 */

import type { Feature, Milestone, Program } from '@/types/domain';

export interface EntityLabels<T> {
  singular: string;
  plural: string;
  /**
   * Display names for the entity's fields. Keyed by the field names on T, so
   * renaming a domain field breaks the config until it's updated to match.
   */
  fields: Partial<Record<keyof T, string>>;
}

export interface LabelConfig {
  feature: EntityLabels<Feature>;
  milestone: EntityLabels<Milestone>;
  program: EntityLabels<Program>;
}

export type EntityKey = keyof LabelConfig;
export type Plurality = 'singular' | 'plural';

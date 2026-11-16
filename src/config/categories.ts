/**
 * Feature categories.
 *
 * Categories describe the kind of work a feature represents. They're a fixed,
 * ordered list because the board and filters rely on the order, and because
 * adding one is a deliberate decision rather than something that should happen
 * by typing a new value into a content file.
 *
 * Replace these with the categories your own work divides into. Any value used
 * in `src/content/features/` must appear here, or the build fails.
 */

export interface Category {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

export const CATEGORIES = [
  {
    id: 'platform',
    label: 'Platform',
    description: 'Infrastructure, accounts and the systems everything else runs on.',
  },
  {
    id: 'interface',
    label: 'Interface',
    description: 'Screens and components the people using the product interact with.',
  },
  {
    id: 'data',
    label: 'Data',
    description: 'How records are modelled, stored and kept correct.',
  },
  {
    id: 'reporting',
    label: 'Reporting',
    description: 'Exports, dashboards and anything that summarises what happened.',
  },
  {
    id: 'integrations',
    label: 'Integrations',
    description: 'Connections to other systems, in either direction.',
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
    description: 'Work that makes the product usable with assistive technology.',
  },
] as const satisfies readonly Category[];

export type CategoryId = (typeof CATEGORIES)[number]['id'];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as readonly CategoryId[];

const CATEGORY_BY_ID: ReadonlyMap<string, Category> = new Map(CATEGORIES.map((c) => [c.id, c]));

/** Returns the category, or undefined when the ID isn't configured. */
export function findCategory(id: string): Category | undefined {
  return CATEGORY_BY_ID.get(id);
}

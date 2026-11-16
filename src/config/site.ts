/**
 * Site-wide settings.
 *
 * Deliberately carries no product name. This version presents itself as the
 * client's own planning tool, so every title the user sees comes from the
 * program in src/content/program/. A later iteration that is a product in its
 * own right can add branding here.
 */

export const SITE = {
  /** Shown in the meta description when a page doesn't supply its own. */
  defaultDescription: 'Plan and budget the work for this engagement.',
} as const;

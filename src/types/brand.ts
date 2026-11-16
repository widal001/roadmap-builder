/**
 * Branded primitive types.
 *
 * A branded type is a plain string at runtime, but the compiler treats it as
 * distinct. This codebase passes a lot of IDs around, so the brands catch a
 * milestone ID handed to something expecting a feature ID.
 */

declare const brand: unique symbol;

export type Brand<T, B extends string> = T & { readonly [brand]: B };

export type FeatureId = Brand<string, 'Feature'>;
export type MilestoneId = Brand<string, 'Milestone'>;
export type TagId = Brand<string, 'Tag'>;

// ---------------------------------------------------------------------------
// Constructors
//
// Content entry IDs arrive from Astro as plain strings. These mark the single
// point where an unchecked string becomes a branded ID.
// ---------------------------------------------------------------------------

export const toFeatureId = (id: string): FeatureId => id as FeatureId;
export const toMilestoneId = (id: string): MilestoneId => id as MilestoneId;
export const toTagId = (id: string): TagId => id as TagId;

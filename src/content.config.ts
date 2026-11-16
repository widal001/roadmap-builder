/**
 * Content collections.
 *
 * The schemas here validate one entry at a time. Checks that span entries,
 * such as whether a `blockedBy` ID exists or whether the dependency edges form
 * a cycle, live in src/lib/data/validate-content.ts.
 */

import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { SIZE_IDS } from '@/config/sizes';
import { FEATURE_STATUS_IDS, MILESTONE_STATUS_IDS } from '@/config/statuses';
import { CATEGORY_IDS } from '@/config/categories';

/** Zod enums need a non-empty tuple, which a readonly array doesn't satisfy. */
const asEnum = <T extends string>(values: readonly T[]) => z.enum(values as unknown as [T, ...T[]]);

const markdown = (directory: string) =>
  glob({ pattern: '**/*.md', base: `./src/content/${directory}` });

const program = defineCollection({
  loader: markdown('program'),
  schema: z.object({
    title: z.string(),
  }),
});

const milestones = defineCollection({
  loader: markdown('milestones'),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    deadline: z.coerce.date().nullable().default(null),
    position: z.number().int().positive(),
    status: asEnum(MILESTONE_STATUS_IDS).default('planned'),
    tags: z.array(z.string()).default([]),
  }),
});

const features = defineCollection({
  loader: markdown('features'),
  schema: z.object({
    title: z.string(),
    category: asEnum(CATEGORY_IDS),
    milestone: z.string().nullable().default(null),
    size: asEnum(SIZE_IDS),
    status: asEnum(FEATURE_STATUS_IDS).default('backlog'),
    position: z.number().int().positive(),
    tags: z.array(z.string()).default([]),
    /** One direction only. `blocking` is derived when the catalog is built. */
    blockedBy: z.array(z.string()).default([]),
  }),
});

const tags = defineCollection({
  loader: markdown('tags'),
  schema: z.object({
    label: z.string(),
    description: z.string().default(''),
  }),
});

export const collections = { program, milestones, features, tags };

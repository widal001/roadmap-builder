/**
 * The words the UI shows for each entity and field.
 *
 * This demo is for a software engagement, so features are called "Features".
 * A participatory budgeting deployment would change `singular` and `plural` to
 * "Proposal" and "Proposals" here and nowhere else.
 */

import type { LabelConfig } from '@/types/labels';

export const LABELS: LabelConfig = {
  feature: {
    singular: 'Feature',
    plural: 'Features',
    fields: {
      title: 'Title',
      category: 'Category',
      milestoneId: 'Milestone',
      size: 'Size',
      status: 'Status',
      tags: 'Tags',
      blockedBy: 'Blocked by',
      blocking: 'Blocks',
    },
  },
  milestone: {
    singular: 'Milestone',
    plural: 'Milestones',
    fields: {
      title: 'Title',
      description: 'Description',
      deadline: 'Deadline',
      status: 'Status',
      tags: 'Tags',
    },
  },
  program: {
    singular: 'Program',
    plural: 'Programs',
    fields: {
      title: 'Title',
    },
  },
};

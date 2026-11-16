import { describe, expect, it } from 'vitest';

import { fieldLabel, label } from '@/lib/labels/resolve-label';

describe('label', () => {
  it('returns the singular name by default', () => {
    expect(label('feature')).toBe('Feature');
  });

  it('returns the plural name when asked', () => {
    expect(label('feature', 'plural')).toBe('Features');
    expect(label('milestone', 'plural')).toBe('Milestones');
  });
});

describe('fieldLabel', () => {
  it('uses the configured name for a field', () => {
    expect(fieldLabel('feature', 'milestoneId')).toBe('Milestone');
    expect(fieldLabel('milestone', 'deadline')).toBe('Deadline');
  });

  it('falls back to a readable version of the field name', () => {
    // `position` has no override in the label config.
    expect(fieldLabel('feature', 'position')).toBe('Position');
  });

  it('splits camel case in the fallback', () => {
    expect(fieldLabel('milestone', 'position')).toBe('Position');
    expect(fieldLabel('program', 'title')).toBe('Title');
  });
});

import { describe, expect, it } from 'vitest';

import { describeDependencyNode, featureHref } from '@/lib/graph/describe-dependency-node';
import { makeFeature } from '@/lib/test-support/plan-fixtures';

describe('describeDependencyNode', () => {
  it('names the status with the configured label, not the raw ID', () => {
    const facts = describeDependencyNode(makeFeature('a', { status: 'in_progress' }), null);

    expect(facts.statusLabel).toBe('In progress');
    expect(facts.statusClass).toBe('status status--in_progress');
  });

  it('prices the feature from its size', () => {
    const small = describeDependencyNode(makeFeature('a', { size: 'xs' }), null);
    const large = describeDependencyNode(makeFeature('b', { size: 'xl' }), null);

    expect(small.price).not.toBe(large.price);
    expect(large.price.startsWith('$')).toBe(true);
  });

  it('links to the feature and to its milestone', () => {
    const facts = describeDependencyNode(makeFeature('a'), {
      id: 'family-experience',
      title: 'Family experience',
      source: 'roadmap',
    });

    expect(facts.href).toBe('/features/a/');
    expect(facts.milestoneHref).toBe('/milestones/family-experience/');
  });

  it('says a milestone is chosen when it came from the roadmap', () => {
    const facts = describeDependencyNode(makeFeature('a'), {
      id: 'm',
      title: 'Milestone',
      source: 'roadmap',
    });

    expect(facts.milestoneTitle).toBe('Milestone');
    expect(facts.milestoneNote).toBe('In your roadmap');
  });

  it('says a milestone is only suggested when it came from the menu', () => {
    const facts = describeDependencyNode(makeFeature('a'), {
      id: 'm',
      title: 'Milestone',
      source: 'menu',
    });

    expect(facts.milestoneNote).toBe('On the menu');
  });

  it('reads sensibly for a feature in no milestone', () => {
    const facts = describeDependencyNode(makeFeature('a'), null);

    expect(facts.milestoneTitle).toBeNull();
    expect(facts.milestoneHref).toBeNull();
    expect(facts.milestoneNote).toBe('Not in a milestone');
  });
});

describe('featureHref', () => {
  it('points at the feature page with a trailing slash', () => {
    expect(featureHref('save-and-resume-screening')).toBe('/features/save-and-resume-screening/');
  });
});

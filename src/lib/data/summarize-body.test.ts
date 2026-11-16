import { describe, expect, it } from 'vitest';

import { summarizeBody } from '@/lib/data/summarize-body';

describe('choosing the paragraph', () => {
  it('takes the first paragraph and stops at the blank line', () => {
    const body = 'Families can save a screening and come back to it.\n\nA second paragraph.';

    expect(summarizeBody(body)).toBe('Families can save a screening and come back to it.');
  });

  it('joins a paragraph that is wrapped across lines', () => {
    const body = 'Families can save a screening\nand come back to it later.\n\nMore.';

    expect(summarizeBody(body)).toBe('Families can save a screening and come back to it later.');
  });

  it('skips a heading above the prose', () => {
    const body = '## What this covers\n\nThe work of saving a screening.';

    expect(summarizeBody(body)).toBe('The work of saving a screening.');
  });

  it('stops before a list that follows the paragraph', () => {
    const body = 'The work of saving a screening.\n- One\n- Two';

    expect(summarizeBody(body)).toBe('The work of saving a screening.');
  });

  it('returns an empty string for a body with no prose', () => {
    expect(summarizeBody('')).toBe('');
    expect(summarizeBody(undefined)).toBe('');
    expect(summarizeBody('## Only a heading')).toBe('');
  });
});

describe('plain text', () => {
  it('keeps the words a link wrapped and drops the URL', () => {
    const body = 'Hands results to [MyFriendBen](https://example.com) when a family asks.';

    expect(summarizeBody(body)).toBe('Hands results to MyFriendBen when a family asks.');
  });

  it('drops emphasis and inline code markers', () => {
    expect(summarizeBody('A **bold** claim about `save_and_resume`.')).toBe(
      'A bold claim about save_and_resume.',
    );
  });
});

describe('truncation', () => {
  it('leaves a short summary alone', () => {
    expect(summarizeBody('Short enough.', 40)).toBe('Short enough.');
  });

  it('cuts at a word boundary and marks the cut', () => {
    expect(summarizeBody('one two three four five six', 12)).toBe('one two…');
  });

  it('takes trailing punctuation with the cut', () => {
    expect(summarizeBody('one two, three four', 11)).toBe('one two…');
  });
});

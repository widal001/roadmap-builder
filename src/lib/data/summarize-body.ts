/**
 * A one-line summary of a markdown body.
 *
 * Feature cards need a sentence about the work, and the content files already
 * open with one. Deriving the summary from the first paragraph at build time
 * means nobody has to write the same sentence twice in frontmatter, and the
 * cards can't drift out of step with the page behind them.
 *
 * This is deliberately not a markdown parser. It handles the inline syntax our
 * content actually uses — links, emphasis, inline code — and leaves anything
 * more elaborate as plain text, which is readable even when it isn't pretty.
 */

/** How long a summary can run before it's cut at a word boundary. */
export const SUMMARY_MAX_CHARACTERS = 180;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * The first paragraph of a markdown body, as plain text.
 *
 * Returns an empty string when the body has no prose in it, so a feature
 * without a body is simply a card without a summary.
 */
export function summarizeBody(
  body: string | undefined | null,
  maxCharacters: number = SUMMARY_MAX_CHARACTERS,
): string {
  const paragraph = firstParagraph(body ?? '');
  if (paragraph === '') return '';

  return truncateAtWord(stripMarkdown(paragraph), maxCharacters);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Lines that open a block we don't want to summarize. */
const SKIPPED_LINE = /^(#|>|[-*+]\s|\d+\.\s|```|<|\||!\[)/;

/**
 * The first run of prose lines in the body.
 *
 * Headings, lists, tables, quotes and code fences are skipped rather than
 * summarized, because a card showing "## What this covers" tells the reader
 * nothing.
 */
function firstParagraph(body: string): string {
  const lines: string[] = [];

  for (const raw of body.split('\n')) {
    const line = raw.trim();

    if (line === '' || SKIPPED_LINE.test(line)) {
      if (lines.length > 0) break;
      continue;
    }

    lines.push(line);
  }

  return lines.join(' ');
}

/** Drops the inline markdown syntax, keeping the words it wrapped. */
function stripMarkdown(text: string): string {
  return (
    text
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      // Underscores only count as emphasis around a whole word, so an
      // identifier such as save_and_resume survives intact.
      .replace(/(^|[\s("'])_{1,2}([^_]+)_{1,2}(?=$|[\s.,;:)"'])/g, '$1$2')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Cuts to the last whole word that fits, with an ellipsis.
 *
 * Trailing punctuation goes with the cut, so a summary never reads as
 * "the Navigator,…".
 */
function truncateAtWord(text: string, maxCharacters: number): string {
  if (text.length <= maxCharacters) return text;

  const clipped = text.slice(0, maxCharacters);
  const lastSpace = clipped.lastIndexOf(' ');
  const head = lastSpace === -1 ? clipped : clipped.slice(0, lastSpace);

  return `${head.replace(/[\s,;:.!?-]+$/, '')}…`;
}

/**
 * Normalizes free-text answers for comparison against the correct option's label:
 * case-insensitive, whitespace-collapsed, trailing punctuation stripped.
 * Keeps type-in exercises forgiving without needing a full fuzzy-match engine.
 */
export function normalizeAnswer(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!?,;:]+$/, '')
    .trim()
}
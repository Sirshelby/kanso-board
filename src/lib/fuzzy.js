/**
 * Small fuzzy matcher for the command palette.
 * Returns null for no match, otherwise a score (higher is better) and the matched
 * character indices so the UI can highlight them.
 */
const BOUNDARY = /[\s\-_/.#]/;

export function fuzzyMatch(query, text) {
  const q = query.trim().toLowerCase();
  if (!q) return { score: 0, indices: [] };
  const t = text.toLowerCase();

  // Contiguous matches beat scattered ones, and word-start matches beat mid-word ones.
  const at = t.indexOf(q);
  if (at !== -1) {
    const atBoundary = at === 0 || BOUNDARY.test(t[at - 1]);
    return {
      score: 1000 - at + (atBoundary ? 200 : 0) - (t.length - q.length) * 0.5,
      indices: Array.from({ length: q.length }, (_, i) => at + i),
    };
  }

  // Otherwise every character must continue the previous match or start a word,
  // so "ct" finds "Create task" but scattered letters don't produce noisy results.
  const indices = [];
  let score = 0;
  let from = 0;
  let previous = -2;
  for (const ch of q) {
    if (ch === ' ') continue;
    let found = t.indexOf(ch, from);
    while (found !== -1 && found !== previous + 1 && !(found === 0 || BOUNDARY.test(t[found - 1]))) {
      found = t.indexOf(ch, found + 1);
    }
    if (found === -1) return null;
    score += found === previous + 1 ? 6 : 4;
    indices.push(found);
    previous = found;
    from = found + 1;
  }
  return { score: score - t.length * 0.05, indices };
}

export function fuzzyFilter(items, query, getText) {
  const results = [];
  for (const item of items) {
    const match = fuzzyMatch(query, getText(item));
    if (match) results.push({ item, ...match });
  }
  return results.sort((a, b) => b.score - a.score);
}

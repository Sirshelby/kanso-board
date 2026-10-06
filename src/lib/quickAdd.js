const PRIORITY_ALIASES = {
  urgent: 'urgent',
  u: 'urgent',
  high: 'high',
  h: 'high',
  medium: 'medium',
  med: 'medium',
  m: 'medium',
  low: 'low',
  l: 'low',
};

export function normalizeTag(raw) {
  return raw.trim().replace(/^#+/, '').toLowerCase().replace(/\s+/g, '-');
}

/**
 * Parses quick-add input such as "Fix login redirect #auth #bug !high".
 * `#word` adds a tag and `!level` sets priority; everything else is the title.
 */
export function parseQuickAdd(input) {
  const tags = [];
  let priority = null;
  const words = [];

  for (const word of input.trim().split(/\s+/).filter(Boolean)) {
    if (/^#[\p{L}\p{N}_-]+$/u.test(word)) {
      const tag = normalizeTag(word);
      if (!tags.includes(tag)) tags.push(tag);
    } else if (/^![a-z]+$/i.test(word) && PRIORITY_ALIASES[word.slice(1).toLowerCase()]) {
      priority = PRIORITY_ALIASES[word.slice(1).toLowerCase()];
    } else {
      words.push(word);
    }
  }

  return { title: words.join(' '), tags, priority };
}

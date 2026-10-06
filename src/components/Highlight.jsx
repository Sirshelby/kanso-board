function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Highlights search terms (by `query`) or exact character positions (by `indices`). */
export function Highlight({ text, query, indices }) {
  if (indices?.length) {
    const marked = new Set(indices);
    const parts = [];
    let buffer = '';
    let inMark = false;
    const flush = (key) => {
      if (!buffer) return;
      parts.push(inMark ? <mark key={key}>{buffer}</mark> : buffer);
      buffer = '';
    };
    [...text].forEach((ch, i) => {
      const isMarked = marked.has(i);
      if (isMarked !== inMark) {
        flush(i);
        inMark = isMarked;
      }
      buffer += ch;
    });
    flush('end');
    return parts;
  }

  const terms = query?.trim().split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (!terms?.length) return text;
  const parts = text.split(new RegExp(`(${terms.join('|')})`, 'gi'));
  return parts.map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part));
}

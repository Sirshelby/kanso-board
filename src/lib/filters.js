export function isFiltering(filters) {
  return Boolean(filters.query.trim() || filters.priorities.length || filters.tags.length);
}

export function taskMatches(task, filters) {
  if (!task) return false;
  const query = filters.query.trim().toLowerCase();
  if (query) {
    const haystack = `${task.title} ${task.description} ${task.tags.map((t) => `#${t}`).join(' ')}`.toLowerCase();
    if (!query.split(/\s+/).every((term) => haystack.includes(term))) return false;
  }
  if (filters.priorities.length && !filters.priorities.includes(task.priority)) return false;
  if (filters.tags.length && !filters.tags.some((tag) => task.tags.includes(tag))) return false;
  return true;
}

/**
 * Converts a drop position among the *visible* (filtered) cards into an index in
 * the column's full task list, both measured without the task being moved.
 * This keeps reordering correct while filters hide some cards.
 */
export function resolveDropIndex(allIds, visibleIds, visibleIndex, movingId) {
  const all = allIds.filter((id) => id !== movingId);
  const visible = visibleIds.filter((id) => id !== movingId);
  if (visible.length === 0) return all.length;
  if (visibleIndex < visible.length) return all.indexOf(visible[visibleIndex]);
  return all.indexOf(visible[visible.length - 1]) + 1;
}

export function collectTags(board) {
  const counts = new Map();
  for (const task of Object.values(board.tasks)) {
    for (const tag of task.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag);
}

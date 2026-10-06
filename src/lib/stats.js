import { DONE_COLUMN_ID, PRIORITIES } from './constants.js';
import { DAY_MS, addDays, daysUntil, startOfDay, toISODate } from './dates.js';

export const THROUGHPUT_DAYS = 14;

export function computeStats(board, now = new Date()) {
  const tasks = Object.values(board.tasks);
  const doneColumn = board.columns.find((c) => c.id === DONE_COLUMN_ID);
  const doneIds = new Set(doneColumn?.taskIds ?? []);
  const open = tasks.filter((t) => !doneIds.has(t.id));
  const completed = tasks.filter((t) => doneIds.has(t.id) && t.completedAt);

  const today = startOfDay(now);
  const days = Array.from({ length: THROUGHPUT_DAYS }, (_, i) => {
    const date = addDays(today, i - (THROUGHPUT_DAYS - 1));
    return { iso: toISODate(date), date, count: 0 };
  });
  const byDay = new Map(days.map((d) => [d.iso, d]));
  for (const task of completed) {
    const bucket = byDay.get(toISODate(task.completedAt));
    if (bucket) bucket.count += 1;
  }

  const cycleDays = completed
    .map((t) => (t.completedAt - t.createdAt) / DAY_MS)
    .filter((d) => d >= 0);

  const tagCounts = new Map();
  for (const task of open) {
    for (const tag of task.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }

  return {
    openCount: open.length,
    completedRecently: days.reduce((sum, d) => sum + d.count, 0),
    overdueCount: open.filter((t) => t.due && daysUntil(t.due, now) < 0).length,
    averageCycleDays: cycleDays.length
      ? cycleDays.reduce((a, b) => a + b, 0) / cycleDays.length
      : null,
    throughput: days,
    byColumn: board.columns.map((c) => ({
      id: c.id,
      title: c.title,
      count: c.taskIds.length,
      limit: c.limit,
    })),
    byPriority: PRIORITIES.map((p) => ({
      ...p,
      count: open.filter((t) => t.priority === p.id).length,
    })),
    tags: [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)),
    dueSoon: open
      .filter((t) => t.due)
      .map((task) => ({ task, days: daysUntil(task.due, now) }))
      .filter((x) => x.days <= 7)
      .sort((a, b) => a.days - b.days),
  };
}

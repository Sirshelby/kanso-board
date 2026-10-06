export const DAY_MS = 86_400_000;

export function startOfDay(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(value, amount) {
  const d = new Date(value);
  d.setDate(d.getDate() + amount);
  return d;
}

/** Local calendar date as YYYY-MM-DD (never UTC, so dates don't shift near midnight). */
export function toISODate(value) {
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Whole calendar days from today until `iso`. Negative when it is in the past. */
export function daysUntil(iso, now = new Date()) {
  return Math.round((parseISODate(iso) - startOfDay(now)) / DAY_MS);
}

export function dueStatus(iso, now = new Date()) {
  if (!iso) return null;
  const days = daysUntil(iso, now);
  if (days < 0) return 'overdue';
  if (days <= 2) return 'soon';
  return 'later';
}

export function formatDue(iso, now = new Date()) {
  const days = daysUntil(iso, now);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days === -1) return '1 day overdue';
  if (days < -1) return `${-days} days overdue`;
  const date = parseISODate(iso);
  if (days < 7) return `Due ${date.toLocaleDateString(undefined, { weekday: 'long' })}`;
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return `Due ${date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })}`;
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

export function formatRelative(timestamp, now = Date.now()) {
  const diff = timestamp - now;
  const abs = Math.abs(diff);
  if (abs < 60_000) return 'just now';
  if (abs < 3_600_000) return relative.format(Math.round(diff / 60_000), 'minute');
  if (abs < DAY_MS) return relative.format(Math.round(diff / 3_600_000), 'hour');
  return relative.format(Math.round(diff / DAY_MS), 'day');
}

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'kanso:board';
export const THEME_KEY = 'kanso:theme';
export const DONE_COLUMN_ID = 'done';

/** Ordered from most to least pressing. `level` drives the signal-bar glyph. */
export const PRIORITIES = [
  { id: 'urgent', label: 'Urgent', level: 4 },
  { id: 'high', label: 'High', level: 3 },
  { id: 'medium', label: 'Medium', level: 2 },
  { id: 'low', label: 'Low', level: 1 },
];

export const PRIORITY_BY_ID = Object.fromEntries(PRIORITIES.map((p) => [p.id, p]));

export const EMPTY_FILTERS = Object.freeze({ query: '', priorities: [], tags: [] });

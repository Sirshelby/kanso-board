import { SCHEMA_VERSION, STORAGE_KEY } from './constants.js';

export function isValidBoard(board) {
  if (!board || typeof board !== 'object') return false;
  if (!Array.isArray(board.columns) || !board.tasks || typeof board.tasks !== 'object') return false;
  const seen = new Set();
  for (const column of board.columns) {
    if (typeof column?.id !== 'string' || !Array.isArray(column.taskIds)) return false;
    for (const id of column.taskIds) {
      const task = board.tasks[id];
      if (!task || typeof task.title !== 'string' || seen.has(id)) return false;
      seen.add(id);
    }
  }
  return true;
}

/** Upgrade older saved data here as the schema evolves. */
export function migrate(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.version === SCHEMA_VERSION) return data;
  return null;
}

export function loadBoard(key = STORAGE_KEY) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const board = migrate(JSON.parse(raw));
    return isValidBoard(board) ? board : null;
  } catch {
    return null;
  }
}

export function saveBoard(board, key = STORAGE_KEY) {
  try {
    localStorage.setItem(key, JSON.stringify(board));
    return true;
  } catch {
    return false;
  }
}

export function serializeExport(board) {
  return JSON.stringify({ app: 'kanso', exportedAt: new Date().toISOString(), board }, null, 2);
}

export function parseImport(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  const board = migrate(data?.board ?? data);
  if (!isValidBoard(board)) throw new Error('That file is not a Kanso board export.');
  return board;
}

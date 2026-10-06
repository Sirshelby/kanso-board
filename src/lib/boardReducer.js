import { DONE_COLUMN_ID } from './constants.js';

/**
 * Pure board reducer. Every case returns the *same* object when nothing changed,
 * which lets the history layer skip no-op entries.
 *
 * Board shape:
 * {
 *   version: number,
 *   columns: [{ id, title, limit: number | null, taskIds: string[] }],
 *   tasks: { [id]: Task }
 * }
 */

export function findColumnOf(board, taskId) {
  return board.columns.find((c) => c.taskIds.includes(taskId)) ?? null;
}

function insertAt(list, index, value) {
  const i = Math.max(0, Math.min(index, list.length));
  return [...list.slice(0, i), value, ...list.slice(i)];
}

function withTaskDefaults(task, now) {
  return {
    description: '',
    priority: 'medium',
    tags: [],
    due: null,
    checklist: [],
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    ...task,
  };
}

export function boardReducer(board, action) {
  const now = action.now ?? Date.now();

  switch (action.type) {
    case 'task/add': {
      const { task, columnId, index } = action;
      const column = board.columns.find((c) => c.id === columnId);
      if (!column || board.tasks[task.id]) return board;

      const created = withTaskDefaults(task, now);
      if (columnId === DONE_COLUMN_ID) created.completedAt = now;

      return {
        ...board,
        tasks: { ...board.tasks, [task.id]: created },
        columns: board.columns.map((c) =>
          c.id === columnId
            ? { ...c, taskIds: insertAt(c.taskIds, index ?? c.taskIds.length, task.id) }
            : c,
        ),
      };
    }

    case 'task/update': {
      const existing = board.tasks[action.id];
      if (!existing) return board;
      return {
        ...board,
        tasks: {
          ...board.tasks,
          [action.id]: { ...existing, ...action.changes, id: existing.id, updatedAt: now },
        },
      };
    }

    case 'task/delete': {
      if (!board.tasks[action.id]) return board;
      const { [action.id]: _removed, ...tasks } = board.tasks;
      return {
        ...board,
        tasks,
        columns: board.columns.map((c) =>
          c.taskIds.includes(action.id)
            ? { ...c, taskIds: c.taskIds.filter((id) => id !== action.id) }
            : c,
        ),
      };
    }

    case 'task/move': {
      const { id, toColumnId, toIndex } = action;
      const from = findColumnOf(board, id);
      const to = board.columns.find((c) => c.id === toColumnId);
      if (!from || !to) return board;

      const fromIndex = from.taskIds.indexOf(id);
      const remaining = from.taskIds.filter((x) => x !== id);
      const base = from.id === to.id ? remaining : to.taskIds;
      const index = Math.max(0, Math.min(toIndex, base.length));

      if (from.id === to.id && index === fromIndex) return board;

      const nextTarget = insertAt(base, index, id);
      const columns = board.columns.map((c) => {
        if (c.id === to.id) return { ...c, taskIds: nextTarget };
        if (c.id === from.id) return { ...c, taskIds: remaining };
        return c;
      });

      if (from.id === to.id) return { ...board, columns };

      const task = board.tasks[id];
      let { completedAt } = task;
      if (to.id === DONE_COLUMN_ID) completedAt = now;
      else if (from.id === DONE_COLUMN_ID) completedAt = null;

      return {
        ...board,
        columns,
        tasks: { ...board.tasks, [id]: { ...task, completedAt, updatedAt: now } },
      };
    }

    case 'task/save': {
      // Edit fields and (optionally) change status as one undoable step.
      let next = boardReducer(board, { type: 'task/update', id: action.id, changes: action.changes, now });
      const current = findColumnOf(next, action.id);
      if (current && action.columnId && current.id !== action.columnId) {
        next = boardReducer(next, {
          type: 'task/move',
          id: action.id,
          toColumnId: action.columnId,
          toIndex: Infinity,
          now,
        });
      }
      return next;
    }

    case 'column/setLimit': {
      const column = board.columns.find((c) => c.id === action.columnId);
      if (!column || column.limit === action.limit) return board;
      return {
        ...board,
        columns: board.columns.map((c) =>
          c.id === action.columnId ? { ...c, limit: action.limit } : c,
        ),
      };
    }

    case 'board/replace':
      return action.board === board ? board : action.board;

    default:
      return board;
  }
}

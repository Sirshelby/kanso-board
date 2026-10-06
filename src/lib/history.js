/**
 * Higher-order reducer that adds undo/redo to any reducer.
 *
 * Each entry in `past` and `future` stores a snapshot plus a label describing the
 * change that leads away from it, so the UI can say exactly what will be undone.
 * Because the board reducer is immutable, snapshots share structure and are cheap.
 */
export const HISTORY_LIMIT = 100;

export function createHistory(present) {
  return { past: [], present, future: [] };
}

export function withHistory(reducer, { limit = HISTORY_LIMIT } = {}) {
  return function historyReducer(state, action) {
    switch (action.type) {
      case 'history/undo': {
        if (state.past.length === 0) return state;
        const entry = state.past[state.past.length - 1];
        return {
          past: state.past.slice(0, -1),
          present: entry.snapshot,
          future: [{ snapshot: state.present, label: entry.label }, ...state.future],
        };
      }

      case 'history/redo': {
        if (state.future.length === 0) return state;
        const [entry, ...future] = state.future;
        return {
          past: [...state.past, { snapshot: state.present, label: entry.label }],
          present: entry.snapshot,
          future,
        };
      }

      default: {
        const next = reducer(state.present, action);
        if (next === state.present) return state;
        if (action.meta?.history === false) return { ...state, present: next };
        const label = action.meta?.label ?? 'Change';
        return {
          past: [...state.past, { snapshot: state.present, label }].slice(-limit),
          present: next,
          future: [],
        };
      }
    }
  };
}

import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { boardReducer } from '../lib/boardReducer.js';
import { createHistory, withHistory } from '../lib/history.js';
import { createId } from '../lib/ids.js';
import { createSeedBoard } from '../lib/seed.js';
import { loadBoard, saveBoard } from '../lib/storage.js';

const BoardContext = createContext(null);
const historyReducer = withHistory(boardReducer);

function init(initialBoard) {
  return createHistory(initialBoard ?? loadBoard() ?? createSeedBoard());
}

export function BoardProvider({ children, initialBoard, persist = true }) {
  const [state, dispatch] = useReducer(historyReducer, initialBoard, init);
  const board = state.present;

  // Debounced so a burst of edits (or a long drag session) writes once.
  useEffect(() => {
    if (!persist) return undefined;
    const timer = setTimeout(() => saveBoard(board), 250);
    return () => clearTimeout(timer);
  }, [board, persist]);

  const actions = useMemo(
    () => ({
      addTask(fields, columnId = 'backlog', index) {
        const task = { ...fields, id: createId('t') };
        dispatch({ type: 'task/add', task, columnId, index, meta: { label: 'Task added' } });
        return task.id;
      },
      saveTask(id, changes, columnId) {
        dispatch({ type: 'task/save', id, changes, columnId, meta: { label: 'Task edited' } });
      },
      deleteTask(id) {
        dispatch({ type: 'task/delete', id, meta: { label: 'Task deleted' } });
      },
      moveTask(id, toColumnId, toIndex) {
        dispatch({ type: 'task/move', id, toColumnId, toIndex, meta: { label: 'Task moved' } });
      },
      setLimit(columnId, limit) {
        dispatch({ type: 'column/setLimit', columnId, limit, meta: { label: 'Limit changed' } });
      },
      replaceBoard(next, label = 'Board replaced') {
        dispatch({ type: 'board/replace', board: next, meta: { label } });
      },
      undo() {
        dispatch({ type: 'history/undo' });
      },
      redo() {
        dispatch({ type: 'history/redo' });
      },
    }),
    [],
  );

  const value = useMemo(
    () => ({
      board,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      undoLabel: state.past.at(-1)?.label ?? null,
      redoLabel: state.future[0]?.label ?? null,
      ...actions,
    }),
    [board, state.past, state.future, actions],
  );

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}

export function useBoard() {
  const context = useContext(BoardContext);
  if (!context) throw new Error('useBoard must be used inside <BoardProvider>.');
  return context;
}

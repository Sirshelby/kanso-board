import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePointerDrag } from '../hooks/usePointerDrag.js';
import { useStableCallback } from '../hooks/useStableCallback.js';
import { DONE_COLUMN_ID } from '../lib/constants.js';
import { isFiltering, resolveDropIndex, taskMatches } from '../lib/filters.js';
import { useBoard } from '../state/BoardContext.jsx';
import { useAnnounce, useToast } from '../state/Feedback.jsx';
import { Column } from './Column.jsx';
import { CardBody } from './TaskCard.jsx';
import '../styles/board.css';

export function Board({ filters, onOpenTask }) {
  const { board, moveTask, addTask, setLimit } = useBoard();
  const announce = useAnnounce();
  const toast = useToast();
  const columnsRef = useRef(new Map());
  const scrollerRef = useRef(null);
  const focusAfterMove = useRef(null);
  const [justMovedId, setJustMovedId] = useState(null);

  const filtering = isFiltering(filters);
  // Visible ids and task objects per column, memoized so columns keep stable props during a drag.
  const { visible, visibleTasks } = useMemo(() => {
    const ids = {};
    const tasks = {};
    for (const column of board.columns) {
      ids[column.id] = column.taskIds.filter((id) => taskMatches(board.tasks[id], filters));
      tasks[column.id] = ids[column.id].map((id) => board.tasks[id]);
    }
    return { visible: ids, visibleTasks: tasks };
  }, [board, filters]);

  const columnTitle = (id) => board.columns.find((c) => c.id === id)?.title ?? '';

  const flashMoved = (taskId) => {
    setJustMovedId(taskId);
  };

  useEffect(() => {
    if (!justMovedId) return undefined;
    const timer = setTimeout(() => setJustMovedId(null), 700);
    return () => clearTimeout(timer);
  }, [justMovedId]);

  const commitMove = (taskId, fromColumnId, toColumnId, visibleIndex) => {
    const target = board.columns.find((c) => c.id === toColumnId);
    const toIndex = resolveDropIndex(target.taskIds, visible[toColumnId], visibleIndex, taskId);
    const before = board.columns.find((c) => c.id === fromColumnId)?.taskIds.indexOf(taskId);
    if (fromColumnId === toColumnId && toIndex === before) return false;
    moveTask(taskId, toColumnId, toIndex);
    flashMoved(taskId);
    const position = visibleIndex + 1;
    announce(`${board.tasks[taskId].title} moved to ${target.title}, position ${position}.`);
    return true;
  };

  const handleDrop = useStableCallback(({ taskId, fromColumnId, toColumnId, visibleIndex }) => {
    commitMove(taskId, fromColumnId, toColumnId, visibleIndex);
  });

  const { drag, ghostRef, startDrag, shouldSuppressClick } = usePointerDrag({
    columnsRef,
    scrollerRef,
    onDrop: handleDrop,
    onStart: (taskId) => announce(`Picked up ${board.tasks[taskId]?.title}. Press Escape to cancel.`),
    onCancel: () => announce('Move cancelled.'),
  });

  const registerColumn = useCallback((id, el) => {
    if (el) columnsRef.current.set(id, el);
    else columnsRef.current.delete(id);
  }, []);

  const handleOpen = useStableCallback((taskId) => {
    if (!shouldSuppressClick()) onOpenTask(taskId);
  });

  // Keyboard alternative to dragging: Shift + arrow keys on a focused card.
  const handleCardKeyDown = useStableCallback((event, taskId, columnId) => {
    if (!event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;
    const columnIndex = board.columns.findIndex((c) => c.id === columnId);
    const ids = visible[columnId];
    const index = ids.indexOf(taskId);
    let toColumn = board.columns[columnIndex];
    let toVisibleIndex;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowRight': {
        const next = board.columns[columnIndex + (event.key === 'ArrowLeft' ? -1 : 1)];
        if (!next) return;
        toColumn = next;
        toVisibleIndex = Math.min(index, visible[next.id].length);
        break;
      }
      case 'ArrowUp':
        if (index <= 0) return;
        toVisibleIndex = index - 1;
        break;
      case 'ArrowDown':
        if (index >= ids.length - 1) return;
        toVisibleIndex = index + 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    focusAfterMove.current = taskId;
    commitMove(taskId, columnId, toColumn.id, toVisibleIndex);
  });

  // Moving a card between columns remounts it, so put focus back on it afterwards.
  useEffect(() => {
    const id = focusAfterMove.current;
    if (!id) return;
    focusAfterMove.current = null;
    const card = scrollerRef.current?.querySelector(`[data-task-id="${CSS.escape(id)}"] > .card`);
    card?.focus();
    card?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [board]);

  const handleQuickAdd = useStableCallback((columnId, { title, tags, priority }) => {
    addTask({ title, tags, priority: priority ?? 'medium' }, columnId);
    if (filtering) toast(`Added “${title}”. Clear filters if you don't see it.`);
    else announce(`Added ${title} to ${columnTitle(columnId)}.`);
  });

  const draggedTask = drag ? board.tasks[drag.taskId] : null;

  return (
    <div className="board-scroller" ref={scrollerRef}>
      <div
        className="board"
        style={{
          '--column-count': board.columns.length,
          '--drag-height': drag ? `${drag.height}px` : undefined,
        }}
      >
        {board.columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            tasks={visibleTasks[column.id]}
            drag={drag}
            filtering={filtering}
            query={filters.query}
            justMovedId={justMovedId}
            registerColumn={registerColumn}
            onCardPointerDown={startDrag}
            onCardKeyDown={handleCardKeyDown}
            onOpenTask={handleOpen}
            onQuickAdd={handleQuickAdd}
            onSetLimit={setLimit}
          />
        ))}
      </div>

      <p id="card-instructions" hidden>
        Press Enter to open. Hold Shift and use the arrow keys to move between columns or reorder.
      </p>

      {draggedTask &&
        createPortal(
          <div className="drag-ghost" ref={ghostRef} style={{ width: drag.width }} aria-hidden="true">
            <div className="card is-lifted" data-priority={draggedTask.priority}>
              <CardBody
                task={draggedTask}
                isDone={drag.overColumnId === DONE_COLUMN_ID}
                query={filters.query}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

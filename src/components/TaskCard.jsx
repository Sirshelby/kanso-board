import { memo } from 'react';
import { PRIORITY_BY_ID } from '../lib/constants.js';
import { dueStatus, formatDue } from '../lib/dates.js';
import { Highlight } from './Highlight.jsx';
import { Icon, PriorityGlyph } from './Icon.jsx';
import '../styles/card.css';

/** The visual body of a card, shared by the board card and the floating drag ghost. */
export function CardBody({ task, isDone, query }) {
  const priority = PRIORITY_BY_ID[task.priority] ?? PRIORITY_BY_ID.medium;
  const status = isDone ? 'done' : dueStatus(task.due);
  const doneItems = task.checklist.filter((i) => i.done).length;
  const hasMeta = task.due || task.checklist.length > 0 || task.tags.length > 0;

  return (
    <>
      <span className="card-top">
        <span className="card-priority" title={`${priority.label} priority`}>
          <PriorityGlyph priority={priority.id} level={priority.level} />
          <span className="sr-only">{priority.label} priority.</span>
        </span>
        <span className="card-title">
          <Highlight text={task.title} query={query} />
        </span>
      </span>
      {hasMeta && (
        <span className="card-meta">
          {task.due && (
            <span className="meta-item meta-due" data-status={status}>
              <Icon name="calendar" size={14} />
              {isDone ? formatDue(task.due).replace(/^Due /, '') : formatDue(task.due)}
            </span>
          )}
          {task.checklist.length > 0 && (
            <span
              className="meta-item meta-checklist"
              data-complete={doneItems === task.checklist.length || undefined}
            >
              <Icon name="checklist" size={14} />
              <span className="sr-only">Checklist:</span>
              {doneItems}/{task.checklist.length}
            </span>
          )}
          {task.tags.map((tag) => (
            <span className="meta-item meta-tag" key={tag}>
              <Highlight text={`#${tag}`} query={query} />
            </span>
          ))}
        </span>
      )}
    </>
  );
}

export const TaskCard = memo(function TaskCard({
  task,
  columnId,
  isDone,
  isDragSource,
  justMoved,
  query,
  onPointerDown,
  onKeyDown,
  onOpen,
}) {
  return (
    <li
      className="card-item"
      data-task-id={task.id}
      data-drag-source={isDragSource || undefined}
      data-just-moved={justMoved || undefined}
    >
      <button
        type="button"
        className="card"
        data-priority={task.priority}
        data-done={isDone || undefined}
        aria-describedby="card-instructions"
        onPointerDown={(event) => onPointerDown(event, task.id, columnId)}
        onKeyDown={(event) => onKeyDown(event, task.id, columnId)}
        onClick={() => onOpen(task.id)}
      >
        <CardBody task={task} isDone={isDone} query={query} />
      </button>
    </li>
  );
});

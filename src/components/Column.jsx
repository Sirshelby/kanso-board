import { memo, useCallback, useId, useRef, useState } from 'react';
import { DONE_COLUMN_ID } from '../lib/constants.js';
import { parseQuickAdd } from '../lib/quickAdd.js';
import { Icon } from './Icon.jsx';
import { TaskCard } from './TaskCard.jsx';

function LimitMeter({ count, limit, over }) {
  if (!limit) return <div className="meter" aria-hidden="true"><span className="meter-seg is-on is-solid" /></div>;
  return (
    <div className="meter" data-over={over || undefined} aria-hidden="true">
      {Array.from({ length: limit }, (_, i) => (
        <span key={i} className={`meter-seg${i < count ? ' is-on' : ''}`} />
      ))}
    </div>
  );
}

function LimitControl({ column, count, onSetLimit }) {
  const [editing, setEditing] = useState(false);
  const committed = useRef(false);

  function commit(raw) {
    if (committed.current) return;
    committed.current = true;
    const value = Number.parseInt(raw, 10);
    onSetLimit(column.id, Number.isFinite(value) && value > 0 ? Math.min(value, 99) : null);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        className="limit-input"
        type="number"
        inputMode="numeric"
        min="1"
        max="99"
        placeholder="None"
        defaultValue={column.limit ?? ''}
        aria-label={`Work in progress limit for ${column.title}. Leave empty for no limit.`}
        autoFocus
        onFocus={() => {
          committed.current = false;
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit(event.currentTarget.value);
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            committed.current = true;
            setEditing(false);
          }
        }}
        onBlur={(event) => commit(event.currentTarget.value)}
      />
    );
  }

  return (
    <button
      type="button"
      className="column-count"
      onClick={() => setEditing(true)}
      aria-label={`${count} tasks${column.limit ? `, limit ${column.limit}` : ', no limit'}. Change limit.`}
      title="Change work in progress limit"
    >
      <span className="count-value">{count}</span>
      {column.limit ? <span className="count-limit">of {column.limit}</span> : <span className="count-limit">no limit</span>}
    </button>
  );
}

function QuickAdd({ columnTitle, onAdd }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const hintId = useId();

  if (!open) {
    return (
      <button type="button" className="quick-add-trigger" onClick={() => setOpen(true)}>
        <Icon name="plus" size={16} />
        Add task
      </button>
    );
  }

  return (
    <div className="quick-add">
      <input
        type="text"
        value={value}
        placeholder="Task title"
        aria-label={`New task in ${columnTitle}`}
        aria-describedby={hintId}
        autoFocus
        enterKeyHint="done"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
            event.preventDefault();
            if (onAdd(value)) setValue('');
          } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            setValue('');
            setOpen(false);
          }
        }}
        onBlur={() => {
          if (!value.trim()) setOpen(false);
        }}
      />
      <p id={hintId} className="quick-add-hint">
        Type <kbd>#tag</kbd> or <kbd>!high</kbd> to set details, then press Enter.
      </p>
    </div>
  );
}

export const Column = memo(function Column({
  column,
  tasks,
  drag,
  filtering,
  query,
  justMovedId,
  registerColumn,
  onCardPointerDown,
  onCardKeyDown,
  onOpenTask,
  onQuickAdd,
  onSetLimit,
}) {
  const titleId = useId();
  const isDone = column.id === DONE_COLUMN_ID;
  const count = column.taskIds.length;
  const isTarget = drag?.overColumnId === column.id;
  const incoming = isTarget && drag.fromColumnId !== column.id ? 1 : 0;
  const projected = count + incoming;
  const over = Boolean(column.limit) && projected > column.limit;

  const ref = useCallback((el) => registerColumn(column.id, el), [registerColumn, column.id]);
  const handleQuickAdd = useCallback(
    (raw) => {
      const parsed = parseQuickAdd(raw);
      if (!parsed.title) return false;
      onQuickAdd(column.id, parsed);
      return true;
    },
    [onQuickAdd, column.id],
  );

  const items = [];
  let visibleIndex = 0;
  let placed = false;
  const placeholder = <li key="__placeholder" className="drop-placeholder" aria-hidden="true" />;
  for (const task of tasks) {
    const isSource = drag?.taskId === task.id;
    if (!isSource) {
      if (isTarget && !placed && visibleIndex === drag.overIndex) {
        items.push(placeholder);
        placed = true;
      }
      visibleIndex += 1;
    }
    items.push(
      <TaskCard
        key={task.id}
        task={task}
        columnId={column.id}
        isDone={isDone}
        isDragSource={isSource}
        justMoved={justMovedId === task.id}
        query={query}
        onPointerDown={onCardPointerDown}
        onKeyDown={onCardKeyDown}
        onOpen={onOpenTask}
      />,
    );
  }
  if (isTarget && !placed) items.push(placeholder);

  const visibleCount = tasks.filter((t) => t.id !== drag?.taskId).length;

  return (
    <section
      ref={ref}
      className="column"
      aria-labelledby={titleId}
      data-drop-target={isTarget || undefined}
      data-over-limit={over || undefined}
    >
      <header className="column-header">
        <LimitMeter count={projected} limit={column.limit} over={over} />
        <div className="column-heading">
          <h2 id={titleId} className="column-title">{column.title}</h2>
          {isDone ? (
            <span className="column-count is-static">
              <span className="count-value">{count}</span>
              <span className="sr-only"> tasks</span>
            </span>
          ) : (
            <LimitControl column={column} count={count} onSetLimit={onSetLimit} />
          )}
        </div>
        {over && (
          <p className="limit-warning">
            {incoming ? 'Dropping here goes over the limit' : `Over the limit by ${count - column.limit}`}
          </p>
        )}
      </header>

      <ol className="column-list" data-drop-list aria-labelledby={titleId}>
        {items}
        {visibleCount === 0 && !isTarget && (
          <li className="column-empty">
            {filtering ? `No matching tasks in ${column.title}.` : 'Nothing here yet. Drag a task in or add one below.'}
          </li>
        )}
      </ol>

      {!isDone && (
        <footer className="column-footer">
          <QuickAdd columnTitle={column.title} onAdd={handleQuickAdd} />
        </footer>
      )}
    </section>
  );
});

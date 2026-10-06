import { useId, useRef, useState } from 'react';
import { isMac } from '../hooks/useHotkeys.js';
import { PRIORITIES } from '../lib/constants.js';
import { formatRelative } from '../lib/dates.js';
import { createId } from '../lib/ids.js';
import { normalizeTag } from '../lib/quickAdd.js';
import { Icon, PriorityGlyph } from './Icon.jsx';
import { Modal } from './Modal.jsx';
import '../styles/editor.css';

function TagInput({ id, tags, suggestions, onChange }) {
  const [draft, setDraft] = useState('');
  const listId = useId();

  function commit(raw) {
    const tag = normalizeTag(raw.replace(/,/g, ''));
    if (tag && !tags.includes(tag)) onChange([...tags, tag]);
    setDraft('');
  }

  return (
    <div className="tag-input">
      {tags.map((tag) => (
        <span className="tag-chip" key={tag}>
          #{tag}
          <button
            type="button"
            className="tag-remove"
            aria-label={`Remove tag ${tag}`}
            onClick={() => onChange(tags.filter((t) => t !== tag))}
          >
            <Icon name="x" size={14} />
          </button>
        </span>
      ))}
      <input
        id={id}
        type="text"
        value={draft}
        list={listId}
        placeholder={tags.length ? 'Add another' : 'Add a tag'}
        autoComplete="off"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ',') && !event.nativeEvent.isComposing) {
            if (!draft.trim()) return;
            event.preventDefault();
            event.stopPropagation();
            commit(draft);
          } else if (event.key === 'Backspace' && !draft && tags.length) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={() => draft.trim() && commit(draft)}
      />
      <datalist id={listId}>
        {suggestions
          .filter((s) => !tags.includes(s))
          .map((s) => (
            <option key={s} value={s} />
          ))}
      </datalist>
    </div>
  );
}

function ChecklistEditor({ items, onChange }) {
  const [draft, setDraft] = useState('');
  const doneCount = items.filter((i) => i.done).length;

  const update = (id, changes) => onChange(items.map((i) => (i.id === id ? { ...i, ...changes } : i)));

  return (
    <div className="checklist-editor">
      {items.length > 0 && (
        <>
          <div
            className="checklist-progress"
            role="progressbar"
            aria-label="Checklist progress"
            aria-valuemin={0}
            aria-valuemax={items.length}
            aria-valuenow={doneCount}
          >
            <span style={{ width: `${(doneCount / items.length) * 100}%` }} />
          </div>
          <ul className="checklist-items">
            {items.map((item) => (
              <li key={item.id} data-done={item.done || undefined}>
                <input
                  type="checkbox"
                  checked={item.done}
                  aria-label={`Mark “${item.text || 'item'}” as ${item.done ? 'not done' : 'done'}`}
                  onChange={(event) => update(item.id, { done: event.target.checked })}
                />
                <input
                  type="text"
                  className="checklist-text"
                  value={item.text}
                  aria-label="Checklist item"
                  onChange={(event) => update(item.id, { text: event.target.value })}
                />
                <button
                  type="button"
                  className="icon-button is-small"
                  aria-label={`Remove “${item.text || 'item'}”`}
                  onClick={() => onChange(items.filter((i) => i.id !== item.id))}
                >
                  <Icon name="x" size={14} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <input
        type="text"
        className="checklist-new"
        value={draft}
        placeholder="Add a checklist item and press Enter"
        aria-label="New checklist item"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing && draft.trim()) {
            event.preventDefault();
            event.stopPropagation();
            onChange([...items, { id: createId('c'), text: draft.trim(), done: false }]);
            setDraft('');
          }
        }}
      />
    </div>
  );
}

function TaskForm({ headingId, mode, task, columnId, columns, tagSuggestions, onSave, onDelete, onCancel }) {
  const ids = {
    checklist: useId(),
    title: useId(),
    description: useId(),
    status: useId(),
    due: useId(),
    tags: useId(),
    error: useId(),
  };
  const titleRef = useRef(null);
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [priority, setPriority] = useState(task?.priority ?? 'medium');
  const [status, setStatus] = useState(columnId);
  const [due, setDue] = useState(task?.due ?? '');
  const [tags, setTags] = useState(task?.tags ?? []);
  const [checklist, setChecklist] = useState(task?.checklist ?? []);
  const [error, setError] = useState('');

  function save() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Add a title to save this task.');
      titleRef.current?.focus();
      return;
    }
    onSave(
      {
        title: trimmed,
        description: description.trim(),
        priority,
        due: due || null,
        tags,
        checklist: checklist
          .map((i) => ({ ...i, text: i.text.trim() }))
          .filter((i) => i.text),
      },
      status,
    );
  }

  return (
    <div
      className="editor"
      onKeyDown={(event) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          save();
        }
      }}
    >
      <header className="editor-header">
        <h2 id={headingId} className="editor-heading">
          {mode === 'create' ? 'New task' : 'Edit task'}
        </h2>
        <button type="button" className="icon-button" aria-label="Close without saving" onClick={onCancel}>
          <Icon name="x" />
        </button>
      </header>

      <div className="editor-body">
        <div className="field">
          <label htmlFor={ids.title} className="field-label">Title</label>
          <input
            ref={titleRef}
            id={ids.title}
            className="input input-title"
            type="text"
            value={title}
            // Focus the title for new tasks; when opening an existing one, don't pop the mobile keyboard.
            autoFocus={mode === 'create'}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? ids.error : undefined}
            placeholder="What needs to happen?"
            onChange={(event) => {
              setTitle(event.target.value);
              if (error) setError('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault();
                save();
              }
            }}
          />
          {error && (
            <p id={ids.error} className="field-error" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor={ids.description} className="field-label">Notes</label>
          <textarea
            id={ids.description}
            className="input"
            rows={3}
            value={description}
            placeholder="Context, links, acceptance criteria"
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <fieldset className="field">
          <legend className="field-label">Priority</legend>
          <div className="segmented">
            {PRIORITIES.map((p) => (
              <label key={p.id} className="segment" data-priority={p.id}>
                <input
                  type="radio"
                  name="priority"
                  value={p.id}
                  checked={priority === p.id}
                  onChange={() => setPriority(p.id)}
                />
                <PriorityGlyph priority={p.id} level={p.level} />
                <span>{p.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field-row">
          <div className="field">
            <label htmlFor={ids.status} className="field-label">Status</label>
            <select
              id={ids.status}
              className="input"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={ids.due} className="field-label">Due date</label>
            <div className="date-wrap">
              <input
                id={ids.due}
                className="input"
                type="date"
                value={due}
                onChange={(event) => setDue(event.target.value)}
              />
              {due && (
                <button type="button" className="text-button" onClick={() => setDue('')}>
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="field">
          <label htmlFor={ids.tags} className="field-label">Tags</label>
          <TagInput id={ids.tags} tags={tags} suggestions={tagSuggestions} onChange={setTags} />
        </div>

        <div className="field" role="group" aria-labelledby={ids.checklist}>
          <span className="field-label" id={ids.checklist}>Checklist</span>
          <ChecklistEditor items={checklist} onChange={setChecklist} />
        </div>

        {task && (
          <p className="editor-timestamps">
            Created {formatRelative(task.createdAt)}. Last edited {formatRelative(task.updatedAt)}.
          </p>
        )}
      </div>

      <footer className="editor-footer">
        {mode === 'edit' && (
          <button type="button" className="btn btn-danger" onClick={onDelete}>
            <Icon name="trash" size={16} />
            Delete
          </button>
        )}
        <span className="editor-hint" aria-hidden="true">
          <kbd>{isMac ? '⌘' : 'Ctrl'}</kbd>
          <kbd>Enter</kbd> to save
        </span>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={save}>
          {mode === 'create' ? 'Create task' : 'Save changes'}
        </button>
      </footer>
    </div>
  );
}

/**
 * `state` is null (closed), { mode: 'create', columnId } or { mode: 'edit', taskId }.
 * The form is keyed per opening so its draft state always starts fresh.
 */
export function TaskEditor({ state, board, tagSuggestions, onSave, onDelete, onClose }) {
  const headingId = useId();
  const task = state?.mode === 'edit' ? board.tasks[state.taskId] : null;
  const columnId =
    state?.mode === 'edit'
      ? board.columns.find((c) => c.taskIds.includes(state.taskId))?.id
      : state?.columnId;
  const open = Boolean(state && (state.mode === 'create' || task));

  return (
    <Modal open={open} onClose={onClose} labelledBy={headingId} className="modal-editor">
      {open && (
        <TaskForm
          key={state.taskId ?? `new-${state.columnId}`}
          headingId={headingId}
          mode={state.mode}
          task={task}
          columnId={columnId ?? board.columns[0].id}
          columns={board.columns}
          tagSuggestions={tagSuggestions}
          onSave={onSave}
          onDelete={() => onDelete(state.taskId)}
          onCancel={onClose}
        />
      )}
    </Modal>
  );
}

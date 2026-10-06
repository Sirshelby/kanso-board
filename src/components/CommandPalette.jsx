import { useEffect, useId, useMemo, useState } from 'react';
import { fuzzyFilter } from '../lib/fuzzy.js';
import { Highlight } from './Highlight.jsx';
import { Icon, PriorityGlyph } from './Icon.jsx';
import { Modal } from './Modal.jsx';
import { PRIORITY_BY_ID } from '../lib/constants.js';
import '../styles/palette.css';

const MAX_TASK_RESULTS = 8;

function buildResults(commands, tasks, query) {
  const available = commands.filter((c) => !c.disabled);
  const commandHits = query.trim()
    ? fuzzyFilter(available, query, (c) => `${c.label} ${c.keywords ?? ''}`)
    : available.map((item) => ({ item, indices: [] }));

  const taskHits = query.trim()
    ? fuzzyFilter(tasks, query, (t) => t.title).slice(0, MAX_TASK_RESULTS)
    : [...tasks]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 4)
        .map((item) => ({ item, indices: [] }));

  return [
    {
      id: 'actions',
      label: 'Actions',
      items: commandHits.map(({ item, indices }) => ({
        key: `cmd-${item.id}`,
        kind: 'command',
        item,
        // Only highlight characters that fall inside the visible label.
        indices: indices.filter((i) => i < item.label.length),
      })),
    },
    {
      id: 'tasks',
      label: query.trim() ? 'Tasks' : 'Recently edited',
      items: taskHits.map(({ item, indices }) => ({ key: `task-${item.id}`, kind: 'task', item, indices })),
    },
  ].filter((group) => group.items.length > 0);
}

function Palette({ commands, tasks, columnOf, onRun, onOpenTask }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listId = useId();

  const groups = useMemo(() => buildResults(commands, tasks, query), [commands, tasks, query]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const activeIndex = Math.min(active, Math.max(flat.length - 1, 0));
  const activeItem = flat[activeIndex];
  const optionId = (key) => `${listId}-${key}`;

  useEffect(() => {
    if (!activeItem) return;
    document.getElementById(optionId(activeItem.key))?.scrollIntoView({ block: 'nearest' });
  });

  function choose(result) {
    if (!result) return;
    if (result.kind === 'command') onRun(result.item);
    else onOpenTask(result.item.id);
  }

  function onKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!flat.length) return;
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      setActive((activeIndex + delta + flat.length) % flat.length);
    } else if (event.key === 'Home' && flat.length) {
      event.preventDefault();
      setActive(0);
    } else if (event.key === 'End' && flat.length) {
      event.preventDefault();
      setActive(flat.length - 1);
    } else if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      choose(activeItem);
    }
  }

  return (
    <div className="palette">
      <div className="palette-search">
        <Icon name="search" />
        <input
          type="text"
          role="combobox"
          aria-label="Search actions and tasks"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeItem ? optionId(activeItem.key) : undefined}
          placeholder="Search actions and tasks"
          value={query}
          autoFocus
          spellCheck={false}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
      </div>

      <ul className="palette-list" id={listId} role="listbox" aria-label="Results">
        {groups.map((group) => (
          <li key={group.id} role="presentation" className="palette-group">
            <div className="palette-group-label" id={`${listId}-${group.id}`} aria-hidden="true">
              {group.label}
            </div>
            <ul role="group" aria-labelledby={`${listId}-${group.id}`}>
              {group.items.map((result) => {
                const index = flat.indexOf(result);
                const selected = index === activeIndex;
                const priority = result.kind === 'task' ? PRIORITY_BY_ID[result.item.priority] : null;
                return (
                  <li
                    key={result.key}
                    id={optionId(result.key)}
                    role="option"
                    aria-selected={selected}
                    className="palette-option"
                    onPointerMove={() => !selected && setActive(index)}
                    onClick={() => choose(result)}
                  >
                    {result.kind === 'command' ? (
                      <>
                        <Icon name={result.item.icon} className="palette-icon" />
                        <span className="palette-label">
                          <Highlight text={result.item.label} indices={result.indices} />
                        </span>
                        {result.item.shortcut && (
                          <span className="palette-shortcut" aria-hidden="true">
                            {result.item.shortcut.map((k) => (
                              <kbd key={k}>{k}</kbd>
                            ))}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="palette-icon">
                          <PriorityGlyph priority={priority.id} level={priority.level} />
                        </span>
                        <span className="palette-label">
                          <Highlight text={result.item.title} indices={result.indices} />
                        </span>
                        <span className="palette-meta">{columnOf(result.item.id)}</span>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>

      {flat.length === 0 && (
        <p className="palette-empty">
          No actions or tasks match “{query}”. Try fewer letters or a different word.
        </p>
      )}

      <footer className="palette-footer" aria-hidden="true">
        <span><kbd>↑</kbd><kbd>↓</kbd> to move</span>
        <span><kbd>Enter</kbd> to choose</span>
        <span><kbd>Esc</kbd> to close</span>
      </footer>
    </div>
  );
}

export function CommandPalette({ open, onClose, onClosed, ...props }) {
  return (
    <Modal open={open} onClose={onClose} onClosed={onClosed} label="Command menu" className="modal-palette">
      {open && <Palette {...props} />}
    </Modal>
  );
}

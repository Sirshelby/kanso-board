import { PRIORITIES } from '../lib/constants.js';
import { isFiltering } from '../lib/filters.js';
import { Icon, PriorityGlyph } from './Icon.jsx';
import '../styles/filters.css';

const MAX_TAG_CHIPS = 8;

function toggle(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function FilterBar({ filters, onChange, tags, matchCount, totalCount, searchRef }) {
  const active = isFiltering(filters);
  const shownTags = [...new Set([...filters.tags, ...tags.slice(0, MAX_TAG_CHIPS)])];

  return (
    <div className="filter-bar">
      <div className="search-field" role="search">
        <Icon name="search" size={16} />
        <label className="sr-only" htmlFor="task-search">Search tasks</label>
        <input
          ref={searchRef}
          id="task-search"
          type="search"
          placeholder="Search tasks"
          value={filters.query}
          autoComplete="off"
          onChange={(event) => onChange({ ...filters, query: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              onChange({ ...filters, query: '' });
              event.currentTarget.blur();
            }
          }}
        />
        <kbd className="search-key" aria-hidden="true">/</kbd>
      </div>

      <div className="chip-scroll">
        <div className="chip-group" role="group" aria-label="Filter by priority">
          {PRIORITIES.map((p) => (
            <button
              key={p.id}
              type="button"
              className="chip"
              aria-pressed={filters.priorities.includes(p.id)}
              onClick={() => onChange({ ...filters, priorities: toggle(filters.priorities, p.id) })}
            >
              <PriorityGlyph priority={p.id} level={p.level} />
              {p.label}
            </button>
          ))}
        </div>
        <span className="chip-divider" aria-hidden="true" />
        <div className="chip-group" role="group" aria-label="Filter by tag">
          {shownTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className="chip chip-tag"
              aria-pressed={filters.tags.includes(tag)}
              onClick={() => onChange({ ...filters, tags: toggle(filters.tags, tag) })}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      <p className="filter-summary" aria-live="polite">
        {active && (
          <>
            <span>
              Showing {matchCount} of {totalCount} tasks
            </span>
            <button
              type="button"
              className="text-button"
              onClick={() => onChange({ query: '', priorities: [], tags: [] })}
            >
              Clear filters
            </button>
          </>
        )}
      </p>
    </div>
  );
}

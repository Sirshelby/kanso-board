import { useId, useMemo } from 'react';
import { formatDue } from '../lib/dates.js';
import { computeStats, THROUGHPUT_DAYS } from '../lib/stats.js';
import { useBoard } from '../state/BoardContext.jsx';
import { PriorityGlyph } from './Icon.jsx';
import '../styles/insights.css';

function Panel({ title, description, className = '', children }) {
  const id = useId();
  return (
    <section className={`panel ${className}`} aria-labelledby={id}>
      <h2 id={id} className="panel-title">{title}</h2>
      {description && <p className="panel-description">{description}</p>}
      {children}
    </section>
  );
}

function Throughput({ days }) {
  const max = Math.max(3, ...days.map((d) => d.count));
  const total = days.reduce((sum, d) => sum + d.count, 0);
  const best = days.reduce((a, b) => (b.count > a.count ? b : a), days[0]);
  const weekday = (d) => d.date.toLocaleDateString(undefined, { weekday: 'narrow' });
  const full = (d) => d.date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <figure className="throughput">
      <div className="throughput-plot" aria-hidden="true">
        {days.map((d, i) => (
          <div
            key={d.iso}
            className="throughput-col"
            data-today={i === days.length - 1 || undefined}
            title={`${full(d)}: ${d.count} finished`}
          >
            <span className="throughput-value">{d.count || ''}</span>
            <span className="throughput-bar" style={{ '--v': d.count / max }} />
            <span className="throughput-day">{weekday(d)}</span>
          </div>
        ))}
      </div>
      <figcaption className="throughput-caption">
        {total === 0
          ? `Nothing finished in the last ${THROUGHPUT_DAYS} days.`
          : `${total} tasks finished in the last ${THROUGHPUT_DAYS} days. Busiest day: ${full(best)}, with ${best.count}.`}
      </figcaption>
      <table className="sr-only">
        <caption>Tasks finished per day</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Finished</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.iso}>
              <th scope="row">{full(d)}</th>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function StageLoad({ columns }) {
  const scale = Math.max(1, ...columns.map((c) => Math.max(c.count, c.limit ?? 0)));
  return (
    <ul className="stage-list">
      {columns.map((c) => {
        const over = c.limit && c.count > c.limit;
        return (
          <li key={c.id} className="stage-row" data-over={over || undefined}>
            <span className="stage-name">{c.title}</span>
            <span className="stage-track" aria-hidden="true">
              <span className="stage-fill" style={{ '--v': c.count / scale }} />
              {c.limit && <span className="stage-limit" style={{ '--v': c.limit / scale }} />}
            </span>
            <span className="stage-count">
              {c.count}
              {c.limit ? <span className="stage-of"> of {c.limit}</span> : null}
              {over && <span className="sr-only"> (over limit)</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function PriorityMix({ priorities }) {
  const total = priorities.reduce((sum, p) => sum + p.count, 0);
  if (total === 0) return <p className="panel-empty">No open tasks. Everything on the board is done.</p>;
  return (
    <>
      <div className="mix-bar" aria-hidden="true">
        {priorities
          .filter((p) => p.count)
          .map((p) => (
            <span key={p.id} data-priority={p.id} style={{ flexGrow: p.count }} />
          ))}
      </div>
      <ul className="mix-legend">
        {priorities.map((p) => (
          <li key={p.id}>
            <PriorityGlyph priority={p.id} level={p.level} />
            <span className="mix-label">{p.label}</span>
            <span className="mix-count">{p.count}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

export function Insights({ onOpenTask }) {
  const { board } = useBoard();
  const stats = useMemo(() => computeStats(board), [board]);
  const columnOf = (id) => board.columns.find((c) => c.taskIds.includes(id));
  const maxTag = Math.max(1, ...stats.tags.map((t) => t.count));

  const summary = [
    { label: 'Open tasks', value: stats.openCount },
    { label: `Finished in ${THROUGHPUT_DAYS} days`, value: stats.completedRecently },
    { label: 'Overdue', value: stats.overdueCount, tone: stats.overdueCount ? 'warn' : undefined },
    {
      label: 'Average time to finish',
      value: stats.averageCycleDays == null ? 'None yet' : `${stats.averageCycleDays.toFixed(1)} days`,
    },
  ];

  return (
    <div className="insights">
      <header className="insights-header">
        <h1 className="insights-title">Insights</h1>
        <p className="insights-lede">How work is moving across the board. Everything updates as you change tasks.</p>
      </header>

      <dl className="summary">
        {summary.map((s) => (
          <div key={s.label} className="summary-item" data-tone={s.tone}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="insights-grid">
        <Panel title="Finished per day" description="Tasks moved to Done each day." className="span-2">
          <Throughput days={stats.throughput} />
        </Panel>

        <Panel title="Load by stage" description="Tasks in each column against its limit.">
          <StageLoad columns={stats.byColumn} />
        </Panel>

        <Panel title="Open work by priority">
          <PriorityMix priorities={stats.byPriority} />
        </Panel>

        <Panel title="Due in the next 7 days" description="Overdue tasks are listed first.">
          {stats.dueSoon.length === 0 ? (
            <p className="panel-empty">No open tasks are due this week.</p>
          ) : (
            <ul className="due-list">
              {stats.dueSoon.map(({ task, days }) => (
                <li key={task.id}>
                  <button type="button" className="due-item" onClick={() => onOpenTask(task.id)}>
                    <span className="due-title">{task.title}</span>
                    <span className="due-when" data-status={days < 0 ? 'overdue' : days <= 2 ? 'soon' : 'later'}>
                      {formatDue(task.due)}
                    </span>
                    <span className="due-stage">{columnOf(task.id)?.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Tags on open work">
          {stats.tags.length === 0 ? (
            <p className="panel-empty">Open tasks have no tags. Add tags to group related work.</p>
          ) : (
            <ul className="tag-bars">
              {stats.tags.slice(0, 8).map((t) => (
                <li key={t.tag}>
                  <span className="tag-name">#{t.tag}</span>
                  <span className="tag-track" aria-hidden="true">
                    <span style={{ '--v': t.count / maxTag }} />
                  </span>
                  <span className="tag-count">{t.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

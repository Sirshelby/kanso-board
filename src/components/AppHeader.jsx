import { MOD_LABEL } from '../hooks/useHotkeys.js';
import { Icon, LogoMark } from './Icon.jsx';
import '../styles/header.css';

const THEME_META = {
  system: { icon: 'monitor', label: 'Theme follows your system', next: 'light' },
  light: { icon: 'sun', label: 'Light theme', next: 'dark' },
  dark: { icon: 'moon', label: 'Dark theme', next: 'system setting' },
};

export function AppHeader({
  view,
  onViewChange,
  onOpenPalette,
  onNewTask,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  theme,
  onCycleTheme,
}) {
  const themeMeta = THEME_META[theme];
  return (
    <header className="app-header">
      <div className="brand">
        <LogoMark />
        <span className="brand-name">Kanso</span>
      </div>

      <nav className="view-switch" aria-label="Views">
        {[
          { id: 'board', label: 'Board', icon: 'board' },
          { id: 'insights', label: 'Insights', icon: 'chart' },
        ].map((v) => (
          <button
            key={v.id}
            type="button"
            aria-current={view === v.id ? 'page' : undefined}
            onClick={() => onViewChange(v.id)}
          >
            <Icon name={v.icon} size={16} />
            {v.label}
          </button>
        ))}
      </nav>

      <div className="header-actions">
        <button type="button" className="palette-trigger" onClick={onOpenPalette} aria-label="Open command menu">
          <Icon name="command" size={16} />
          <span className="palette-trigger-label">Commands</span>
          <kbd aria-hidden="true">{MOD_LABEL === '⌘' ? '⌘K' : 'Ctrl K'}</kbd>
        </button>

        <div className="icon-group">
          <button
            type="button"
            className="icon-button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label={canUndo ? `Undo: ${undoLabel}` : 'Nothing to undo'}
            title={canUndo ? `Undo: ${undoLabel} (${MOD_LABEL}Z)` : 'Nothing to undo'}
          >
            <Icon name="undo" />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label={canRedo ? `Redo: ${redoLabel}` : 'Nothing to redo'}
            title={canRedo ? `Redo: ${redoLabel}` : 'Nothing to redo'}
          >
            <Icon name="redo" />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={onCycleTheme}
            aria-label={`${themeMeta.label}. Switch to ${themeMeta.next}.`}
            title={`${themeMeta.label}. Switch to ${themeMeta.next}.`}
          >
            <Icon name={themeMeta.icon} />
          </button>
        </div>

        <button type="button" className="btn btn-primary new-task" onClick={onNewTask}>
          <Icon name="plus" size={16} />
          <span className="new-task-label">New task</span>
        </button>
      </div>
    </header>
  );
}

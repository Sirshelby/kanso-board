import { useId } from 'react';
import { MOD_LABEL } from '../hooks/useHotkeys.js';
import { Icon } from './Icon.jsx';
import { Modal } from './Modal.jsx';

const SHORTCUTS = [
  { keys: [MOD_LABEL, 'K'], action: 'Open the command menu' },
  { keys: ['N'], action: 'Create a task' },
  { keys: ['/'], action: 'Search tasks' },
  { keys: [MOD_LABEL, 'Z'], action: 'Undo' },
  { keys: [MOD_LABEL, 'Shift', 'Z'], action: 'Redo' },
  { keys: ['Enter'], action: 'Open the focused task' },
  { keys: ['Shift', '← →'], action: 'Move the focused task to another column' },
  { keys: ['Shift', '↑ ↓'], action: 'Reorder the focused task' },
  { keys: [MOD_LABEL, 'Enter'], action: 'Save the task you are editing' },
  { keys: ['Esc'], action: 'Close a dialog or cancel a drag' },
  { keys: ['?'], action: 'Show this list' },
];

export function ShortcutsDialog({ open, onClose }) {
  const headingId = useId();
  return (
    <Modal open={open} onClose={onClose} labelledBy={headingId} className="modal-shortcuts">
      <div className="shortcuts">
        <header className="editor-header">
          <h2 id={headingId} className="editor-heading">Keyboard shortcuts</h2>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose} autoFocus>
            <Icon name="x" />
          </button>
        </header>
        <dl className="shortcut-list">
          {SHORTCUTS.map((s) => (
            <div key={s.action} className="shortcut-row">
              <dt>
                {s.keys.map((k) => (
                  <kbd key={k}>{k}</kbd>
                ))}
              </dt>
              <dd>{s.action}</dd>
            </div>
          ))}
        </dl>
        <p className="shortcuts-note">On touch screens, press and hold a card to pick it up.</p>
      </div>
    </Modal>
  );
}

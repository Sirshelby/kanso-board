import { useMemo, useRef, useState } from 'react';
import { AppHeader } from './components/AppHeader.jsx';
import { Board } from './components/Board.jsx';
import { CommandPalette } from './components/CommandPalette.jsx';
import { FilterBar } from './components/FilterBar.jsx';
import { Insights } from './components/Insights.jsx';
import { ShortcutsDialog } from './components/ShortcutsDialog.jsx';
import { TaskEditor } from './components/TaskEditor.jsx';
import { MOD_LABEL, useHotkeys } from './hooks/useHotkeys.js';
import { useTheme } from './hooks/useTheme.js';
import { findColumnOf } from './lib/boardReducer.js';
import { EMPTY_FILTERS } from './lib/constants.js';
import { toISODate } from './lib/dates.js';
import { collectTags, isFiltering, taskMatches } from './lib/filters.js';
import { createSeedBoard } from './lib/seed.js';
import { parseImport, serializeExport } from './lib/storage.js';
import { BoardProvider, useBoard } from './state/BoardContext.jsx';
import { AnnouncerProvider, ToastProvider, useToast } from './state/Feedback.jsx';

const EDITABLE_FIELDS = ['title', 'description', 'priority', 'due', 'tags', 'checklist'];

function hasChanges(task, fields) {
  return EDITABLE_FIELDS.some((key) => JSON.stringify(task[key]) !== JSON.stringify(fields[key]));
}

function Workspace() {
  const { board, addTask, saveTask, deleteTask, replaceBoard, undo, redo, canUndo, canRedo, undoLabel, redoLabel } =
    useBoard();
  const toast = useToast();
  const { theme, setTheme, cycleTheme } = useTheme();

  const [view, setView] = useState('board');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [editor, setEditor] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const pendingCommand = useRef(null);
  const searchRef = useRef(null);
  const fileRef = useRef(null);

  const anyModalOpen = Boolean(editor) || paletteOpen || shortcutsOpen;
  const tags = useMemo(() => collectTags(board), [board]);
  const allTasks = useMemo(() => Object.values(board.tasks), [board.tasks]);
  const matchCount = useMemo(() => allTasks.filter((t) => taskMatches(t, filters)).length, [allTasks, filters]);

  const openCreate = (columnId = board.columns[0].id) => setEditor({ mode: 'create', columnId });
  const openTask = (taskId) => setEditor({ mode: 'edit', taskId });

  const handleUndo = () => {
    if (!canUndo) return;
    undo();
    toast(`Undone: ${undoLabel}`);
  };
  const handleRedo = () => {
    if (!canRedo) return;
    redo();
    toast(`Redone: ${redoLabel}`);
  };

  const focusSearch = () => {
    setView('board');
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  function handleSave(fields, columnId) {
    if (editor.mode === 'create') {
      addTask(fields, columnId);
      toast(`Created “${fields.title}”`);
    } else {
      const task = board.tasks[editor.taskId];
      const moved = findColumnOf(board, editor.taskId)?.id !== columnId;
      if (hasChanges(task, fields) || moved) {
        saveTask(editor.taskId, fields, columnId);
        toast('Changes saved');
      }
    }
    setEditor(null);
  }

  function handleDelete(taskId) {
    const title = board.tasks[taskId]?.title;
    deleteTask(taskId);
    setEditor(null);
    toast(`Deleted “${title}”`, { action: { label: 'Undo', onClick: undo } });
  }

  function exportBoard() {
    const blob = new Blob([serializeExport(board)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kanso-board-${toISODate(new Date())}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Board exported');
  }

  async function importBoard(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      replaceBoard(parseImport(await file.text()), 'Board imported');
      toast('Board imported', { action: { label: 'Undo', onClick: undo } });
    } catch (error) {
      toast(error.message);
    }
  }

  const commands = [
    { id: 'new', label: 'Create task', icon: 'plus', shortcut: ['N'], keywords: 'add new', run: () => openCreate() },
    { id: 'search', label: 'Search tasks', icon: 'search', shortcut: ['/'], keywords: 'find filter', run: focusSearch },
    { id: 'board', label: 'Go to board', icon: 'board', disabled: view === 'board', run: () => setView('board') },
    { id: 'insights', label: 'Go to insights', icon: 'chart', keywords: 'stats chart report', disabled: view === 'insights', run: () => setView('insights') },
    { id: 'undo', label: `Undo: ${undoLabel}`, icon: 'undo', shortcut: [MOD_LABEL, 'Z'], disabled: !canUndo, run: handleUndo },
    { id: 'redo', label: `Redo: ${redoLabel}`, icon: 'redo', shortcut: [MOD_LABEL, 'Shift', 'Z'], disabled: !canRedo, run: handleRedo },
    { id: 'clear', label: 'Clear filters', icon: 'filter', disabled: !isFiltering(filters), run: () => setFilters(EMPTY_FILTERS) },
    { id: 'light', label: 'Use light theme', icon: 'sun', keywords: 'appearance mode', disabled: theme === 'light', run: () => setTheme('light') },
    { id: 'dark', label: 'Use dark theme', icon: 'moon', keywords: 'appearance mode night', disabled: theme === 'dark', run: () => setTheme('dark') },
    { id: 'system', label: 'Match system theme', icon: 'monitor', keywords: 'appearance mode auto', disabled: theme === 'system', run: () => setTheme('system') },
    { id: 'export', label: 'Export board as JSON', icon: 'download', keywords: 'backup save download', run: exportBoard },
    { id: 'import', label: 'Import board from JSON', icon: 'upload', keywords: 'restore load upload', run: () => fileRef.current?.click() },
    {
      id: 'reset',
      label: 'Restore demo data',
      icon: 'restore',
      keywords: 'reset sample',
      run: () => {
        replaceBoard(createSeedBoard(), 'Demo data restored');
        setFilters(EMPTY_FILTERS);
        toast('Demo data restored', { action: { label: 'Undo', onClick: undo } });
      },
    },
    { id: 'shortcuts', label: 'Show keyboard shortcuts', icon: 'keyboard', shortcut: ['?'], keywords: 'help keys', run: () => setShortcutsOpen(true) },
  ];

  useHotkeys([
    { combo: 'mod+k', handler: () => setPaletteOpen((o) => !o), allowInInputs: true, enabled: !editor && !shortcutsOpen },
    { combo: 'n', handler: () => openCreate(), enabled: !anyModalOpen },
    { combo: '/', handler: focusSearch, enabled: !anyModalOpen },
    { combo: 'mod+z', handler: handleUndo, enabled: !anyModalOpen },
    { combo: 'mod+shift+z', handler: handleRedo, enabled: !anyModalOpen },
    { combo: 'mod+y', handler: handleRedo, enabled: !anyModalOpen },
    { combo: '?', handler: () => setShortcutsOpen(true), enabled: !anyModalOpen },
  ]);

  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to content</a>
      <AppHeader
        view={view}
        onViewChange={setView}
        onOpenPalette={() => setPaletteOpen(true)}
        onNewTask={() => openCreate()}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        undoLabel={undoLabel}
        redoLabel={redoLabel}
        theme={theme}
        onCycleTheme={cycleTheme}
      />

      <main id="main" className="app-main" tabIndex={-1}>
        {view === 'board' ? (
          <>
            <h1 className="sr-only">Board</h1>
            <FilterBar
              filters={filters}
              onChange={setFilters}
              tags={tags}
              matchCount={matchCount}
              totalCount={allTasks.length}
              searchRef={searchRef}
            />
            <Board filters={filters} onOpenTask={openTask} />
          </>
        ) : (
          <Insights onOpenTask={openTask} />
        )}
      </main>

      <TaskEditor
        state={editor}
        board={board}
        tagSuggestions={tags}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={() => setEditor(null)}
      />

      <CommandPalette
        open={paletteOpen}
        commands={commands}
        tasks={allTasks}
        columnOf={(id) => findColumnOf(board, id)?.title ?? ''}
        onClose={() => setPaletteOpen(false)}
        onClosed={() => {
          // Run the chosen command only after the palette has closed and returned focus,
          // so commands that move focus (search, dialogs) aren't overridden.
          const run = pendingCommand.current;
          pendingCommand.current = null;
          run?.();
        }}
        onRun={(command) => {
          pendingCommand.current = command.run;
          setPaletteOpen(false);
        }}
        onOpenTask={(taskId) => {
          pendingCommand.current = () => openTask(taskId);
          setPaletteOpen(false);
        }}
      />

      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={importBoard}
      />
    </div>
  );
}

export default function App({ initialBoard, persist = true }) {
  return (
    <BoardProvider initialBoard={initialBoard} persist={persist}>
      <ToastProvider>
        <AnnouncerProvider>
          <Workspace />
        </AnnouncerProvider>
      </ToastProvider>
    </BoardProvider>
  );
}

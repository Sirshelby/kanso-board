import { describe, expect, it } from 'vitest';
import { boardReducer, findColumnOf } from '../boardReducer.js';

const NOW = 1_700_000_000_000;

function makeBoard() {
  const task = (id) => ({ id, title: id, description: '', priority: 'medium', tags: [], due: null, checklist: [], createdAt: 0, updatedAt: 0, completedAt: null });
  return {
    version: 1,
    columns: [
      { id: 'backlog', title: 'Backlog', limit: null, taskIds: ['a', 'b', 'c'] },
      { id: 'doing', title: 'In progress', limit: 2, taskIds: ['d'] },
      { id: 'done', title: 'Done', limit: null, taskIds: [] },
    ],
    tasks: Object.fromEntries(['a', 'b', 'c', 'd'].map((id) => [id, task(id)])),
  };
}

const ids = (board, columnId) => board.columns.find((c) => c.id === columnId).taskIds;

describe('boardReducer', () => {
  it('adds a task with defaults at the requested position', () => {
    const next = boardReducer(makeBoard(), { type: 'task/add', task: { id: 'x', title: 'New' }, columnId: 'backlog', index: 1, now: NOW });
    expect(ids(next, 'backlog')).toEqual(['a', 'x', 'b', 'c']);
    expect(next.tasks.x).toMatchObject({ title: 'New', priority: 'medium', tags: [], createdAt: NOW, completedAt: null });
  });

  it('marks tasks added straight to Done as completed', () => {
    const next = boardReducer(makeBoard(), { type: 'task/add', task: { id: 'x', title: 'Shipped' }, columnId: 'done', now: NOW });
    expect(next.tasks.x.completedAt).toBe(NOW);
  });

  it('reorders within a column', () => {
    const next = boardReducer(makeBoard(), { type: 'task/move', id: 'a', toColumnId: 'backlog', toIndex: 2 });
    expect(ids(next, 'backlog')).toEqual(['b', 'c', 'a']);
  });

  it('returns the same board for a no-op move', () => {
    const board = makeBoard();
    expect(boardReducer(board, { type: 'task/move', id: 'b', toColumnId: 'backlog', toIndex: 1 })).toBe(board);
  });

  it('moves across columns and clamps the index', () => {
    const next = boardReducer(makeBoard(), { type: 'task/move', id: 'b', toColumnId: 'doing', toIndex: 99 });
    expect(ids(next, 'backlog')).toEqual(['a', 'c']);
    expect(ids(next, 'doing')).toEqual(['d', 'b']);
  });

  it('sets completedAt when entering Done and clears it when leaving', () => {
    const done = boardReducer(makeBoard(), { type: 'task/move', id: 'a', toColumnId: 'done', toIndex: 0, now: NOW });
    expect(done.tasks.a.completedAt).toBe(NOW);
    const reopened = boardReducer(done, { type: 'task/move', id: 'a', toColumnId: 'backlog', toIndex: 0, now: NOW + 1 });
    expect(reopened.tasks.a.completedAt).toBeNull();
  });

  it('deletes a task from both the task map and its column', () => {
    const next = boardReducer(makeBoard(), { type: 'task/delete', id: 'c' });
    expect(next.tasks.c).toBeUndefined();
    expect(ids(next, 'backlog')).toEqual(['a', 'b']);
  });

  it('saves edits and a status change as one step', () => {
    const next = boardReducer(makeBoard(), { type: 'task/save', id: 'a', changes: { title: 'Renamed' }, columnId: 'doing', now: NOW });
    expect(next.tasks.a.title).toBe('Renamed');
    expect(findColumnOf(next, 'a').id).toBe('doing');
    expect(ids(next, 'doing')).toEqual(['d', 'a']);
  });

  it('ignores actions for unknown tasks or columns', () => {
    const board = makeBoard();
    expect(boardReducer(board, { type: 'task/update', id: 'nope', changes: {} })).toBe(board);
    expect(boardReducer(board, { type: 'task/move', id: 'a', toColumnId: 'nope', toIndex: 0 })).toBe(board);
    expect(boardReducer(board, { type: 'column/setLimit', columnId: 'doing', limit: 2 })).toBe(board);
  });
});

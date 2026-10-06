import { describe, expect, it } from 'vitest';
import { daysUntil, dueStatus, formatDue } from '../dates.js';
import { resolveDropIndex, taskMatches } from '../filters.js';
import { fuzzyFilter, fuzzyMatch } from '../fuzzy.js';
import { parseQuickAdd } from '../quickAdd.js';
import { createSeedBoard } from '../seed.js';
import { computeStats } from '../stats.js';
import { isValidBoard, parseImport, serializeExport } from '../storage.js';

describe('parseQuickAdd', () => {
  it('pulls tags and priority out of the title', () => {
    expect(parseQuickAdd('Fix login redirect #Auth #bug !high')).toEqual({
      title: 'Fix login redirect',
      tags: ['auth', 'bug'],
      priority: 'high',
    });
  });

  it('leaves unknown tokens in the title', () => {
    expect(parseQuickAdd('Ship it! #1 !soon')).toEqual({ title: 'Ship it! !soon', tags: ['1'], priority: null });
  });
});

describe('fuzzyMatch', () => {
  it('ranks word-start substring matches above scattered ones', () => {
    const results = fuzzyFilter(['Go to insights', 'Show keyboard shortcuts', 'Create task'], 'ins', (x) => x);
    expect(results[0].item).toBe('Go to insights');
  });

  it('matches word starts and reports indices', () => {
    expect(fuzzyMatch('ct', 'Create task')).toMatchObject({ indices: [0, 7] });
    expect(fuzzyMatch('crta', 'Create task')).toMatchObject({ indices: [0, 1, 7, 8] });
  });

  it('rejects scattered letters', () => {
    expect(fuzzyMatch('the', 'Show keyboard shortcuts')).toBeNull();
    expect(fuzzyMatch('zzz', 'Create task')).toBeNull();
  });
});

describe('resolveDropIndex', () => {
  const all = ['a', 'b', 'c', 'd', 'e'];

  it('maps visible positions to full-list positions when filters hide cards', () => {
    const visible = ['b', 'd'];
    expect(resolveDropIndex(all, visible, 0, 'x')).toBe(1); // before b
    expect(resolveDropIndex(all, visible, 1, 'x')).toBe(3); // before d
    expect(resolveDropIndex(all, visible, 2, 'x')).toBe(4); // after d
  });

  it('measures positions without the moving card', () => {
    expect(resolveDropIndex(all, all, 2, 'a')).toBe(2); // a lands between c and d
  });

  it('appends to an empty or fully hidden column', () => {
    expect(resolveDropIndex(['a', 'b'], [], 0, 'x')).toBe(2);
  });
});

describe('taskMatches', () => {
  const task = { title: 'Fix crash on upload', description: 'HEIC photos', tags: ['bug', 'ios'], priority: 'urgent' };

  it('matches every search term across title, notes and tags', () => {
    expect(taskMatches(task, { query: 'crash heic', priorities: [], tags: [] })).toBe(true);
    expect(taskMatches(task, { query: '#ios', priorities: [], tags: [] })).toBe(true);
    expect(taskMatches(task, { query: 'crash android', priorities: [], tags: [] })).toBe(false);
  });

  it('applies priority and tag filters', () => {
    expect(taskMatches(task, { query: '', priorities: ['low'], tags: [] })).toBe(false);
    expect(taskMatches(task, { query: '', priorities: [], tags: ['design', 'bug'] })).toBe(true);
  });
});

describe('dates', () => {
  const now = new Date(2026, 9, 5, 15, 30);

  it('counts calendar days, not 24-hour blocks', () => {
    expect(daysUntil('2026-10-05', now)).toBe(0);
    expect(daysUntil('2026-10-06', now)).toBe(1);
    expect(daysUntil('2026-10-02', now)).toBe(-3);
  });

  it('describes due dates in plain language', () => {
    expect(formatDue('2026-10-05', now)).toBe('Due today');
    expect(formatDue('2026-10-06', now)).toBe('Due tomorrow');
    expect(formatDue('2026-10-02', now)).toBe('3 days overdue');
    expect(dueStatus('2026-10-07', now)).toBe('soon');
    expect(dueStatus('2026-10-20', now)).toBe('later');
  });
});

describe('seed data, stats and storage', () => {
  const board = createSeedBoard(new Date(2026, 9, 5, 9).getTime());

  it('produces a valid board', () => {
    expect(isValidBoard(board)).toBe(true);
  });

  it('computes throughput and overdue counts', () => {
    const stats = computeStats(board, new Date(2026, 9, 5, 18));
    expect(stats.throughput).toHaveLength(14);
    expect(stats.completedRecently).toBe(board.columns.find((c) => c.id === 'done').taskIds.length);
    expect(stats.overdueCount).toBe(1);
  });

  it('round-trips through export and import', () => {
    expect(parseImport(serializeExport(board))).toEqual(board);
  });

  it('rejects files that are not board exports', () => {
    expect(() => parseImport('not json')).toThrow('not valid JSON');
    expect(() => parseImport('{"hello":1}')).toThrow('not a Kanso board');
  });
});

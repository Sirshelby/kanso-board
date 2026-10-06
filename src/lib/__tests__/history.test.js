import { describe, expect, it } from 'vitest';
import { createHistory, withHistory } from '../history.js';

const counter = (state, action) => (action.type === 'add' ? state + action.by : state);
const reducer = withHistory(counter, { limit: 3 });

describe('withHistory', () => {
  it('undoes and redoes with labels', () => {
    let s = createHistory(0);
    s = reducer(s, { type: 'add', by: 1, meta: { label: 'Add one' } });
    s = reducer(s, { type: 'add', by: 2, meta: { label: 'Add two' } });
    expect(s.present).toBe(3);
    expect(s.past.at(-1).label).toBe('Add two');

    s = reducer(s, { type: 'history/undo' });
    expect(s.present).toBe(1);
    expect(s.future[0].label).toBe('Add two');

    s = reducer(s, { type: 'history/redo' });
    expect(s.present).toBe(3);
  });

  it('skips no-op actions and clears redo on a new change', () => {
    let s = createHistory(0);
    s = reducer(s, { type: 'add', by: 1 });
    const same = reducer(s, { type: 'unknown' });
    expect(same).toBe(s);

    s = reducer(s, { type: 'history/undo' });
    s = reducer(s, { type: 'add', by: 5 });
    expect(s.future).toHaveLength(0);
  });

  it('caps the number of undo steps', () => {
    let s = createHistory(0);
    for (let i = 0; i < 6; i += 1) s = reducer(s, { type: 'add', by: 1 });
    expect(s.past).toHaveLength(3);
  });

  it('can apply changes without recording them', () => {
    const s = reducer(createHistory(0), { type: 'add', by: 1, meta: { history: false } });
    expect(s.present).toBe(1);
    expect(s.past).toHaveLength(0);
  });
});

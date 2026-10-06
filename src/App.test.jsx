import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App.jsx';
import { createSeedBoard } from './lib/seed.js';

function renderApp() {
  return render(<App initialBoard={createSeedBoard()} persist={false} />);
}

const column = (name) => screen.getByRole('region', { name });

describe('App', () => {
  it('renders every column with its tasks', () => {
    renderApp();
    expect(within(column('In progress')).getByText('Fix crash when uploading HEIC photos')).toBeInTheDocument();
    expect(screen.getAllByRole('region')).toHaveLength(4);
  });

  it('filters cards from the search box', () => {
    renderApp();
    fireEvent.change(screen.getByLabelText('Search tasks'), { target: { value: 'heic' } });
    expect(screen.getByText(/Showing 1 of/)).toBeInTheDocument();
    expect(screen.queryByText('Write release notes for 2.4')).not.toBeInTheDocument();
  });

  it('quick-adds a task with tags and priority, then undoes it', () => {
    renderApp();
    const backlog = column('Backlog');
    fireEvent.click(within(backlog).getByRole('button', { name: 'Add task' }));
    const input = within(backlog).getByLabelText('New task in Backlog');
    fireEvent.change(input, { target: { value: 'Draft the launch email #marketing !urgent' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    const card = within(backlog).getByText('Draft the launch email').closest('button');
    expect(card).toHaveAttribute('data-priority', 'urgent');
    expect(within(card).getByText('#marketing')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Undo: Task added' }));
    expect(screen.queryByText('Draft the launch email')).not.toBeInTheDocument();
  });

  it('moves a focused card to the next column with Shift + ArrowRight', () => {
    renderApp();
    const card = within(column('Backlog')).getByText('Write release notes for 2.4').closest('button');
    fireEvent.keyDown(card, { key: 'ArrowRight', shiftKey: true });
    expect(within(column('In progress')).getByText('Write release notes for 2.4')).toBeInTheDocument();
    expect(within(column('In progress')).getByText(/Dropping here|Over the limit/)).toBeInTheDocument();
  });

  it('runs commands from the command menu', () => {
    renderApp();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = screen.getByRole('combobox', { name: 'Search actions and tasks' });
    fireEvent.change(input, { target: { value: 'insights' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByRole('heading', { name: 'Insights', level: 1 })).toBeInTheDocument();
  });

  it('edits a task in the editor', () => {
    renderApp();
    fireEvent.click(screen.getByText('Compare offline sync options'));
    const title = screen.getByLabelText('Title');
    fireEvent.change(title, { target: { value: 'Compare offline sync libraries' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByText('Compare offline sync libraries')).toBeInTheDocument();
  });
});

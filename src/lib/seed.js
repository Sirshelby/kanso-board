import { SCHEMA_VERSION } from './constants.js';
import { addDays, startOfDay, toISODate } from './dates.js';

/** Demo board for a small team shipping release 2.4 of a mobile app. Dates are relative to today. */
export function createSeedBoard(now = Date.now()) {
  const today = startOfDay(now);
  const due = (days) => toISODate(addDays(today, days));
  const at = (daysAgo, hour = 10) => {
    const d = addDays(today, -daysAgo);
    d.setHours(hour, 15, 0, 0);
    return d.getTime();
  };
  let n = 0;
  const item = (text, done = false) => ({ id: `c_seed${++n}`, text, done });

  const task = (id, fields) => ({
    id,
    description: '',
    priority: 'medium',
    tags: [],
    due: null,
    checklist: [],
    completedAt: null,
    updatedAt: fields.createdAt,
    ...fields,
  });

  const list = [
    // Backlog
    task('t_seed01', {
      title: 'Audit color contrast on the settings screens',
      description: 'Several secondary labels look below 4.5:1 in dark mode. Check every settings screen and log fixes.',
      priority: 'low',
      tags: ['design', 'a11y'],
      due: due(9),
      createdAt: at(6),
    }),
    task('t_seed02', {
      title: 'Add CSV export to the reports page',
      description: 'Finance asked for a monthly export. Match the columns in the current table view.',
      tags: ['frontend', 'backend'],
      createdAt: at(5),
    }),
    task('t_seed03', {
      title: 'Compare offline sync options',
      description: 'Shortlist two approaches with trade-offs for conflict handling and battery use.',
      priority: 'low',
      tags: ['research'],
      createdAt: at(11),
    }),
    task('t_seed04', {
      title: 'Write release notes for 2.4',
      priority: 'medium',
      tags: ['docs'],
      due: due(6),
      createdAt: at(2),
      checklist: [item('Collect merged changes'), item('Draft notes'), item('Review with support')],
    }),

    // In progress
    task('t_seed05', {
      title: 'Fix crash when uploading HEIC photos',
      description: 'Reproducible on iOS 17 with photos taken in portrait mode. Stack trace is in the error tracker.',
      priority: 'urgent',
      tags: ['bug', 'ios'],
      due: due(-1),
      createdAt: at(3),
      checklist: [item('Reproduce on device', true), item('Patch image decoder', true), item('Add regression test')],
    }),
    task('t_seed06', {
      title: 'Build the new onboarding checklist',
      description: 'Four steps shown after sign-up. Progress should survive an app restart.',
      priority: 'high',
      tags: ['frontend'],
      due: due(2),
      createdAt: at(4),
      checklist: [
        item('Checklist component', true),
        item('Persist progress'),
        item('Empty and done states'),
        item('Analytics events'),
      ],
    }),
    task('t_seed07', {
      title: 'Rate-limit the password reset endpoint',
      priority: 'high',
      tags: ['backend', 'security'],
      due: due(4),
      createdAt: at(2),
    }),

    // Review
    task('t_seed08', {
      title: 'Redesign empty states for search',
      priority: 'medium',
      tags: ['design'],
      due: due(1),
      createdAt: at(7),
    }),
    task('t_seed09', {
      title: 'Move image uploads to signed URLs',
      description: 'Uploads currently go through the API server. Signed URLs cut response time and server load.',
      priority: 'high',
      tags: ['backend'],
      createdAt: at(8),
    }),

    // Done
    task('t_seed10', { title: 'Set up error tracking for the web app', tags: ['frontend'], createdAt: at(16), completedAt: at(12, 15) }),
    task('t_seed11', { title: 'Add skeleton loading to the feed', tags: ['frontend', 'design'], createdAt: at(14), completedAt: at(10, 11) }),
    task('t_seed12', { title: 'Fix double submit on the checkout button', priority: 'high', tags: ['bug'], createdAt: at(10), completedAt: at(8, 16) }),
    task('t_seed13', { title: 'Translate onboarding into Spanish', priority: 'low', tags: ['docs'], createdAt: at(12), completedAt: at(6, 14) }),
    task('t_seed14', { title: 'Ship dark mode for the dashboard', priority: 'high', tags: ['frontend', 'design'], createdAt: at(13), completedAt: at(4, 17) }),
    task('t_seed15', { title: 'Upgrade CI to Node 22', priority: 'low', tags: ['backend'], createdAt: at(5), completedAt: at(3, 12) }),
    task('t_seed16', { title: 'Remove unused icon fonts from the bundle', priority: 'low', tags: ['frontend'], createdAt: at(4), completedAt: at(3, 16) }),
    task('t_seed17', { title: 'Add keyboard shortcuts to the editor', tags: ['frontend'], createdAt: at(6), completedAt: at(1, 13) }),
  ];

  const ids = (from, to) => list.slice(from, to).map((t) => t.id);

  return {
    version: SCHEMA_VERSION,
    columns: [
      { id: 'backlog', title: 'Backlog', limit: null, taskIds: ids(0, 4) },
      { id: 'doing', title: 'In progress', limit: 3, taskIds: ids(4, 7) },
      { id: 'review', title: 'Review', limit: 2, taskIds: ids(7, 9) },
      { id: 'done', title: 'Done', limit: null, taskIds: ids(9).reverse() },
    ],
    tasks: Object.fromEntries(list.map((t) => [t.id, t])),
  };
}

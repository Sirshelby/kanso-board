const PATHS = {
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6L6 18',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4.2-4.2',
  undo: 'M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  redo: 'M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  monitor: 'M3 5h18v11H3zM8 20h8M12 16v4',
  calendar: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  checklist: 'M4 7l2 2 3.5-3.5M4 15l2 2 3.5-3.5M13 8h7M13 16h7',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  board: 'M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v6h-4z',
  chart: 'M4 20h16M7 16v-5M12 16V7M17 16v-8',
  keyboard: 'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  restore: 'M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4',
  filter: 'M4 6h16M7 12h10M10 18h4',
  command: 'M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z',
};

export function Icon({ name, size = 18, className = '', ...rest }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Priority as signal-strength bars: shape carries the meaning, color reinforces it. */
export function PriorityGlyph({ priority, level }) {
  return (
    <svg className="priority-glyph" data-priority={priority} width="14" height="12" viewBox="0 0 14 12" aria-hidden="true" focusable="false">
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={i * 3.6}
          y={9 - i * 3}
          width="2.6"
          height={3 + i * 3}
          rx="0.8"
          className={i < level ? 'on' : 'off'}
        />
      ))}
    </svg>
  );
}

export function LogoMark() {
  return (
    <svg className="logo-mark" width="26" height="26" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="7" className="logo-bg" />
      <rect x="7" y="8" width="4.5" height="16" rx="1.5" className="logo-bar" />
      <rect x="13.75" y="8" width="4.5" height="11" rx="1.5" className="logo-bar accent" />
      <rect x="20.5" y="8" width="4.5" height="7" rx="1.5" className="logo-bar" />
    </svg>
  );
}

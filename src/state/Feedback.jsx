import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon.jsx';
import { createId } from '../lib/ids.js';
import '../styles/toast.css';

const ToastContext = createContext(() => {});
const AnnounceContext = createContext(() => {});

/** Visible, dismissible notifications with an optional action (such as Undo). */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const show = useCallback(
    (message, { action, duration = 5000 } = {}) => {
      const id = createId('toast');
      setToasts((list) => [...list.slice(-2), { id, message, action }]);
      timers.current.set(id, setTimeout(() => dismiss(id), duration));
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach(clearTimeout);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div className="toast" key={toast.id}>
            <span className="toast-message">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  toast.action.onClick();
                  dismiss(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              className="toast-close"
              aria-label="Dismiss notification"
              onClick={() => dismiss(toast.id)}
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Screen-reader-only announcements for drag and keyboard moves. */
export function AnnouncerProvider({ children }) {
  const [message, setMessage] = useState('');
  // A trailing no-break space forces re-announcement of an identical message.
  const announce = useCallback(
    (text) => setMessage((previous) => (previous === text ? `${text}\u00a0` : text)),
    [],
  );
  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {message}
      </div>
    </AnnounceContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
export const useAnnounce = () => useContext(AnnounceContext);

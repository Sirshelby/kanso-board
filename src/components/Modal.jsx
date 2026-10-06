import { useLayoutEffect, useRef } from 'react';
import { useStableCallback } from '../hooks/useStableCallback.js';
import '../styles/modal.css';

/**
 * Thin wrapper around the native <dialog> element: the browser provides the focus
 * trap, Escape handling, inert background and top-layer stacking for free.
 */
export function Modal({ open, onClose, onClosed, labelledBy, label, className = '', children }) {
  const ref = useRef(null);
  const returnFocus = useRef(null);
  const pressedBackdrop = useRef(false);
  const handleClosed = useStableCallback(() => onClosed?.());

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      const target = returnFocus.current;
      if (target?.isConnected && document.activeElement === document.body) target.focus();
      handleClosed();
    }
  }, [open, handleClosed]);

  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onPointerDown={(event) => {
        pressedBackdrop.current = event.target === ref.current;
      }}
      onClick={(event) => {
        // Close only when the press both started and ended on the backdrop.
        if (pressedBackdrop.current && event.target === ref.current) onClose();
        pressedBackdrop.current = false;
      }}
    >
      {open && children}
    </dialog>
  );
}

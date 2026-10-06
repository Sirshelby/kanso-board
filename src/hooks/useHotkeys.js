import { useEffect, useRef } from 'react';

export function isTypingTarget(element) {
  if (!element) return false;
  const tag = element.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable;
}

export const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
export const MOD_LABEL = isMac ? '⌘' : 'Ctrl';

/** Matches combos such as "mod+k", "mod+shift+z", "n" or "?". `mod` is ⌘ on Mac, Ctrl elsewhere. */
export function matchesCombo(event, combo) {
  const parts = combo.toLowerCase().split('+');
  const key = parts.pop();
  const wantMod = parts.includes('mod');
  const wantShift = parts.includes('shift');
  const wantAlt = parts.includes('alt');
  const hasMod = event.metaKey || event.ctrlKey;

  if (wantMod !== hasMod || wantAlt !== event.altKey) return false;
  // Symbols like "?" already imply Shift, so only enforce Shift for letters and named keys.
  if (/^([a-z]|arrow\w+|enter)$/.test(key) && wantShift !== event.shiftKey) return false;
  return event.key.toLowerCase() === key;
}

/**
 * Global keyboard shortcuts. Bindings: [{ combo, handler, enabled?, allowInInputs? }].
 * The listener is attached once; bindings are read from a ref so they can change freely.
 */
export function useHotkeys(bindings) {
  const ref = useRef(bindings);
  useEffect(() => {
    ref.current = bindings;
  });

  useEffect(() => {
    function onKeyDown(event) {
      if (event.defaultPrevented || event.isComposing) return;
      for (const binding of ref.current) {
        if (binding.enabled === false) continue;
        if (!binding.allowInInputs && isTypingTarget(event.target)) continue;
        if (matchesCombo(event, binding.combo)) {
          event.preventDefault();
          binding.handler(event);
          return;
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

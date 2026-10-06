import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

const MOUSE_THRESHOLD = 5; // px of movement before a mouse press becomes a drag
const TOUCH_DELAY = 220; // ms a finger must rest on a card before it lifts
const TOUCH_TOLERANCE = 8; // px a finger may wander during that delay (more means "scrolling")
const EDGE = 56; // px from a scroll container's edge where auto-scroll starts
const MAX_SPEED = 16; // px per frame at the very edge

function edgeSpeed(position, start, end) {
  if (position < start + EDGE) return -Math.ceil(MAX_SPEED * Math.min(1, (start + EDGE - position) / EDGE));
  if (position > end - EDGE) return Math.ceil(MAX_SPEED * Math.min(1, (position - (end - EDGE)) / EDGE));
  return 0;
}

/**
 * Pointer-events drag and drop for the board, written without a library.
 *
 * - One code path for mouse, pen and touch. Touch uses a short press-and-hold so
 *   normal swipes still scroll the board.
 * - The floating "ghost" card follows the pointer through a ref and
 *   requestAnimationFrame, so pointer movement never triggers a React render.
 *   React state only changes when the drop target (column or index) changes.
 * - Columns and the board scroller auto-scroll near their edges.
 * - Escape cancels.
 *
 * Columns register their element in `columnsRef` (Map<columnId, HTMLElement>).
 * Each column contains a `[data-drop-list]` element whose children carry `data-task-id`.
 */
export function usePointerDrag({ columnsRef, scrollerRef, onDrop, onStart, onCancel }) {
  const [drag, setDrag] = useState(null);
  const ghostRef = useRef(null);
  const suppressClickRef = useRef(false);
  const callbacks = useRef({ onDrop, onStart, onCancel });

  useEffect(() => {
    callbacks.current = { onDrop, onStart, onCancel };
  });

  const engine = useMemo(() => {
    let s = null; // the current press/drag session

    function listItems(columnEl, excludeId) {
      const list = columnEl.querySelector('[data-drop-list]');
      if (!list) return [];
      return [...list.querySelectorAll(':scope > [data-task-id]')].filter(
        (el) => el.dataset.taskId !== excludeId,
      );
    }

    function hitTest(x, y) {
      for (const [columnId, el] of columnsRef.current) {
        const rect = el.getBoundingClientRect();
        if (x < rect.left || x > rect.right) continue;
        let index = 0;
        for (const card of listItems(el, s.taskId)) {
          const r = card.getBoundingClientRect();
          if (y > r.top + r.height / 2) index += 1;
          else break;
        }
        return { columnId, index };
      }
      return null;
    }

    function positionGhost() {
      const ghost = ghostRef.current;
      if (!s?.active || !ghost) return;
      ghost.style.transform = `translate3d(${s.x - s.offsetX}px, ${s.y - s.offsetY}px, 0)`;
    }

    function autoScroll() {
      const scroller = scrollerRef.current;
      if (scroller) {
        const r = scroller.getBoundingClientRect();
        const dx = edgeSpeed(s.x, r.left, r.right);
        if (dx) scroller.scrollLeft += dx;
      }
      const columnEl = s.over && columnsRef.current.get(s.over.columnId);
      const list = columnEl?.querySelector('[data-drop-list]');
      if (list && list.scrollHeight > list.clientHeight) {
        const r = list.getBoundingClientRect();
        const dy = edgeSpeed(s.y, r.top, r.bottom);
        if (dy) list.scrollTop += dy;
      }
    }

    function updateTarget() {
      const hit = hitTest(s.x, s.y);
      if (!hit) return;
      if (hit.columnId === s.over?.columnId && hit.index === s.over?.index) return;
      s.over = hit;
      setDrag((d) => (d ? { ...d, overColumnId: hit.columnId, overIndex: hit.index } : d));
    }

    function frame() {
      if (!s?.active) return;
      autoScroll();
      updateTarget();
      positionGhost();
      s.raf = requestAnimationFrame(frame);
    }

    function activate() {
      if (!s || s.active) return;
      const item = s.cardEl.closest('[data-task-id]');
      const columnEl = columnsRef.current.get(s.columnId);
      const rect = s.cardEl.getBoundingClientRect();
      const originIndex = columnEl ? listItems(columnEl, null).indexOf(item) : 0;

      delete s.cardEl.dataset.pressing;
      s.active = true;
      s.offsetX = s.startX - rect.left;
      s.offsetY = s.startY - rect.top;
      s.over = { columnId: s.columnId, index: Math.max(0, originIndex) };
      document.body.classList.add('is-dragging');
      if (s.type === 'touch') navigator.vibrate?.(8);

      setDrag({
        taskId: s.taskId,
        fromColumnId: s.columnId,
        overColumnId: s.over.columnId,
        overIndex: s.over.index,
        width: rect.width,
        height: rect.height,
      });
      callbacks.current.onStart?.(s.taskId);
      s.raf = requestAnimationFrame(frame);
    }

    function teardown() {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('contextmenu', onContextMenu, true);
      if (s) {
        clearTimeout(s.timer);
        cancelAnimationFrame(s.raf);
        delete s.cardEl.dataset.pressing;
      }
      document.body.classList.remove('is-dragging');
      s = null;
    }

    function cancel() {
      const wasActive = s?.active;
      const taskId = s?.taskId;
      teardown();
      if (wasActive) {
        setDrag(null);
        callbacks.current.onCancel?.(taskId);
      }
    }

    function onPointerMove(event) {
      if (!s || event.pointerId !== s.pointerId) return;
      s.x = event.clientX;
      s.y = event.clientY;
      if (s.active) return;
      const distance = Math.hypot(s.x - s.startX, s.y - s.startY);
      if (s.type === 'touch') {
        if (distance > TOUCH_TOLERANCE) cancel(); // the person is scrolling, not dragging
      } else if (distance > MOUSE_THRESHOLD) {
        activate();
      }
    }

    function onPointerUp(event) {
      if (!s || event.pointerId !== s.pointerId) return;
      if (!s.active) {
        teardown();
        return;
      }
      const result = { taskId: s.taskId, fromColumnId: s.columnId, ...s.over };
      // The browser may fire a click right after pointerup; don't let it open the card.
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
      teardown();
      setDrag(null);
      callbacks.current.onDrop?.({
        taskId: result.taskId,
        fromColumnId: result.fromColumnId,
        toColumnId: result.columnId,
        visibleIndex: result.index,
      });
    }

    function onPointerCancel(event) {
      if (s && event.pointerId === s.pointerId) cancel();
    }

    function onKeyDown(event) {
      if (event.key === 'Escape' && s?.active) {
        event.preventDefault();
        event.stopPropagation();
        cancel();
      }
    }

    // Only once a drag is active do we stop the page from scrolling under the finger.
    function onTouchMove(event) {
      if (s?.active) event.preventDefault();
    }

    function onContextMenu(event) {
      if (s) event.preventDefault();
    }

    function start(event, taskId, columnId) {
      if (s) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      s = {
        taskId,
        columnId,
        cardEl: event.currentTarget,
        pointerId: event.pointerId,
        type: event.pointerType,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        active: false,
        over: null,
        timer: 0,
        raf: 0,
      };
      if (s.type === 'touch') {
        s.cardEl.dataset.pressing = '';
        s.timer = setTimeout(activate, TOUCH_DELAY);
      }
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerCancel);
      window.addEventListener('keydown', onKeyDown, true);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('contextmenu', onContextMenu, true);
    }

    return { start, cancel, positionGhost };
  }, [columnsRef, scrollerRef]);

  // Place the ghost before the first paint of a new drag so it never flashes at 0,0.
  useLayoutEffect(() => {
    if (drag) engine.positionGhost();
  }, [drag, engine]);

  useEffect(() => () => engine.cancel(), [engine]);

  return {
    drag,
    ghostRef,
    startDrag: engine.start,
    shouldSuppressClick: () => suppressClickRef.current,
  };
}

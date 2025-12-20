// src/hooks/useDragScroll.js
import { useEffect, useRef } from "react";

export function useDragScroll(ref) {
  const stateRef = useRef({
    down: false,
    dragging: false,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    suppressClick: false,
    pointerId: null,
  });

  useEffect(() => {
    const el = ref?.current;
    if (!el) return;

    const s = stateRef.current;

    // Bigger threshold = clicks work again (mouse jitter is real).
    const THRESHOLD = 12;     // px
    const AXIS_RATIO = 1.2;   // horizontal must be 20% stronger than vertical

    const shouldBlockDrag = (target) => {
      if (!(target instanceof Element)) return false;
      if (target.closest("[data-no-drag]")) return true;
      if (target.closest("input, textarea, select, [contenteditable='true']")) return true;
      return false; // NOTE: buttons/links are allowed (we rely on threshold)
    };

    const onPointerDown = (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (shouldBlockDrag(e.target)) return;

      s.down = true;
      s.dragging = false;
      s.suppressClick = false;
      s.pointerId = e.pointerId;

      s.startX = e.clientX;
      s.startY = e.clientY;
      s.startScrollLeft = el.scrollLeft;

      el.classList.remove("dragging");
      // IMPORTANT: do NOT setPointerCapture here — it can interfere with normal clicks.
    };

    const onPointerMove = (e) => {
      if (!s.down) return;

      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;

      // Don't start dragging unless it's clearly a horizontal gesture.
      if (!s.dragging) {
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (absX < THRESHOLD) return;
        if (absX < absY * AXIS_RATIO) return; // mostly vertical -> treat as normal interaction

        s.dragging = true;
        el.classList.add("dragging");
        document.body.style.userSelect = "none";

        // Only capture once we KNOW we're dragging.
        el.setPointerCapture?.(e.pointerId);
      }

      // While dragging: prevent selection and scroll the container
      e.preventDefault();
      el.scrollLeft = s.startScrollLeft - dx;
    };

    const endDrag = () => {
      if (!s.down) return;

      s.down = false;

      if (s.dragging) {
        s.dragging = false;
        el.classList.remove("dragging");
        document.body.style.userSelect = "";

        // Suppress the click that fires after a drag.
        s.suppressClick = true;
        window.setTimeout(() => (s.suppressClick = false), 150);
      }
    };

    const onClickCapture = (e) => {
      if (s.suppressClick) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // capture:true so we still get events even if a child component stops propagation
    el.addEventListener("pointerdown", onPointerDown, { passive: true, capture: true });
    el.addEventListener("pointermove", onPointerMove, { passive: false });
    el.addEventListener("pointerup", endDrag, { passive: true });
    el.addEventListener("pointercancel", endDrag, { passive: true });
    el.addEventListener("click", onClickCapture, true);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown, true);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
      el.removeEventListener("click", onClickCapture, true);
      document.body.style.userSelect = "";
    };
  }, [ref]);
}

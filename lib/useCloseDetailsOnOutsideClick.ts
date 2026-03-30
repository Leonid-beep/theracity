import { type RefObject, useEffect } from "react";

/** Collapses every open `<details name={detailsName}>` inside `containerRef` when pointer goes down outside. */
export function useCloseDetailsOnOutsideClick(
  containerRef: RefObject<HTMLElement | null>,
  detailsName: string,
) {
  useEffect(() => {
    const onPointerDown = (e: Event) => {
      const root = containerRef.current;
      if (!root) return;
      const target = e.target;
      if (!(target instanceof Node) || root.contains(target)) return;
      root.querySelectorAll(`details[name="${detailsName}"][open]`).forEach((node) => {
        node.removeAttribute("open");
      });
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [containerRef, detailsName]);
}

import { type RefObject, useEffect } from "react";

interface UseOutsideClickOptions {
  enabled?: boolean;
}

export function useOutsideClick(
  refs: Array<RefObject<HTMLElement | null>>,
  onOutsideClick: () => void,
  options: UseOutsideClickOptions = {},
): void {
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handlePointerDown = (event: PointerEvent): void => {
      const targetNode = event.target as Node | null;

      if (targetNode === null) {
        return;
      }

      const isInsideAnyRef = refs.some((ref) => {
        const element = ref.current;

        if (element === null) {
          return false;
        }

        return element.contains(targetNode);
      });

      if (!isInsideAnyRef) {
        onOutsideClick();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [enabled, onOutsideClick, refs]);
}

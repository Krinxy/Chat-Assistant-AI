import { type RefObject, useEffect } from "react";

export function useHorizontalWheelScroll(
  ref: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const element = ref.current;

    if (element === null) {
      return;
    }

    const handleWheel = (event: WheelEvent): void => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }

      event.preventDefault();
      element.scrollLeft += event.deltaY;
    };

    element.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      element.removeEventListener("wheel", handleWheel);
    };
  }, [ref]);
}

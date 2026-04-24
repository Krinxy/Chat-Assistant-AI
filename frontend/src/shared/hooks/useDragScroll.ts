import { type PointerEvent, type RefObject, useCallback, useRef, useState } from "react";

interface DragScrollState {
  pointerId: number | null;
  startClient: number;
  startScroll: number;
  moved: boolean;
}

export type DragScrollOrientation = "horizontal" | "vertical";

export interface UseDragScrollReturn {
  isDragging: boolean;
  hasMoved: () => boolean;
  handlers: {
    onPointerDown: (event: PointerEvent<HTMLElement>) => void;
    onPointerMove: (event: PointerEvent<HTMLElement>) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
    onPointerLeave: () => void;
  };
}

const DRAG_THRESHOLD_PX = 6;
const MOVED_RESET_DELAY_MS = 40;

export function useDragScroll(
  elementRef: RefObject<HTMLElement | null>,
  orientation: DragScrollOrientation = "horizontal",
): UseDragScrollReturn {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const stateRef = useRef<DragScrollState>({
    pointerId: null,
    startClient: 0,
    startScroll: 0,
    moved: false,
  });

  const finish = useCallback((): void => {
    setIsDragging(false);
    stateRef.current.pointerId = null;
    globalThis.setTimeout(() => {
      stateRef.current.moved = false;
    }, MOVED_RESET_DELAY_MS);
  }, []);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>): void => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      const element = elementRef.current;
      if (element === null) {
        return;
      }

      const client = orientation === "horizontal" ? event.clientX : event.clientY;
      const scroll = orientation === "horizontal" ? element.scrollLeft : element.scrollTop;

      stateRef.current.pointerId = event.pointerId;
      stateRef.current.startClient = client;
      stateRef.current.startScroll = scroll;
      stateRef.current.moved = false;
    },
    [elementRef, orientation],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>): void => {
      if (stateRef.current.pointerId !== event.pointerId) {
        return;
      }

      const element = elementRef.current;
      if (element === null) {
        return;
      }

      const client = orientation === "horizontal" ? event.clientX : event.clientY;
      const offset = client - stateRef.current.startClient;

      if (Math.abs(offset) > DRAG_THRESHOLD_PX) {
        stateRef.current.moved = true;
        if (!isDragging) {
          setIsDragging(true);
        }
      }

      const nextScroll = stateRef.current.startScroll - offset;

      if (orientation === "horizontal") {
        element.scrollLeft = nextScroll;
      } else {
        element.scrollTop = nextScroll;
      }
    },
    [elementRef, isDragging, orientation],
  );

  const hasMoved = useCallback((): boolean => {
    return stateRef.current.moved;
  }, []);

  return {
    isDragging,
    hasMoved,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
      onPointerLeave: finish,
    },
  };
}

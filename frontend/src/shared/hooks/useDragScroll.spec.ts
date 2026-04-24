import { act, renderHook } from "@testing-library/react";
import { createRef, type RefObject } from "react";
import { vi } from "vitest";
import { useDragScroll } from "./useDragScroll";

type PointerHandlerArg = Parameters<
  ReturnType<typeof useDragScroll>["handlers"]["onPointerDown"]
>[0];

const makePointerEvent = (
  overrides: Partial<{
    pointerId: number;
    pointerType: string;
    button: number;
    clientX: number;
    clientY: number;
  }> = {},
): PointerHandlerArg =>
  ({
    pointerId: overrides.pointerId ?? 1,
    pointerType: overrides.pointerType ?? "mouse",
    button: overrides.button ?? 0,
    clientX: overrides.clientX ?? 0,
    clientY: overrides.clientY ?? 0,
  }) as unknown as PointerHandlerArg;

const makeScrollableRef = (
  initialScroll = 0,
  orientation: "horizontal" | "vertical" = "horizontal",
) => {
  const element = document.createElement("div");
  if (orientation === "horizontal") element.scrollLeft = initialScroll;
  else element.scrollTop = initialScroll;
  const ref = { current: element } as RefObject<HTMLElement>;
  return { element, ref };
};

describe("useDragScroll", () => {
  it("scrolls horizontally and marks moved when drag exceeds threshold", () => {
    const initialScroll = 40;
    const startX = 100;
    const endX = 70;
    const { element, ref } = makeScrollableRef(initialScroll);

    const { result } = renderHook(() => useDragScroll(ref));

    act(() => {
      result.current.handlers.onPointerDown(makePointerEvent({ clientX: startX }));
    });
    act(() => {
      result.current.handlers.onPointerMove(makePointerEvent({ clientX: endX }));
    });

    expect(element.scrollLeft).toBe(initialScroll - (endX - startX));
    expect(result.current.hasMoved()).toBe(true);
    expect(result.current.isDragging).toBe(true);
  });

  it("ignores right-click (button 2) for mouse pointer type", () => {
    const initialScroll = 12;
    const { element, ref } = makeScrollableRef(initialScroll);

    const { result } = renderHook(() => useDragScroll(ref));

    act(() => {
      result.current.handlers.onPointerDown(makePointerEvent({ button: 2, clientX: 0 }));
    });
    act(() => {
      result.current.handlers.onPointerMove(makePointerEvent({ clientX: -50 }));
    });

    expect(element.scrollLeft).toBe(initialScroll);
    expect(result.current.hasMoved()).toBe(false);
  });

  it("does not mark moved for pointer movement below threshold", () => {
    const { ref } = makeScrollableRef(0);
    const { result } = renderHook(() => useDragScroll(ref));

    const startX = 50;
    const belowThresholdDelta = 2;

    act(() => {
      result.current.handlers.onPointerDown(makePointerEvent({ clientX: startX }));
      result.current.handlers.onPointerMove(
        makePointerEvent({ clientX: startX + belowThresholdDelta }),
      );
      result.current.handlers.onPointerUp();
    });

    expect(result.current.hasMoved()).toBe(false);
  });

  it("scrolls vertically when orientation is vertical", () => {
    const initialScroll = 20;
    const startY = 80;
    const endY = 50;
    const { element, ref } = makeScrollableRef(initialScroll, "vertical");

    const { result } = renderHook(() => useDragScroll(ref, "vertical"));

    act(() => {
      result.current.handlers.onPointerDown(makePointerEvent({ clientY: startY }));
    });
    act(() => {
      result.current.handlers.onPointerMove(makePointerEvent({ clientY: endY }));
    });

    expect(element.scrollTop).toBe(initialScroll - (endY - startY));
    expect(result.current.hasMoved()).toBe(true);
  });

  it("ignores pointer move from a different pointer id", () => {
    const initialScroll = 0;
    const { element, ref } = makeScrollableRef(initialScroll);

    const { result } = renderHook(() => useDragScroll(ref));

    act(() => {
      result.current.handlers.onPointerDown(makePointerEvent({ pointerId: 1, clientX: 0 }));
    });
    act(() => {
      result.current.handlers.onPointerMove(makePointerEvent({ pointerId: 2, clientX: 100 }));
    });

    expect(element.scrollLeft).toBe(initialScroll);
    expect(result.current.hasMoved()).toBe(false);
  });

  it("does not begin tracking when element ref is null on pointer down", () => {
    const ref = createRef<HTMLElement>();

    const { result } = renderHook(() => useDragScroll(ref));

    act(() => {
      result.current.handlers.onPointerDown(makePointerEvent({ clientX: 50 }));
    });
    act(() => {
      result.current.handlers.onPointerMove(makePointerEvent({ clientX: 100 }));
    });

    expect(result.current.hasMoved()).toBe(false);
    expect(result.current.isDragging).toBe(false);
  });

  it("ignores pointer move when element ref becomes null mid-drag", () => {
    const { ref } = makeScrollableRef(0);

    const { result } = renderHook(() => useDragScroll(ref));

    act(() => {
      result.current.handlers.onPointerDown(makePointerEvent({ clientX: 0 }));
    });

    (ref as { current: HTMLElement | null }).current = null;

    act(() => {
      result.current.handlers.onPointerMove(makePointerEvent({ clientX: 50 }));
    });

    expect(result.current.hasMoved()).toBe(false);
  });

  it("resets isDragging on pointer cancel", () => {
    const { ref } = makeScrollableRef(0);
    const { result } = renderHook(() => useDragScroll(ref));

    act(() => {
      result.current.handlers.onPointerDown(makePointerEvent({ clientX: 0 }));
      result.current.handlers.onPointerMove(makePointerEvent({ clientX: 50 }));
    });
    expect(result.current.isDragging).toBe(true);

    act(() => {
      result.current.handlers.onPointerCancel();
    });

    expect(result.current.isDragging).toBe(false);
  });

  it("resets isDragging on pointer leave", () => {
    const { ref } = makeScrollableRef(0);
    const { result } = renderHook(() => useDragScroll(ref));

    act(() => {
      result.current.handlers.onPointerDown(makePointerEvent({ clientX: 0 }));
      result.current.handlers.onPointerMove(makePointerEvent({ clientX: 50 }));
    });
    expect(result.current.isDragging).toBe(true);

    act(() => {
      result.current.handlers.onPointerLeave();
    });

    expect(result.current.isDragging).toBe(false);
  });

  it("clears moved flag after delay following pointer up", () => {
    vi.useFakeTimers();
    const { ref } = makeScrollableRef(0);
    const { result } = renderHook(() => useDragScroll(ref));

    act(() => {
      result.current.handlers.onPointerDown(makePointerEvent({ clientX: 0 }));
      result.current.handlers.onPointerMove(makePointerEvent({ clientX: 50 }));
    });
    expect(result.current.hasMoved()).toBe(true);

    act(() => {
      result.current.handlers.onPointerUp();
      vi.runAllTimers();
    });

    expect(result.current.hasMoved()).toBe(false);
    vi.useRealTimers();
  });
});

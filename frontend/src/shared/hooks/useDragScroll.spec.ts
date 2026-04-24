import { act, renderHook } from "@testing-library/react";
import { createRef } from "react";
import { useDragScroll } from "./useDragScroll";

type PointerHandlerArg = Parameters<
  ReturnType<typeof useDragScroll>["handlers"]["onPointerDown"]
>[0];

const createPointerEvent = (
  overrides: Partial<{
    pointerId: number;
    pointerType: string;
    button: number;
    clientX: number;
  }> = {},
): PointerHandlerArg => ({
  pointerId: overrides.pointerId ?? 1,
  pointerType: overrides.pointerType ?? "mouse",
  button: overrides.button ?? 0,
  clientX: overrides.clientX ?? 0,
}) as unknown as PointerHandlerArg;

describe("useDragScroll", () => {
  it("starts tracking on pointer down and scrolls on movement", () => {
    const element = document.createElement("div");
    element.scrollLeft = 40;
    const ref = createRef<HTMLElement>();
    Object.defineProperty(ref, "current", { value: element, writable: true });

    const { result } = renderHook(() => useDragScroll(ref));

    act(() => {
      result.current.handlers.onPointerDown(createPointerEvent({ clientX: 100 }));
    });

    act(() => {
      result.current.handlers.onPointerMove(
        createPointerEvent({ clientX: 70 }),
      );
    });

    expect(element.scrollLeft).toBe(70);
    expect(result.current.hasMoved()).toBe(true);
  });

  it("ignores right-click for mouse pointer", () => {
    const element = document.createElement("div");
    element.scrollLeft = 12;
    const ref = createRef<HTMLElement>();
    Object.defineProperty(ref, "current", { value: element, writable: true });

    const { result } = renderHook(() => useDragScroll(ref));

    act(() => {
      result.current.handlers.onPointerDown(
        createPointerEvent({ button: 2, clientX: 0 }),
      );
    });

    act(() => {
      result.current.handlers.onPointerMove(
        createPointerEvent({ clientX: -50 }),
      );
    });

    expect(element.scrollLeft).toBe(12);
    expect(result.current.hasMoved()).toBe(false);
  });

  it("reports moved=false for taps below threshold", () => {
    const element = document.createElement("div");
    const ref = createRef<HTMLElement>();
    Object.defineProperty(ref, "current", { value: element, writable: true });

    const { result } = renderHook(() => useDragScroll(ref));

    act(() => {
      result.current.handlers.onPointerDown(createPointerEvent({ clientX: 50 }));
      result.current.handlers.onPointerMove(createPointerEvent({ clientX: 52 }));
      result.current.handlers.onPointerUp();
    });

    expect(result.current.hasMoved()).toBe(false);
  });
});

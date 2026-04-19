import { type FormEvent } from "react";
import { act, renderHook } from "@testing-library/react";

import { useChatSession } from "./useChatSession";

describe("useChatSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns setup hint for non-Gemini models", () => {
    const { result } = renderHook(() =>
      useChatSession({
        selectedModelId: "gpt-5.3-codex",
        selectedModelLabel: "GPT-5.3-Codex",
        language: "de",
        actionStartedPrefix: "Aktion gestartet",
        reasoningText: "Denke nach...",
      }),
    );

    act(() => {
      result.current.setDraft("Testfrage");
    });

    act(() => {
      result.current.sendMessage({
        preventDefault: vi.fn(),
      } as unknown as FormEvent<HTMLFormElement>);
      vi.runAllTimers();
    });

    const assistantReply = result.current.messages.find(
      (message) => message.role === "assistant" && !message.isThinking,
    );

    expect(assistantReply?.text).toContain("Dieses LLM ist noch nicht angelegt");
  });

  it("keeps Gemini models active for mocked streaming replies", () => {
    const { result } = renderHook(() =>
      useChatSession({
        selectedModelId: "gemini-2.5-pro",
        selectedModelLabel: "Gemini 2.5 Pro",
        language: "de",
        actionStartedPrefix: "Aktion gestartet",
        reasoningText: "Denke nach...",
      }),
    );

    act(() => {
      result.current.setDraft("Was ist neu?");
    });

    act(() => {
      result.current.sendMessage({
        preventDefault: vi.fn(),
      } as unknown as FormEvent<HTMLFormElement>);
      vi.runAllTimers();
    });

    const assistantReply = result.current.messages.find(
      (message) => message.role === "assistant" && !message.isThinking,
    );

    expect(assistantReply?.text).toContain("Gemini 2.5 Pro");
    expect(assistantReply?.text).not.toContain("Dieses LLM ist noch nicht angelegt");
  });

  it("adds uploaded images as user attachments", () => {
    const onFirstUserMessage = vi.fn();
    const createObjectUrlSpy = vi
      .spyOn(globalThis.URL, "createObjectURL")
      .mockReturnValue("blob:image-preview");

    const { result } = renderHook(() =>
      useChatSession({
        selectedModelId: "gemini-2.5-pro",
        selectedModelLabel: "Gemini 2.5 Pro",
        language: "de",
        actionStartedPrefix: "Aktion gestartet",
        reasoningText: "Denke nach...",
        onFirstUserMessage,
      }),
    );

    const imageFile = new File(["binary"], "mock-image.png", { type: "image/png" });

    act(() => {
      result.current.addUploadedFilesMessage([imageFile]);
    });

    expect(onFirstUserMessage).toHaveBeenCalledTimes(1);
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]?.attachments?.[0]).toMatchObject({
      name: "mock-image.png",
      isImage: true,
      previewUrl: "blob:image-preview",
    });
  });
});

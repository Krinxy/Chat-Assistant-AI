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
        token: null,
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

    expect(assistantReply?.text).toContain("Dieses LLM ist noch nicht angebunden");
  });

  it("calls backend and streams response for Gemini models", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({
        status: "ok",
        message: "This is the backend reply.",
        session_id: "test-session-123",
        user: "test@example.com",
      }),
    } as unknown as Response);

    const { result } = renderHook(() =>
      useChatSession({
        selectedModelId: "gemini-2.5-pro",
        selectedModelLabel: "Gemini 2.5 Pro",
        language: "de",
        actionStartedPrefix: "Aktion gestartet",
        reasoningText: "Denke nach...",
        token: null,
      }),
    );

    act(() => {
      result.current.setDraft("Was ist neu?");
    });

    await act(async () => {
      result.current.sendMessage({
        preventDefault: vi.fn(),
      } as unknown as FormEvent<HTMLFormElement>);
      await vi.runAllTimersAsync();
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/chat"),
      expect.objectContaining({ method: "POST" }),
    );

    const requestBody = JSON.parse(
      (vi.mocked(globalThis.fetch).mock.calls[0]?.[1] as RequestInit).body as string,
    ) as { provider?: string };
    expect(requestBody.provider).toBe("gemini");

    const assistantReply = result.current.messages.find(
      (message) => message.role === "assistant" && !message.isThinking,
    );

    expect(assistantReply?.text).not.toContain("Dieses LLM ist noch nicht angebunden");
    expect(assistantReply?.text).toBeDefined();
  });

  it("routes local self-hosted models to the local provider", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({
        status: "ok",
        message: "Local reply.",
        session_id: "local-session-1",
        user: "test@example.com",
      }),
    } as unknown as Response);

    const { result } = renderHook(() =>
      useChatSession({
        selectedModelId: "local-vllm-openai",
        selectedModelLabel: "vLLM (OpenAI-compatible)",
        language: "de",
        actionStartedPrefix: "Aktion gestartet",
        reasoningText: "Denke nach...",
        token: null,
      }),
    );

    act(() => {
      result.current.setDraft("Hallo lokal");
    });

    await act(async () => {
      result.current.sendMessage({
        preventDefault: vi.fn(),
      } as unknown as FormEvent<HTMLFormElement>);
      await vi.runAllTimersAsync();
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const requestBody = JSON.parse(
      (vi.mocked(globalThis.fetch).mock.calls[0]?.[1] as RequestInit).body as string,
    ) as { provider?: string };
    expect(requestBody.provider).toBe("local");
  });

  it("shows auth error when backend returns 401 for Gemini models", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: vi.fn().mockResolvedValueOnce({ detail: "Not authenticated" }),
    } as unknown as Response);

    const { result } = renderHook(() =>
      useChatSession({
        selectedModelId: "gemini-2.5-pro",
        selectedModelLabel: "Gemini 2.5 Pro",
        language: "de",
        actionStartedPrefix: "Aktion gestartet",
        reasoningText: "Denke nach...",
        token: null,
      }),
    );

    act(() => {
      result.current.setDraft("Hallo");
    });

    await act(async () => {
      result.current.sendMessage({
        preventDefault: vi.fn(),
      } as unknown as FormEvent<HTMLFormElement>);
      await vi.runAllTimersAsync();
    });

    const assistantReply = result.current.messages.find(
      (message) => message.role === "assistant" && !message.isThinking,
    );

    expect(assistantReply?.text).toContain("einloggen");
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
        token: null,
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

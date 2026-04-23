import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { uiTextByLanguage } from "../../../shared/i18n/uiText";
import { ChatPanel } from "./ChatPanel";

const expectCompactProfileBadge = (): void => {
  const profileButton = screen.getByRole("button", { name: /open profile/i });
  const avatar = within(profileButton).getByTitle(/.+/);
  const avatarText = avatar.textContent?.trim() ?? "";

  expect(avatarText).toMatch(/^[\p{L}\p{N}]{1,2}$/u);
};

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static lastInstance: MockWebSocket | null = null;

  readonly CONNECTING = MockWebSocket.CONNECTING;
  readonly OPEN = MockWebSocket.OPEN;
  readonly CLOSING = MockWebSocket.CLOSING;
  readonly CLOSED = MockWebSocket.CLOSED;

  readonly url: string;
  readonly protocol = "";
  readonly extensions = "";
  binaryType: BinaryType = "blob";
  readyState = MockWebSocket.CONNECTING;
  bufferedAmount = 0;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  sentMessages: unknown[] = [];

  send = vi.fn((payload: unknown) => {
    this.sentMessages.push(payload);
  });

  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent("close"));
  });

  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn(() => true);

  constructor(url: string) {
    this.url = url;
    MockWebSocket.lastInstance = this;
  }

  open(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event("open"));
  }

  emitJson(payload: unknown): void {
    this.onmessage?.(new MessageEvent("message", { data: JSON.stringify(payload) }));
  }
}

class MockMediaRecorder {
  static lastInstance: MockMediaRecorder | null = null;
  static isTypeSupported = vi.fn(() => true);

  state: RecordingState = "inactive";
  stream: MediaStream;
  mimeType: string;
  videoBitsPerSecond = 0;
  audioBitsPerSecond = 0;
  onstart: ((event: Event) => void) | null = null;
  onstop: ((event: Event) => void) | null = null;
  onpause: ((event: Event) => void) | null = null;
  onresume: ((event: Event) => void) | null = null;
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  start = vi.fn(() => {
    this.state = "recording";
    this.onstart?.(new Event("start"));
  });

  stop = vi.fn(() => {
    this.state = "inactive";
    this.onstop?.(new Event("stop"));
  });

  pause = vi.fn(() => {
    this.state = "paused";
    this.onpause?.(new Event("pause"));
  });

  resume = vi.fn(() => {
    this.state = "recording";
    this.onresume?.(new Event("resume"));
  });

  requestData = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn(() => true);

  constructor(stream: MediaStream, options?: MediaRecorderOptions) {
    this.stream = stream;
    this.mimeType = options?.mimeType ?? "";
    MockMediaRecorder.lastInstance = this;
  }

  emitChunk(content = "audio-chunk"): void {
    const data = new Blob([content], { type: this.mimeType || "audio/webm" });
    this.ondataavailable?.({ data } as BlobEvent);
  }
}

const originalWebSocket = globalThis.WebSocket;
const originalMediaRecorder = globalThis.MediaRecorder;
const originalMediaDevices = navigator.mediaDevices;

const parseControlPayload = (payload: unknown): Record<string, unknown> => {
  if (typeof payload !== "string") {
    return {};
  }

  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const installTranscriptionMocks = () => {
  MockWebSocket.lastInstance = null;
  MockMediaRecorder.lastInstance = null;
  globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  globalThis.MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;

  const stopTrack = vi.fn();
  const getUserMedia = vi.fn().mockResolvedValue({
    getTracks: () => [{ stop: stopTrack }],
  } as unknown as MediaStream);

  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });

  return {
    getUserMedia,
    stopTrack,
  };
};

describe("ChatPanel", () => {
  const defaultProps = {
    hasStartedChat: true,
    draft: "",
    setDraft: () => {},
    messages: [],
    isTyping: false,
    selectedModel: { id: "gpt-5.3-codex", label: "GPT-5.3-Codex" },
    selectedModelId: "gpt-5.3-codex",
    modelProviders: [
      {
        id: "recent",
        label: "Recently used",
        models: [{ id: "gpt-5.3-codex", label: "GPT-5.3-Codex" }],
      },
    ],
    attachmentActions: [{ id: "files", label: "Attach files" }],
    onSendMessage: () => {},
    onAttachmentAction: () => {},
    onAttachmentUpload: () => {},
    onModelSelect: () => {},
    onServiceAdd: () => {},
    onServiceRemove: () => {},
    brainrotStyle: "meme67" as const,
    onBrainrotStyleChange: () => {},
    onLocalLlmConfigSave: () => {},
    onReturnToDashboard: () => {},
    onOpenProfile: () => {},
    copy: uiTextByLanguage.en.chat,
  };

  afterEach(() => {
    vi.clearAllMocks();
    globalThis.WebSocket = originalWebSocket;
    globalThis.MediaRecorder = originalMediaRecorder;

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: originalMediaDevices,
    });
  });

  it("renders merged chat toolbar with compact profile in chat mode", () => {
    render(
      <ChatPanel
        {...defaultProps}
        activeServices={[]}
      />,
    );

    expect(screen.getByTitle("Dashboard")).toBeInTheDocument();
    expectCompactProfileBadge();
  });

  it("shows minimal local setup fields when local configurator service is active", () => {
    render(
      <ChatPanel
        {...defaultProps}
        activeServices={["localConfigurator"]}
      />,
    );

    expect(screen.getAllByText(uiTextByLanguage.en.chat.localConfigTitle).length).toBeGreaterThan(0);
    expect(screen.getByText(uiTextByLanguage.en.chat.localSetupSteps[0])).toBeInTheDocument();
    expect(screen.queryByText(uiTextByLanguage.en.chat.localApiKey)).not.toBeInTheDocument();
  });

  it("shows audio button for empty draft and send button for non-empty draft", () => {
    const { rerender } = render(
      <ChatPanel
        {...defaultProps}
        activeServices={[]}
      />,
    );

    expect(screen.getByRole("button", { name: defaultProps.copy.audioTitle })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: defaultProps.copy.sendTitle })).not.toBeInTheDocument();

    rerender(
      <ChatPanel
        {...defaultProps}
        draft="Hello there"
        activeServices={[]}
      />,
    );

    expect(screen.getByRole("button", { name: defaultProps.copy.sendTitle })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: defaultProps.copy.audioTitle })).not.toBeInTheDocument();
  });

  it("records speech and forwards merged final and interim transcript", async () => {
    const setDraft = vi.fn();
    const { getUserMedia, stopTrack } = installTranscriptionMocks();

    render(
      <ChatPanel
        {...defaultProps}
        setDraft={setDraft}
        activeServices={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: defaultProps.copy.audioTitle }));

    await waitFor(() => {
      expect(MockWebSocket.lastInstance).not.toBeNull();
    });

    const socket = MockWebSocket.lastInstance;
    act(() => {
      socket?.open();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: defaultProps.copy.audioStopTitle })).toBeInTheDocument();
    });

    const startPayload = parseControlPayload(socket?.sentMessages[0]);
    expect(startPayload.type).toBe("start");
    expect(startPayload.language).toBe("en");

    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(stopTrack).not.toHaveBeenCalled();

    const recorder = MockMediaRecorder.lastInstance;
    expect(recorder).not.toBeNull();
    expect(recorder?.start).toHaveBeenCalledTimes(1);

    act(() => {
      recorder?.emitChunk("test");
    });

    await waitFor(() => {
      expect(socket?.send).toHaveBeenCalled();
      expect((socket?.send.mock.calls.length ?? 0) >= 2).toBe(true);
    });

    act(() => {
      socket?.emitJson({
        type: "transcript",
        text: "Hello",
        chunk_index: 0,
      });

      socket?.emitJson({
        type: "transcript",
        text: "world",
        chunk_index: 1,
      });
    });

    await waitFor(() => {
      expect(setDraft).toHaveBeenLastCalledWith("Hello world");
    });
  });

  it("stops recording on second click and clears listening feedback", async () => {
    const { stopTrack } = installTranscriptionMocks();

    render(
      <ChatPanel
        {...defaultProps}
        activeServices={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: defaultProps.copy.audioTitle }));

    await waitFor(() => {
      expect(MockWebSocket.lastInstance).not.toBeNull();
    });

    const socket = MockWebSocket.lastInstance;
    act(() => {
      socket?.open();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: defaultProps.copy.audioStopTitle })).toBeInTheDocument();
    });

    const recorder = MockMediaRecorder.lastInstance;
    expect(recorder).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: defaultProps.copy.audioStopTitle }));

    expect(recorder?.stop).toHaveBeenCalledTimes(1);

    act(() => {
      socket?.emitJson({ type: "stopped" });
    });

    await waitFor(() => {
      expect(socket?.close).toHaveBeenCalledTimes(1);
      expect(stopTrack).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByText(defaultProps.copy.speechListening)).not.toBeInTheDocument();
    });
  });

  it("shows unsupported message when speech api is unavailable", async () => {
    globalThis.MediaRecorder = undefined as unknown as typeof MediaRecorder;
    globalThis.WebSocket = undefined as unknown as typeof WebSocket;

    render(
      <ChatPanel
        {...defaultProps}
        activeServices={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: defaultProps.copy.audioTitle }));

    await waitFor(() => {
      expect(screen.getByText(defaultProps.copy.speechUnsupported)).toBeInTheDocument();
    });
  });

  it("shows backend unavailable message when websocket connection cannot be created", async () => {
    const { stopTrack } = installTranscriptionMocks();

    class FailingWebSocket {
      constructor() {
        throw new Error("offline");
      }
    }

    globalThis.WebSocket = FailingWebSocket as unknown as typeof WebSocket;

    render(
      <ChatPanel
        {...defaultProps}
        activeServices={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: defaultProps.copy.audioTitle }));

    await waitFor(() => {
      expect(screen.getByText(defaultProps.copy.speechBackendUnavailable)).toBeInTheDocument();
    });

    expect(stopTrack).toHaveBeenCalled();
  });

  it("keeps recording active when backend reports chunk processing failure", async () => {
    installTranscriptionMocks();

    render(
      <ChatPanel
        {...defaultProps}
        activeServices={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: defaultProps.copy.audioTitle }));

    await waitFor(() => {
      expect(MockWebSocket.lastInstance).not.toBeNull();
    });

    const socket = MockWebSocket.lastInstance;
    act(() => {
      socket?.open();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: defaultProps.copy.audioStopTitle })).toBeInTheDocument();
    });

    act(() => {
      socket?.emitJson({
        type: "chunk_error",
        message: "Chunk transcription failed",
        chunk_index: 0,
      });
    });

    expect(screen.getByRole("button", { name: defaultProps.copy.audioStopTitle })).toBeInTheDocument();
    expect(screen.queryByText("Chunk transcription failed")).not.toBeInTheDocument();

    expect(socket?.close).not.toHaveBeenCalled();
  });

  it("sends german language hint when locale is set to german", async () => {
    installTranscriptionMocks();

    render(
      <ChatPanel
        {...defaultProps}
        copy={uiTextByLanguage.de.chat}
        activeServices={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: uiTextByLanguage.de.chat.audioTitle }));

    await waitFor(() => {
      expect(MockWebSocket.lastInstance).not.toBeNull();
    });

    const socket = MockWebSocket.lastInstance;
    act(() => {
      socket?.open();
    });

    await waitFor(() => {
      expect((socket?.sentMessages.length ?? 0) > 0).toBe(true);
    });

    const startPayload = parseControlPayload(socket?.sentMessages[0]);
    expect(startPayload.type).toBe("start");
    expect(startPayload.language).toBe("de");
  });
});

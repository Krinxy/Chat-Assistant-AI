import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { uiTextByLanguage } from "../../../shared/i18n/uiText";
import { ChatPanel } from "./ChatPanel";

class MockSpeechRecognition {
  static lastInstance: MockSpeechRecognition | null = null;

  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;

  start = vi.fn();
  stop = vi.fn(() => {
    this.onend?.();
  });

  constructor() {
    MockSpeechRecognition.lastInstance = this;
  }
}

const speechApi = globalThis as typeof globalThis & {
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
};
const originalSpeechRecognition = speechApi.SpeechRecognition;
const originalWebkitSpeechRecognition = speechApi.webkitSpeechRecognition;
const originalMediaDevices = navigator.mediaDevices;

const installSpeechRecognitionMocks = () => {
  MockSpeechRecognition.lastInstance = null;
  speechApi.SpeechRecognition = MockSpeechRecognition;
  speechApi.webkitSpeechRecognition = undefined;

  const stopTrack = vi.fn();
  const getUserMedia = vi.fn().mockResolvedValue({
    getTracks: () => [{ stop: stopTrack }],
  });

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
    speechApi.SpeechRecognition = originalSpeechRecognition;
    speechApi.webkitSpeechRecognition = originalWebkitSpeechRecognition;

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
    expect(screen.getByText("DB")).toBeInTheDocument();
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
    const { getUserMedia, stopTrack } = installSpeechRecognitionMocks();

    render(
      <ChatPanel
        {...defaultProps}
        setDraft={setDraft}
        activeServices={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: defaultProps.copy.audioTitle }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: defaultProps.copy.audioStopTitle })).toBeInTheDocument();
    });

    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(stopTrack).toHaveBeenCalled();

    const recognition = MockSpeechRecognition.lastInstance;
    expect(recognition).not.toBeNull();
    expect(recognition?.continuous).toBe(true);
    expect(recognition?.interimResults).toBe(true);

    recognition?.onresult?.({
      resultIndex: 0,
      results: [
        {
          isFinal: true,
          length: 1,
          0: { transcript: "Hello" },
        },
        {
          isFinal: false,
          length: 1,
          0: { transcript: "world" },
        },
      ],
    });

    expect(setDraft).toHaveBeenCalledWith("Hello world");
  });

  it("stops recording on second click and clears listening feedback", async () => {
    installSpeechRecognitionMocks();

    render(
      <ChatPanel
        {...defaultProps}
        activeServices={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: defaultProps.copy.audioTitle }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: defaultProps.copy.audioStopTitle })).toBeInTheDocument();
    });

    const recognition = MockSpeechRecognition.lastInstance;
    expect(recognition).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: defaultProps.copy.audioStopTitle }));

    expect(recognition?.stop).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.queryByText(defaultProps.copy.speechListening)).not.toBeInTheDocument();
    });
  });

  it("shows unsupported message when speech api is unavailable", async () => {
    speechApi.SpeechRecognition = undefined;
    speechApi.webkitSpeechRecognition = undefined;

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
});

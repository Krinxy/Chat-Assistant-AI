import {
  type FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ChatSkeletonMessage } from "../../../shared/components/feedback/ChatSkeletonMessage";
import { useOutsideClick } from "../../../shared/hooks/useOutsideClick";
import type { UiText } from "../../../shared/i18n/uiText";
import type {
  AttachmentAction,
  BrainrotStyleKey,
  ChatServiceKey,
  ChatMessage,
  LocalLlmConfig,
  ModelOption,
  ModelProvider,
} from "../types/chat";

interface ChatPanelProps {
  hasStartedChat: boolean;
  draft: string;
  setDraft: (value: string) => void;
  messages: ChatMessage[];
  isTyping: boolean;
  selectedModel: ModelOption;
  selectedModelId: string;
  modelProviders: ModelProvider[];
  attachmentActions: AttachmentAction[];
  onSendMessage: (event: FormEvent<HTMLFormElement>) => void;
  onAttachmentAction: (actionId: string) => void;
  onModelSelect: (modelId: string) => void;
  activeServices: ChatServiceKey[];
  onServiceAdd: (serviceKey: ChatServiceKey) => void;
  onServiceRemove: (serviceKey: ChatServiceKey) => void;
  brainrotStyle: BrainrotStyleKey;
  onBrainrotStyleChange: (style: BrainrotStyleKey) => void;
  onLocalLlmConfigSave?: (config: LocalLlmConfig) => void;
  onReturnToDashboard: () => void;
  onOpenProfile: () => void;
  copy: UiText["chat"];
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike | undefined;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type GlobalSpeechApi = typeof globalThis & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export function ChatPanel({
  hasStartedChat,
  draft,
  setDraft,
  messages,
  isTyping,
  selectedModel,
  selectedModelId,
  modelProviders,
  attachmentActions,
  onSendMessage,
  onAttachmentAction,
  onModelSelect,
  activeServices,
  onServiceAdd,
  onServiceRemove,
  brainrotStyle,
  onBrainrotStyleChange,
  onLocalLlmConfigSave,
  onReturnToDashboard,
  onOpenProfile,
  copy,
}: ChatPanelProps) {
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState<boolean>(false);
  const [isServicesMenuOpen, setIsServicesMenuOpen] = useState<boolean>(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState<boolean>(false);
  const [activeModelProviderId, setActiveModelProviderId] = useState<string | null>(
    null,
  );
  const [modelSearch, setModelSearch] = useState<string>("");
  const [localLlmConfig, setLocalLlmConfig] = useState<LocalLlmConfig>({
    endpoint: "",
    modelName: "",
    apiKey: "",
  });
  const [isLocalConfigSaved, setIsLocalConfigSaved] = useState<boolean>(false);
  const [isRecordingSpeech, setIsRecordingSpeech] = useState<boolean>(false);
  const [speechStatusText, setSpeechStatusText] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatLogRef = useRef<HTMLDivElement | null>(null);
  const modelPickerRef = useRef<HTMLDivElement | null>(null);
  const servicesTriggerRef = useRef<HTMLDivElement | null>(null);
  const attachWrapperRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const latestDraftRef = useRef<string>(draft);
  const speechSessionInitialDraftRef = useRef<string>("");

  useEffect(() => {
    latestDraftRef.current = draft;
  }, [draft]);

  const closeTransientMenus = useCallback((): void => {
    setIsAttachMenuOpen(false);
    setIsServicesMenuOpen(false);
    setIsModelMenuOpen(false);
  }, []);

  const stopSpeechRecognition = useCallback((): void => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    recognition?.stop();
    setIsRecordingSpeech(false);
    setSpeechStatusText(null);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (speechStatusText === null || isRecordingSpeech) {
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      setSpeechStatusText(null);
    }, 2400);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [isRecordingSpeech, speechStatusText]);

  const handleSpeechResult = useCallback((event: SpeechRecognitionEventLike): void => {
    const finalSegments: string[] = [];
    const interimSegments: string[] = [];

    for (let index = 0; index < event.results.length; index += 1) {
      const result = event.results[index];
      const transcript = result[0]?.transcript?.trim() ?? "";

      if (transcript.length > 0) {
        if (result?.isFinal === true) {
          finalSegments.push(transcript);
        } else {
          interimSegments.push(transcript);
        }
      }
    }

    if (finalSegments.length === 0 && interimSegments.length === 0) {
      return;
    }

    const spokenText = [...finalSegments, ...interimSegments].join(" ").trim();

    if (spokenText.length === 0) {
      return;
    }

    const baseDraft = speechSessionInitialDraftRef.current;
    const nextDraft = baseDraft.length > 0 ? `${baseDraft} ${spokenText}` : spokenText;
    setDraft(nextDraft);
  }, [setDraft]);

  const handleAudioInput = useCallback(async (): Promise<void> => {
    if (isRecordingSpeech) {
      stopSpeechRecognition();
      return;
    }

    const speechApi = globalThis as GlobalSpeechApi;
    const RecognitionCtor = speechApi.SpeechRecognition ?? speechApi.webkitSpeechRecognition;

    if (RecognitionCtor === undefined) {
      setSpeechStatusText(copy.speechUnsupported);
      return;
    }

    try {
      if (navigator.mediaDevices?.getUserMedia !== undefined) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStream.getTracks().forEach((track) => {
          track.stop();
        });
      }
    } catch {
      setSpeechStatusText(copy.speechPermissionDenied);
      return;
    }

    const recognition = new RecognitionCtor();
    recognition.lang = copy.speechLocale;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = handleSpeechResult;
    recognition.onerror = (event) => {
      if (event.error === "aborted") {
        return;
      }

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setSpeechStatusText(copy.speechPermissionDenied);
      } else {
        setSpeechStatusText(copy.speechUnsupported);
      }

      recognitionRef.current = null;
      setIsRecordingSpeech(false);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsRecordingSpeech(false);
      setSpeechStatusText((previous) =>
        previous === copy.speechListening ? null : previous,
      );
    };

    speechSessionInitialDraftRef.current = latestDraftRef.current.trim();
    recognitionRef.current = recognition;
    setSpeechStatusText(copy.speechListening);
    setIsRecordingSpeech(true);

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsRecordingSpeech(false);
      setSpeechStatusText(copy.speechUnsupported);
    }
  }, [
    copy.speechListening,
    copy.speechLocale,
    copy.speechPermissionDenied,
    copy.speechUnsupported,
    handleSpeechResult,
    isRecordingSpeech,
    stopSpeechRecognition,
  ]);

  useOutsideClick(
    [modelPickerRef, servicesTriggerRef, attachWrapperRef],
    closeTransientMenus,
    {
      enabled: isAttachMenuOpen || isServicesMenuOpen || isModelMenuOpen,
    },
  );

  const serviceKeys = useMemo<ChatServiceKey[]>(() => {
    return Object.keys(copy.serviceLabels) as ChatServiceKey[];
  }, [copy.serviceLabels]);

  const brainrotStyleOptions = useMemo<Array<[BrainrotStyleKey, string]>>(() => {
    return Object.entries(copy.brainrotStyles) as Array<[BrainrotStyleKey, string]>;
  }, [copy.brainrotStyles]);

  const remainingServices = useMemo<ChatServiceKey[]>(() => {
    return serviceKeys.filter((serviceKey) => !activeServices.includes(serviceKey));
  }, [activeServices, serviceKeys]);

  const isLocalConfiguratorEnabled = activeServices.includes("localConfigurator");
  const isBrainrotEnabled = activeServices.includes("brainrot");
  const activeBrainrotStyleLabel = copy.brainrotStyles[brainrotStyle];

  const filteredProviders = useMemo<ModelProvider[]>(() => {
    const query = modelSearch.trim().toLowerCase();

    if (query.length === 0) {
      return modelProviders;
    }

    return modelProviders
      .map((provider) => {
        const matchingModels = provider.models.filter((model) =>
          model.label.toLowerCase().includes(query),
        );

        return {
          ...provider,
          models: matchingModels,
        };
      })
      .filter((provider) => provider.models.length > 0);
  }, [modelProviders, modelSearch]);

  const activeProvider =
    filteredProviders.find((provider) => provider.id === activeModelProviderId) ??
    filteredProviders[0] ??
    null;

  const hasStreamingMessage = useMemo(() => {
    return messages.some((message) => message.isStreaming);
  }, [messages]);

  useLayoutEffect(() => {
    if (!hasStartedChat) {
      return;
    }

    const chatLogElement = chatLogRef.current;

    if (chatLogElement === null) {
      return;
    }

    chatLogElement.scrollTop = chatLogElement.scrollHeight;
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [hasStartedChat, isTyping, messages]);

  useEffect(() => {
    if (activeProvider === null) {
      if (activeModelProviderId !== null) {
        setActiveModelProviderId(null);
      }
      return;
    }

    if (activeModelProviderId === null) {
      setActiveModelProviderId(activeProvider.id);
    }
  }, [activeModelProviderId, activeProvider]);

  const handleSelectService = (serviceKey: ChatServiceKey): void => {
    if (activeServices.includes(serviceKey)) {
      return;
    }

    onServiceAdd(serviceKey);
    const next = [...activeServices, serviceKey];
    const hasMore = serviceKeys.some((key) => !next.includes(key));
    setIsServicesMenuOpen(hasMore);
  };

  const handleRemoveService = (serviceKey: ChatServiceKey): void => {
    onServiceRemove(serviceKey);
  };

  const handleLocalConfigSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (localLlmConfig.endpoint.trim().length === 0 || localLlmConfig.modelName.trim().length === 0) {
      setIsLocalConfigSaved(false);
      return;
    }

    onLocalLlmConfigSave?.(localLlmConfig);
    setIsLocalConfigSaved(true);
  };

  const inputPlaceholder = isRecordingSpeech
    ? copy.speechListening
    : copy.inputPlaceholder;
  const speechFeedbackText = isRecordingSpeech ? copy.speechListening : speechStatusText;
  const shouldShowAudioButton = isRecordingSpeech || draft.trim().length === 0;

  return (
    <section className="chat-panel" aria-label="LLM chat window">
      <div className="chat-top-bar-container">
        <div className="chat-top-bar-main">
          {hasStartedChat ? (
            <button
              className="return-home-btn"
              onClick={onReturnToDashboard}
              title={copy.returnDashboard}
              aria-label={copy.returnDashboard}
              type="button"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
          ) : null}

          <div className="chat-model-bar-inline" aria-label="Model settings">
          <div className="model-picker" ref={modelPickerRef}>
            <button
              type="button"
              className="model-picker-btn"
              onClick={() => {
                setIsModelMenuOpen((previous) => !previous);
                setIsAttachMenuOpen(false);
                setIsServicesMenuOpen(false);
              }}
              aria-expanded={isModelMenuOpen}
            >
              <span className="model-name">{selectedModel.label}</span>
              <span className="model-chevron">{isModelMenuOpen ? "▴" : "▾"}</span>
            </button>

            {isModelMenuOpen ? (
              <div
                className="model-picker-popover popup-menu"
                onPointerLeave={() => setActiveModelProviderId(null)}
              >
                <div className="popup-menu-header">
                  <input
                    type="text"
                    placeholder={copy.modelSearchPlaceholder}
                    className="popup-search-input"
                    value={modelSearch}
                    onChange={(event) => setModelSearch(event.target.value)}
                  />
                </div>

                <div className="model-picker-grid">
                  <ul className="popup-menu-list">
                    {filteredProviders.map((provider) => (
                      <li
                        key={provider.id}
                        className={`popup-menu-item has-submenu${
                          activeProvider?.id === provider.id ? " is-active" : ""
                        }`}
                        onPointerEnter={() => setActiveModelProviderId(provider.id)}
                      >
                        <div className="popup-menu-item-content">
                          <span>{provider.label}</span>
                        </div>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </li>
                    ))}
                  </ul>

                  <div className="popup-submenu">
                    {activeProvider === null ? (
                      <p className="popup-empty">{copy.noModelMatch}</p>
                    ) : (
                      <ul className="popup-menu-list">
                        {activeProvider.models.map((model) => (
                          <li key={model.id} className="popup-menu-item model-choice-item">
                            <button
                              type="button"
                              onClick={() => {
                                onModelSelect(model.id);
                                setActiveModelProviderId(null);
                                setIsModelMenuOpen(false);
                              }}
                              className={`model-choice-btn${
                                selectedModelId === model.id ? " is-selected" : ""
                              }`}
                            >
                              <span className="model-choice-indicator">
                                {selectedModelId === model.id ? (
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                ) : null}
                              </span>
                              <span>{model.label}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {activeServices.length > 0 ? (
            <div className="services-bubble-row">
              {activeServices.map((serviceKey) => (
                <button
                  key={serviceKey}
                  type="button"
                  className="service-bubble-chip"
                  title={copy.removeService}
                  onClick={() => handleRemoveService(serviceKey)}
                >
                  <span>{copy.serviceLabels[serviceKey]}</span>
                  <span aria-hidden="true">x</span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="chat-services-trigger" ref={servicesTriggerRef}>
            <button
              className="services-plus-btn"
              title={copy.servicesTitle}
              type="button"
              onClick={() => {
                if (remainingServices.length === 0) {
                  return;
                }

                setIsServicesMenuOpen((previous) => !previous);
                setIsModelMenuOpen(false);
                setIsAttachMenuOpen(false);
              }}
              disabled={remainingServices.length === 0}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            {isServicesMenuOpen ? (
              <ul className="attach-menu-popover services-menu-popover">
                {remainingServices.map((serviceKey) => (
                  <li key={serviceKey}>
                    <button type="button" onClick={() => handleSelectService(serviceKey)}>
                      {copy.serviceLabels[serviceKey]}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {isBrainrotEnabled ? (
            <label className="brainrot-style-wrap">
              <span>{copy.brainrotStyleLabel}</span>
              <select
                value={brainrotStyle}
                onChange={(event) => {
                  onBrainrotStyleChange(event.target.value as BrainrotStyleKey);
                }}
              >
                {brainrotStyleOptions.map(([styleKey, styleLabel]) => (
                  <option key={styleKey} value={styleKey}>{styleLabel}</option>
                ))}
              </select>
            </label>
          ) : null}

          {isLocalConfiguratorEnabled ? (
            <div className="local-llm-hover-wrap">
              <button type="button" className="local-llm-hover-btn">
                {copy.localConfigTitle}
              </button>

              <section className="local-llm-hover-popover" aria-label={copy.localConfigTitle}>
                <div className="local-llm-config-panel">
                  <div className="local-llm-config-header">
                    <h3>{copy.localConfigTitle}</h3>
                    <p>{copy.localConfigHint}</p>
                    <ol className="local-llm-steps">
                      {copy.localSetupSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  <form className="local-llm-config-form" onSubmit={handleLocalConfigSubmit}>
                    <label className="local-llm-field">
                      <span>{copy.localEndpoint}</span>
                      <input
                        type="url"
                        required
                        value={localLlmConfig.endpoint}
                        placeholder="http://localhost:8000/v1"
                        onChange={(event) => {
                          setIsLocalConfigSaved(false);
                          setLocalLlmConfig((previous) => ({
                            ...previous,
                            endpoint: event.target.value,
                          }));
                        }}
                      />
                    </label>

                    <label className="local-llm-field">
                      <span>{copy.localModelName}</span>
                      <input
                        type="text"
                        required
                        value={localLlmConfig.modelName}
                        placeholder="meta-llama/Llama-3.3-70B-Instruct"
                        onChange={(event) => {
                          setIsLocalConfigSaved(false);
                          setLocalLlmConfig((previous) => ({
                            ...previous,
                            modelName: event.target.value,
                          }));
                        }}
                      />
                    </label>

                    <div className="local-llm-actions">
                      <button type="submit" className="local-llm-save-btn">
                        {copy.localSave}
                      </button>
                      {isLocalConfigSaved ? <p>{copy.localSaved}</p> : null}
                    </div>
                  </form>
                </div>
              </section>
            </div>
          ) : null}
          </div>
        </div>

        {hasStartedChat ? (
          <button
            type="button"
            className="profile-chip profile-chip-btn is-compact chat-top-profile"
            aria-label="Open profile"
            onClick={onOpenProfile}
          >
            <div className="profile-avatar" aria-hidden="true" title="Dominic Bechtold">
              DB
            </div>
          </button>
        ) : null}
      </div>

      <div className="chat-log" ref={chatLogRef}>
        {isBrainrotEnabled ? (
          <p className="brainrot-mode-banner">
            {copy.serviceLabels.brainrot} {copy.brainrotStyleActivePrefix}: {activeBrainrotStyleLabel}
          </p>
        ) : null}

        {!hasStartedChat && messages.length === 0 ? (
          <div className="chat-empty-state">
            <h2>{copy.emptyState}</h2>
          </div>
        ) : null}

        {messages.map((message) => {
          if (message.isThinking) {
            return <ChatSkeletonMessage key={message.id} />;
          }

          return (
            <article className={`chat-message bubble ${message.role}`} key={message.id}>
              {message.text ? (
                <p className={message.isStreaming ? "streaming-text" : undefined}>
                  {message.text}
                  {message.isStreaming ? <span className="stream-cursor" aria-hidden="true" /> : null}
                </p>
              ) : null}
              <span>{message.time}</span>
            </article>
          );
        })}

        {isTyping || hasStreamingMessage ? (
          <p className="stream-status">{copy.streamStatus}</p>
        ) : null}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <div className="chat-compose-wrap">
          <form
            className="chat-form unified-input"
            onSubmit={(event) => {
              onSendMessage(event);
              closeTransientMenus();
            }}
          >
            <div className="attach-wrapper" ref={attachWrapperRef}>
              <button
                type="button"
                className="attach-trigger"
                onClick={() => {
                  setIsAttachMenuOpen((previous) => !previous);
                  setIsModelMenuOpen(false);
                  setIsServicesMenuOpen(false);
                }}
                aria-expanded={isAttachMenuOpen}
                aria-controls="chat-attach-menu"
                title={copy.attachTitle}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path
                    d={[
                      "M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49",
                      "l9.19-9.19a4 4 0 0 1 5.66 5.66",
                      "l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48",
                    ].join(" ")}
                  />
                </svg>
              </button>

              {isAttachMenuOpen ? (
                <ul className="attach-menu-popover" id="chat-attach-menu">
                  {attachmentActions.map((action) => (
                    <li key={action.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onAttachmentAction(action.id);
                          setIsAttachMenuOpen(false);
                        }}
                      >
                        {action.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={inputPlaceholder}
              aria-label={inputPlaceholder}
            />

            <div className="input-separator" />

            {shouldShowAudioButton ? (
              <button
                type="button"
                className={`audio-btn${isRecordingSpeech ? " is-recording" : ""}`}
                title={isRecordingSpeech ? copy.audioStopTitle : copy.audioTitle}
                aria-label={isRecordingSpeech ? copy.audioStopTitle : copy.audioTitle}
                aria-pressed={isRecordingSpeech}
                onClick={() => {
                  void handleAudioInput();
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>
            ) : (
              <button type="submit" className="send-btn" title={copy.sendTitle}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            )}
          </form>
        </div>

        {speechFeedbackText !== null ? (
          <p
            className={`speech-status${isRecordingSpeech ? " is-listening" : ""}`}
            aria-live="polite"
          >
            {speechFeedbackText}
          </p>
        ) : null}

        <p className="chat-disclaimer">{copy.disclaimer}</p>
      </div>
    </section>
  );
}

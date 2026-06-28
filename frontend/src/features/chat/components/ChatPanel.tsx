import {
  type ChangeEvent,
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
import { ACTIVE_DEV_PROFILE } from "../../../shared/constants/devProfiles";
import type {
  AttachmentAction,
  BrainrotStyleKey,
  ChatServiceKey,
  ChatMessage,
  LocalLlmConfig,
  ModelOption,
  ModelProvider,
  PersonaQuestionnaireAnswers,
} from "../types/chat";
import { useLiveTranscription } from "../hooks/useLiveTranscription";
import { BrainrotPicker } from "./BrainrotPicker";
import { LocalLlmConfigPanel } from "./LocalLlmConfigPanel";
import { ModelPickerPopover } from "./ModelPickerPopover";
import { PersonaWizard } from "./PersonaWizard";

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
  onAttachmentUpload: (files: File[]) => void;
  onModelSelect: (modelId: string) => void;
  activeServices: ChatServiceKey[];
  onServiceAdd: (serviceKey: ChatServiceKey) => void;
  onServiceRemove: (serviceKey: ChatServiceKey) => void;
  brainrotStyle: BrainrotStyleKey;
  onBrainrotStyleChange: (style: BrainrotStyleKey) => void;
  onLocalLlmConfigSave?: (config: LocalLlmConfig) => void;
  onPersonaProfileReady?: (answers: PersonaQuestionnaireAnswers) => void;
  onReturnToDashboard: () => void;
  onOpenProfile: () => void;
  copy: UiText["chat"];
  authToken?: string;
}

type PersonaFieldKey = keyof PersonaQuestionnaireAnswers;

const emptyPersonaAnswers: PersonaQuestionnaireAnswers = {
  projectType: "",
  functionType: "",
  responseStructure: "",
  analysisGoal: "",
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
  onAttachmentUpload,
  onModelSelect,
  activeServices,
  onServiceAdd,
  onServiceRemove,
  brainrotStyle,
  onBrainrotStyleChange,
  onLocalLlmConfigSave,
  onPersonaProfileReady,
  onReturnToDashboard,
  onOpenProfile,
  copy,
  authToken,
}: ChatPanelProps) {
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState<boolean>(false);
  const [isServicesMenuOpen, setIsServicesMenuOpen] = useState<boolean>(false);
  const [servicesMenuAlign, setServicesMenuAlign] = useState<"left" | "right">("left");
  const [isModelMenuOpen, setIsModelMenuOpen] = useState<boolean>(false);
  const [isBrainrotMenuOpen, setIsBrainrotMenuOpen] = useState<boolean>(false);
  const [activeModelProviderId, setActiveModelProviderId] = useState<string | null>(null);
  const [modelSearch, setModelSearch] = useState<string>("");
  const [localLlmConfig, setLocalLlmConfig] = useState<LocalLlmConfig>({
    endpoint: "",
    modelName: "",
    apiKey: "",
  });
  const [isLocalConfigSaved, setIsLocalConfigSaved] = useState<boolean>(false);
  const [isPersonaWizardOpen, setIsPersonaWizardOpen] = useState<boolean>(false);
  const [personaStepIndex, setPersonaStepIndex] = useState<number>(0);
  const [personaAnswers, setPersonaAnswers] = useState<PersonaQuestionnaireAnswers>(
    emptyPersonaAnswers,
  );
  const [hasCompletedPersonaWizard, setHasCompletedPersonaWizard] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatLogRef = useRef<HTMLDivElement | null>(null);
  const modelPickerRef = useRef<HTMLDivElement | null>(null);
  const servicesTriggerRef = useRef<HTMLDivElement | null>(null);
  const attachWrapperRef = useRef<HTMLDivElement | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement | null>(null);
  const brainrotPickerRef = useRef<HTMLDivElement | null>(null);

  const {
    isRecordingSpeech,
    inputPlaceholder,
    speechFeedbackText,
    shouldShowAudioButton,
    handleAudioInput,
  } = useLiveTranscription({ draft, setDraft, authToken, copy });

  const closeTransientMenus = useCallback((): void => {
    setIsAttachMenuOpen(false);
    setIsServicesMenuOpen(false);
    setIsModelMenuOpen(false);
    setIsBrainrotMenuOpen(false);
  }, []);

  const handleChatFileUpload = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    onAttachmentUpload(files);

    event.target.value = "";
  }, [onAttachmentUpload]);

  useOutsideClick(
    [modelPickerRef, servicesTriggerRef, attachWrapperRef, brainrotPickerRef],
    closeTransientMenus,
    {
      enabled:
        isAttachMenuOpen ||
        isServicesMenuOpen ||
        isModelMenuOpen ||
        isBrainrotMenuOpen,
    },
  );

  const serviceKeys = useMemo<ChatServiceKey[]>(() => {
    return (Object.keys(copy.serviceLabels) as ChatServiceKey[]).filter(
      (serviceKey) => serviceKey !== "promptGuard",
    );
  }, [copy.serviceLabels]);

  const getServiceTooltip = useCallback(
    (serviceKey: ChatServiceKey): string => {
      const configuredTooltip = copy.serviceTooltips[serviceKey];
      if (typeof configuredTooltip === "string" && configuredTooltip.trim().length > 0) {
        return configuredTooltip;
      }

      return copy.serviceLabels[serviceKey];
    },
    [copy.serviceLabels, copy.serviceTooltips],
  );

  const brainrotStyles = useMemo<Array<{ key: BrainrotStyleKey; label: string }>>(() => {
    return (Object.entries(copy.brainrotStyles) as Array<[BrainrotStyleKey, string]>).map(
      ([styleKey, styleLabel]) => ({
        key: styleKey,
        label: styleLabel,
      }),
    );
  }, [copy.brainrotStyles]);

  const personaQuestions = useMemo<Array<{ key: PersonaFieldKey; question: string }>>(() => {
    return [
      { key: "projectType", question: copy.personaProjectQuestion },
      { key: "functionType", question: copy.personaFunctionQuestion },
      { key: "responseStructure", question: copy.personaStructureQuestion },
      { key: "analysisGoal", question: copy.personaGoalQuestion },
    ];
  }, [
    copy.personaFunctionQuestion,
    copy.personaGoalQuestion,
    copy.personaProjectQuestion,
    copy.personaStructureQuestion,
  ]);

  const remainingServices = useMemo<ChatServiceKey[]>(() => {
    return serviceKeys.filter((serviceKey) => !activeServices.includes(serviceKey));
  }, [activeServices, serviceKeys]);

  const isLocalConfiguratorEnabled = activeServices.includes("localConfigurator");
  const isBrainrotEnabled = activeServices.includes("brainrot");
  const currentPersonaQuestion = personaQuestions[personaStepIndex] ?? null;
  const currentPersonaValue =
    currentPersonaQuestion === null ? "" : personaAnswers[currentPersonaQuestion.key];
  const isCurrentPersonaAnswerValid = currentPersonaValue.trim().length > 0;

  const updatePersonaAnswer = useCallback((value: string): void => {
    if (currentPersonaQuestion === null) {
      return;
    }

    setPersonaAnswers((previous) => ({
      ...previous,
      [currentPersonaQuestion.key]: value,
    }));
  }, [currentPersonaQuestion]);

  const closePersonaWizard = useCallback((): void => {
    setIsPersonaWizardOpen(false);
  }, []);

  const handlePersonaStepBack = useCallback((): void => {
    if (personaStepIndex === 0) {
      closePersonaWizard();
      return;
    }
    setPersonaStepIndex((previous) => previous - 1);
  }, [closePersonaWizard, personaStepIndex]);

  const submitPersonaWizardStep = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();

      if (currentPersonaQuestion === null || !isCurrentPersonaAnswerValid) {
        return;
      }

      if (personaStepIndex < personaQuestions.length - 1) {
        setPersonaStepIndex((previous) => previous + 1);
        return;
      }

      const normalizedAnswers: PersonaQuestionnaireAnswers = {
        projectType: personaAnswers.projectType.trim(),
        functionType: personaAnswers.functionType.trim(),
        responseStructure: personaAnswers.responseStructure.trim(),
        analysisGoal: personaAnswers.analysisGoal.trim(),
      };

      setPersonaAnswers(normalizedAnswers);
      setHasCompletedPersonaWizard(true);
      setIsPersonaWizardOpen(false);
      onPersonaProfileReady?.(normalizedAnswers);
    },
    [
      currentPersonaQuestion,
      isCurrentPersonaAnswerValid,
      onPersonaProfileReady,
      personaAnswers,
      personaQuestions.length,
      personaStepIndex,
    ],
  );

  useEffect(() => {
    if (!isBrainrotEnabled) {
      setIsBrainrotMenuOpen(false);
    }
  }, [isBrainrotEnabled]);

  useEffect(() => {
    if (!activeServices.includes("persona")) {
      setIsPersonaWizardOpen(false);
    }
  }, [activeServices]);

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
    const chatLogElement = chatLogRef.current;

    if (chatLogElement === null || messages.length === 0) {
      return;
    }

    const lastMessage = messages[messages.length - 1];
    const isUserMessage = lastMessage?.role === "user";

    const { scrollTop, scrollHeight, clientHeight } = chatLogElement;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    const isNearBottom = distanceFromBottom < 120;

    if (isUserMessage || isNearBottom) {
      chatLogElement.scrollTop = chatLogElement.scrollHeight;
    }
  }, [isTyping, messages]);

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

    if (serviceKey === "persona" && !hasCompletedPersonaWizard) {
      setIsPersonaWizardOpen(true);
      setPersonaStepIndex(0);
    }

    const next = [...activeServices, serviceKey];
    const hasMore = serviceKeys.some((key) => !next.includes(key));
    setIsServicesMenuOpen(hasMore);
  };

  const handleRemoveService = (serviceKey: ChatServiceKey): void => {
    onServiceRemove(serviceKey);

    if (serviceKey === "persona") {
      setIsPersonaWizardOpen(false);
      setPersonaStepIndex(0);
      setHasCompletedPersonaWizard(false);
      setPersonaAnswers(emptyPersonaAnswers);
    }
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

  const audioButtonClass = `audio-btn${isRecordingSpeech ? " is-recording" : ""}`;
  const audioButtonLabel = isRecordingSpeech ? copy.audioStopTitle : copy.audioTitle;
  const speechStatusClass = `speech-status${isRecordingSpeech ? " is-listening" : ""}`;

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
                setIsBrainrotMenuOpen(false);
              }}
              aria-expanded={isModelMenuOpen}
            >
              <span className="model-name">{selectedModel.label}</span>
              <span className="model-chevron">{isModelMenuOpen ? "▴" : "▾"}</span>
            </button>

            <ModelPickerPopover
              isOpen={isModelMenuOpen}
              filteredProviders={filteredProviders}
              activeProvider={activeProvider}
              selectedModelId={selectedModelId}
              selectedModel={selectedModel}
              modelSearch={modelSearch}
              onModelSearch={setModelSearch}
              onModelSelect={onModelSelect}
              onProviderHover={setActiveModelProviderId}
              onProviderSelect={setActiveModelProviderId}
              onClose={() => setIsModelMenuOpen(false)}
              copy={copy}
            />
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

                if (servicesTriggerRef.current) {
                  const rect = servicesTriggerRef.current.getBoundingClientRect();
                  setServicesMenuAlign(
                    rect.left > window.innerWidth * 0.5 ? "right" : "left",
                  );
                }
                setIsServicesMenuOpen((previous) => !previous);
                setIsModelMenuOpen(false);
                setIsAttachMenuOpen(false);
                setIsBrainrotMenuOpen(false);
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
              <ul className={`attach-menu-popover services-menu-popover services-menu-popover--${servicesMenuAlign}`}>
                {remainingServices.map((serviceKey) => {
                  const serviceTooltip = getServiceTooltip(serviceKey);

                  return (
                    <li key={serviceKey}>
                      <button
                        type="button"
                        title={serviceTooltip}
                        aria-label={`${copy.serviceLabels[serviceKey]}: ${serviceTooltip}`}
                        onClick={() => handleSelectService(serviceKey)}
                      >
                        <span className="service-menu-item-label">{copy.serviceLabels[serviceKey]}</span>
                        <small className="service-menu-item-tooltip">{serviceTooltip}</small>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>

          <BrainrotPicker
            containerRef={brainrotPickerRef}
            isEnabled={isBrainrotEnabled}
            isOpen={isBrainrotMenuOpen}
            brainrotStyle={brainrotStyle}
            brainrotStyles={brainrotStyles}
            onBrainrotStyleChange={onBrainrotStyleChange}
            onToggle={() => {
              setIsBrainrotMenuOpen((previous) => !previous);
              setIsAttachMenuOpen(false);
              setIsServicesMenuOpen(false);
              setIsModelMenuOpen(false);
            }}
            onClose={() => setIsBrainrotMenuOpen(false)}
            copy={copy}
          />

          <LocalLlmConfigPanel
            isEnabled={isLocalConfiguratorEnabled}
            localLlmConfig={localLlmConfig}
            isLocalConfigSaved={isLocalConfigSaved}
            onEndpointChange={(value) => {
              setIsLocalConfigSaved(false);
              setLocalLlmConfig((previous) => ({ ...previous, endpoint: value }));
            }}
            onModelNameChange={(value) => {
              setIsLocalConfigSaved(false);
              setLocalLlmConfig((previous) => ({ ...previous, modelName: value }));
            }}
            onSubmit={handleLocalConfigSubmit}
            copy={copy}
          />
          </div>
        </div>

        {hasStartedChat ? (
          <button
            type="button"
            className="profile-chip profile-chip-btn is-compact chat-top-profile"
            aria-label="Open profile"
            onClick={onOpenProfile}
          >
            <div className="profile-avatar" aria-hidden="true" title={ACTIVE_DEV_PROFILE.fullName}>
              {ACTIVE_DEV_PROFILE.initials}
            </div>
          </button>
        ) : null}
      </div>

      <PersonaWizard
        isOpen={isPersonaWizardOpen}
        currentQuestion={currentPersonaQuestion}
        currentValue={currentPersonaValue}
        isAnswerValid={isCurrentPersonaAnswerValid}
        stepIndex={personaStepIndex}
        totalSteps={personaQuestions.length}
        onClose={closePersonaWizard}
        onUpdateAnswer={updatePersonaAnswer}
        onStepBack={handlePersonaStepBack}
        onStepSubmit={submitPersonaWizardStep}
        copy={copy}
      />

      <div className="chat-log" ref={chatLogRef}>
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
              {message.attachments !== undefined && message.attachments.length > 0 ? (
                <div className="chat-message-attachments">
                  {message.attachments.map((attachment) => {
                    if (attachment.isImage && attachment.previewUrl !== undefined) {
                      return (
                        <figure className="chat-image-attachment" key={attachment.id}>
                          <img src={attachment.previewUrl} alt={attachment.name} loading="lazy" />
                          <figcaption>{attachment.name}</figcaption>
                        </figure>
                      );
                    }

                    return (
                      <div className="chat-file-attachment" key={attachment.id}>
                        <span>{attachment.name}</span>
                      </div>
                    );
                  })}
                </div>
              ) : null}

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

        <div className="chat-log-end-marker" ref={messagesEndRef} />
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
                  setIsBrainrotMenuOpen(false);
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
                          if (action.id === "files") {
                            chatFileInputRef.current?.click();
                          } else {
                            onAttachmentAction(action.id);
                          }

                          setIsAttachMenuOpen(false);
                        }}
                      >
                        {action.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <input
                ref={chatFileInputRef}
                className="chat-file-input"
                type="file"
                multiple
                aria-label={copy.attachTitle}
                onChange={handleChatFileUpload}
              />
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
                className={audioButtonClass}
                title={audioButtonLabel}
                aria-label={audioButtonLabel}
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

          {speechFeedbackText !== null ? (
            <p className={speechStatusClass} aria-live="polite">
              {speechFeedbackText}
            </p>
          ) : null}
        </div>

        <p className="chat-disclaimer">{copy.disclaimer}</p>
      </div>
    </section>
  );
}

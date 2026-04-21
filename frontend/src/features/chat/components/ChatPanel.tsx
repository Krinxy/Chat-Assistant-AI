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
}

type PersonaFieldKey = keyof PersonaQuestionnaireAnswers;

interface TranscriptionControlMessage {
  type: "start" | "stop";
  language?: string;
  mime_type?: string;
}

interface TranscriptionStoppedMessage {
  type: "stopped";
}

interface TranscriptionTranscriptMessage {
  type: "transcript";
  text: string;
  chunk_index?: number;
}

interface TranscriptionErrorMessage {
  type: "error";
  message: string;
}

interface TranscriptionChunkErrorMessage {
  type: "chunk_error";
  message: string;
  chunk_index?: number;
}

type TranscriptionServerMessage =
  | TranscriptionTranscriptMessage
  | TranscriptionErrorMessage
  | TranscriptionChunkErrorMessage
  | TranscriptionStoppedMessage
  | { type: "ready" | "started" };

const SPEECH_MONITOR_POLL_MS = 180;
const SPEECH_ACTIVITY_RMS_THRESHOLD = 0.02;
const SPEECH_MIN_SEGMENT_MS = 2400;
const SPEECH_SILENCE_FLUSH_MS = 2200;
const SPEECH_MAX_SEGMENT_MS = 18000;
const TRANSCRIPT_ANIMATION_STEP_MS = 58;

const normalizeSpeechLanguage = (speechLocale: string): "de" | "en" => {
  const [languageCode] = speechLocale.split("-");
  const normalized = languageCode?.trim().toLowerCase() ?? "";

  if (normalized === "de") {
    return "de";
  }

  return "en";
};

const resolveTranscriptionWsUrl = (): string => {
  const configuredUrl = import.meta.env.VITE_TRANSCRIPTION_WS_URL?.trim();

  if (configuredUrl !== undefined && configuredUrl.length > 0) {
    if (configuredUrl.startsWith("https://")) {
      return `wss://${configuredUrl.slice("https://".length)}`;
    }

    if (configuredUrl.startsWith("http://")) {
      return `ws://${configuredUrl.slice("http://".length)}`;
    }

    return configuredUrl;
  }

  const protocol = globalThis.location?.protocol === "https:" ? "wss" : "ws";
  const host = globalThis.location?.hostname ?? "localhost";
  return `${protocol}://${host}:8000/ws/transcribe`;
};

const getSupportedAudioMimeType = (): string | undefined => {
  if (typeof MediaRecorder.isTypeSupported !== "function") {
    return "audio/webm;codecs=opus";
  }

  const preferredMimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return preferredMimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
};

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
}: ChatPanelProps) {
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState<boolean>(false);
  const [isServicesMenuOpen, setIsServicesMenuOpen] = useState<boolean>(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState<boolean>(false);
  const [isBrainrotMenuOpen, setIsBrainrotMenuOpen] = useState<boolean>(false);
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
  const [isPersonaWizardOpen, setIsPersonaWizardOpen] = useState<boolean>(false);
  const [personaStepIndex, setPersonaStepIndex] = useState<number>(0);
  const [personaAnswers, setPersonaAnswers] = useState<PersonaQuestionnaireAnswers>(
    emptyPersonaAnswers,
  );
  const [hasCompletedPersonaWizard, setHasCompletedPersonaWizard] = useState<boolean>(false);
  const [isRecordingSpeech, setIsRecordingSpeech] = useState<boolean>(false);
  const [speechStatusText, setSpeechStatusText] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatLogRef = useRef<HTMLDivElement | null>(null);
  const modelPickerRef = useRef<HTMLDivElement | null>(null);
  const servicesTriggerRef = useRef<HTMLDivElement | null>(null);
  const attachWrapperRef = useRef<HTMLDivElement | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement | null>(null);
  const brainrotPickerRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const transcriptionSocketRef = useRef<WebSocket | null>(null);
  const speechChunkTextsRef = useRef<string[]>([]);
  const latestChunkIndexRef = useRef<number>(-1);
  const transcriptQueueRef = useRef<string[]>([]);
  const transcriptAnimationTimerRef = useRef<ReturnType<typeof globalThis.setInterval> | null>(
    null,
  );
  const speechMonitorTimerRef = useRef<ReturnType<typeof globalThis.setInterval> | null>(
    null,
  );
  const speechAudioContextRef = useRef<AudioContext | null>(null);
  const speechAnalyserRef = useRef<AnalyserNode | null>(null);
  const speechSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const segmentStartedAtRef = useRef<number>(0);
  const lastVoiceActivityAtRef = useRef<number>(0);
  const isStoppingRecordingRef = useRef<boolean>(false);
  const chunkUploadQueueRef = useRef<Promise<void>>(Promise.resolve());
  const latestDraftRef = useRef<string>(draft);
  const speechSessionInitialDraftRef = useRef<string>("");

  useEffect(() => {
    latestDraftRef.current = draft;
  }, [draft]);

  const closeTransientMenus = useCallback((): void => {
    setIsAttachMenuOpen(false);
    setIsServicesMenuOpen(false);
    setIsModelMenuOpen(false);
    setIsBrainrotMenuOpen(false);
  }, []);

  const clearSpeechChunkMonitor = useCallback((): void => {
    if (speechMonitorTimerRef.current !== null) {
      globalThis.clearInterval(speechMonitorTimerRef.current);
      speechMonitorTimerRef.current = null;
    }

    speechSourceNodeRef.current?.disconnect();
    speechSourceNodeRef.current = null;

    speechAnalyserRef.current?.disconnect();
    speechAnalyserRef.current = null;

    const audioContext = speechAudioContextRef.current;
    speechAudioContextRef.current = null;
    if (audioContext !== null && audioContext.state !== "closed") {
      void audioContext.close().catch(() => undefined);
    }
  }, []);

  const clearTranscriptAnimation = useCallback((): void => {
    if (transcriptAnimationTimerRef.current !== null) {
      globalThis.clearInterval(transcriptAnimationTimerRef.current);
      transcriptAnimationTimerRef.current = null;
    }

    transcriptQueueRef.current = [];
  }, []);

  const writeDraftFromSpokenText = useCallback(
    (spokenText: string): void => {
      const normalizedSpokenText = spokenText.trim();
      const baseDraft = speechSessionInitialDraftRef.current;
      const nextDraft =
        baseDraft.length > 0
          ? `${baseDraft} ${normalizedSpokenText}`.trim()
          : normalizedSpokenText;
      setDraft(nextDraft);
    },
    [setDraft],
  );

  const drainTranscriptQueue = useCallback((): void => {
    const run = (): void => {
      if (transcriptAnimationTimerRef.current !== null) {
        return;
      }

      const nextTranscript = transcriptQueueRef.current.shift();
      if (nextTranscript === undefined) {
        return;
      }

      const words = nextTranscript
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length > 0);

      if (words.length === 0) {
        run();
        return;
      }

      const spokenPrefix = speechChunkTextsRef.current.join(" ").trim();
      let wordCursor = 0;

      transcriptAnimationTimerRef.current = globalThis.setInterval(() => {
        wordCursor += 1;

        const animatedPart = words.slice(0, wordCursor).join(" ").trim();
        const spokenText = [spokenPrefix, animatedPart]
          .filter((part) => part.length > 0)
          .join(" ")
          .trim();

        writeDraftFromSpokenText(spokenText);

        if (wordCursor < words.length) {
          return;
        }

        if (transcriptAnimationTimerRef.current !== null) {
          globalThis.clearInterval(transcriptAnimationTimerRef.current);
          transcriptAnimationTimerRef.current = null;
        }

        speechChunkTextsRef.current.push(nextTranscript);
        run();
      }, TRANSCRIPT_ANIMATION_STEP_MS);
    };

    run();
  }, [writeDraftFromSpokenText]);

  const teardownLiveTranscription = useCallback((
    nextStatusText: string | null,
    options?: { sendStopSignal?: boolean },
  ): void => {
    const sendStopSignal = options?.sendStopSignal ?? true;
    clearSpeechChunkMonitor();
    clearTranscriptAnimation();

    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    if (recorder !== null && recorder.state !== "inactive") {
      recorder.stop();
    }

    const stream = mediaStreamRef.current;
    mediaStreamRef.current = null;
    stream?.getTracks().forEach((track) => {
      track.stop();
    });

    const socket = transcriptionSocketRef.current;
    transcriptionSocketRef.current = null;
    if (sendStopSignal && socket !== null && socket.readyState === WebSocket.OPEN) {
      const stopPayload: TranscriptionControlMessage = { type: "stop" };
      socket.send(JSON.stringify(stopPayload));
    }

    if (
      socket !== null &&
      (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
    ) {
      socket.close(1000, "client-stop");
    }

    isStoppingRecordingRef.current = false;
    chunkUploadQueueRef.current = Promise.resolve();
    setIsRecordingSpeech(false);
    setSpeechStatusText(nextStatusText);
  }, [clearSpeechChunkMonitor, clearTranscriptAnimation]);

  const stopLiveTranscription = useCallback((): void => {
    const recorder = mediaRecorderRef.current;
    if (recorder !== null && recorder.state === "recording") {
      isStoppingRecordingRef.current = true;
      clearSpeechChunkMonitor();

      // Flush the final in-memory audio segment before the recorder stops.
      try {
        recorder.requestData();
      } catch {
        // Ignore recorder flush errors and continue shutdown.
      }

      recorder.stop();
      return;
    }

    teardownLiveTranscription(null);
  }, [clearSpeechChunkMonitor, teardownLiveTranscription]);

  useEffect(() => {
    return () => {
      teardownLiveTranscription(null);
    };
  }, [teardownLiveTranscription]);

  useEffect(() => {
    if (speechStatusText === null) {
      return;
    }

    if (isRecordingSpeech && speechStatusText === copy.speechListening) {
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      setSpeechStatusText(isRecordingSpeech ? copy.speechListening : null);
    }, 2400);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [copy.speechListening, isRecordingSpeech, speechStatusText]);

  const monitorSpeechAndFlush = useCallback(
    (recorder: MediaRecorder, mediaStream: MediaStream, transcriptionSocket: WebSocket): void => {
      clearSpeechChunkMonitor();

      const now = Date.now();
      segmentStartedAtRef.current = now;
      lastVoiceActivityAtRef.current = now;

      const requestRecorderFlush = (): void => {
        if (
          recorder.state !== "recording" ||
          transcriptionSocket.readyState !== WebSocket.OPEN
        ) {
          return;
        }

        recorder.requestData();
        const flushNow = Date.now();
        segmentStartedAtRef.current = flushNow;
        lastVoiceActivityAtRef.current = flushNow;
      };

      type AudioContextConstructor = typeof AudioContext;
      const audioContextCtor = (
        globalThis.AudioContext ??
        (globalThis as typeof globalThis & {
          webkitAudioContext?: AudioContextConstructor;
        }).webkitAudioContext
      );

      if (audioContextCtor !== undefined) {
        const audioContext = new audioContextCtor();
        const sourceNode = audioContext.createMediaStreamSource(mediaStream);
        const analyserNode = audioContext.createAnalyser();

        analyserNode.fftSize = 2048;
        sourceNode.connect(analyserNode);

        speechAudioContextRef.current = audioContext;
        speechSourceNodeRef.current = sourceNode;
        speechAnalyserRef.current = analyserNode;
      }

      const waveform =
        speechAnalyserRef.current !== null
          ? new Uint8Array(speechAnalyserRef.current.fftSize)
          : null;

      speechMonitorTimerRef.current = globalThis.setInterval(() => {
        if (recorder.state !== "recording") {
          return;
        }

        const tickNow = Date.now();
        if (waveform !== null && speechAnalyserRef.current !== null) {
          speechAnalyserRef.current.getByteTimeDomainData(waveform);

          let squaredAmplitudeSum = 0;
          for (let index = 0; index < waveform.length; index += 1) {
            const centered = (waveform[index] - 128) / 128;
            squaredAmplitudeSum += centered * centered;
          }

          const rms = Math.sqrt(squaredAmplitudeSum / waveform.length);
          if (rms >= SPEECH_ACTIVITY_RMS_THRESHOLD) {
            lastVoiceActivityAtRef.current = tickNow;
          }
        }

        const chunkDurationMs = tickNow - segmentStartedAtRef.current;
        const silenceDurationMs = tickNow - lastVoiceActivityAtRef.current;

        if (chunkDurationMs >= SPEECH_MAX_SEGMENT_MS) {
          requestRecorderFlush();
          return;
        }

        if (
          chunkDurationMs >= SPEECH_MIN_SEGMENT_MS &&
          silenceDurationMs >= SPEECH_SILENCE_FLUSH_MS
        ) {
          requestRecorderFlush();
        }
      }, SPEECH_MONITOR_POLL_MS);
    },
    [clearSpeechChunkMonitor],
  );

  const applyTranscriptChunk = useCallback(
    (transcript: string, chunkIndex: number | null): void => {
      const normalizedTranscript = transcript.trim();

      if (normalizedTranscript.length === 0) {
        return;
      }

      if (chunkIndex !== null) {
        if (chunkIndex <= latestChunkIndexRef.current) {
          return;
        }

        latestChunkIndexRef.current = chunkIndex;
      }

      transcriptQueueRef.current.push(normalizedTranscript);
      drainTranscriptQueue();
    },
    [drainTranscriptQueue],
  );

  const handleAudioInput = useCallback(async (): Promise<void> => {
    if (isRecordingSpeech) {
      stopLiveTranscription();
      return;
    }

    if (
      typeof MediaRecorder === "undefined" ||
      typeof WebSocket === "undefined" ||
      navigator.mediaDevices?.getUserMedia === undefined
    ) {
      setSpeechStatusText(copy.speechUnsupported);
      return;
    }

    let mediaStream: MediaStream;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setSpeechStatusText(copy.speechPermissionDenied);
      return;
    }

    let transcriptionSocket: WebSocket;
    try {
      transcriptionSocket = new WebSocket(resolveTranscriptionWsUrl());
    } catch {
      mediaStream.getTracks().forEach((track) => {
        track.stop();
      });
      setSpeechStatusText(copy.speechBackendUnavailable);
      return;
    }

    mediaStreamRef.current = mediaStream;
    transcriptionSocketRef.current = transcriptionSocket;
    speechChunkTextsRef.current = [];
    latestChunkIndexRef.current = -1;
    transcriptQueueRef.current = [];
    chunkUploadQueueRef.current = Promise.resolve();
    isStoppingRecordingRef.current = false;
    speechSessionInitialDraftRef.current = latestDraftRef.current.trim();

    transcriptionSocket.onopen = () => {
      if (transcriptionSocketRef.current !== transcriptionSocket) {
        return;
      }

      const preferredMimeType = getSupportedAudioMimeType();
      let recorder: MediaRecorder;

      try {
        recorder =
          preferredMimeType !== undefined
            ? new MediaRecorder(mediaStream, { mimeType: preferredMimeType })
            : new MediaRecorder(mediaStream);
      } catch {
        teardownLiveTranscription(copy.speechUnsupported);
        return;
      }

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        chunkUploadQueueRef.current = chunkUploadQueueRef.current
          .then(async () => {
            if (event.data.size === 0 || transcriptionSocket.readyState !== WebSocket.OPEN) {
              return;
            }

            const buffer = await event.data.arrayBuffer();
            if (buffer.byteLength === 0 || transcriptionSocket.readyState !== WebSocket.OPEN) {
              return;
            }

            transcriptionSocket.send(buffer);
          })
          .catch(() => undefined);
      };

      recorder.onstop = () => {
        if (!isStoppingRecordingRef.current) {
          return;
        }

        chunkUploadQueueRef.current
          .then(() => {
            if (transcriptionSocket.readyState === WebSocket.OPEN) {
              const stopPayload: TranscriptionControlMessage = { type: "stop" };
              transcriptionSocket.send(JSON.stringify(stopPayload));
              return;
            }

            teardownLiveTranscription(null, { sendStopSignal: false });
          })
          .catch(() => {
            teardownLiveTranscription(copy.speechUnsupported, { sendStopSignal: false });
          });
      };

      recorder.onerror = () => {
        teardownLiveTranscription(copy.speechUnsupported);
      };

      const startPayload: TranscriptionControlMessage = {
        type: "start",
        language: normalizeSpeechLanguage(copy.speechLocale),
        mime_type: recorder.mimeType || preferredMimeType,
      };

      transcriptionSocket.send(JSON.stringify(startPayload));
      recorder.start();
      monitorSpeechAndFlush(recorder, mediaStream, transcriptionSocket);
      setIsRecordingSpeech(true);
      setSpeechStatusText(copy.speechListening);
    };

    transcriptionSocket.onmessage = (event: MessageEvent<string>) => {
      if (transcriptionSocketRef.current !== transcriptionSocket) {
        return;
      }

      let payload: TranscriptionServerMessage;
      try {
        payload = JSON.parse(event.data) as TranscriptionServerMessage;
      } catch {
        return;
      }

      if (payload.type === "transcript") {
        const chunkIndex =
          typeof payload.chunk_index === "number" ? payload.chunk_index : null;
        applyTranscriptChunk(payload.text, chunkIndex);
        return;
      }

      if (payload.type === "chunk_error") {
        // Recoverable chunk failures should not break a live recording session.
        return;
      }

      if (payload.type === "stopped") {
        teardownLiveTranscription(null, { sendStopSignal: false });
        return;
      }

      if (payload.type === "error") {
        const errorMessage =
          payload.message.trim().length > 0 ? payload.message : copy.speechUnsupported;
        teardownLiveTranscription(errorMessage);
      }
    };

    transcriptionSocket.onerror = () => {
      if (transcriptionSocketRef.current !== transcriptionSocket) {
        return;
      }

      teardownLiveTranscription(copy.speechBackendUnavailable);
    };

    transcriptionSocket.onclose = () => {
      if (transcriptionSocketRef.current !== transcriptionSocket) {
        return;
      }

      const hasActiveRecorder = mediaRecorderRef.current !== null;
      const shouldSignalUnavailable =
        hasActiveRecorder && !isStoppingRecordingRef.current;
      teardownLiveTranscription(
        shouldSignalUnavailable ? copy.speechBackendUnavailable : null,
        { sendStopSignal: false },
      );
    };
  }, [
    applyTranscriptChunk,
    copy.speechBackendUnavailable,
    copy.speechListening,
    copy.speechLocale,
    copy.speechPermissionDenied,
    copy.speechUnsupported,
    isRecordingSpeech,
    monitorSpeechAndFlush,
    stopLiveTranscription,
    teardownLiveTranscription,
  ]);

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
      {
        key: "projectType",
        question: copy.personaProjectQuestion,
      },
      {
        key: "functionType",
        question: copy.personaFunctionQuestion,
      },
      {
        key: "responseStructure",
        question: copy.personaStructureQuestion,
      },
      {
        key: "analysisGoal",
        question: copy.personaGoalQuestion,
      },
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

  const inputPlaceholder = isRecordingSpeech
    ? copy.speechListening
    : copy.inputPlaceholder;
  const speechFeedbackText =
    isRecordingSpeech && (speechStatusText === null || speechStatusText === copy.speechListening)
      ? copy.speechListening
      : speechStatusText;
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
                setIsBrainrotMenuOpen(false);
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
              <ul className="attach-menu-popover services-menu-popover">
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

          {isBrainrotEnabled ? (
            <div className="brainrot-picker" ref={brainrotPickerRef}>
              <button
                type="button"
                className="brainrot-picker-btn"
                onClick={() => {
                  setIsBrainrotMenuOpen((previous) => !previous);
                  setIsAttachMenuOpen(false);
                  setIsServicesMenuOpen(false);
                  setIsModelMenuOpen(false);
                }}
                aria-expanded={isBrainrotMenuOpen}
              >
                <span className="model-name">{copy.brainrotStyleLabel}</span>
                <span className="model-chevron">{isBrainrotMenuOpen ? "▴" : "▾"}</span>
              </button>

              {isBrainrotMenuOpen ? (
                <ul className="brainrot-style-popover" aria-label={copy.brainrotStyleLabel}>
                  {brainrotStyles.map((styleOption) => {
                    const isSelected = styleOption.key === brainrotStyle;

                    return (
                      <li key={styleOption.key}>
                        <button
                          type="button"
                          className={`brainrot-style-option${isSelected ? " is-active" : ""}`}
                          onClick={() => {
                            onBrainrotStyleChange(styleOption.key);
                            setIsBrainrotMenuOpen(false);
                          }}
                          title={styleOption.label}
                        >
                          <span>{styleOption.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
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
            <div className="profile-avatar" aria-hidden="true" title={ACTIVE_DEV_PROFILE.fullName}>
              {ACTIVE_DEV_PROFILE.initials}
            </div>
          </button>
        ) : null}
      </div>

      {isPersonaWizardOpen && currentPersonaQuestion !== null ? (
        <div
          className="persona-wizard-overlay"
          role="presentation"
          onClick={closePersonaWizard}
        >
          <section
            className="persona-wizard-panel"
            aria-label={copy.personaWizardTitle}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="persona-wizard-header">
              <h3>{copy.personaWizardTitle}</h3>
              <p>{copy.personaWizardSubtitle}</p>
            </header>

            <form className="persona-wizard-form" onSubmit={submitPersonaWizardStep}>
              <label className="persona-wizard-field">
                <span>{currentPersonaQuestion.question}</span>
                <textarea
                  value={currentPersonaValue}
                  placeholder={copy.personaInputPlaceholder}
                  onChange={(event) => updatePersonaAnswer(event.target.value)}
                />
              </label>

              <div className="persona-wizard-actions">
                <button
                  type="button"
                  className="persona-wizard-ghost-btn"
                  onClick={() => {
                    if (personaStepIndex === 0) {
                      closePersonaWizard();
                      return;
                    }

                    setPersonaStepIndex((previous) => previous - 1);
                  }}
                >
                  {copy.personaBack}
                </button>

                <div className="persona-wizard-right-actions">
                  <button
                    type="button"
                    className="persona-wizard-ghost-btn"
                    onClick={closePersonaWizard}
                  >
                    {copy.personaSkip}
                  </button>

                  <button
                    type="submit"
                    className="persona-wizard-primary-btn"
                    disabled={!isCurrentPersonaAnswerValid}
                  >
                    {personaStepIndex === personaQuestions.length - 1
                      ? copy.personaFinish
                      : copy.personaNext}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      ) : null}

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

          {speechFeedbackText !== null ? (
            <p
              className={`speech-status${isRecordingSpeech ? " is-listening" : ""}`}
              aria-live="polite"
            >
              {speechFeedbackText}
            </p>
          ) : null}
        </div>

        <p className="chat-disclaimer">{copy.disclaimer}</p>
      </div>
    </section>
  );
}

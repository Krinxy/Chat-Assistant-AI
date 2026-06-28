import { useCallback, useEffect, useRef, useState } from "react";

import { speechCfg } from "../../../shared/config/appConfig";
import type { UiText } from "../../../shared/i18n/uiText";

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

const SPEECH_MONITOR_POLL_MS = speechCfg.monitor_poll_ms;
const SPEECH_ACTIVITY_RMS_THRESHOLD = speechCfg.rms_threshold;
const SPEECH_MIN_SEGMENT_MS = speechCfg.min_segment_ms;
const SPEECH_SILENCE_FLUSH_MS = speechCfg.silence_flush_ms;
const SPEECH_MAX_SEGMENT_MS = speechCfg.max_segment_ms;
const TRANSCRIPT_ANIMATION_STEP_MS = speechCfg.transcript_animation_step_ms;

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

type SpeechCopy = Pick<
  UiText["chat"],
  | "speechListening"
  | "speechUnsupported"
  | "speechPermissionDenied"
  | "speechBackendUnavailable"
  | "speechLocale"
  | "inputPlaceholder"
>;

interface UseLiveTranscriptionOptions {
  draft: string;
  setDraft: (value: string) => void;
  authToken?: string;
  copy: SpeechCopy;
}

export interface LiveTranscriptionState {
  isRecordingSpeech: boolean;
  speechStatusText: string | null;
  /** Pre-computed placeholder for the chat input while recording or at rest. */
  inputPlaceholder: string;
  /** Pre-computed feedback text shown beneath the input during/after recording. */
  speechFeedbackText: string | null;
  /** Whether to show the audio button (recording active or draft is empty). */
  shouldShowAudioButton: boolean;
  handleAudioInput: () => Promise<void>;
}

export function useLiveTranscription({
  draft,
  setDraft,
  authToken,
  copy,
}: UseLiveTranscriptionOptions): LiveTranscriptionState {
  const [isRecordingSpeech, setIsRecordingSpeech] = useState<boolean>(false);
  const [speechStatusText, setSpeechStatusText] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const transcriptionSocketRef = useRef<WebSocket | null>(null);
  const speechChunkTextsRef = useRef<string[]>([]);
  const latestChunkIndexRef = useRef<number>(-1);
  const transcriptQueueRef = useRef<string[]>([]);
  const transcriptAnimationTimerRef = useRef<ReturnType<typeof globalThis.setInterval> | null>(null);
  const speechMonitorTimerRef = useRef<ReturnType<typeof globalThis.setInterval> | null>(null);
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
      // stop() fires ondataavailable with all audio since the last start() — no
      // prior requestData() needed. requestData() before stop() would emit a
      // complete chunk followed by a headerless trailing fragment on stop().
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

        // Reset timing before stop so the next segment starts fresh
        const flushNow = Date.now();
        segmentStartedAtRef.current = flushNow;
        lastVoiceActivityAtRef.current = flushNow;
        // Stop instead of requestData — stop produces a self-contained WebM file per
        // segment (no EBML header missing on second+ flushes). onstop restarts the
        // recorder for the next segment.
        recorder.stop();
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

      if (authToken !== undefined && authToken.length > 0) {
        transcriptionSocket.send(JSON.stringify({ type: "auth", token: authToken }));
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
          // Mid-session segment flush: restart recorder so the next segment is also
          // a self-contained WebM (complete EBML header, decodable independently).
          globalThis.setTimeout(() => {
            if (transcriptionSocketRef.current !== transcriptionSocket) {
              return;
            }
            try {
              recorder.start();
            } catch {
              teardownLiveTranscription(copy.speechUnsupported);
            }
          }, 0);
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
    authToken,
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

  const inputPlaceholder = isRecordingSpeech ? copy.speechListening : copy.inputPlaceholder;
  const isListeningStatus = speechStatusText === null || speechStatusText === copy.speechListening;
  const speechFeedbackText =
    isRecordingSpeech && isListeningStatus ? copy.speechListening : speechStatusText;
  const shouldShowAudioButton = isRecordingSpeech || draft.trim().length === 0;

  return {
    isRecordingSpeech,
    speechStatusText,
    inputPlaceholder,
    speechFeedbackText,
    shouldShowAudioButton,
    handleAudioInput,
  };
}

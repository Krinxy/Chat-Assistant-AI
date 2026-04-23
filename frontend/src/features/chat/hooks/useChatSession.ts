import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

import type { BrainrotStyleKey, ChatAttachment, ChatMessage, Language } from "../types/chat";
import { composeAssistantReply, timeFormatter } from "../utils/chat";

interface UseChatSessionOptions {
  selectedModelId: string;
  selectedModelLabel: string;
  language: Language;
  isBrainrotEnabled?: boolean;
  brainrotStyle?: BrainrotStyleKey;
  actionStartedPrefix: string;
  reasoningText: string;
  onFirstUserMessage?: () => void;
}

interface UseChatSessionResult {
  draft: string;
  setDraft: React.Dispatch<React.SetStateAction<string>>;
  messages: ChatMessage[];
  isTyping: boolean;
  sendMessage: (event: FormEvent<HTMLFormElement>) => boolean;
  addAttachmentActionMessage: (label: string) => void;
  addUploadedFilesMessage: (files: File[]) => void;
  resetSession: () => void;
  openSessionFromPreview: (previewText: string, timeLabel?: string) => void;
}

export function useChatSession({
  selectedModelId,
  selectedModelLabel,
  language,
  isBrainrotEnabled = false,
  brainrotStyle = "meme67",
  actionStartedPrefix,
  reasoningText,
  onFirstUserMessage,
}: UseChatSessionOptions): UseChatSessionResult {
  const [draft, setDraft] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const hasSentFirstMessageRef = useRef<boolean>(false);
  const timeoutIdsRef = useRef<Array<ReturnType<typeof globalThis.setTimeout>>>(
    [],
  );
  const intervalIdsRef = useRef<Array<ReturnType<typeof globalThis.setInterval>>>(
    [],
  );

  const clearScheduledWork = useCallback(() => {
    timeoutIdsRef.current.forEach((timeoutId) => {
      globalThis.clearTimeout(timeoutId);
    });
    timeoutIdsRef.current = [];

    intervalIdsRef.current.forEach((intervalId) => {
      globalThis.clearInterval(intervalId);
    });
    intervalIdsRef.current = [];
  }, []);

  const revokeAttachmentPreviews = useCallback((messagesToRevoke: ChatMessage[]): void => {
    messagesToRevoke.forEach((message) => {
      message.attachments?.forEach((attachment) => {
        if (typeof attachment.previewUrl === "string" && attachment.previewUrl.length > 0) {
          globalThis.URL.revokeObjectURL(attachment.previewUrl);
        }
      });
    });
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    return () => {
      clearScheduledWork();
      revokeAttachmentPreviews(messagesRef.current);
    };
  }, [clearScheduledWork, revokeAttachmentPreviews]);

  const scheduleTimeout = (callback: () => void, delayMs: number): void => {
    const timeoutId = globalThis.setTimeout(() => {
      timeoutIdsRef.current = timeoutIdsRef.current.filter(
        (existingId) => existingId !== timeoutId,
      );
      callback();
    }, delayMs);

    timeoutIdsRef.current.push(timeoutId);
  };

  const sendMessage = useCallback(
    (event: FormEvent<HTMLFormElement>): boolean => {
      event.preventDefault();

      if (isTyping) {
        return false;
      }

      const trimmed = draft.trim();
      if (trimmed.length === 0) {
        return false;
      }

      const currentTime = timeFormatter.format(new Date());
      const userMessage: ChatMessage = {
        id: Date.now(),
        role: "user",
        text: trimmed,
        time: currentTime,
      };

      setMessages((previous) => [...previous, userMessage]);
      setDraft("");
      setIsTyping(true);

      if (!hasSentFirstMessageRef.current) {
        hasSentFirstMessageRef.current = true;
        onFirstUserMessage?.();
      }

      const thinkingId = Date.now() + 1;
      const thinkingMessage: ChatMessage = {
        id: thinkingId,
        role: "assistant",
        text: "",
        time: currentTime,
        isThinking: true,
        reasoning: reasoningText,
      };

      scheduleTimeout(() => {
        setMessages((previous) => [...previous, thinkingMessage]);
      }, 80);

      const isGeminiModel = selectedModelId.toLowerCase().includes("gemini");
      const fullReply = isGeminiModel
        ? composeAssistantReply(trimmed, selectedModelLabel, language, {
          brainrotTone: isBrainrotEnabled,
          brainrotStyle,
        })
        : language === "de"
          ? "Dieses LLM ist noch nicht angelegt. Kontaktiere den Admin. Aktuell arbeiten wir nur mit Google Gemini."
          : "This LLM is not set up yet. Please contact the admin. For now, only Google Gemini is available.";
      const tokens = fullReply.split(" ");

      scheduleTimeout(() => {
        setMessages((previous) => {
          return previous.map((message) => {
            if (message.id !== thinkingId) {
              return message;
            }

            return {
              ...message,
              isThinking: false,
              isStreaming: true,
              text: "",
            };
          });
        });

        let tokenIndex = 0;

        const streamIntervalId = globalThis.setInterval(() => {
          tokenIndex += 1;

          const isDone = tokenIndex >= tokens.length;
          const nextText = tokens.slice(0, tokenIndex).join(" ");

          setMessages((previous) => {
            return previous.map((message) => {
              if (message.id !== thinkingId) {
                return message;
              }

              return {
                ...message,
                text: nextText,
                isStreaming: !isDone,
              };
            });
          });

          if (isDone) {
            globalThis.clearInterval(streamIntervalId);
            intervalIdsRef.current = intervalIdsRef.current.filter(
              (id) => id !== streamIntervalId,
            );
            setIsTyping(false);
          }
        }, 68);

        intervalIdsRef.current.push(streamIntervalId);
      }, 620);

      return true;
    },
    [
      draft,
      isTyping,
      language,
      selectedModelId,
      isBrainrotEnabled,
      brainrotStyle,
      onFirstUserMessage,
      reasoningText,
      selectedModelLabel,
    ],
  );

  const addAttachmentActionMessage = useCallback((label: string): void => {
    setMessages((previous) => [
      ...previous,
      {
        id: Date.now(),
        role: "assistant",
        text: `${actionStartedPrefix}: ${label}.`,
        time: timeFormatter.format(new Date()),
      },
    ]);
  }, [actionStartedPrefix]);

  const addUploadedFilesMessage = useCallback((files: File[]): void => {
    if (files.length === 0) {
      return;
    }

    const attachments: ChatAttachment[] = files.map((file, index) => {
      const fileName = file.name.trim().length > 0 ? file.name.trim() : `file-${index + 1}`;
      const isImage = file.type.toLowerCase().startsWith("image/");

      return {
        id: `${Date.now()}-${index}`,
        name: fileName,
        isImage,
        previewUrl: isImage ? globalThis.URL.createObjectURL(file) : undefined,
      };
    });

    if (attachments.length === 0) {
      return;
    }

    setMessages((previous) => [
      ...previous,
      {
        id: Date.now(),
        role: "user",
        text: "",
        time: timeFormatter.format(new Date()),
        attachments,
      },
    ]);

    if (!hasSentFirstMessageRef.current) {
      hasSentFirstMessageRef.current = true;
      onFirstUserMessage?.();
    }
  }, [onFirstUserMessage]);

  const resetSession = useCallback((): void => {
    clearScheduledWork();
    hasSentFirstMessageRef.current = false;
    setDraft("");
    setMessages((previous) => {
      revokeAttachmentPreviews(previous);
      return [];
    });
    setIsTyping(false);
  }, [clearScheduledWork, revokeAttachmentPreviews]);

  const openSessionFromPreview = useCallback((previewText: string, timeLabel?: string): void => {
    const normalizedPreview = previewText.trim();

    if (normalizedPreview.length === 0) {
      resetSession();
      return;
    }

    clearScheduledWork();
    hasSentFirstMessageRef.current = true;
    setDraft("");
    setIsTyping(false);

    const normalizedTimeLabel = typeof timeLabel === "string" ? timeLabel.trim() : "";
    const messageTime =
      normalizedTimeLabel.length > 0
        ? normalizedTimeLabel
        : timeFormatter.format(new Date());

    setMessages((previous) => {
      revokeAttachmentPreviews(previous);

      return [
        {
          id: Date.now(),
          role: "user",
          text: normalizedPreview,
          time: messageTime,
        },
      ];
    });
  }, [clearScheduledWork, resetSession, revokeAttachmentPreviews]);

  return {
    draft,
    setDraft,
    messages,
    isTyping,
    sendMessage,
    addAttachmentActionMessage,
    addUploadedFilesMessage,
    resetSession,
    openSessionFromPreview,
  };
}

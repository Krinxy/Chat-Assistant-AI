import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

import type { BrainrotStyleKey, ChatMessage, Language } from "../types/chat";
import { composeAssistantReply, timeFormatter } from "../utils/chat";

interface UseChatSessionOptions {
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
  resetSession: () => void;
}

export function useChatSession({
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

  useEffect(() => {
    return () => {
      clearScheduledWork();
    };
  }, [clearScheduledWork]);

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

      const fullReply = composeAssistantReply(trimmed, selectedModelLabel, language, {
        brainrotTone: isBrainrotEnabled,
        brainrotStyle,
      });
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

  const resetSession = useCallback((): void => {
    clearScheduledWork();
    hasSentFirstMessageRef.current = false;
    setDraft("");
    setMessages([]);
    setIsTyping(false);
  }, [clearScheduledWork]);

  return {
    draft,
    setDraft,
    messages,
    isTyping,
    sendMessage,
    addAttachmentActionMessage,
    resetSession,
  };
}

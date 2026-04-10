import { useEffect, useState } from "react";

import type { Language, LocalLlmConfig } from "../../features/chat/types/chat";

interface ProfilePanelProps {
  language: Language;
  localLlmConfig: LocalLlmConfig | null;
}

const getInitialPrePrompt = (): string => {
  try {
    return globalThis.localStorage.getItem("aura.profile.preprompt") ?? "";
  } catch {
    return "";
  }
};

export function ProfilePanel({ language, localLlmConfig }: ProfilePanelProps) {
  const [prePrompt, setPrePrompt] = useState<string>(getInitialPrePrompt);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    if (!isSaved) {
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      setIsSaved(false);
    }, 1600);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [isSaved]);

  const text = language === "de"
    ? {
      title: "Profil",
      subtitle: "Persoenliche Einstellungen fuer deinen Assistant",
      fullName: "Dominic Bechtold",
      email: "dominic@aura.local",
      subscriptionLabel: "Subscription",
      subscriptionValue: "Pro Annual",
      planRenewal: "Verlaengert am 16.08.2026",
      localModelTitle: "Lokales LLM",
      localModelFallback: "Noch kein lokales LLM konfiguriert",
      prePromptTitle: "Pre Prompt",
      prePromptHint: "Welche Regeln und Infos soll AURA immer ueber dich beachten?",
      save: "Speichern",
      saved: "Gespeichert",
      helpTitle: "Hilfe & Funktionsforum",
      helpHint: "Hier findest du schnelle Antworten und Hinweise, wo du Funktionen nachschlagen kannst.",
      helpItems: [
        {
          question: "Wie starte ich einen neuen Chat?",
          answer: "Im Sidebar-Bereich Aktuelle Session auf das Plus klicken.",
        },
        {
          question: "Wie nutze ich Spracheingabe?",
          answer: "Im Chat unten auf das Mikro klicken und Zugriff erlauben.",
        },
        {
          question: "Wo finde ich Modell- und Service-Infos?",
          answer: "Im Bereich Aktuelle Session stehen Scope, aktive Services und Kontext.",
        },
      ],
    }
    : {
      title: "Profile",
      subtitle: "Personal settings for your assistant",
      fullName: "Dominic Bechtold",
      email: "dominic@aura.local",
      subscriptionLabel: "Subscription",
      subscriptionValue: "Pro Annual",
      planRenewal: "Renews on 16 Aug 2026",
      localModelTitle: "Local LLM",
      localModelFallback: "No local LLM configured yet",
      prePromptTitle: "Pre Prompt",
      prePromptHint: "Which rules and background should AURA always know about you?",
      save: "Save",
      saved: "Saved",
      helpTitle: "Help & Feature Forum",
      helpHint: "Quick answers and pointers for where to look up platform features.",
      helpItems: [
        {
          question: "How do I start a new chat?",
          answer: "Use the plus button in the Current Session area of the sidebar.",
        },
        {
          question: "How do I use voice input?",
          answer: "Click the microphone in the chat input and allow access.",
        },
        {
          question: "Where can I review model/service context?",
          answer: "Current Session shows scope, active services, and message context.",
        },
      ],
    };

  const prePromptPlaceholder = language === "de"
    ? "z. B. antworte knapp, nutze deutsch, beruecksichtige meine Produktziele"
    : "e.g. keep answers concise, prefer German, optimize for product planning";

  const handleSave = (): void => {
    try {
      globalThis.localStorage.setItem("aura.profile.preprompt", prePrompt);
    } catch {
      // Ignore storage failures in restrictive browser contexts.
    }

    setIsSaved(true);
  };

  return (
    <section className="profile-panel" aria-label={text.title}>
      <header className="profile-panel-header">
        <h2>{text.title}</h2>
        <p>{text.subtitle}</p>
      </header>

      <div className="profile-grid">
        <article className="profile-card">
          <h3>{text.fullName}</h3>
          <p>{text.email}</p>
          <div className="profile-chip-row">
            <span>{text.subscriptionLabel}</span>
            <strong>{text.subscriptionValue}</strong>
          </div>
          <small>{text.planRenewal}</small>
        </article>

        <article className="profile-card">
          <h3>{text.localModelTitle}</h3>
          {localLlmConfig === null ? (
            <p>{text.localModelFallback}</p>
          ) : (
            <div className="profile-local-model-details">
              <p>{localLlmConfig.modelName}</p>
              <small>{localLlmConfig.endpoint}</small>
            </div>
          )}
        </article>
      </div>

      <article className="profile-card profile-preprompt-card">
        <h3>{text.prePromptTitle}</h3>
        <p>{text.prePromptHint}</p>
        <textarea
          value={prePrompt}
          onChange={(event) => {
            setIsSaved(false);
            setPrePrompt(event.target.value);
          }}
          placeholder={prePromptPlaceholder}
        />
        <div className="profile-preprompt-actions">
          <button type="button" onClick={handleSave}>
            {text.save}
          </button>
          {isSaved ? <span>{text.saved}</span> : null}
        </div>
      </article>

      <article className="profile-card profile-help-card">
        <h3>{text.helpTitle}</h3>
        <p>{text.helpHint}</p>
        <ul className="profile-help-list">
          {text.helpItems.map((item) => (
            <li key={item.question}>
              <strong>{item.question}</strong>
              <span>{item.answer}</span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}

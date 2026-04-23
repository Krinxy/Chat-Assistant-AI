import { useMemo, useState } from "react";

import type { Language } from "../../features/chat/types/chat";

type GuideTopicId = "chat" | "services" | "roles" | "vllm";

interface GuideTopic {
  id: GuideTopicId;
  title: string;
  subtitle: string;
  steps: string[];
}

interface FeatureGuidePanelProps {
  language: Language;
}

export function FeatureGuidePanel({ language }: FeatureGuidePanelProps) {
  const text = language === "de"
    ? {
      title: "Help",
      subtitle: "Kurze Navigation für Features, Workflows und lokale vLLM-Anbindung.",
      navTitle: "Inhalte",
      topics: [
        {
          id: "chat",
          title: "Chat Workflow",
          subtitle: "Von Frage bis Kontextwechsel in wenigen Schritten.",
          steps: [
            "1. In der Sidebar auf Chat wechseln oder mit Neuer Chat starten.",
            "2. Modell im Picker wählen und optional Services aktivieren.",
            "3. Antworten prüfen, Follow-ups senden und Verlauf im Kontext behalten.",
          ],
        },
        {
          id: "services",
          title: "Services nutzen",
          subtitle: "Persona, Faktencheck, Prompt Guard und lokale Konfiguration.",
          steps: [
            "1. Plus neben dem Modell klicken.",
            "2. Gewünschte Services aktivieren, aktive Chips erscheinen direkt daneben.",
            "3. Klick auf einen Chip entfernt den Service wieder aus der Session.",
          ],
        },
        {
          id: "roles",
          title: "Rollen und Sichtbarkeit",
          subtitle: "Wer sieht welche Kunden, Termine und Notizen.",
          steps: [
            "1. Admin hat Vollzugriff auf alle Firmenbereiche.",
            "2. Customer sieht nur die eigene Firma.",
            "3. Sales Consultant sieht nur zugewiesene Firmen und Gespraechsstaende.",
            "4. Analyst sieht Reports und Hypothesen, aber keine Teamverwaltung.",
          ],
        },
        {
          id: "vllm",
          title: "vLLM Quickstart",
          subtitle: "Lokales Modell als OpenAI-kompatiblen Endpoint anbinden.",
          steps: [
            "1. vLLM lokal starten (z. B. mit OpenAI-compatible API).",
            "2. In Chat den Service Lokales LLM Setup aktivieren.",
            "3. Endpoint URL + Modellnamen eintragen und speichern.",
            "4. Modell danach im Picker unter Local / Self-Hosted auswaehlen.",
          ],
        },
      ] as GuideTopic[],
    }
    : {
      title: "Help",
      subtitle: "Kurze Navigation für Features, Workflows und lokale vLLM-Anbindung.",
      navTitle: "Topics",
      topics: [
        {
          id: "chat",
          title: "Chat workflow",
          subtitle: "From first prompt to context-aware follow-up.",
          steps: [
            "1. Switch to Chat from the sidebar or start a new session.",
            "2. Select a model and optionally enable services.",
            "3. Review responses, send follow-ups, and keep session context.",
          ],
        },
        {
          id: "services",
          title: "Use services",
          subtitle: "Persona, fact check, prompt guard, and local setup.",
          steps: [
            "1. Click the plus button next to model picker.",
            "2. Enable needed services and monitor active chips.",
            "3. Click a chip to remove the service from this session.",
          ],
        },
        {
          id: "roles",
          title: "Roles and visibility",
          subtitle: "Who can view which companies and operations.",
          steps: [
            "1. Admin has complete access to all company areas.",
            "2. Customer sees only their own account.",
            "3. Sales Consultant sees assigned companies and call status.",
            "4. Analyst can view analytics but not team management.",
          ],
        },
        {
          id: "vllm",
          title: "vLLM quickstart",
          subtitle: "Connect local model through OpenAI-compatible endpoint.",
          steps: [
            "1. Start vLLM locally with OpenAI-compatible API mode.",
            "2. Enable Local LLM Setup service in chat.",
            "3. Save endpoint URL and model name.",
            "4. Pick the local model from Local / Self-Hosted provider.",
          ],
        },
      ] as GuideTopic[],
    };

  const [activeTopicId, setActiveTopicId] = useState<GuideTopicId>("chat");

  const activeTopic = useMemo(() => {
    return text.topics.find((topic) => topic.id === activeTopicId) ?? text.topics[0];
  }, [activeTopicId, text.topics]);

  return (
    <section className="feature-guide-panel" aria-label={text.title}>
      <header className="feature-guide-header">
        <h2>{text.title}</h2>
        <p>{text.subtitle}</p>
      </header>

      <div className="feature-guide-layout">
        <aside className="feature-guide-nav" aria-label={text.navTitle}>
          {text.topics.map((topic) => (
            <button
              key={topic.id}
              type="button"
              className={`feature-guide-topic-btn${topic.id === activeTopic?.id ? " is-active" : ""}`}
              onClick={() => setActiveTopicId(topic.id)}
            >
              <strong>{topic.title}</strong>
              <span>{topic.subtitle}</span>
            </button>
          ))}
        </aside>

        <article className="feature-guide-content">
          <h3>{activeTopic?.title}</h3>
          <p>{activeTopic?.subtitle}</p>
          <ul className="feature-guide-step-list">
            {activeTopic?.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

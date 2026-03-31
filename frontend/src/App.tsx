import {
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ChatRole = "assistant" | "user";

interface ChatMessage {
  id: number;
  role: ChatRole;
  text: string;
  time: string;
  isThinking?: boolean;
  reasoning?: string;
}

interface ServiceItem {
  id: string;
  title: string;
  description: string;
  accent: string;
  preview: string;
  highlights: [string, string];
}

interface NewsItem {
  id: string;
  title: string;
  source: string;
}

interface AttachmentAction {
  id: string;
  label: string;
}

interface ModelOption {
  id: string;
  label: string;
}

interface ModelProvider {
  id: string;
  label: string;
  models: ModelOption[];
}

interface RecentChat {
  id: string;
  title: string;
  lastUpdate: string;
}

const navigationItems: string[] = [
  "Home",
  "Chat",
  "Recommendations",
  "Notifications",
  "Profile",
];

const headerQuestions: string[] = [
  "Wie war dein Tag?",
  "Was magst du heute fragen?",
  "Womit kann ich dir heute helfen?",
  "Was wollen wir als nächstes bauen?",
  "Was hast du heute noch so vor?",
  "Was gibt es neues?",
  "Was kam zuerst, das Huhn oder das Ei?"
];

const attachmentActions: AttachmentAction[] = [
  { id: "files", label: "Dateien anhaengen" },
  { id: "events", label: "Event hinzufuegen" },
  { id: "cloud", label: "Aus Cloud hochladen" },
];

const modelProviders: ModelProvider[] = [
  {
    id: "recent",
    label: "Zuletzt verwendet",
    models: [
      { id: "gpt-5.3-codex", label: "GPT-5.3-Codex" },
      { id: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    ]
  },
  {
    id: "anthropic",
    label: "Anthropic",
    models: [
      { id: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
      { id: "claude-3-opus", label: "Claude 3 Opus" },
      { id: "claude-3-haiku", label: "Claude 3 Haiku" },
    ]
  },
  {
    id: "openai",
    label: "OpenAI",
    models: [
      { id: "gpt-5.3-codex", label: "GPT-5.3-Codex" },
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4-turbo", label: "GPT-4 Turbo" },
    ]
  },
  {
    id: "google",
    label: "Google",
    models: [
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    ]
  }
];

// Fallback lookup flat list
const allModelsFlat = modelProviders.flatMap(p => p.models);

const serviceItems: ServiceItem[] = [
  {
    id: "llm-core",
    title: "LLM Core",
    description: "Routing prompts to model providers",
    accent: "#636059",
    preview: "Prompt routing",
    highlights: ["Multi-model switch", "Token usage guard"],
  },
  {
    id: "memory-graph",
    title: "Memory Graph",
    description: "Context stitching from previous threads",
    accent: "#7b8488",
    preview: "Memory timeline",
    highlights: ["Session recall", "Cross-thread links"],
  },
  {
    id: "weather-agent",
    title: "Weather Agent",
    description: "Collecting local forecast signals",
    accent: "#8f989c",
    preview: "Live forecast",
    highlights: ["Now and next 24h", "Feels-like deltas"],
  },
  {
    id: "news-agent",
    title: "News Agent",
    description: "Ranking relevant headlines",
    accent: "#9ea8ad",
    preview: "Headline ranker",
    highlights: ["Source confidence", "Topic clustering"],
  },
  {
    id: "notifier",
    title: "Notification Bus",
    description: "Dispatching realtime updates",
    accent: "#566168",
    preview: "Realtime dispatch",
    highlights: ["Priority channels", "Delivery tracking"],
  },
  {
    id: "quality-gate",
    title: "Quality Gate",
    description: "Pipeline checks for every response",
    accent: "#b6c0c4",
    preview: "Policy checks",
    highlights: ["Lint + test gates", "Risk scoring"],
  },
];

const recommendedNews: NewsItem[] = [
  {
    id: "news-1",
    title: "Assistant latency drops after cache rollout across routing nodes",
    source: "Ops Digest",
  },
  {
    id: "news-2",
    title: "Weather station predicts calm rain window through the evening",
    source: "Weather Wire",
  },
  {
    id: "news-3",
    title: "Support queue volume decreases after proactive FAQ suggestions",
    source: "Product Notes",
  },
];

const weatherStats: Array<{ label: string; value: string }> = [
  { label: "Temperature", value: "19C" },
  { label: "Feels like", value: "17C" },
  { label: "Humidity", value: "63%" },
  { label: "Wind", value: "14 km/h" },
];

const initialMessages: ChatMessage[] = [];

const timeFormatter = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
});

const composeAssistantReply = (prompt: string, modelLabel: string): string =>
  `Verstanden: "${prompt}". Ich antworte mit Modell ${modelLabel} und reiche Kontext aus News/Wetter nach.`;

const getGreetingFromUnixTime = (unixTime: number): string => {
  const hour = new Date(unixTime * 1000).getHours();

  if (hour < 10) {
    return "Guten Morgen";
  }

  if (hour < 12) {
    return "Guten Tag";
  }

  if (hour < 18) {
    return "Schönen Nachmittag";
  }

  return "Guten Abend";
};



import { Sidebar } from './widgets/sidebar/Sidebar';
import { Header } from './widgets/header/Header';

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [draft, setDraft] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [activeView, setActiveView] = useState<"dashboard" | "chat">("dashboard");
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState<boolean>(false);
  const [isServicesMenuOpen, setIsServicesMenuOpen] = useState<boolean>(false);
  const [activeModelProviderId, setActiveModelProviderId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>(
    "gpt-5.3-codex"
  );
  const [isModelMenuOpen, setIsModelMenuOpen] = useState<boolean>(false);
  const [unixTime, setUnixTime] = useState<number>(
    Math.floor(Date.now() / 1000),
  );
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isDraggingServices, setIsDraggingServices] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const serviceScrollerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startScrollLeft: number;
  }>({
    active: false,
    startX: 0,
    startScrollLeft: 0,
  });

  useEffect(() => {
    const timerId = globalThis.setInterval(() => {
      setUnixTime(Math.floor(Date.now() / 1000));
    }, 60000);

    return () => {
      globalThis.clearInterval(timerId);
    };
  }, []);

  const selectedModel = useMemo<ModelOption>(() => {
    return (
      allModelsFlat.find((model) => model.id === selectedModelId) ??
      allModelsFlat[0]
    );
  }, [selectedModelId]);

  const greeting = useMemo<string>(
    () => getGreetingFromUnixTime(unixTime),
    [unixTime],
  );

  const randomHeaderQuestion = useMemo<string>(() => {
    const index = Math.floor(Math.random() * headerQuestions.length);
    return headerQuestions[index];
  }, []);

  const handleSendMessage = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      return;
    }

    const currentTime = timeFormatter.format(new Date());
    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      text: trimmed,
      time: currentTime,
    };

    if (messages.length === 0) {
      setIsSidebarOpen(false);
    }
    setActiveView("chat");

    setMessages((previous) => [...previous, userMessage]);
    setDraft("");
    setIsAttachMenuOpen(false);
    setIsTyping(true);

    const thinkingId = Date.now() + 1;
    const thinkingMessage: ChatMessage = {
      id: thinkingId,
      role: "assistant",
      text: "",
      time: currentTime,
      isThinking: true,
      reasoning: "Da wir noch kein Reasoning haben, warten wir 3s..."
    };
    
    // Add the thinking placeholder immediately
    setTimeout(() => {
        setMessages((previous) => [...previous, thinkingMessage]);
    }, 50);

    setTimeout(() => {
      setMessages((previous) => previous.map(msg => 
        msg.id === thinkingId 
          ? {
              ...msg,
              isThinking: false,
              text: composeAssistantReply(trimmed, selectedModel.label)
            }
          : msg
      ));
      setIsTyping(false);
    }, 3000);
  };

  const handleAttachmentAction = (actionId: string): void => {
    const action = attachmentActions.find((item) => item.id === actionId);

    if (action === undefined) {
      setIsAttachMenuOpen(false);
      return;
    }

    setMessages((previous) => [
      ...previous,
      {
        id: Date.now(),
        role: "assistant",
        text: `Aktion gestartet: ${action.label}.`,
        time: timeFormatter.format(new Date()),
      },
    ]);

    setIsAttachMenuOpen(false);
  };

  const handleModelSelect = (modelId: string): void => {
    setSelectedModelId(modelId);
    setIsModelMenuOpen(false);
  };

  const handleServicePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ): void => {
    const element = serviceScrollerRef.current;

    if (element === null) {
      return;
    }

    dragStateRef.current.active = true;
    dragStateRef.current.startX = event.clientX;
    dragStateRef.current.startScrollLeft = element.scrollLeft;
    setIsDraggingServices(true);
    element.setPointerCapture(event.pointerId);
  };

  const handleServicePointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ): void => {
    const element = serviceScrollerRef.current;
    const dragState = dragStateRef.current;

    if (element === null || !dragState.active) {
      return;
    }

    const dragDistance = event.clientX - dragState.startX;
    element.scrollLeft = dragState.startScrollLeft - dragDistance;
  };

  const handleServicePointerUp = (
    event: ReactPointerEvent<HTMLDivElement>,
  ): void => {
    const element = serviceScrollerRef.current;
    dragStateRef.current.active = false;
    setIsDraggingServices(false);

    if (element?.hasPointerCapture(event.pointerId) === true) {
      element.releasePointerCapture(event.pointerId);
    }
  };

  const hasStartedChat = activeView === "chat";

  return (
    <div className={`dashboard-root ${hasStartedChat ? 'chat-mode-root' : 'is-dashboard'}`}>
      <div className={`dashboard-shell${isSidebarOpen ? "" : " is-collapsed"} ${hasStartedChat ? "chat-mode-shell" : ""}`}>
        <Sidebar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          hasStartedChat={hasStartedChat}
          activeView={activeView}
          setActiveView={setActiveView}
        />
        <main className="main-stage">
          <Header greeting={greeting} randomHeaderQuestion={randomHeaderQuestion} hasStartedChat={hasStartedChat} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

          <div
            className={`content-grid ${hasStartedChat ? "chat-focused" : ""}`}
          >
            <section className="chat-panel" aria-label="LLM chat window">
              <div className="chat-top-bar-container">
                {hasStartedChat && (
                  <button className="return-home-btn" onClick={() => {
                    setActiveView("dashboard");
                    setIsSidebarOpen(true);
                  }} title="Zurück zum Dashboard">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12"></line>
                      <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                  </button>
                )}
                
                <div
                  className="chat-model-bar-inline"
                  aria-label="Model settings"
                >
                  <div className="model-picker">
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
                      <span className="model-chevron">
                        {isModelMenuOpen ? "▴" : "▾"}
                      </span>
                    </button>

                    ﻿{isModelMenuOpen ? (
                      <div className="model-picker-popover popup-menu" onPointerLeave={() => setActiveModelProviderId(null)}>
                        <div className="popup-menu-header" style={{padding: '12px', borderBottom: '1px solid var(--line)'}}>
                          <input type="text" placeholder="Search models" className="popup-search-input" style={{width: '100%', background: 'transparent', border: 'none', color: 'var(--ink-900)', fontSize: '14px', outline: 'none'}} />
                        </div>
                        <ul className="popup-menu-list" style={{margin: 0, padding: '8px 0', listStyle: 'none'}}>
                          {modelProviders.map((provider) => (
                            <li 
                              key={provider.id} 
                              className="popup-menu-item has-submenu"
                              onPointerEnter={() => setActiveModelProviderId(provider.id)}
                              style={{position: 'relative', padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--ink-900)'}}
                            >
                              <div className="popup-menu-item-content" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                {activeModelProviderId === provider.id && <div style={{position:'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: 'var(--accent)', borderRadius: '0 2px 2px 0'}}></div>}
                                <span>{provider.label}</span>
                              </div>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                              
                              {activeModelProviderId === provider.id && (
                                <div className="popup-submenu popup-menu" style={{position: 'absolute', top: 0, left: '100%', marginLeft: '8px', minWidth: '240px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', zIndex: 100}}>
                                  <ul className="popup-menu-list" style={{margin: 0, padding: '8px 0', listStyle: 'none'}}>
                                    {provider.models.map((model) => (
                                      <li key={model.id} className="popup-menu-item" style={{padding: '0'}}>
                                        <button
                                          type="button"
                                          onClick={() => { handleModelSelect(model.id); setActiveModelProviderId(null); setIsModelMenuOpen(false); }}
                                          style={{width: '100%', display: 'flex', alignItems: 'center', padding: '10px 16px', background: 'transparent', border: 'none', color: selectedModelId === model.id ? 'var(--ink-900)' : 'var(--ink-700)', cursor: 'pointer', textAlign: 'left', fontWeight: selectedModelId === model.id ? 600 : 400}}
                                        >
                                          <div style={{width: '16px', display: 'flex', alignItems: 'center', marginRight: '8px'}}>
                                            {selectedModelId === model.id && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                          </div>
                                          {model.label}
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                  </div>
                </div>

                <div className="chat-services-trigger" style={{ position: "relative" }}>
                  <button 
                    className="services-plus-btn" 
                    title="Gathers features like Persona and Faktencheck"
                    onClick={() => {
                      setIsServicesMenuOpen((prev) => !prev);
                      setIsModelMenuOpen(false);
                      setIsAttachMenuOpen(false);
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                  {isServicesMenuOpen ? (
                    <ul className="attach-menu-popover" style={{ top: "100%", left: 0, marginTop: "8px", zIndex: 100 }}>
                      <li>
                        <button type="button" onClick={() => setIsServicesMenuOpen(false)}>Persona</button>
                      </li>
                      <li>
                        <button type="button" onClick={() => setIsServicesMenuOpen(false)}>Faktencheck</button>
                      </li>
                    </ul>
                  ) : null}
                </div>
              </div>

              <div className="chat-log">
                {!hasStartedChat ? (
                  <div className="chat-empty-state">
                    <h2>Wie kann ich dir helfen?</h2>
                  </div>
                ) : null}
                {messages.map((message) => (
                    <article
                      className={`chat-message bubble ${message.role}`}
                      key={message.id}
                    >
                      {message.isThinking && (
                        <details className="reasoning-block">
                          <summary>Thinking Process...</summary>
                          <div className="reasoning-content">{message.reasoning}</div>
                        </details>
                      )}
                      {message.text && <p>{message.text}</p>}
                      <span>{message.time}</span>
                    </article>
                  ))}
                {isTyping && (
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                )}
              </div>

              <div className="chat-input-container">
                <div className="chat-compose-wrap">
                  <form
                    className="chat-form unified-input"
                    onSubmit={handleSendMessage}
                  >
                    <div className="attach-wrapper">
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
                        title="Anhang hinzufügen"
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                      </button>
                      
                      {isAttachMenuOpen ? (
                        <ul className="attach-menu-popover" id="chat-attach-menu">
                          {attachmentActions.map((action) => (
                            <li key={action.id}>
                              <button
                                type="button"
                                onClick={() => handleAttachmentAction(action.id)}
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
                      placeholder="Type a message..."
                      aria-label="Type in message"
                    />

                    <div className="input-separator"></div>

                    {draft.trim().length > 0 ? (
                      <button type="submit" className="send-btn" title="Senden">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                      </button>
                    ) : (
                      <button type="button" className="audio-btn" title="Audio aufnehmen">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                      </button>
                    )}
                  </form>
                </div>
                <p className="chat-disclaimer">
                  Sprachmodelle können Fehler machen. Wichtige Informationen immer überprüfen.
                </p>
              </div>
            </section>

            {!hasStartedChat && (
              
                                <aside className="right-column" aria-label="Recommendation and weather area">
                  <details className="widget-accordion" open>
                    <summary className="widget-accordion-header">Recommended News</summary>
                    <div className="widget-accordion-body" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {recommendedNews.map((headline) => (
                        <div key={headline.id} style={{ display: "flex", gap: "10px", alignItems: "center", padding: "8px", background: "var(--panel)", borderRadius: "8px", border: "1px solid var(--line)", cursor: "pointer" }}>
                          <div style={{ width: "40px", height: "40px", borderRadius: "6px", background: "var(--line)", flexShrink: 0 }} />
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--ink-900)", lineHeight: 1.2 }}>{headline.title}</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--ink-500)" }}>{headline.source}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                  <div className="weather-widget" style={{ background: "var(--panel)", borderRadius: "20px", padding: "20px", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                    <div className="weather-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "var(--ink-900)" }}>Wetter</h4>
                    </div>
                    <div className="weather-stats" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      {weatherStats.map((item) => (
                        <div key={item.label} style={{ background: "var(--bg-1)", padding: "12px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--ink-500)" }}>{item.label}</span>
                          <span style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--ink-900)" }}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </aside>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}









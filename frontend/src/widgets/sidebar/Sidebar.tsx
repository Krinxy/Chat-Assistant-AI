import { useEffect, useMemo, useState } from "react";

import type { ActiveView, Language } from "../../features/chat/types/chat";
import type { UiText } from "../../shared/i18n/uiText";

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeView: ActiveView;
  setActiveView: React.Dispatch<React.SetStateAction<ActiveView>>;
  language: Language;
  setLanguage: React.Dispatch<React.SetStateAction<Language>>;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  copy: UiText["sidebar"];
  activeServiceLabels: string[];
  latestMessagePreview: {
    text: string;
    time: string;
  } | null;
  onStartNewChat: () => void;
}

const navigationItems: Array<{
  key: keyof UiText["sidebar"]["nav"];
  view: ActiveView;
}> = [
  { key: "home", view: "dashboard" },
  { key: "chat", view: "chat" },
  { key: "companies", view: "companies" },
  { key: "recommendations", view: "recommendations" },
  { key: "notifications", view: "notifications" },
  { key: "profile", view: "profile" },
];

const recentChatsByLanguage: Record<
  Language,
  Array<{ id: string; title: string; lastUpdate: string; preview: string }>
> = {
  de: [
    {
      id: "chat-001",
      title: "Weather + Empfehlungen",
      lastUpdate: "09:44",
      preview: "Zeig mir das Wetter in Berlin",
    },
    {
      id: "chat-002",
      title: "Pipeline Fixes",
      lastUpdate: "09:11",
      preview: "Wie kann ich die Jenkins Pipeline beschleunigen?",
    },
    {
      id: "chat-003",
      title: "Dashboard Layout",
      lastUpdate: "08:57",
      preview: "Das Dashboard braucht mehr Farbe.",
    },
    {
      id: "chat-004",
      title: "Service Health Check",
      lastUpdate: "08:38",
      preview: "Sind alle Services online?",
    },
    {
      id: "chat-005",
      title: "Frontend Styling",
      lastUpdate: "08:04",
      preview: "Welches Color Scheme passt gut?",
    },
    {
      id: "chat-006",
      title: "Auth Notes",
      lastUpdate: "Yesterday",
      preview: "Notizen zur Authentifizierung",
    },
    {
      id: "chat-007",
      title: "Model Settings",
      lastUpdate: "Yesterday",
      preview: "Wechsel auf GPT-5.3-Codex",
    },
    {
      id: "chat-008",
      title: "Context Memory",
      lastUpdate: "Yesterday",
      preview: "Erinnere dich an die Konversation",
    },
  ],
  en: [
    {
      id: "chat-001",
      title: "Weather + Recommendations",
      lastUpdate: "09:44",
      preview: "Show me the weather in Berlin",
    },
    {
      id: "chat-002",
      title: "Pipeline Fixes",
      lastUpdate: "09:11",
      preview: "How can I speed up the Jenkins pipeline?",
    },
    {
      id: "chat-003",
      title: "Dashboard Layout",
      lastUpdate: "08:57",
      preview: "The dashboard needs more color.",
    },
    {
      id: "chat-004",
      title: "Service Health Check",
      lastUpdate: "08:38",
      preview: "Are all services online?",
    },
    {
      id: "chat-005",
      title: "Frontend Styling",
      lastUpdate: "08:04",
      preview: "What color scheme fits best?",
    },
    {
      id: "chat-006",
      title: "Auth Notes",
      lastUpdate: "Yesterday",
      preview: "Authentication notes",
    },
    {
      id: "chat-007",
      title: "Model Settings",
      lastUpdate: "Yesterday",
      preview: "Switch to GPT-5.3-Codex",
    },
    {
      id: "chat-008",
      title: "Context Memory",
      lastUpdate: "Yesterday",
      preview: "Remember this conversation",
    },
  ],
};

export function Sidebar({
  isSidebarOpen,
  setIsSidebarOpen,
  activeView,
  setActiveView,
  language,
  setLanguage,
  theme,
  onToggleTheme,
  copy,
  activeServiceLabels,
  latestMessagePreview,
  onStartNewChat,
}: SidebarProps) {
  const [showAllChats, setShowAllChats] = useState<boolean>(false);

  const recentChats = useMemo(() => {
    return recentChatsByLanguage[language];
  }, [language]);

  const [activeRecentChatId, setActiveRecentChatId] = useState<string | null>(
    recentChats[0]?.id ?? null,
  );

  useEffect(() => {
    if (recentChats.length === 0) {
      setActiveRecentChatId(null);
      return;
    }

    setActiveRecentChatId((previous) => {
      if (previous !== null && recentChats.some((chat) => chat.id === previous)) {
        return previous;
      }

      return recentChats[0]?.id ?? null;
    });
  }, [recentChats]);

  useEffect(() => {
    if (activeRecentChatId === null) {
      return;
    }

    const idleTimeoutId = globalThis.setTimeout(() => {
      setActiveRecentChatId(null);
    }, 7200000);

    return () => {
      globalThis.clearTimeout(idleTimeoutId);
    };
  }, [activeRecentChatId]);

  const visibleRecentChats = showAllChats ? recentChats : recentChats.slice(0, 8);

  const currentScopeLabel = useMemo(() => {
    if (activeView === "dashboard") {
      return copy.nav.home;
    }

    if (activeView === "recommendations") {
      return copy.nav.recommendations;
    }

    if (activeView === "companies") {
      return copy.nav.companies;
    }

    if (activeView === "notifications") {
      return copy.nav.notifications;
    }

    if (activeView === "profile") {
      return copy.nav.profile;
    }

    if (activeView === "guide") {
      return copy.featureGuideButton;
    }

    return copy.nav.chat;
  }, [
    activeView,
    copy.featureGuideButton,
    copy.nav.chat,
    copy.nav.companies,
    copy.nav.home,
    copy.nav.notifications,
    copy.nav.profile,
    copy.nav.recommendations,
  ]);

  const currentServicesLabel =
    activeServiceLabels.length > 0
      ? activeServiceLabels.join(", ")
      : copy.noActiveServices;

  return (
    <aside className="left-sidebar" aria-label="Sidebar controls">
      <div className="sidebar-top-row">
        {isSidebarOpen ? (
          <div className="brand-block">
            <div className="brand-copy">
              <h1>AURA</h1>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setIsSidebarOpen((previous) => !previous)}
          aria-label={isSidebarOpen ? "Collapse sidebar" : "Open sidebar"}
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
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      <ul className="nav-list" aria-label="Main navigation">
        {navigationItems.map((item) => {
          const isActive = item.view === activeView;

          return (
            <li
              className={isActive ? "is-active" : ""}
              key={item.key}
              onClick={() => {
                setActiveView(item.view);
              }}
              style={{ cursor: "pointer" }}
            >
              <span>{copy.nav[item.key]}</span>
            </li>
          );
        })}
      </ul>

      {isSidebarOpen ? (
        <section className="sidebar-section sidebar-section-current" aria-label={copy.currentSessionTitle}>
          <div className="sidebar-section-header">
            <p className="sidebar-section-title">{copy.currentSessionTitle}</p>
            <button
              className="new-chat-small-btn"
              title={copy.newChatTitle}
              type="button"
              onClick={() => {
                setActiveRecentChatId(null);
                onStartNewChat();
              }}
            >
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
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          <ul className="sidebar-session-context">
            <li>
              <span>{copy.scopeLabel}</span>
              <strong>{currentScopeLabel}</strong>
            </li>
            <li>
              <span>{copy.servicesLabel}</span>
              <strong title={currentServicesLabel}>{currentServicesLabel}</strong>
            </li>
          </ul>

          {latestMessagePreview === null ? (
            <p className="sidebar-session-empty">{copy.noMessagesYet}</p>
          ) : (
            <article className="sidebar-session-preview" title={latestMessagePreview.text}>
              <p>{latestMessagePreview.text}</p>
              <small>{latestMessagePreview.time}</small>
            </article>
          )}
        </section>
      ) : null}

      {isSidebarOpen ? (
        <section className="sidebar-section sidebar-section-history" aria-label={copy.lastChatsTitle}>
          <div className="sidebar-section-header">
            <p className="sidebar-section-title">{copy.lastChatsTitle}</p>
          </div>

          <ul className="history-list">
            {visibleRecentChats.map((chat) => {
              const isActiveChat = activeView === "chat" && chat.id === activeRecentChatId;

              return (
                <li key={chat.id} title={chat.preview} className="chat-preview-item">
                  <button
                    type="button"
                    className={`history-item${isActiveChat ? " is-active-chat" : ""}`}
                    onClick={() => {
                      setActiveRecentChatId(chat.id);
                      setActiveView("chat");
                    }}
                  >
                    <span>{chat.title}</span>
                    <div className="history-meta">
                      {isActiveChat ? (
                        <em className="history-status-badge is-active">{copy.activeNow}</em>
                      ) : (
                        <small>{chat.lastUpdate}</small>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {recentChats.length > 8 ? (
            <button
              type="button"
              className="more-chats-btn"
              onClick={() => setShowAllChats((previous) => !previous)}
            >
              {showAllChats ? copy.lessChats : copy.moreChats}
            </button>
          ) : null}
        </section>
      ) : null}

      <div className="sidebar-footer-actions">
        <div className={`sidebar-utility-row${isSidebarOpen ? "" : " is-compact"}`}>
          <button
            type="button"
            className={`feature-guide-btn${activeView === "guide" ? " is-active" : ""}${
              isSidebarOpen ? "" : " is-compact"
            }`}
            onClick={() => setActiveView("guide")}
            title={copy.featureGuideButton}
          >
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
              <path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" />
              <line x1="8" y1="7" x2="15" y2="7" />
              <line x1="8" y1="11" x2="15" y2="11" />
            </svg>
            {isSidebarOpen ? <span>{copy.featureGuideButton}</span> : null}
          </button>

          <button
            onClick={onToggleTheme}
            className={`theme-toggle-btn${isSidebarOpen ? "" : " is-compact"}`}
            title={theme === "dark" ? copy.themeLight : copy.themeDark}
            aria-label={theme === "dark" ? copy.themeLight : copy.themeDark}
            type="button"
          >
            {theme === "dark" ? (
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
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
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
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>

        <div className="language-ghost-switch" role="group" aria-label={copy.languageTitle}>
          <button
            type="button"
            className={`language-ghost-btn${language === "de" ? " is-active" : ""}`}
            onClick={() => setLanguage("de")}
            title={copy.languageDe}
          >
            DE
          </button>
          <span>/</span>
          <button
            type="button"
            className={`language-ghost-btn${language === "en" ? " is-active" : ""}`}
            onClick={() => setLanguage("en")}
            title={copy.languageEn}
          >
            EN
          </button>
        </div>

      </div>
    </aside>
  );
}

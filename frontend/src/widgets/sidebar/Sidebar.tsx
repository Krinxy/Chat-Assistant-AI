import { type JSX, useEffect, useMemo, useState } from "react";

import type { ActiveView, Language } from "../../features/chat/types/chat";
import type { UiText } from "../../shared/i18n/uiText";

interface RecentChatItem {
  id: string;
  title: string;
  lastUpdate: string;
  preview: string;
}

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
  onOpenRecentChat: (previewText: string, timeLabel: string) => void;
  onOpenImprint?: () => void;
}

type NavIcon = (props: { className?: string }) => JSX.Element;

const NavIconBase = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <svg
    className={className}
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const HomeIcon: NavIcon = ({ className }) => (
  <NavIconBase className={className}>
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
  </NavIconBase>
);

const ChatIcon: NavIcon = ({ className }) => (
  <NavIconBase className={className}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.1A8 8 0 1 1 21 12z" />
  </NavIconBase>
);

const CompaniesIcon: NavIcon = ({ className }) => (
  <NavIconBase className={className}>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <line x1="8" y1="4" x2="8" y2="21" />
    <line x1="16" y1="4" x2="16" y2="21" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
  </NavIconBase>
);

const RecommendationsIcon: NavIcon = ({ className }) => (
  <NavIconBase className={className}>
    <polygon points="12 2 15 9 22 9 16.5 13.5 18.5 21 12 16.8 5.5 21 7.5 13.5 2 9 9 9 12 2" />
  </NavIconBase>
);

const NotificationsIcon: NavIcon = ({ className }) => (
  <NavIconBase className={className}>
    <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 3h16z" />
    <path d="M10 21a2 2 0 0 0 4 0" />
  </NavIconBase>
);

const DeskIcon: NavIcon = ({ className }) => (
  <NavIconBase className={className}>
    <rect x="2" y="13" width="20" height="8" rx="1" />
    <line x1="6" y1="13" x2="6" y2="21" />
    <line x1="12" y1="3" x2="12" y2="13" />
    <path d="M9 3h6" />
  </NavIconBase>
);

const SettingsIcon: NavIcon = ({ className }) => (
  <NavIconBase className={className}>
    <circle cx="12" cy="12" r="3" />
    <path
      d={
        "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06" +
        "a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09" +
        "a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83" +
        "l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09" +
        "a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83" +
        "l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09" +
        "a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83" +
        "l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09" +
        "a1.65 1.65 0 0 0-1.51 1z"
      }
    />
  </NavIconBase>
);

const navigationItems: Array<{
  key: keyof UiText["sidebar"]["nav"];
  view: ActiveView;
  Icon: NavIcon;
}> = [
  { key: "home", view: "dashboard", Icon: HomeIcon },
  { key: "mydesk", view: "mydesk", Icon: DeskIcon },
  { key: "chat", view: "chat", Icon: ChatIcon },
  { key: "companies", view: "companies", Icon: CompaniesIcon },
  { key: "recommendations", view: "recommendations", Icon: RecommendationsIcon },
  { key: "notifications", view: "notifications", Icon: NotificationsIcon },
  { key: "settings", view: "settings", Icon: SettingsIcon },
];

const seedRecentChatsByLanguage: Record<Language, RecentChatItem[]> = {
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

const formatRecentChatTimestamp = (value: Date, language: Language): string => {
  const locale = language === "de" ? "de-DE" : "en-US";

  return value.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
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
  latestMessagePreview,
  onStartNewChat,
  onOpenRecentChat,
  onOpenImprint,
}: SidebarProps) {
  const [recentChatsByLanguageState, setRecentChatsByLanguageState] = useState<
    Record<Language, RecentChatItem[]>
  >(() => ({
    de: [...seedRecentChatsByLanguage.de],
    en: [...seedRecentChatsByLanguage.en],
  }));

  const recentChats = useMemo(() => {
    return recentChatsByLanguageState[language] ?? [];
  }, [language, recentChatsByLanguageState]);

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
          const { Icon } = item;

          return (
            <li
              className={isActive ? "is-active" : ""}
              key={item.key}
              onClick={() => {
                setActiveView(item.view);
              }}
              style={{ cursor: "pointer" }}
            >
              <Icon className="nav-list-icon" />
              <span>{copy.nav[item.key]}</span>
            </li>
          );
        })}
      </ul>

      {isSidebarOpen ? (
        <section
          className="sidebar-section sidebar-section-history"
          aria-label={copy.lastChatsTitle}
        >
          <div className="sidebar-section-header">
            <p className="sidebar-section-title">{copy.lastChatsTitle}</p>
            <button
              className="new-chat-small-btn"
              title={copy.newChatTitle}
              type="button"
              onClick={() => {
                const nextChatId = `chat-${Date.now()}`;
                const now = new Date();
                const latestPreviewText = latestMessagePreview?.text.trim() ?? "";

                setRecentChatsByLanguageState((previous) => ({
                  de: [
                    {
                      id: nextChatId,
                      title: "Neue Session",
                      lastUpdate: formatRecentChatTimestamp(now, "de"),
                      preview:
                        latestPreviewText.length > 0
                          ? latestPreviewText
                          : "Neue Session gestartet",
                    },
                    ...previous.de,
                  ].slice(0, 40),
                  en: [
                    {
                      id: nextChatId,
                      title: "New session",
                      lastUpdate: formatRecentChatTimestamp(now, "en"),
                      preview:
                        latestPreviewText.length > 0
                          ? latestPreviewText
                          : "Started a new session",
                    },
                    ...previous.en,
                  ].slice(0, 40),
                }));

                setActiveRecentChatId(nextChatId);
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

          <ul className="history-list history-list-scrollable">
            {recentChats.map((chat) => {
              const isActiveChat = activeView === "chat" && chat.id === activeRecentChatId;

              return (
                <li key={chat.id} title={chat.preview} className="chat-preview-item">
                  <button
                    type="button"
                    className={`history-item${isActiveChat ? " is-active-chat" : ""}`}
                    onClick={() => {
                      setActiveRecentChatId(chat.id);
                      onOpenRecentChat(chat.preview, chat.lastUpdate);
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

        {isSidebarOpen ? (
          <a
            href="/impressum"
            className="sidebar-imprint-link"
            onClick={(event) => {
              event.preventDefault();
              onOpenImprint?.();
            }}
          >
            {copy.imprint}
          </a>
        ) : null}

      </div>
    </aside>
  );
}

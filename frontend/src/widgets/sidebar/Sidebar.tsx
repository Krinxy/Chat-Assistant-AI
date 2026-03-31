import { useState } from "react";

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  hasStartedChat: boolean;
  activeView: "dashboard" | "chat";
  setActiveView: React.Dispatch<React.SetStateAction<"dashboard" | "chat">>;
}

const navigationItems: string[] = ["Home", "Chat", "Recommendations", "Notifications", "Profile"];

const recentChats = [
  { id: "chat-001", title: "Weather + Recommendations", lastUpdate: "09:44", preview: "Zeig mir das Wetter in Berlin" },
  { id: "chat-002", title: "Pipeline Fixes", lastUpdate: "09:11", preview: "Wie kann ich die Jenkins Pipeline beschleunigen?" },
  { id: "chat-003", title: "Dashboard Layout", lastUpdate: "08:57", preview: "Das Dashboard braucht mehr Farbe." },
  { id: "chat-004", title: "Service Health Check", lastUpdate: "08:38", preview: "Sind alle Services online?" },
  { id: "chat-005", title: "Frontend Styling", lastUpdate: "08:04", preview: "Welches Color Scheme passt gut?" },
  { id: "chat-006", title: "Auth Notes", lastUpdate: "Yesterday", preview: "Notizen zur Authentifizierung" },
  { id: "chat-007", title: "Model Settings", lastUpdate: "Yesterday", preview: "Wechsel auf GPT-4" },
  { id: "chat-008", title: "Context Memory", lastUpdate: "Yesterday", preview: "Erinnere dich an die Konversation" },
];

export function Sidebar({ isSidebarOpen, setIsSidebarOpen, hasStartedChat, activeView, setActiveView }: SidebarProps) {
  const [showAllChats, setShowAllChats] = useState(false);
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'light');
  const visibleRecentChats = showAllChats ? recentChats : recentChats.slice(0, 8);

  // If chat is running, hide sidebar logic slightly different if needed, or fully hide.
  // if (!isSidebarOpen) return null; // Removed to let CSS handle grid track collapse properly

  return (
    <aside className="left-sidebar" aria-label="Sidebar controls">
      <div className="sidebar-top-row">
        <div className="brand-block">
          <div className="brand-copy">
            <h1>AURA</h1>
          </div>
        </div>

        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setIsSidebarOpen((previous) => !previous)}
          aria-label="Sidebar einklappen"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>

      <ul className="nav-list" aria-label="Main navigation">
        {navigationItems.map((item) => (
          <li 
            className={
              (item.toLowerCase() === activeView) || 
              (item === "Home" && activeView === "dashboard") 
                ? "is-active" 
                : ""
            } 
            key={item}
            onClick={() => {
              if (item === "Home") {
                setActiveView("dashboard");
              } else if (item === "Chat") {
                setActiveView("chat");
              }
            }}
            style={{ cursor: "pointer" }}
          >
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {(true) && (
        <section className="sidebar-card" aria-label="Letzte Chats">
          <div className="sidebar-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <p className="sidebar-section-title" style={{ margin: 0 }}>Letzte Chats</p>
            <button className="new-chat-small-btn" title="Neuer Chat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>
          <ul className="history-list">
              {visibleRecentChats.map((chat) => (
                <li key={chat.id} title={chat.preview} className="chat-preview-item">
                  <button type="button" className="history-item">
                    <span>{chat.title}</span>
                    <small>{chat.lastUpdate}</small>
                  </button>
                </li>
              ))}
            </ul>

            {recentChats.length > 8 ? (
              <button
                type="button"
                className="more-chats-btn"
                onClick={() => setShowAllChats((previous) => !previous)}
              >
                {showAllChats ? "Weniger anzeigen" : "Mehr anzeigen"}
              </button>
            ) : null}
          </section>
      )}

      <div style={{ marginTop: 'auto', display: 'flex' }}>
        <button
          onClick={() => {
            const next = theme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            setTheme(next);
          }}
          className="theme-toggle-btn"
          title="Toggle Theme"
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            cursor: 'pointer',
            padding: '8px 12px',
            color: 'var(--ink-700)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            justifyContent: 'center',
            fontWeight: 500,
            fontSize: '0.85rem'
          }}
        >
          {theme === 'dark' ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
              <span className="theme-toggle-text">Light Mode</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
              <span className="theme-toggle-text">Dark Mode</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

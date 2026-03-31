import React from "react";

interface HeaderProps {
  greeting: string;
  randomHeaderQuestion: string;
  hasStartedChat: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function Header({
  greeting,
  randomHeaderQuestion,
  hasStartedChat,
  isSidebarOpen,
  setIsSidebarOpen,
}: HeaderProps) {
  return (
    <header className={`top-bar ${hasStartedChat ? "chat-active" : ""}`}>
      <div
        className="greeting-block"
        style={{ display: "flex", alignItems: "center", gap: "16px" }}
      >
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {hasStartedChat && (
              <span
                className="brand-logo-combined"
                style={{
                  fontWeight: "bold",
                  fontSize: "1.2rem",
                  color: "var(--accent-1)",
                }}
              >
                AURA
              </span>
            )}
            {!hasStartedChat && `${greeting}, Dominic`}
          </h2>
          {!hasStartedChat && (
            <p className="header-question">{randomHeaderQuestion}</p>
          )}
        </div>
      </div>

      <div className="profile-chip" aria-label="Signed in profile">
        <div
          className="profile-avatar"
          aria-hidden="true"
          title="Dominic Bechtold"
        >
          DB
        </div>
        {!hasStartedChat && (
          <div>
            <p className="profile-name">Dominic Bechtold</p>
            <p className="profile-role">Softwarearchitekt</p>
          </div>
        )}
      </div>
    </header>
  );
}

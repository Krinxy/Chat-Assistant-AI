interface HeaderProps {
  greeting: string;
  randomHeaderQuestion: string;
  hasStartedChat: boolean;
  showChatBrand: boolean;
  profileRole: string;
  onOpenProfile: () => void;
}

export function Header({
  greeting,
  randomHeaderQuestion,
  hasStartedChat,
  showChatBrand,
  profileRole,
  onOpenProfile,
}: HeaderProps) {
  return (
    <header className={`top-bar ${hasStartedChat ? "chat-active" : ""}`}>
      <div className="greeting-block">
        <div>
          <h2 className="greeting-heading">
            {hasStartedChat && showChatBrand && (
              <span className="brand-logo-combined">
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

      <button
        type="button"
        className={`profile-chip profile-chip-btn ${hasStartedChat ? "is-compact" : ""}`}
        aria-label="Open profile"
        onClick={onOpenProfile}
      >
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
            <p className="profile-role">{profileRole}</p>
          </div>
        )}
      </button>
    </header>
  );
}

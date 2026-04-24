import type { Language } from "../../features/chat/types/chat";
import { ACTIVE_DEV_PROFILE } from "../../shared/constants/devProfiles";

interface UserProfilePanelProps {
  language: Language;
  onOpenSettings: () => void;
}

export function UserProfilePanel({ language, onOpenSettings }: UserProfilePanelProps) {
  const copy = language === "de"
    ? {
        title: "Profil",
        subtitle: "Dein Account auf einen Blick.",
        emailLabel: "E-Mail",
        roleLabel: "Rolle",
        userIdLabel: "User-ID",
        openSettings: "Einstellungen öffnen",
        bannerLabel: "Angemeldet als",
      }
    : {
        title: "Profile",
        subtitle: "Your account at a glance.",
        emailLabel: "Email",
        roleLabel: "Role",
        userIdLabel: "User ID",
        openSettings: "Open settings",
        bannerLabel: "Signed in as",
      };

  return (
    <section className="profile-panel user-profile-panel" aria-label={copy.title}>
      <header className="profile-panel-header">
        <div className="profile-panel-title-wrap">
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
      </header>

      <article className="user-profile-banner">
        <div className="user-profile-banner-avatar" aria-hidden="true">
          {ACTIVE_DEV_PROFILE.initials}
        </div>
        <div className="user-profile-banner-text">
          <span className="user-profile-banner-kicker">{copy.bannerLabel}</span>
          <strong>{ACTIVE_DEV_PROFILE.fullName}</strong>
          <small>{ACTIVE_DEV_PROFILE.role}</small>
        </div>
      </article>

      <dl className="user-profile-facts">
        <div>
          <dt>{copy.emailLabel}</dt>
          <dd>{ACTIVE_DEV_PROFILE.email}</dd>
        </div>
        <div>
          <dt>{copy.roleLabel}</dt>
          <dd>{ACTIVE_DEV_PROFILE.role}</dd>
        </div>
        <div>
          <dt>{copy.userIdLabel}</dt>
          <dd>{ACTIVE_DEV_PROFILE.id}</dd>
        </div>
      </dl>

      <button
        type="button"
        className="user-profile-settings-btn"
        onClick={onOpenSettings}
      >
        {copy.openSettings}
      </button>
    </section>
  );
}

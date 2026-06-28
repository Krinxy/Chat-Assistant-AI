import type { Language } from "../../chat/types/chat";
import type { InviteDecision, InviteNotification, NotificationFeedItem } from "../hooks/useInviteNotifications";

interface NotificationsPanelProps {
  language: Language;
  inviteNotifications: InviteNotification[];
  notificationFeed: NotificationFeedItem[];
  onRsvpDecision: (appointmentId: string, decision: InviteDecision) => void;
}

export function NotificationsPanel({
  language,
  inviteNotifications,
  notificationFeed,
  onRsvpDecision,
}: NotificationsPanelProps) {
  const isDE = language === "de";

  return (
    <section
      className="utility-view-panel notifications-panel"
      aria-label={isDE ? "Benachrichtigungen" : "Notifications"}
    >
      <header className="utility-view-header">
        <h2>{isDE ? "Benachrichtigungen" : "Notifications"}</h2>
      </header>

      <div className="notifications-layout">
        <article className="notifications-block">
          <h3>{isDE ? "Termin-Einladungen" : "Appointment invites"}</h3>
          <ul className="notifications-list">
            {inviteNotifications.map((invite) => (
              <li key={invite.id} className="notifications-item">
                <div className="notifications-item-content">
                  <strong>{invite.title}</strong>
                  <p>
                    {invite.dayLabel} · {invite.timeLabel}
                    {invite.endTimeLabel !== undefined ? `-${invite.endTimeLabel}` : ""}
                    {invite.invitedBy !== undefined ? ` · ${isDE ? "von" : "by"} ${invite.invitedBy}` : ""}
                  </p>
                  {invite.status === "pending" ? (
                    <div className="notifications-rsvp-actions">
                      <button
                        type="button"
                        className="notifications-rsvp-btn notifications-rsvp-btn--accept"
                        onClick={() => onRsvpDecision(invite.id, "accepted")}
                      >
                        {isDE ? "Annehmen" : "Accept"}
                      </button>
                      <button
                        type="button"
                        className="notifications-rsvp-btn notifications-rsvp-btn--decline"
                        onClick={() => onRsvpDecision(invite.id, "declined")}
                      >
                        {isDE ? "Ablehnen" : "Decline"}
                      </button>
                    </div>
                  ) : null}
                </div>
                <span className={`notifications-status notifications-status--${invite.status}`}>
                  {invite.status === "pending"
                    ? isDE
                      ? "Offen"
                      : "Pending"
                    : invite.status === "accepted"
                      ? isDE
                        ? "Zugesagt"
                        : "Accepted"
                      : isDE
                        ? "Abgesagt"
                        : "Declined"}
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className="notifications-block">
          <h3>{isDE ? "Live Feed" : "Live feed"}</h3>
          {notificationFeed.length === 0 ? (
            <p className="notifications-empty">
              {isDE
                ? "Sobald du unter Desk auf Einladungen reagierst, erscheinen Events hier live."
                : "As soon as you respond to invites in Desk, events appear here live."}
            </p>
          ) : (
            <ul className="notifications-list">
              {notificationFeed.map((entry) => (
                <li key={entry.id} className="notifications-item notifications-item--feed">
                  <div>
                    <strong>{entry.title}</strong>
                    <p>{entry.detail}</p>
                  </div>
                  <time>{entry.timestamp}</time>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </section>
  );
}

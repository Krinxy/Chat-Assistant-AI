import { useCallback, useMemo, useState } from "react";

import {
  personalAppointments,
  weekdayLabelsByLanguage,
} from "../../../pages/CompanyWorkspacePage/companyWorkspace.data";
import type { ParsedAppointmentItem } from "../../../pages/CompanyWorkspacePage/companyWorkspace.types";
import type { Language } from "../../chat/types/chat";

export type InviteDecision = "accepted" | "declined";
type InviteStatus = "pending" | InviteDecision;

export interface NotificationFeedItem {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
}

export interface InviteNotification extends ParsedAppointmentItem {
  status: InviteStatus;
  dayLabel: string;
}

interface UseInviteNotificationsOptions {
  language: Language;
  onSnackbar: (message: string) => void;
}

export function useInviteNotifications({ language, onSnackbar }: UseInviteNotificationsOptions) {
  const [deskRsvpDecisions, setDeskRsvpDecisions] = useState<Record<string, InviteDecision>>({});
  const [notificationFeed, setNotificationFeed] = useState<NotificationFeedItem[]>([]);

  const inviteNotifications = useMemo<InviteNotification[]>(() => {
    const weekDays = weekdayLabelsByLanguage[language];
    const invites = personalAppointments
      .filter((appointment) => appointment.invitedBy !== undefined)
      .map((appointment) => {
        const status: InviteStatus = deskRsvpDecisions[appointment.id] ?? appointment.rsvp ?? "pending";
        return {
          ...appointment,
          status,
          dayLabel: weekDays[appointment.dayIndex] ?? "",
        };
      });

    return invites.sort(
      (a, b) => a.weekIndex - b.weekIndex || a.dayIndex - b.dayIndex || a.timeLabel.localeCompare(b.timeLabel),
    );
  }, [deskRsvpDecisions, language]);

  const handleDeskRsvpDecision = useCallback(
    (appointmentId: string, decision: InviteDecision): void => {
      setDeskRsvpDecisions((previous) => ({ ...previous, [appointmentId]: decision }));
      const appointment = personalAppointments.find((entry) => entry.id === appointmentId);
      if (appointment === undefined) {
        return;
      }

      const actionLabel =
        language === "de"
          ? decision === "accepted"
            ? "zugesagt"
            : "abgesagt"
          : decision === "accepted"
            ? "accepted"
            : "declined";
      const actorLabel = language === "de" ? "Du hast" : "You";
      const message = `${actorLabel} ${actionLabel}: ${appointment.title}`;

      setNotificationFeed((previous) =>
        [
          {
            id: `${appointmentId}-${Date.now()}`,
            title: message,
            detail: `${appointment.timeLabel}${appointment.endTimeLabel !== undefined ? ` - ${appointment.endTimeLabel}` : ""}`,
            timestamp: new Date().toLocaleTimeString(language === "de" ? "de-DE" : "en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
          ...previous,
        ].slice(0, 16),
      );

      onSnackbar(message);
    },
    [language, onSnackbar],
  );

  return { deskRsvpDecisions, notificationFeed, inviteNotifications, handleDeskRsvpDecision };
}

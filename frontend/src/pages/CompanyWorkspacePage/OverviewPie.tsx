import type { Language } from "../../features/chat/types/chat";

interface OverviewPieProps {
  openQuestions: number;
  pendingMeetings: number;
  language: Language;
}

export function OverviewPie({ openQuestions, pendingMeetings, language }: OverviewPieProps) {
  const total = Math.max(1, openQuestions + pendingMeetings);
  const openSliceDegree = (openQuestions / total) * 360;

  const openLabel = language === "de" ? "Offene Fragen" : "Open questions";
  const meetingLabel = language === "de" ? "Offene Meetings" : "Open meetings";

  return (
    <div className="company-overview-pie-wrap">
      <div
        className="company-overview-pie"
        style={{
          background: `conic-gradient(
            var(--feature-lilac) 0deg ${openSliceDegree}deg,
            color-mix(in srgb, var(--accent-3) 68%, var(--panel-solid)) ${openSliceDegree}deg 360deg
          )`,
        }}
        aria-label="Open item split"
      >
        <span>{openQuestions + pendingMeetings}</span>
      </div>

      <ul className="company-overview-legend">
        <li>
          <em className="company-legend-dot is-open" />
          <span>{openLabel}</span>
          <strong>{openQuestions}</strong>
        </li>
        <li>
          <em className="company-legend-dot is-meeting" />
          <span>{meetingLabel}</span>
          <strong>{pendingMeetings}</strong>
        </li>
      </ul>
    </div>
  );
}

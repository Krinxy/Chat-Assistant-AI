import type { Language } from "../../features/chat/types/chat";

interface OverviewMetricsProps {
  openQuestions: number;
  completedQuestions: number;
  pendingMeetings: number;
  completedMeetings: number;
  hypothesesCount: number;
  confirmedHypotheses: number;
  unconfirmedHypotheses: number;
  language: Language;
}

function Donut({ pct, color }: { pct: number; color: string }) {
  const r = 15;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="ov-donut" aria-hidden="true">
      <circle cx="20" cy="20" r={r} fill="none" strokeWidth="4" className="ov-donut-track" />
      <circle
        cx="20" cy="20" r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={`${dash.toFixed(2)} ${circ.toFixed(2)}`}
        strokeLinecap="round"
        transform="rotate(-90 20 20)"
        className="ov-donut-fill"
      />
      <text x="20" y="24" textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>
        {pct}%
      </text>
    </svg>
  );
}

export function OverviewMetrics({
  openQuestions,
  completedQuestions,
  pendingMeetings,
  completedMeetings,
  hypothesesCount,
  confirmedHypotheses,
  unconfirmedHypotheses,
  language,
}: OverviewMetricsProps) {
  const totalQ = openQuestions + completedQuestions;
  const totalM = pendingMeetings + completedMeetings;
  const pctQ = totalQ > 0 ? Math.round((completedQuestions / totalQ) * 100) : 0;
  const pctM = totalM > 0 ? Math.round((completedMeetings / totalM) * 100) : 0;
  const pendingHypotheses = hypothesesCount - confirmedHypotheses - unconfirmedHypotheses;

  const t = language === "de"
    ? {
        questions: "Fragen",
        meetings: "Meetings",
        completed: "Abgeschlossen",
        open: "Offen",
        pending: "Ausstehend",
        done: "Erledigt",
        hypotheses: "Hypothesen",
        confirmed: "bestätigt",
        unconfirmed: "widerlegt",
        pendingLabel: "ausstehend",
      }
    : {
        questions: "Questions",
        meetings: "Meetings",
        completed: "Completed",
        open: "Open",
        pending: "Pending",
        done: "Done",
        hypotheses: "Hypotheses",
        confirmed: "confirmed",
        unconfirmed: "refuted",
        pendingLabel: "pending",
      };

  return (
    <div className="ov-metrics-root">

      {/* Questions card */}
      <div className="ov-stat-card">
        <div className="ov-stat-card-inner">
          <Donut pct={pctQ} color="#7c6af7" />
          <div className="ov-stat-card-content">
            <span className="ov-stat-label">{t.questions}</span>
            <div className="ov-stat-row">
              <span className="ov-stat-chip ov-stat-chip--done">{completedQuestions} {t.completed}</span>
              <span className="ov-stat-chip">{openQuestions} {t.open}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Meetings card */}
      <div className="ov-stat-card">
        <div className="ov-stat-card-inner">
          <Donut pct={pctM} color="#a78bfa" />
          <div className="ov-stat-card-content">
            <span className="ov-stat-label">{t.meetings}</span>
            <div className="ov-stat-row">
              <span className="ov-stat-chip ov-stat-chip--done">{completedMeetings} {t.done}</span>
              <span className="ov-stat-chip">{pendingMeetings} {t.pending}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hypotheses card */}
      {hypothesesCount > 0 && (
        <div className="ov-hypo-card">
          <div className="ov-hypo-card-header">
            <svg className="ov-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a7 7 0 0 1 7 7c0 2.62-1.54 4.9-3.8 6.06L14 18H10l-.2-2.94A7.01 7.01 0 0 1 5 9a7 7 0 0 1 7-7z" />
              <line x1="9" y1="21" x2="15" y2="21" />
            </svg>
            <span className="ov-stat-label">{t.hypotheses}</span>
            <strong className="ov-hypo-total">{hypothesesCount}</strong>
          </div>
          <div className="ov-hypo-chips">
            {confirmedHypotheses > 0 && (
              <span className="ov-hypo-chip ov-hypo-chip--ok">
                {confirmedHypotheses} {t.confirmed}
              </span>
            )}
            {unconfirmedHypotheses > 0 && (
              <span className="ov-hypo-chip ov-hypo-chip--no">
                {unconfirmedHypotheses} {t.unconfirmed}
              </span>
            )}
            {pendingHypotheses > 0 && (
              <span className="ov-hypo-chip ov-hypo-chip--pending">
                {pendingHypotheses} {t.pendingLabel}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

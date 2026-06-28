import { useCallback, useRef, useState } from "react";

import { weekdayLabelsByLanguage } from "./companyWorkspace.data";
import { OverviewMetrics } from "./OverviewMetrics";
import type { CompanyWorkspaceText } from "./companyWorkspace.text";
import type { CompanyRecord, HypothesisEntry, ParsedAppointmentItem } from "./companyWorkspace.types";
import type { Language } from "../../features/chat/types/chat";

const OV_WIDGET_DEFAULT_ORDER = ["metrics", "events", "scopes", "kpis"] as const;
type OverviewWidgetId = typeof OV_WIDGET_DEFAULT_ORDER[number];

interface OverviewTabContentProps {
  selectedCompany: CompanyRecord;
  language: Language;
  appointmentItems: ParsedAppointmentItem[];
  activeHypotheses: HypothesisEntry[];
  text: CompanyWorkspaceText;
}

export function OverviewTabContent({ selectedCompany, language, appointmentItems, activeHypotheses, text }: OverviewTabContentProps) {
  const [overviewWidgetOrder, setOverviewWidgetOrder] = useState<OverviewWidgetId[]>(() => {
    try {
      const stored = localStorage.getItem("aura_ov_widget_order");
      if (stored) {
        const parsed = JSON.parse(stored) as OverviewWidgetId[];
        if (Array.isArray(parsed) && parsed.length === OV_WIDGET_DEFAULT_ORDER.length) {
          return parsed;
        }
      }
    } catch { /* ignore */ }
    return [...OV_WIDGET_DEFAULT_ORDER];
  });
  const ovDragWidget = useRef<OverviewWidgetId | null>(null);
  const ovDragOverWidget = useRef<OverviewWidgetId | null>(null);
  const [ovDragActive, setOvDragActive] = useState<OverviewWidgetId | null>(null);
  const [ovDragOver, setOvDragOver] = useState<OverviewWidgetId | null>(null);

  const handleOvDragStart = useCallback((id: OverviewWidgetId) => {
    ovDragWidget.current = id;
    setOvDragActive(id);
  }, []);

  const handleOvDragOver = useCallback((id: OverviewWidgetId) => {
    ovDragOverWidget.current = id;
    setOvDragOver(id);
  }, []);

  const handleOvDrop = useCallback(() => {
    const from = ovDragWidget.current;
    const to = ovDragOverWidget.current;
    if (from && to && from !== to) {
      setOverviewWidgetOrder((prev) => {
        const next = [...prev];
        const fromIdx = next.indexOf(from);
        const toIdx = next.indexOf(to);
        next.splice(fromIdx, 1);
        next.splice(toIdx, 0, from);
        try { localStorage.setItem("aura_ov_widget_order", JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    }
    ovDragWidget.current = null;
    ovDragOverWidget.current = null;
    setOvDragActive(null);
    setOvDragOver(null);
  }, []);

  const handleOvDragEnd = useCallback(() => {
    ovDragWidget.current = null;
    ovDragOverWidget.current = null;
    setOvDragActive(null);
    setOvDragOver(null);
  }, []);

  const handleOvMoveUp = useCallback((id: OverviewWidgetId) => {
    setOverviewWidgetOrder((prev) => {
      const next = [...prev];
      const idx = next.indexOf(id);
      if (idx <= 0) return prev;
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      try { localStorage.setItem("aura_ov_widget_order", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const handleOvMoveDown = useCallback((id: OverviewWidgetId) => {
    setOverviewWidgetOrder((prev) => {
      const next = [...prev];
      const idx = next.indexOf(id);
      if (idx >= next.length - 1) return prev;
      [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
      try { localStorage.setItem("aura_ov_widget_order", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const totalOpen = selectedCompany.openQuestions + selectedCompany.pendingMeetings;
  const avgResponseHours = Math.max(0.8, 3.2 - selectedCompany.pendingMeetings * 0.35);
  const completionRate = Math.max(52, 100 - totalOpen * 3);
  const priorityLabel = totalOpen >= 10
    ? text.kpiThreeHigh
    : totalOpen >= 6
      ? text.kpiThreeMedium
      : text.kpiThreeLow;
  const scopeProgress = [
    {
      id: "scope-discovery",
      label: text.scopeDiscovery,
      value: Math.min(100, Math.max(24, Math.round(34 + activeHypotheses.length * 17))),
    },
    {
      id: "scope-validation",
      label: text.scopeValidation,
      value: Math.min(100, Math.max(26, Math.round(completionRate - selectedCompany.pendingMeetings * 2))),
    },
    {
      id: "scope-delivery",
      label: text.scopeDelivery,
      value: Math.min(
        100,
        Math.max(22, Math.round(28 + selectedCompany.documents.length * 10 + selectedCompany.appointments.length * 7)),
      ),
    },
  ];
  const scopeCoverage = Math.round(
    scopeProgress.reduce((sum, item) => sum + item.value, 0) / Math.max(1, scopeProgress.length),
  );
  const nextAppointment = appointmentItems
    .slice()
    .sort((a, b) => a.dayIndex - b.dayIndex || a.timeLabel.localeCompare(b.timeLabel))[0];
  const weekDayLabels = weekdayLabelsByLanguage[language];

  const ovWidgets: Record<string, JSX.Element> = {
    metrics: (
      <div className="company-overview-block">
        <OverviewMetrics
          openQuestions={selectedCompany.openQuestions}
          completedQuestions={selectedCompany.completedQuestions}
          pendingMeetings={selectedCompany.pendingMeetings}
          completedMeetings={selectedCompany.completedMeetings}
          hypothesesCount={activeHypotheses.length}
          confirmedHypotheses={activeHypotheses.filter((h) => h.status === "confirmed").length}
          unconfirmedHypotheses={activeHypotheses.filter((h) => h.status === "unconfirmed").length}
          language={language}
        />
        <div className="company-overview-focus-grid">
          <article className="company-overview-focus-card">
            <span>{text.openLabel}</span>
            <strong>{selectedCompany.openQuestions}</strong>
            <small>{language === "de" ? "Offene Fragen im Backlog" : "Open questions in backlog"}</small>
          </article>
          <article className="company-overview-focus-card">
            <span>{text.meetingsLabel}</span>
            <strong>{selectedCompany.pendingMeetings}</strong>
            <small>{language === "de" ? "Ausstehende Meeting-Entscheidungen" : "Pending meeting decisions"}</small>
          </article>
        </div>
      </div>
    ),
    events: (
      <div className="company-overview-block company-overview-block--events">
        <h4>{text.recentEventsTitle}</h4>
        {nextAppointment !== undefined && (
          <div className="ov-next-appointment">
            <span className="ov-next-apt-badge">
              {language === "de" ? "Nächster Termin" : "Next meeting"}
            </span>
            <div className="ov-next-apt-body">
              <time>{weekDayLabels[nextAppointment.dayIndex]} · {nextAppointment.timeLabel}</time>
              <strong>{nextAppointment.title}</strong>
              {nextAppointment.attendees.length > 0 && (
                <div className="ov-next-apt-attendees">
                  {nextAppointment.attendees.map((a) => (
                    <span key={a} className="ov-apt-chip">{a}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        <ul className="company-detail-list company-detail-list-lined">
          {selectedCompany.recentEvents.map((eventText) => {
            const colonIdx = eventText.indexOf(":");
            const hasLabel = colonIdx > 0 && colonIdx < 20;
            return (
              <li key={eventText} className="recent-event-item">
                <span className="recent-event-dot" aria-hidden="true" />
                {hasLabel ? (
                  <>
                    <span className="recent-event-time">{eventText.slice(0, colonIdx)}</span>
                    <span className="recent-event-text">{eventText.slice(colonIdx + 1).trimStart()}</span>
                  </>
                ) : (
                  <span className="recent-event-text">{eventText}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    ),
    scopes: (
      <div className="company-overview-scopes-wrap">
        <div className="company-overview-block company-overview-progress-block">
          <h4>{text.overviewScopeTitle}</h4>
          <ul className="company-scope-progress-list">
            {scopeProgress.map((scope) => (
              <li key={scope.id}>
                <div className="company-scope-progress-head">
                  <span>{scope.label}</span>
                  <strong>{scope.value}%</strong>
                </div>
                <div className="company-scope-progress-track" aria-label={`${scope.label} ${scope.value}%`}>
                  <span className="company-scope-progress-fill" style={{ width: `${scope.value}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="company-overview-priority-stack">
          <article className="company-overview-kpi-card company-overview-kpi-card-spotlight">
            <span>{text.kpiThreeLabel}</span>
            <strong>{priorityLabel}</strong>
            <small>{text.kpiThreeHint}</small>
          </article>
          <article className="company-overview-kpi-card company-overview-kpi-card-spotlight">
            <span>{text.kpiFourLabel}</span>
            <strong>{scopeCoverage}%</strong>
            <small>{text.kpiFourHint}</small>
          </article>
        </div>
      </div>
    ),
    kpis: (
      <div className="company-overview-kpi-grid">
        <article className="company-overview-kpi-card">
          <span>{text.kpiOneLabel}</span>
          <strong>{avgResponseHours.toFixed(1)}h</strong>
          <small>{text.kpiOneHint}</small>
        </article>
        <article className="company-overview-kpi-card">
          <span>{text.kpiTwoLabel}</span>
          <strong>{completionRate}%</strong>
          <small>{text.kpiTwoHint}</small>
        </article>
        <article className="company-overview-kpi-card">
          <span>{text.openLabel}</span>
          <strong>{selectedCompany.openQuestions}</strong>
          <small>{text.openKpiHint}</small>
        </article>
        <article className="company-overview-kpi-card">
          <span>{text.meetingsLabel}</span>
          <strong>{selectedCompany.pendingMeetings}</strong>
          <small>{text.meetingsKpiHint}</small>
        </article>
      </div>
    ),
  };

  return (
    <div className="company-overview-widget-stack">
      {overviewWidgetOrder.map((id, idx) => (
        <div
          key={id}
          className={[
            "ov-widget",
            ovDragActive === id ? "ov-widget--dragging" : "",
            ovDragOver === id && ovDragActive !== id ? "ov-widget--drag-over" : "",
          ].filter(Boolean).join(" ")}
          draggable
          onDragStart={() => handleOvDragStart(id)}
          onDragOver={(e) => { e.preventDefault(); handleOvDragOver(id); }}
          onDrop={handleOvDrop}
          onDragEnd={handleOvDragEnd}
        >
          <div className="ov-widget-controls">
            <span className="ov-drag-handle" aria-hidden="true">⠿</span>
            <div className="ov-move-btns">
              <button
                type="button"
                className="ov-move-btn"
                disabled={idx === 0}
                onClick={() => handleOvMoveUp(id)}
                aria-label="Move up"
              >▲</button>
              <button
                type="button"
                className="ov-move-btn"
                disabled={idx === overviewWidgetOrder.length - 1}
                onClick={() => handleOvMoveDown(id)}
                aria-label="Move down"
              >▼</button>
            </div>
          </div>
          {ovWidgets[id]}
        </div>
      ))}
    </div>
  );
}

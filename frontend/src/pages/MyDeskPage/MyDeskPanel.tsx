import { useMemo, useState } from "react";

import type { Language } from "../../features/chat/types/chat";
import { ACTIVE_DEV_PROFILE } from "../../shared/constants/devProfiles";
import { CompanyAppointmentsTab } from "../CompanyWorkspacePage/CompanyAppointmentsTab";
import {
  companyRecords,
  weekdayLabelsByLanguage,
} from "../CompanyWorkspacePage/companyWorkspace.data";
import { getCompanyWorkspaceText } from "../CompanyWorkspacePage/companyWorkspace.text";
import type { CompanyRecord, ParsedAppointmentItem } from "../CompanyWorkspacePage/companyWorkspace.types";
import {
  parseAppointmentItem,
  readDbAssignedRole,
} from "../CompanyWorkspacePage/companyWorkspace.utils";

type DeskTab = "overview" | "appointments" | "companies";

interface MyDeskPanelProps {
  language: Language;
}

export function MyDeskPanel({ language }: MyDeskPanelProps) {
  const text = useMemo(() => getCompanyWorkspaceText(language), [language]);
  const [assignedRole] = useState(readDbAssignedRole);
  const [activeTab, setActiveTab] = useState<DeskTab>("overview");

  const copy =
    language === "de"
      ? {
          title: "Mein Schreibtisch",
          subtitle: "Dein persönlicher Überblick.",
          tabs: {
            overview: "Überblick",
            appointments: "Termine",
            companies: "Meine Firmen",
          },
          bannerLabel: "Angemeldet als",
          kpiCompanies: "Zugeordnete Firmen",
          kpiAppointments: "Termine diese Woche",
          kpiOpenQuestions: "Offene Fragen",
          kpiPendingMeetings: "Ausstehende Meetings",
          nextAppointmentTitle: "Nächster Termin heute",
          nextAppointmentNone: "Keine weiteren Termine heute.",
          companiesTitle: "Firmen im Überblick",
          companiesEmpty: "Keine Firmen für deine Rolle gefunden.",
          appointmentsEmpty: "Keine Termine für deine Rolle gefunden.",
          openLabel: "Offen",
          meetingsLabel: "Meetings",
          segmentLabel: "Segment",
          ownerLabel: "Owner",
        }
      : {
          title: "My Desk",
          subtitle: "Your personal overview.",
          tabs: {
            overview: "Overview",
            appointments: "Appointments",
            companies: "My Companies",
          },
          bannerLabel: "Signed in as",
          kpiCompanies: "Assigned Companies",
          kpiAppointments: "Appointments this week",
          kpiOpenQuestions: "Open Questions",
          kpiPendingMeetings: "Pending Meetings",
          nextAppointmentTitle: "Next appointment today",
          nextAppointmentNone: "No more appointments today.",
          companiesTitle: "Companies at a glance",
          companiesEmpty: "No companies found for your role.",
          appointmentsEmpty: "No appointments found for your role.",
          openLabel: "Open",
          meetingsLabel: "Meetings",
          segmentLabel: "Segment",
          ownerLabel: "Owner",
        };

  const accessibleCompanies = useMemo<CompanyRecord[]>(() => {
    if (assignedRole === "guest") return [];
    return companyRecords.filter((c) => c.assignedRoles.includes(assignedRole));
  }, [assignedRole]);

  const userAppointments = useMemo<ParsedAppointmentItem[]>(() => {
    const weekDays = weekdayLabelsByLanguage[language];

    // Build name tokens to match against the attendees list.
    // We check firstName and the first part of fullName (e.g. "Dominic" matches "Dominic Bechtold").
    const nameTokens = [
      ACTIVE_DEV_PROFILE.firstName.toLowerCase(),
      ACTIVE_DEV_PROFILE.fullName.toLowerCase(),
    ];

    return accessibleCompanies.flatMap((company) =>
      company.appointments
        .map((raw, index) =>
          parseAppointmentItem(raw, index % weekDays.length, company.id, index),
        )
        .filter((item) => {
          if (item.attendees.length === 0) return false;
          return item.attendees.some((attendee) => {
            const a = attendee.trim().toLowerCase();
            return nameTokens.some((token) => a === token || a.startsWith(token));
          });
        }),
    );
  }, [accessibleCompanies, language]);

  const visibleDayIndices = useMemo(() => {
    const hasWeekend = userAppointments.some((item) => item.dayIndex >= 5);
    return hasWeekend ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4];
  }, [userAppointments]);

  const todayDayIndex = (new Date().getDay() + 6) % 7;
  const currentTimeStr = (() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  })();

  const nextAppointmentToday = useMemo(() => {
    return userAppointments
      .filter((a) => a.dayIndex === todayDayIndex && a.timeLabel >= currentTimeStr)
      .sort((a, b) => a.timeLabel.localeCompare(b.timeLabel))[0] ?? null;
  }, [userAppointments, todayDayIndex, currentTimeStr]);

  const totalOpenQuestions = useMemo(
    () => accessibleCompanies.reduce((sum, c) => sum + c.openQuestions, 0),
    [accessibleCompanies],
  );
  const totalPendingMeetings = useMemo(
    () => accessibleCompanies.reduce((sum, c) => sum + c.pendingMeetings, 0),
    [accessibleCompanies],
  );

  const deskTabs: DeskTab[] = ["overview", "appointments", "companies"];

  return (
    <section className="profile-panel" aria-label={copy.title}>
      <header className="profile-panel-header">
        <div className="profile-panel-title-wrap">
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
      </header>

      <div
        className="company-tab-row"
        role="tablist"
        aria-label="Desk tabs"
      >
        {deskTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={tab === activeTab}
            className={`company-tab-btn${tab === activeTab ? " is-active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {copy.tabs[tab]}
          </button>
        ))}
      </div>

      <div className="company-detail-section">
        {activeTab === "overview" && (
          <>
            {/* User banner */}
            <article className="user-profile-banner" style={{ marginBottom: "20px" }}>
              <div className="user-profile-banner-avatar" aria-hidden="true">
                {ACTIVE_DEV_PROFILE.initials}
              </div>
              <div className="user-profile-banner-text">
                <span className="user-profile-banner-kicker">{copy.bannerLabel}</span>
                <strong>{ACTIVE_DEV_PROFILE.fullName}</strong>
                <small>{ACTIVE_DEV_PROFILE.role}</small>
              </div>
            </article>

            {/* KPI row */}
            <ul className="mydesk-kpi-row">
              <li className="mydesk-kpi-card">
                <span className="mydesk-kpi-value">{accessibleCompanies.length}</span>
                <span className="mydesk-kpi-label">{copy.kpiCompanies}</span>
              </li>
              <li className="mydesk-kpi-card">
                <span className="mydesk-kpi-value">{userAppointments.length}</span>
                <span className="mydesk-kpi-label">{copy.kpiAppointments}</span>
              </li>
              <li className="mydesk-kpi-card">
                <span className="mydesk-kpi-value">{totalOpenQuestions}</span>
                <span className="mydesk-kpi-label">{copy.kpiOpenQuestions}</span>
              </li>
              <li className="mydesk-kpi-card">
                <span className="mydesk-kpi-value">{totalPendingMeetings}</span>
                <span className="mydesk-kpi-label">{copy.kpiPendingMeetings}</span>
              </li>
            </ul>

            {/* Next appointment today */}
            <div className="mydesk-next-appointment">
              <p className="mydesk-section-label">{copy.nextAppointmentTitle}</p>
              {nextAppointmentToday !== null ? (
                <div className="mydesk-next-card">
                  <time className="planner-card-time">{nextAppointmentToday.timeLabel}</time>
                  <span className="planner-card-title">{nextAppointmentToday.title}</span>
                  {nextAppointmentToday.attendees.length > 0 && (
                    <span className="mydesk-next-attendees">
                      {nextAppointmentToday.attendees.join(", ")}
                    </span>
                  )}
                </div>
              ) : (
                <p className="workspace-empty-hint">{copy.nextAppointmentNone}</p>
              )}
            </div>
          </>
        )}

        {activeTab === "appointments" && (
          userAppointments.length === 0 ? (
            <p className="workspace-empty-hint">{copy.appointmentsEmpty}</p>
          ) : (
            <CompanyAppointmentsTab
              language={language}
              text={text}
              appointmentItems={userAppointments}
              visibleDayIndices={visibleDayIndices}
              activeTeamMembers={[]}
              companyAssignees={{}}
              onAssigneeChange={() => undefined}
            />
          )
        )}

        {activeTab === "companies" && (
          accessibleCompanies.length === 0 ? (
            <p className="workspace-empty-hint">{copy.companiesEmpty}</p>
          ) : (
            <ul className="mydesk-company-list">
              {accessibleCompanies.map((company) => (
                <li key={company.id} className="mydesk-company-row">
                  <div className="mydesk-company-name">{company.name}</div>
                  <ul className="company-detail-metrics-inline">
                    <li>{copy.segmentLabel}: {company.segment}</li>
                    <li>{copy.ownerLabel}: {company.owner}</li>
                    <li>{copy.openLabel}: {company.openQuestions}</li>
                    <li>{copy.meetingsLabel}: {company.pendingMeetings}</li>
                  </ul>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </section>
  );
}

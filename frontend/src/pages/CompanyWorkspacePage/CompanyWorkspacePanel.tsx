import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import type { Language } from "../../features/chat/types/chat";

type AccessRole = "admin" | "customer" | "salesConsultant" | "analyst";
type DisplayRole = AccessRole | "guest";

type CompanyTab =
  | "overview"
  | "portfolio"
  | "performance"
  | "documents"
  | "hypotheses"
  | "appointments"
  | "notes"
  | "team"
  | "newsfeed";

interface CompanyRecord {
  id: string;
  name: string;
  segment: string;
  lastVisited: string;
  isFavorite: boolean;
  assignedRoles: AccessRole[];
  owner: string;
  openQuestions: number;
  pendingMeetings: number;
  documents: string[];
  hypotheses: string[];
  appointments: string[];
  notes: string[];
  teamMembers: string[];
  personas: string[];
  newsfeed: string[];
  recentEvents: string[];
  portfolioSummary: string;
  performanceSummary: string;
}

interface CompanyWorkspacePanelProps {
  language: Language;
}

const companyRecords: CompanyRecord[] = [
  {
    id: "aurora-bank",
    name: "Aurora Bank",
    segment: "Fintech",
    lastVisited: "10:22",
    isFavorite: true,
    assignedRoles: ["admin", "salesConsultant", "analyst"],
    owner: "M. Ritter",
    openQuestions: 6,
    pendingMeetings: 2,
    documents: ["Q2 Risiko-Radar", "Roadmap API Consent", "Journey Mapping v3"],
    hypotheses: [
      "Antwortquote steigt mit persona-spezifischen Follow-ups.",
      "Dokumenten-Shortcuts reduzieren offene Tickets > 20%.",
    ],
    appointments: ["Mo 11:00 Steering", "Mi 15:30 Enablement", "Fr 09:00 Sales Review"],
    notes: [
      "Decision Maker will benchmark against two competitors.",
      "Need legal review for data retention wording.",
    ],
    teamMembers: ["Sales: Lena", "CSM: Amir", "Solution: Carla", "Legal: Jens"],
    personas: ["Head of Risk", "Ops Lead", "Data Officer"],
    newsfeed: [
      "Pilot region expanded to DACH branch network.",
      "Internal KPI target updated to response-time below 2.1s.",
    ],
    recentEvents: [
      "Heute 09:40: Follow-up Meeting geplant.",
      "Gestern: Persona Mapping aktualisiert.",
      "Montag: Dokumenten-Freigabe durch Legal.",
    ],
    portfolioSummary: "2 aktive Produkte, Upsell-Potenzial im Governance-Paket.",
    performanceSummary: "81% beantwortete Fragen, 14 offen, 2 kritische Follow-ups.",
  },
  {
    id: "nordlicht-logistics",
    name: "Nordlicht Logistics",
    segment: "Transport",
    lastVisited: "09:58",
    isFavorite: false,
    assignedRoles: ["admin", "salesConsultant"],
    owner: "D. Reimann",
    openQuestions: 3,
    pendingMeetings: 1,
    documents: ["Fleet AI Review", "SLA Delta 2026", "Renewal Negotiation Notes"],
    hypotheses: ["Dispatch-Assist Feature senkt Eskalationen in Peak-Slots."],
    appointments: ["Di 14:00 KPI Review", "Do 10:30 Renewal Prep"],
    notes: ["Customer asks for dashboard access by region managers."],
    teamMembers: ["Sales: Daria", "CSM: Faris", "Ops: Kim"],
    personas: ["Head of Dispatch", "Regional Manager"],
    newsfeed: ["Two new depots are onboarding in Q3."],
    recentEvents: [
      "Heute 08:15: SLA Delta kommentiert.",
      "Gestern: Erster Renewal-Entwurf versendet.",
      "Letzte Woche: Dispatch KPI Flag gesetzt.",
    ],
    portfolioSummary: "Starke Nutzung im Dispatch, Dokumentenmodul noch gering.",
    performanceSummary: "74% beantwortete Fragen, 6 offen, 1 Termin in Vorbereitung.",
  },
  {
    id: "cobalt-health",
    name: "Cobalt Health",
    segment: "Healthcare",
    lastVisited: "Gestern",
    isFavorite: true,
    assignedRoles: ["admin", "analyst"],
    owner: "S. Nguyen",
    openQuestions: 9,
    pendingMeetings: 3,
    documents: ["Compliance Snapshot", "Patient Journey Mapping", "Insights Q1"],
    hypotheses: [
      "Mehr Kontextfelder verbessern Relevanz fuer Medical Persona.",
      "Weekly Summary mit offenen Themen reduziert Churn-Risiko.",
    ],
    appointments: ["Mo 08:30 Compliance Sync", "Do 16:00 Product Board"],
    notes: ["Need role-based masking for sensitive patient hints."],
    teamMembers: ["Analyst: Sina", "CSM: Daniel", "Security: Lea"],
    personas: ["Medical Ops", "Compliance Lead", "Support Manager"],
    newsfeed: ["New procurement framework approved for EMEA rollout."],
    recentEvents: [
      "Heute 07:50: Compliance Notiz aktualisiert.",
      "Gestern: Risiko-Hypothese bestaetigt.",
      "Montag: Review mit Security Team.",
    ],
    portfolioSummary: "Hoher Value im Analysebereich, Pilot fuer Team-Workflow geplant.",
    performanceSummary: "69% beantwortete Fragen, 18 offen, 3 Termine kommende Woche.",
  },
  {
    id: "greenforge-energy",
    name: "Greenforge Energy",
    segment: "Energy",
    lastVisited: "Gestern",
    isFavorite: false,
    assignedRoles: ["admin", "customer"],
    owner: "R. Novak",
    openQuestions: 2,
    pendingMeetings: 1,
    documents: ["Grid Overview", "Portfolio Fit", "Executive Summary"],
    hypotheses: ["Automation bundle should be placed in next offer."],
    appointments: ["Fr 13:00 Site Review"],
    notes: ["Customer account sees only own entities by default."],
    teamMembers: ["Customer Admin: R. Novak", "Advisor: Mira"],
    personas: ["Plant Manager", "Finance Lead"],
    newsfeed: ["Leadership announced modernization budget for 2026."],
    recentEvents: [
      "Gestern: Site Review vorbereitet.",
      "Montag: Product fit Dokument abgelegt.",
      "Letzte Woche: Meeting Slot abgestimmt.",
    ],
    portfolioSummary: "Single-account visibility, moderate upsell readiness.",
    performanceSummary: "88% beantwortete Fragen, 3 offen, stabiler Health-Score.",
  },
  {
    id: "sunset-insurance",
    name: "Sunset Insurance",
    segment: "Insurance",
    lastVisited: "11:36",
    isFavorite: true,
    assignedRoles: ["admin", "salesConsultant", "analyst"],
    owner: "P. Kramer",
    openQuestions: 5,
    pendingMeetings: 2,
    documents: ["Claims Overview", "Renewal Draft", "Risk Signals Q2"],
    hypotheses: [
      "Persona snippets in claims context improve resolution speed.",
      "Compact weekly summary lowers escalation volume.",
    ],
    appointments: ["Di 09:30 Claims Sync", "Do 14:00 Renewal Board"],
    notes: ["Prefers short summaries and explicit risk tags."],
    teamMembers: ["Sales: Jo", "CSM: Mel", "Analyst: Tim"],
    personas: ["Claims Lead", "Operations Manager", "IT Security"],
    newsfeed: ["Board approved pilot for automated document routing."],
    recentEvents: [
      "Heute 10:10: Review-Notiz hinzugefuegt.",
      "Gestern: Renewal Draft abgestimmt.",
      "Montag: KPI-Alert geschlossen.",
    ],
    portfolioSummary: "Starker Fit im Claims-Workflow, Upsell im Reporting moeglich.",
    performanceSummary: "77% beantwortete Fragen, 9 offen, 2 priorisierte Meetings.",
  },
  {
    id: "nova-commerce",
    name: "Nova Commerce",
    segment: "Retail",
    lastVisited: "Heute",
    isFavorite: false,
    assignedRoles: ["admin", "salesConsultant", "customer"],
    owner: "L. Ortmann",
    openQuestions: 4,
    pendingMeetings: 1,
    documents: ["Store Rollout Plan", "Support SOP", "Executive Notes"],
    hypotheses: ["Store-level prompts can reduce ticket handovers by 18%."],
    appointments: ["Mi 13:00 Weekly Ops"],
    notes: ["Needs region-level visibility for store managers."],
    teamMembers: ["Sales: Nia", "CSM: Olek", "Ops: Rene"],
    personas: ["Retail Ops", "Regional Lead"],
    newsfeed: ["Five new stores scheduled for pilot onboarding."],
    recentEvents: [
      "Heute 09:05: Store KPI export geteilt.",
      "Gestern: SOP finalisiert.",
      "Letzte Woche: Pilot-Scope erweitert.",
    ],
    portfolioSummary: "Gute Nutzung im Tagesbetrieb, Potenzial bei Team-Modulen.",
    performanceSummary: "83% beantwortete Fragen, 5 offen, stabiler Rollout.",
  },
  {
    id: "polaris-media",
    name: "Polaris Media",
    segment: "Media",
    lastVisited: "08:42",
    isFavorite: false,
    assignedRoles: ["admin", "salesConsultant"],
    owner: "A. Weber",
    openQuestions: 7,
    pendingMeetings: 2,
    documents: ["Campaign Brief", "Persona Cluster", "Q3 Theme Map"],
    hypotheses: [
      "Persona-driven briefing templates increase response precision.",
      "Faster tagging lowers content QA loops.",
    ],
    appointments: ["Mo 16:00 Editorial", "Fr 10:00 Stakeholder Sync"],
    notes: ["Wants explicit confidence hints in recommendations."],
    teamMembers: ["Sales: Pia", "CSM: Andre", "Creative: Kim"],
    personas: ["Editorial Lead", "Campaign Owner"],
    newsfeed: ["Editorial board approved Q3 experimentation budget."],
    recentEvents: [
      "Heute 08:00: Theme Map aktualisiert.",
      "Gestern: Campaign Brief kommentiert.",
      "Dienstag: Persona Cluster erweitert.",
    ],
    portfolioSummary: "Hohe Aktivitaet im Kampagnenbereich, Reporting noch ausbaufahig.",
    performanceSummary: "71% beantwortete Fragen, 11 offen, 2 Fokus-Meetings.",
  },
  {
    id: "urban-harbor",
    name: "Urban Harbor",
    segment: "Real Estate",
    lastVisited: "12:11",
    isFavorite: true,
    assignedRoles: ["admin", "customer", "analyst"],
    owner: "C. Sahin",
    openQuestions: 3,
    pendingMeetings: 1,
    documents: ["Tenant Insights", "Portfolio Mix", "Risk Brief"],
    hypotheses: ["Weekly open-item digest improves board readiness."],
    appointments: ["Do 11:00 Portfolio Review"],
    notes: ["Customer team requests cleaner handover templates."],
    teamMembers: ["Customer Admin: C. Sahin", "Analyst: Noor"],
    personas: ["Portfolio Manager", "Finance Controller"],
    newsfeed: ["Two properties moved into modernization planning."],
    recentEvents: [
      "Heute 11:20: Risk Brief ueberarbeitet.",
      "Gestern: Tenant Insights geteilt.",
      "Montag: Portfolio Mix finalisiert.",
    ],
    portfolioSummary: "Stark in Portfolio-Transparenz, mittleres Upsell-Potenzial.",
    performanceSummary: "86% beantwortete Fragen, 4 offen, 1 Termin geplant.",
  },
];

const tabVisibilityByRole: Record<DisplayRole, CompanyTab[]> = {
  admin: [
    "overview",
    "portfolio",
    "performance",
    "documents",
    "hypotheses",
    "appointments",
    "notes",
    "team",
    "newsfeed",
  ],
  salesConsultant: [
    "overview",
    "portfolio",
    "performance",
    "documents",
    "hypotheses",
    "appointments",
    "notes",
    "team",
    "newsfeed",
  ],
  analyst: ["overview", "portfolio", "performance", "documents", "hypotheses", "newsfeed"],
  customer: ["overview", "portfolio", "performance", "documents", "appointments", "newsfeed"],
  guest: ["overview", "documents"],
};

interface OverviewPieProps {
  openQuestions: number;
  pendingMeetings: number;
  language: Language;
}

function OverviewPie({ openQuestions, pendingMeetings, language }: OverviewPieProps) {
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

const readDbAssignedRole = (): DisplayRole => {
  try {
    const rawRole = globalThis.localStorage.getItem("aura.workspace.role");

    if (rawRole === "admin" || rawRole === "customer" || rawRole === "salesConsultant" || rawRole === "analyst") {
      return rawRole;
    }

    if (rawRole === null) {
      return "salesConsultant";
    }

    return "guest";
  } catch {
    return "salesConsultant";
  }
};

export function CompanyWorkspacePanel({ language }: CompanyWorkspacePanelProps) {
  const [assignedRole] = useState<DisplayRole>(readDbAssignedRole);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<CompanyTab>("overview");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [uploadedDocumentsByCompany, setUploadedDocumentsByCompany] = useState<Record<string, string[]>>({});
  const [documentSearch, setDocumentSearch] = useState<string>("");
  const documentFileInputRef = useRef<HTMLInputElement | null>(null);

  const roleScopedCompanies = useMemo(() => {
    if (assignedRole === "guest") {
      return [] as CompanyRecord[];
    }

    return companyRecords.filter((company) => company.assignedRoles.includes(assignedRole));
  }, [assignedRole]);

  useEffect(() => {
    if (roleScopedCompanies.length === 0) {
      setSelectedCompanyId("");
      return;
    }

    setSelectedCompanyId((previous) => previous || roleScopedCompanies[0].id);
  }, [roleScopedCompanies]);

  const text = language === "de"
    ? {
      title: "Workspace",
      rolePrefix: "Role:",
      roles: {
        admin: "Admin",
        customer: "Customer",
        salesConsultant: "Sales Consultant",
        analyst: "Analyst",
        guest: "Guest",
      },
      recentlyVisited: "Recently visited",
      favorites: "Favoriten",
      searchLabel: "Search companies",
      searchPlaceholder: "Name, Segment oder Owner suchen",
      noResult: "Kein Unternehmen gefunden.",
      ownerLabel: "Owner",
      openLabel: "Offen",
      meetingsLabel: "Meetings",
      recentEventsTitle: "Recent events",
      tabs: {
        overview: "Overview",
        portfolio: "Portfolio",
        performance: "Performance",
        documents: "Dokumente",
        hypotheses: "Hypothesen",
        appointments: "Termine",
        notes: "Notizen",
        team: "Team",
        newsfeed: "Newsfeed",
      },
      personaTitle: "Personas im Unternehmen",
      addFile: "Add file",
      fileSearch: "Search file",
      noDocumentResult: "Keine Dokumente gefunden.",
      kpiOneLabel: "Durchschnittliche Antwortzeit",
      kpiTwoLabel: "Antwortquote",
      kpiThreeLabel: "Prioritaet",
      kpiOneHint: "Median ueber offene Threads",
      kpiTwoHint: "Anteil geklaerter Punkte",
      kpiThreeLow: "Niedrig",
      kpiThreeMedium: "Mittel",
      kpiThreeHigh: "Hoch",
      kpiThreeHint: "Basierend auf offenen Fragen/Meetings",
    }
    : {
      title: "Workspace",
      rolePrefix: "Role:",
      roles: {
        admin: "Admin",
        customer: "Customer",
        salesConsultant: "Sales Consultant",
        analyst: "Analyst",
        guest: "Guest",
      },
      recentlyVisited: "Recently visited",
      favorites: "Favorites",
      searchLabel: "Search companies",
      searchPlaceholder: "Search by name, segment, or owner",
      noResult: "No company found.",
      ownerLabel: "Owner",
      openLabel: "Open",
      meetingsLabel: "Meetings",
      recentEventsTitle: "Recent events",
      tabs: {
        overview: "Overview",
        portfolio: "Portfolio",
        performance: "Performance",
        documents: "Documents",
        hypotheses: "Hypotheses",
        appointments: "Appointments",
        notes: "Notes",
        team: "Team",
        newsfeed: "Newsfeed",
      },
      personaTitle: "Personas in this company",
      addFile: "Add file",
      fileSearch: "Search file",
      noDocumentResult: "No documents found.",
      kpiOneLabel: "Average response time",
      kpiTwoLabel: "Response completion",
      kpiThreeLabel: "Priority",
      kpiOneHint: "Median over active threads",
      kpiTwoHint: "Share of resolved points",
      kpiThreeLow: "Low",
      kpiThreeMedium: "Medium",
      kpiThreeHigh: "High",
      kpiThreeHint: "Derived from open questions and meetings",
    };

  const filteredCompanies = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (query.length === 0) {
      return roleScopedCompanies;
    }

    return roleScopedCompanies.filter((company) => {
      const searchable = `${company.name} ${company.segment} ${company.owner}`.toLowerCase();
      return searchable.includes(query);
    });
  }, [roleScopedCompanies, searchTerm]);

  useEffect(() => {
    if (filteredCompanies.length === 0) {
      setSelectedCompanyId("");
      return;
    }

    const stillVisible = filteredCompanies.some((company) => company.id === selectedCompanyId);

    if (!stillVisible) {
      setSelectedCompanyId(filteredCompanies[0]?.id ?? "");
    }
  }, [filteredCompanies, selectedCompanyId]);

  useEffect(() => {
    setActiveTab("overview");
  }, [selectedCompanyId]);

  useEffect(() => {
    setDocumentSearch("");
  }, [selectedCompanyId]);

  const selectedCompany = useMemo(() => {
    return filteredCompanies.find((company) => company.id === selectedCompanyId) ?? null;
  }, [filteredCompanies, selectedCompanyId]);

  const recentCompanies = useMemo(() => {
    return roleScopedCompanies.slice(0, 12);
  }, [roleScopedCompanies]);

  const favoriteCompanies = useMemo(() => {
    return roleScopedCompanies.filter((company) => company.isFavorite);
  }, [roleScopedCompanies]);

  const visibleTabs = tabVisibilityByRole[assignedRole];

  useEffect(() => {
    if (visibleTabs.includes(activeTab)) {
      return;
    }

    setActiveTab("overview");
  }, [activeTab, visibleTabs]);

  const handleDocumentUpload = (event: ChangeEvent<HTMLInputElement>): void => {
    if (selectedCompany === null) {
      return;
    }

    const fileNames = Array.from(event.target.files ?? [])
      .map((file) => file.name.trim())
      .filter((name) => name.length > 0);

    if (fileNames.length === 0) {
      return;
    }

    setUploadedDocumentsByCompany((previous) => {
      const existing = previous[selectedCompany.id] ?? [];
      return {
        ...previous,
        [selectedCompany.id]: Array.from(new Set([...existing, ...fileNames])),
      };
    });

    event.target.value = "";
  };

  const renderDetailBody = (): JSX.Element | null => {
    if (selectedCompany === null) {
      return null;
    }

    if (activeTab === "overview") {
      const totalOpen = selectedCompany.openQuestions + selectedCompany.pendingMeetings;
      const avgResponseHours = Math.max(0.8, 3.2 - selectedCompany.pendingMeetings * 0.35);
      const completionRate = Math.max(52, 100 - totalOpen * 3);
      const priorityLabel = totalOpen >= 10
        ? text.kpiThreeHigh
        : totalOpen >= 6
          ? text.kpiThreeMedium
          : text.kpiThreeLow;

      return (
        <div className="company-overview-layout">
          <div className="company-overview-block">
            <OverviewPie
              openQuestions={selectedCompany.openQuestions}
              pendingMeetings={selectedCompany.pendingMeetings}
              language={language}
            />
          </div>

          <div className="company-overview-block">
            <h4>{text.recentEventsTitle}</h4>
            <ul className="company-detail-list company-detail-list-lined">
              {selectedCompany.recentEvents.map((eventText) => (
                <li key={eventText}>{eventText}</li>
              ))}
            </ul>
          </div>

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
              <span>{text.kpiThreeLabel}</span>
              <strong>{priorityLabel}</strong>
              <small>{text.kpiThreeHint}</small>
            </article>
          </div>
        </div>
      );
    }

    if (activeTab === "portfolio") {
      return <p>{selectedCompany.portfolioSummary}</p>;
    }

    if (activeTab === "performance") {
      return <p>{selectedCompany.performanceSummary}</p>;
    }

    if (activeTab === "documents") {
      const uploadedDocuments = uploadedDocumentsByCompany[selectedCompany.id] ?? [];
      const allDocuments = Array.from(new Set([...selectedCompany.documents, ...uploadedDocuments]));
      const docQuery = documentSearch.trim().toLowerCase();
      const visibleDocuments = docQuery.length === 0
        ? allDocuments
        : allDocuments.filter((item) => item.toLowerCase().includes(docQuery));

      return (
        <div className="company-documents-panel">
          <div className="company-documents-toolbar">
            <input
              type="search"
              value={documentSearch}
              onChange={(event) => setDocumentSearch(event.target.value)}
              placeholder={text.fileSearch}
              aria-label={text.fileSearch}
            />

            <button
              type="button"
              onClick={() => {
                documentFileInputRef.current?.click();
              }}
            >
              {text.addFile}
            </button>

            <input
              ref={documentFileInputRef}
              className="company-file-input"
              type="file"
              multiple
              onChange={handleDocumentUpload}
            />
          </div>

          <ul className="company-detail-list company-detail-list-lined company-documents-list">
            {visibleDocuments.map((item) => (
              <li key={item}>{item}</li>
            ))}
            {visibleDocuments.length === 0 ? <li>{text.noDocumentResult}</li> : null}
          </ul>
        </div>
      );
    }

    if (activeTab === "hypotheses") {
      return (
        <ul className="company-detail-list company-detail-list-lined">
          {selectedCompany.hypotheses.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    }

    if (activeTab === "appointments") {
      return (
        <ul className="company-detail-list company-detail-list-lined">
          {selectedCompany.appointments.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    }

    if (activeTab === "notes") {
      return (
        <ul className="company-detail-list company-detail-list-lined">
          {selectedCompany.notes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    }

    if (activeTab === "team") {
      return (
        <div>
          <p className="company-team-title">{text.personaTitle}</p>
          <div className="company-persona-row">
            {selectedCompany.personas.map((persona) => (
              <span key={persona} className="company-pill">{persona}</span>
            ))}
          </div>
          <ul className="company-detail-list company-detail-list-lined">
            {selectedCompany.teamMembers.map((member) => (
              <li key={member}>{member}</li>
            ))}
          </ul>
        </div>
      );
    }

    return (
      <ul className="company-detail-list company-detail-list-lined">
        {selectedCompany.newsfeed.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  };

  return (
    <section className="company-workspace-panel" aria-label={text.title}>
      <header className="company-workspace-header">
        <div>
          <h2>{text.title}</h2>
        </div>

        <div className="company-assigned-role" aria-label="Role">
          <span>{text.rolePrefix}</span>
          <strong>{text.roles[assignedRole]}</strong>
        </div>
      </header>

      <div className="company-workspace-grid">
        <aside className="company-list-column">
          <article className="company-box-card company-box-card-stacked">
            <h3>{text.recentlyVisited}</h3>
            <ul className="company-sublist-scroll" aria-label={text.recentlyVisited}>
              {recentCompanies.map((company) => (
                <li key={company.id}>
                  <button
                    type="button"
                    className={`company-sublist-item-btn${company.id === selectedCompanyId ? " is-active" : ""}`}
                    onClick={() => setSelectedCompanyId(company.id)}
                  >
                    <span className="company-sublist-main">{company.name}</span>
                    <span className="company-sublist-time">{company.lastVisited}</span>
                  </button>
                </li>
              ))}
            </ul>
          </article>

          <article className="company-box-card company-box-card-stacked">
            <h3>{text.favorites}</h3>
            <ul className="company-sublist-scroll" aria-label={text.favorites}>
              {favoriteCompanies.map((company) => (
                <li key={company.id}>
                  <button
                    type="button"
                    className={`company-sublist-item-btn${company.id === selectedCompanyId ? " is-active" : ""}`}
                    onClick={() => setSelectedCompanyId(company.id)}
                  >
                    {company.name}
                  </button>
                </li>
              ))}
            </ul>
          </article>

          <label className="company-search-field">
            <span>{text.searchLabel}</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={text.searchPlaceholder}
            />
          </label>

          <ul className="company-list-scroll" aria-label={text.searchLabel}>
            {filteredCompanies.map((company) => {
              const isActive = company.id === selectedCompanyId;

              return (
                <li key={company.id}>
                  <button
                    type="button"
                    className={`company-item-btn${isActive ? " is-active" : ""}`}
                    onClick={() => setSelectedCompanyId(company.id)}
                  >
                    <div>
                      <strong>{company.name}</strong>
                      <small>{company.segment}</small>
                    </div>
                    <div className="company-item-meta">
                      <span>{company.lastVisited}</span>
                      {company.isFavorite ? <em>*</em> : null}
                    </div>
                  </button>
                </li>
              );
            })}

            {filteredCompanies.length === 0 ? <li className="company-empty-item">{text.noResult}</li> : null}
          </ul>
        </aside>

        <section className="company-detail-column" aria-label="Company dashboard">
          {selectedCompany === null ? (
            <p>{text.noResult}</p>
          ) : (
            <>
              <header className="company-detail-header">
                <div>
                  <h3>{selectedCompany.name}</h3>
                  <p>{selectedCompany.segment}</p>
                </div>

                <ul className="company-detail-metrics-inline">
                  <li>{text.ownerLabel}: {selectedCompany.owner}</li>
                  <li>{text.openLabel}: {selectedCompany.openQuestions}</li>
                  <li>{text.meetingsLabel}: {selectedCompany.pendingMeetings}</li>
                </ul>
              </header>

              <div className="company-tab-row" role="tablist" aria-label="Company dashboard tabs">
                {visibleTabs.map((tabId) => (
                  <button
                    key={tabId}
                    type="button"
                    role="tab"
                    aria-selected={tabId === activeTab}
                    className={`company-tab-btn${tabId === activeTab ? " is-active" : ""}`}
                    onClick={() => setActiveTab(tabId)}
                  >
                    {text.tabs[tabId]}
                  </button>
                ))}
              </div>

              <section className="company-detail-section">{renderDetailBody()}</section>
            </>
          )}
        </section>
      </div>
    </section>
  );
}

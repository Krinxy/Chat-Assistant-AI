import type { CompanyWorkspaceText } from "./companyWorkspace.text";
import type { CompanyRecord, HypothesisEntry } from "./companyWorkspace.types";
import { buildPerformanceRows, sparkPolyline } from "./companyWorkspace.utils";
import type { Language } from "../../features/chat/types/chat";

interface PortfolioTabContentProps {
  selectedCompany: CompanyRecord;
  language: Language;
  activeHypotheses: HypothesisEntry[];
  text: CompanyWorkspaceText;
}

export function PortfolioTabContent({ selectedCompany, language, activeHypotheses, text }: PortfolioTabContentProps) {
  const auraScore = Math.min(98, 72 + selectedCompany.documents.length * 4 + activeHypotheses.length * 3);
  const comparisonTools = [
    {
      name: "AURA",
      isAura: true,
      personaDepth: Math.min(100, 80 + activeHypotheses.length * 5),
      responseSpeed: Math.max(0.8, 3.2 - selectedCompany.pendingMeetings * 0.3),
      knowledgeScope: auraScore,
      meetingContext: language === "de" ? "Vollständig" : "Full",
      contextRich: true,
    },
    {
      name: "Salesforce",
      isAura: false,
      personaDepth: 61,
      responseSpeed: 4.1,
      knowledgeScope: 68,
      meetingContext: language === "de" ? "Basis" : "Basic",
      contextRich: false,
    },
    {
      name: "HubSpot",
      isAura: false,
      personaDepth: 54,
      responseSpeed: 3.4,
      knowledgeScope: 71,
      meetingContext: language === "de" ? "Keins" : "None",
      contextRich: false,
    },
  ];

  const featureLabel = language === "de"
    ? { persona: "Persona-Tiefe", speed: "Antwortzeit", scope: "Wissensabdeckung", ctx: "Meeting-Kontext" }
    : { persona: "Persona depth", speed: "Response time", scope: "Knowledge scope", ctx: "Meeting context" };
  const speedUnit = "s";
  const scopeUnit = "%";

  const performanceRows = buildPerformanceRows(selectedCompany, activeHypotheses, language);

  return (
    <div className="port-layout">
      <div className="port-summary">{selectedCompany.portfolioSummary}</div>
      <div className="port-comparison">
        {comparisonTools.map((tool) => (
          <div key={tool.name} className={`port-tool-card${tool.isAura ? " port-tool-card--aura" : ""}`}>
            <div className="port-tool-header">
              <span className="port-tool-name">{tool.name}</span>
              {tool.isAura && <span className="port-tool-badge">{language === "de" ? "Aktiv" : "Active"}</span>}
            </div>
            <div className="port-tool-metrics">
              <div className="port-tool-metric">
                <span>{featureLabel.persona}</span>
                <div className="port-bar-track">
                  <div className="port-bar-fill" style={{ width: `${tool.personaDepth}%`, opacity: tool.isAura ? 1 : 0.55 }} />
                </div>
                <strong>{tool.personaDepth}%</strong>
              </div>
              <div className="port-tool-metric">
                <span>{featureLabel.speed}</span>
                <div className="port-bar-track">
                  <div
                    className="port-bar-fill port-bar-fill--speed"
                    style={{ width: `${Math.min(100, ((5 - tool.responseSpeed) / 4.2) * 100)}%`, opacity: tool.isAura ? 1 : 0.55 }}
                  />
                </div>
                <strong>{tool.responseSpeed.toFixed(1)}{speedUnit}</strong>
              </div>
              <div className="port-tool-metric">
                <span>{featureLabel.scope}</span>
                <div className="port-bar-track">
                  <div
                    className="port-bar-fill"
                    style={{ width: `${tool.knowledgeScope}${scopeUnit}`, opacity: tool.isAura ? 1 : 0.55 }}
                  />
                </div>
                <strong>{tool.knowledgeScope}{scopeUnit}</strong>
              </div>
              <div className="port-tool-metric port-tool-metric--ctx">
                <span>{featureLabel.ctx}</span>
                <span className={`port-ctx-badge${tool.contextRich ? " port-ctx-badge--rich" : ""}`}>
                  {tool.contextRich ? "✓ " : "○ "}{tool.meetingContext}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="portfolio-performance-wrap">
        <div className="perf-headline">
          <h4>{text.performanceTitle}</h4>
          <span className="perf-period">{language === "de" ? "Laufende Periode" : "Current period"}</span>
        </div>
        <div className="perf-grid">
          {performanceRows.map((metric) => (
            <article className={`perf-card perf-card--${metric.trend}`} key={metric.id}>
              <div className="perf-card-top">
                <span className="perf-card-label">{metric.label}</span>
                <span className={`perf-trend-badge perf-trend-badge--${metric.trend}`}>
                  {metric.trend === "up" ? "↑" : metric.trend === "down" ? "↓" : "→"}
                </span>
              </div>
              <div className="perf-card-value">
                <strong>{metric.value}</strong>
                <small>{metric.unit}</small>
              </div>
              <svg className="perf-spark" viewBox="0 0 80 32" aria-hidden="true" preserveAspectRatio="none">
                <polyline
                  points={sparkPolyline(metric.spark)}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`perf-spark-line perf-spark-line--${metric.trend}`}
                />
              </svg>
              <div className="perf-track">
                <div className={`perf-fill perf-fill--${metric.trend}`} style={{ width: `${metric.barPct}%` }} />
              </div>
              {metric.note && <span className="perf-card-note">{metric.note}</span>}
            </article>
          ))}
        </div>
        <p className="company-performance-summary">
          <strong>{text.perfSummaryLabel}: </strong>
          {selectedCompany.performanceSummary}
        </p>
      </div>
    </div>
  );
}

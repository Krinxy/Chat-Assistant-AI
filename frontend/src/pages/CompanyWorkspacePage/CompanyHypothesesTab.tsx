import { useState } from "react";
import type { Language } from "../../features/chat/types/chat";
import type { HypothesisEntry, HypothesisStatus } from "./companyWorkspace.types";

interface CompanyHypothesesTabProps {
  hypotheses: HypothesisEntry[];
  language: Language;
  documentCount: number;
  onAddHypothesis: (entry: HypothesisEntry) => void;
  onUpdateHypothesis: (index: number, entry: HypothesisEntry) => void;
  onDeleteHypothesis: (index: number) => void;
}

const STATUS_LABEL: Record<HypothesisStatus, { de: string; en: string }> = {
  confirmed:   { de: "Bestätigt",  en: "Confirmed"   },
  unconfirmed: { de: "Widerlegt",  en: "Unconfirmed" },
  pending:     { de: "Ausstehend", en: "Pending"      },
};

const HYPO_R = 36;
const HYPO_C = 2 * Math.PI * HYPO_R;

interface DonutSegmentProps { dash: number; offset: number; color: string; }
function DonutSegment({ dash, offset, color }: DonutSegmentProps) {
  if (dash <= 0) return null;
  return (
    <circle
      cx="44" cy="44" r={HYPO_R}
      fill="none"
      stroke={color}
      strokeWidth="11"
      strokeLinecap="butt"
      strokeDasharray={`${dash} ${HYPO_C}`}
      strokeDashoffset={-offset}
      transform="rotate(-90 44 44)"
    />
  );
}

export function CompanyHypothesesTab({
  hypotheses,
  language,
  documentCount,
  onAddHypothesis,
  onUpdateHypothesis,
  onDeleteHypothesis,
}: CompanyHypothesesTabProps) {
  const [draftText, setDraftText] = useState("");
  const [draftStatus, setDraftStatus] = useState<HypothesisStatus>("pending");
  const confirmed   = hypotheses.filter((h) => h.status === "confirmed").length;
  const unconfirmed = hypotheses.filter((h) => h.status === "unconfirmed").length;
  const pending     = hypotheses.filter((h) => h.status === "pending").length;
  const total       = hypotheses.length;

  const confirmedDash   = total > 0 ? (confirmed   / total) * HYPO_C : 0;
  const unconfirmedDash = total > 0 ? (unconfirmed / total) * HYPO_C : 0;
  const pendingDash     = total > 0 ? (pending     / total) * HYPO_C : 0;

  const t = language === "de"
    ? {
      title: "Hypothesen",
      rag: "RAG-Validierung ausstehend",
      empty: "Keine Hypothesen hinterlegt.",
      inputPlaceholder: "Hypothese eingeben...",
      add: "Hypothese hinzufügen",
      docsHint: "Dokumente im Workspace für Auswertung",
      remove: "Entfernen",
    }
    : {
      title: "Hypotheses",
      rag: "RAG validation pending",
      empty: "No hypotheses on record.",
      inputPlaceholder: "Add hypothesis...",
      add: "Add hypothesis",
      docsHint: "Documents available for evaluation",
      remove: "Remove",
    };

  return (
    <div className="hyp-panel">
      <div className="hyp-top">
        <div className="hyp-donut-wrap">
          <svg viewBox="0 0 88 88" className="hyp-donut-svg" aria-hidden="true">
            <circle cx="44" cy="44" r={HYPO_R} fill="none" stroke="rgba(124,106,247,0.1)" strokeWidth="11" />
            {total === 0 ? (
              <circle cx="44" cy="44" r={HYPO_R} fill="none" stroke="rgba(124,106,247,0.18)" strokeWidth="11" />
            ) : (
              <>
                <DonutSegment dash={confirmedDash}   offset={0}                                color="#7c6af7" />
                <DonutSegment dash={unconfirmedDash} offset={confirmedDash}                    color="#c4b5fd" />
                <DonutSegment dash={pendingDash}     offset={confirmedDash + unconfirmedDash}  color="rgba(124,106,247,0.28)" />
              </>
            )}
            <text x="44" y="41" textAnchor="middle" fill="white" fontSize="15" fontWeight="800">{total}</text>
            <text x="44" y="54" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="8">{t.title}</text>
          </svg>
        </div>

        <div className="hyp-legend">
          <div className="hyp-legend-row">
            <span className="hyp-legend-dot" style={{ background: "#7c6af7" }} />
            <span className="hyp-legend-label">{STATUS_LABEL.confirmed[language]}</span>
            <strong className="hyp-legend-val">{confirmed}</strong>
          </div>
          <div className="hyp-legend-row">
            <span className="hyp-legend-dot" style={{ background: "#c4b5fd" }} />
            <span className="hyp-legend-label">{STATUS_LABEL.unconfirmed[language]}</span>
            <strong className="hyp-legend-val">{unconfirmed}</strong>
          </div>
          <div className="hyp-legend-row">
            <span className="hyp-legend-dot" style={{ background: "rgba(124,106,247,0.35)" }} />
            <span className="hyp-legend-label">{STATUS_LABEL.pending[language]}</span>
            <strong className="hyp-legend-val">{pending}</strong>
          </div>
          <span className="hyp-rag-label">{t.rag}</span>
          <span className="hyp-rag-label">{documentCount} · {t.docsHint}</span>
        </div>
      </div>

      <form
        className="hyp-add-form"
        onSubmit={(event) => {
          event.preventDefault();
          const normalized = draftText.trim();
          if (normalized.length === 0) return;
          onAddHypothesis({ text: normalized, status: draftStatus });
          setDraftText("");
          setDraftStatus("pending");
        }}
      >
        <input
          value={draftText}
          onChange={(event) => setDraftText(event.target.value)}
          placeholder={t.inputPlaceholder}
        />
        <select value={draftStatus} onChange={(event) => setDraftStatus(event.target.value as HypothesisStatus)}>
          <option value="pending">{STATUS_LABEL.pending[language]}</option>
          <option value="confirmed">{STATUS_LABEL.confirmed[language]}</option>
          <option value="unconfirmed">{STATUS_LABEL.unconfirmed[language]}</option>
        </select>
        <button type="submit">{t.add}</button>
      </form>

      {hypotheses.length === 0 ? (
        <p className="hyp-empty">{t.empty}</p>
      ) : (
        <div className="hyp-list">
          {hypotheses.map((h, i) => {
            const label = STATUS_LABEL[h.status][language];
            return (
              <div key={i} className={`hyp-card hyp-card--${h.status}`}>
                <div className="hyp-card-stripe" />
                <div className="hyp-card-body">
                  <textarea
                    className="hyp-card-input"
                    value={h.text}
                    onChange={(event) => {
                      onUpdateHypothesis(i, { ...h, text: event.target.value });
                    }}
                  />
                  <div className="hyp-card-actions">
                    <select
                      value={h.status}
                      onChange={(event) => onUpdateHypothesis(i, { ...h, status: event.target.value as HypothesisStatus })}
                    >
                      <option value="pending">{STATUS_LABEL.pending[language]}</option>
                      <option value="confirmed">{STATUS_LABEL.confirmed[language]}</option>
                      <option value="unconfirmed">{STATUS_LABEL.unconfirmed[language]}</option>
                    </select>
                    <span className={`hyp-status-pill hyp-status-pill--${h.status}`}>{label}</span>
                    <button type="button" className="hyp-action-btn" onClick={() => onDeleteHypothesis(i)}>
                      {t.remove}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

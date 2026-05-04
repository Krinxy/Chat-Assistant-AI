import { useEffect, useMemo, useState } from "react";
import type { Language } from "../../features/chat/types/chat";
import type { HypothesisEntry, HypothesisStatus } from "./companyWorkspace.types";

interface CompanyHypothesesTabProps {
  hypotheses: HypothesisEntry[];
  language: Language;
  onAddHypothesis: (entry: HypothesisEntry) => void;
  onUpdateHypothesis: (index: number, entry: HypothesisEntry) => void;
  onDeleteHypothesis: (index: number) => void;
}

const STATUS_LABEL: Record<HypothesisStatus, { de: string; en: string }> = {
  confirmed: { de: "Bestätigt", en: "Confirmed" },
  unconfirmed: { de: "Widerlegt", en: "Unconfirmed" },
  pending: { de: "Ausstehend", en: "Pending" },
};

export function CompanyHypothesesTab({
  hypotheses,
  language,
  onAddHypothesis,
  onUpdateHypothesis,
  onDeleteHypothesis,
}: CompanyHypothesesTabProps) {
  const copy = language === "de"
    ? {
      confirmed: "Bestätigt",
      unconfirmed: "Widerlegt",
      allHypotheses: "Alle Hypothesen",
      addHypothesis: "Hypothese hinzufügen",
      title: "Titel",
      description: "Beschreibung",
      status: "Status",
      ragOwned: "Status, Quelldokument und Meeting werden automatisch vom RAG/LLM gesetzt",
      ragSourceDocument: "Quelldokument (RAG)",
      ragSourceMeeting: "Meeting (RAG)",
      ragNotYetSet: "Noch nicht vom RAG gesetzt",
      save: "Speichern",
      create: "Erstellen",
      remove: "Entfernen",
      noHypotheses: "Keine Hypothesen vorhanden.",
      noHypothesesFiltered: "Keine Hypothesen für diesen Filter.",
      addHintTitle: "Neue Hypothese",
      filterAll: "Alle",
      filterConfirmed: "Bestätigt",
      filterUnconfirmed: "Widerlegt",
    }
    : {
      confirmed: "Confirmed",
      unconfirmed: "Unconfirmed",
      allHypotheses: "All hypotheses",
      addHypothesis: "Add hypothesis",
      title: "Title",
      description: "Description",
      status: "Status",
      ragOwned: "Status, source document and meeting are set automatically by RAG/LLM",
      ragSourceDocument: "Source document (RAG)",
      ragSourceMeeting: "Meeting (RAG)",
      ragNotYetSet: "Not yet set by RAG",
      save: "Save",
      create: "Create",
      remove: "Remove",
      noHypotheses: "No hypotheses available.",
      noHypothesesFiltered: "No hypotheses match this filter.",
      addHintTitle: "New hypothesis",
      filterAll: "All",
      filterConfirmed: "Confirmed",
      filterUnconfirmed: "Unconfirmed",
    };

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "confirmed" | "unconfirmed">("all");
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");

  useEffect(() => {
    if (hypotheses.length === 0) {
      setSelectedIndex(null);
      setIsCreatingNew(true);
      return;
    }
    if (selectedIndex === null || selectedIndex >= hypotheses.length) {
      setSelectedIndex(0);
    }
  }, [hypotheses.length, selectedIndex]);

  const selectedHypothesis = selectedIndex !== null ? hypotheses[selectedIndex] ?? null : null;

  useEffect(() => {
    if (isCreatingNew) {
      setEditTitle("");
      setEditDescription("");
      return;
    }

    if (selectedHypothesis === null) {
      return;
    }

    const fallbackTitle = selectedHypothesis.text.length > 56
      ? `${selectedHypothesis.text.slice(0, 56)}...`
      : selectedHypothesis.text;
    setEditTitle(selectedHypothesis.title ?? fallbackTitle);
    setEditDescription(selectedHypothesis.description ?? selectedHypothesis.text);
  }, [isCreatingNew, selectedHypothesis]);

  const confirmedCount = useMemo(
    () => hypotheses.filter((item) => item.status === "confirmed").length,
    [hypotheses],
  );
  const unconfirmedCount = useMemo(
    () => hypotheses.filter((item) => item.status === "unconfirmed").length,
    [hypotheses],
  );

  const filteredHypotheses = useMemo(
    () => hypotheses
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => filterStatus === "all" || item.status === filterStatus),
    [hypotheses, filterStatus],
  );

  const statusLabel = selectedHypothesis !== null
    ? STATUS_LABEL[selectedHypothesis.status][language]
    : STATUS_LABEL.pending[language];

  return (
    <div className="hyp-layout">
      <aside className="hyp-left-column">
        <article className="hyp-summary-window">
          <div className="hyp-summary-card">
            <span>{copy.confirmed}</span>
            <strong>{confirmedCount}</strong>
          </div>
          <div className="hyp-summary-card">
            <span>{copy.unconfirmed}</span>
            <strong>{unconfirmedCount}</strong>
          </div>
        </article>

        <article className="hyp-list-window">
          <header className="hyp-list-head">
            <h4>{copy.allHypotheses}</h4>
            <div className="hyp-list-head-actions">
              <select
                className="hyp-filter-select"
                value={filterStatus}
                onChange={(event) => {
                  setFilterStatus(event.target.value as "all" | "confirmed" | "unconfirmed");
                }}
                aria-label="Filter hypotheses"
              >
                <option value="all">{copy.filterAll}</option>
                <option value="confirmed">{copy.filterConfirmed}</option>
                <option value="unconfirmed">{copy.filterUnconfirmed}</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingNew(true);
                  setSelectedIndex(null);
                }}
              >
                {copy.addHypothesis}
              </button>
            </div>
          </header>

          {hypotheses.length === 0 ? (
            <p className="hyp-empty">{copy.noHypotheses}</p>
          ) : filteredHypotheses.length === 0 ? (
            <p className="hyp-empty">{copy.noHypothesesFiltered}</p>
          ) : (
            <ul className="hyp-items">
              {filteredHypotheses.map(({ item, originalIndex }) => {
                const label = STATUS_LABEL[item.status][language];
                const rowTitle = item.title ?? item.text;
                return (
                  <li key={`${rowTitle}-${originalIndex}`}>
                    <button
                      type="button"
                      className={`hyp-item-btn${!isCreatingNew && selectedIndex === originalIndex ? " is-active" : ""}`}
                      onClick={() => {
                        setSelectedIndex(originalIndex);
                        setIsCreatingNew(false);
                      }}
                    >
                      <span>{rowTitle}</span>
                      <small>{label}</small>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      </aside>

      <section className="hyp-editor-window">
        <div className="hyp-editor-form">
          <h4>{isCreatingNew ? copy.addHintTitle : editTitle}</h4>

          <label>
            <span>{copy.title}</span>
            <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
          </label>

          <label>
            <span>{copy.description}</span>
            <textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} />
          </label>

          <div className="hyp-rag-info">
            <div className="hyp-rag-info-row">
              <span className="hyp-rag-info-label">{copy.status}</span>
              <span className="hyp-rag-info-value">{statusLabel}</span>
            </div>
            {!isCreatingNew && selectedHypothesis !== null ? (
              <>
                <div className="hyp-rag-info-row">
                  <span className="hyp-rag-info-label">{copy.ragSourceDocument}</span>
                  <span className={`hyp-rag-info-value${selectedHypothesis.sourceDocument ? "" : " hyp-rag-info-empty"}`}>
                    {selectedHypothesis.sourceDocument ?? copy.ragNotYetSet}
                  </span>
                </div>
                <div className="hyp-rag-info-row">
                  <span className="hyp-rag-info-label">{copy.ragSourceMeeting}</span>
                  <span className={`hyp-rag-info-value${selectedHypothesis.sourceMeetingId ? "" : " hyp-rag-info-empty"}`}>
                    {selectedHypothesis.sourceMeetingId ?? copy.ragNotYetSet}
                  </span>
                </div>
              </>
            ) : null}
            <small className="hyp-rag-info-hint">{copy.ragOwned}</small>
          </div>

          <div className="hyp-editor-actions">
            <button
              type="button"
              onClick={() => {
                const normalizedTitle = editTitle.trim();
                const normalizedDescription = editDescription.trim();
                if (normalizedTitle.length === 0) return;

                if (isCreatingNew) {
                  onAddHypothesis({
                    title: normalizedTitle,
                    description: normalizedDescription,
                    text: normalizedDescription.length > 0 ? normalizedDescription : normalizedTitle,
                    status: "pending",
                    sourceDocument: null,
                    sourceMeetingId: null,
                  });
                  setIsCreatingNew(false);
                  setSelectedIndex(0);
                  return;
                }

                if (selectedHypothesis === null || selectedIndex === null) return;
                onUpdateHypothesis(selectedIndex, {
                  ...selectedHypothesis,
                  title: normalizedTitle,
                  description: normalizedDescription,
                  text: normalizedDescription.length > 0 ? normalizedDescription : normalizedTitle,
                });
              }}
            >
              {isCreatingNew ? copy.create : copy.save}
            </button>
            {!isCreatingNew && selectedIndex !== null ? (
              <button
                type="button"
                className="hyp-action-btn"
                onClick={() => onDeleteHypothesis(selectedIndex)}
              >
                {copy.remove}
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

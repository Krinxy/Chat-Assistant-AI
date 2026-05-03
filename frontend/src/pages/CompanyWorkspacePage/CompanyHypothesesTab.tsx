import { useEffect, useMemo, useState } from "react";
import type { Language } from "../../features/chat/types/chat";
import type { HypothesisEntry, HypothesisStatus, ParsedAppointmentItem } from "./companyWorkspace.types";

interface CompanyHypothesesTabProps {
  hypotheses: HypothesisEntry[];
  language: Language;
  documents: string[];
  meetings: ParsedAppointmentItem[];
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
  documents,
  meetings,
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
      sourceDocument: "Dokument",
      sourceMeeting: "Meeting",
      status: "Status",
      ragOwned: "Wird später automatisch vom RAG/LLM gesetzt",
      save: "Speichern",
      create: "Erstellen",
      remove: "Entfernen",
      noHypotheses: "Keine Hypothesen vorhanden.",
      chooseDocument: "Dokument auswählen",
      chooseMeeting: "Meeting auswählen",
      noDocuments: "Keine Dokumente",
      noMeetings: "Keine Meetings",
      addHintTitle: "Neue Hypothese",
    }
    : {
      confirmed: "Confirmed",
      unconfirmed: "Unconfirmed",
      allHypotheses: "All hypotheses",
      addHypothesis: "Add hypothesis",
      title: "Title",
      description: "Description",
      sourceDocument: "Document",
      sourceMeeting: "Meeting",
      status: "Status",
      ragOwned: "Will be set automatically by RAG/LLM later",
      save: "Save",
      create: "Create",
      remove: "Remove",
      noHypotheses: "No hypotheses available.",
      chooseDocument: "Select document",
      chooseMeeting: "Select meeting",
      noDocuments: "No documents",
      noMeetings: "No meetings",
      addHintTitle: "New hypothesis",
    };

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editDocument, setEditDocument] = useState<string>("");
  const [editMeeting, setEditMeeting] = useState<string>("");

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
      setEditDocument("");
      setEditMeeting("");
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
    setEditDocument(selectedHypothesis.sourceDocument ?? "");
    setEditMeeting(selectedHypothesis.sourceMeetingId ?? "");
  }, [isCreatingNew, selectedHypothesis]);

  const confirmedCount = useMemo(
    () => hypotheses.filter((item) => item.status === "confirmed").length,
    [hypotheses],
  );
  const unconfirmedCount = useMemo(
    () => hypotheses.filter((item) => item.status === "unconfirmed").length,
    [hypotheses],
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
            <button
              type="button"
              onClick={() => {
                setIsCreatingNew(true);
                setSelectedIndex(null);
              }}
            >
              {copy.addHypothesis}
            </button>
          </header>

          {hypotheses.length === 0 ? (
            <p className="hyp-empty">{copy.noHypotheses}</p>
          ) : (
            <ul className="hyp-items">
              {hypotheses.map((item, index) => {
                const label = STATUS_LABEL[item.status][language];
                const rowTitle = item.title ?? item.text;
                return (
                  <li key={`${rowTitle}-${index}`}>
                    <button
                      type="button"
                      className={`hyp-item-btn${!isCreatingNew && selectedIndex === index ? " is-active" : ""}`}
                      onClick={() => {
                        setSelectedIndex(index);
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

          <div className="hyp-editor-assignment-grid">
            <label>
              <span>{copy.sourceDocument}</span>
              <select value={editDocument} onChange={(event) => setEditDocument(event.target.value)}>
                <option value="">{copy.chooseDocument}</option>
                {documents.length === 0 ? <option value="">{copy.noDocuments}</option> : null}
                {documents.map((documentName) => (
                  <option key={documentName} value={documentName}>{documentName}</option>
                ))}
              </select>
            </label>

            <label>
              <span>{copy.sourceMeeting}</span>
              <select value={editMeeting} onChange={(event) => setEditMeeting(event.target.value)}>
                <option value="">{copy.chooseMeeting}</option>
                {meetings.length === 0 ? <option value="">{copy.noMeetings}</option> : null}
                {meetings.map((meeting) => (
                  <option key={meeting.id} value={meeting.id}>{meeting.timeLabel} · {meeting.title}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="hyp-status-readonly">
            <span>{copy.status}: {statusLabel}</span>
            <small>{copy.ragOwned}</small>
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
                    sourceDocument: editDocument.length > 0 ? editDocument : null,
                    sourceMeetingId: editMeeting.length > 0 ? editMeeting : null,
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
                  sourceDocument: editDocument.length > 0 ? editDocument : null,
                  sourceMeetingId: editMeeting.length > 0 ? editMeeting : null,
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

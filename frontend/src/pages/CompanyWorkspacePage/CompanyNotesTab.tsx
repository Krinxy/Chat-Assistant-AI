import { useState } from "react";
import type { ChangeEvent, FormEvent, RefObject } from "react";

import type { CompanyWorkspaceText } from "./companyWorkspace.text";
import type { CompanyNoteEntry, ParsedAppointmentItem } from "./companyWorkspace.types";

interface CompanyNotesTabProps {
  text: CompanyWorkspaceText;
  notesForSelectedCompany: CompanyNoteEntry[];
  activeNoteId: string;
  activeNote: CompanyNoteEntry | null;
  noteLabelLookup: Map<string, string>;
  appointmentItems: ParsedAppointmentItem[];
  appointmentLabelById: Map<string, string>;
  noteFileInputRef: RefObject<HTMLInputElement>;
  onAttachNoteFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onSelectNote: (noteId: string) => void;
  onMoveNoteStatus: (noteId: string, status: "open" | "closed") => void;
  editNoteTitle: string;
  editNoteContent: string;
  editNoteLabels: string[];
  editNoteLinkedEvent: string;
  onEditNoteTitleChange: (value: string) => void;
  onEditNoteContentChange: (value: string) => void;
  onToggleEditNoteLabel: (labelId: string) => void;
  onEditNoteLinkedEventChange: (value: string) => void;
  onSaveNoteEdit: () => void;
  noteDraft: string;
  noteDraftLabels: string[];
  noteDraftLinkedEvent: string;
  onNoteDraftChange: (value: string) => void;
  onToggleCreateNoteLabel: (labelId: string) => void;
  onNoteDraftLinkedEventChange: (value: string) => void;
  onAddNote: (event: FormEvent<HTMLFormElement>) => void;
}

export function CompanyNotesTab({
  text,
  notesForSelectedCompany,
  activeNoteId,
  activeNote,
  noteLabelLookup,
  appointmentItems,
  appointmentLabelById,
  noteFileInputRef,
  onAttachNoteFile,
  onSelectNote,
  onMoveNoteStatus,
  editNoteTitle,
  editNoteContent,
  editNoteLabels,
  editNoteLinkedEvent,
  onEditNoteTitleChange,
  onEditNoteContentChange,
  onToggleEditNoteLabel,
  onEditNoteLinkedEventChange,
  onSaveNoteEdit,
  noteDraft,
  noteDraftLabels,
  noteDraftLinkedEvent,
  onNoteDraftChange,
  onToggleCreateNoteLabel,
  onNoteDraftLinkedEventChange,
  onAddNote,
}: CompanyNotesTabProps) {
  const [dragOverColumn, setDragOverColumn] = useState<"open" | "closed" | null>(null);
  const isActiveNoteEditable = activeNote !== null && activeNote.source !== "base";
  const openNotes = notesForSelectedCompany.filter((note) => (note.status ?? "open") === "open");
  const closedNotes = notesForSelectedCompany.filter((note) => (note.status ?? "open") === "closed");
  const closedLabel = text.openLabel === "Open" ? "Closed" : "Geschlossen";
  const dragPayloadType = "application/x-aura-note";

  return (
    <div className="company-notes-panel">
      <h4>{text.notesTitle}</h4>

      <div className="company-notes-layout">
        <aside className="company-notes-list-pane">
          <div className="company-notes-list-head">
            <strong>{text.notesListTitle}</strong>
            <button
              type="button"
              onClick={() => {
                noteFileInputRef.current?.click();
              }}
            >
              {text.attachNoteFile}
            </button>
            <input
              ref={noteFileInputRef}
              className="company-file-input"
              type="file"
              multiple
              onChange={onAttachNoteFile}
            />
          </div>

          <div className="company-notes-kanban">
            <section
              className={`company-notes-column company-notes-dropzone${dragOverColumn === "open" ? " is-drag-over" : ""}`}
              onDragOver={(event) => { event.preventDefault(); setDragOverColumn("open"); }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setDragOverColumn(null);
                }
              }}
              onDrop={(event) => {
                setDragOverColumn(null);
                const payload = event.dataTransfer.getData(dragPayloadType);
                if (payload.length === 0) return;
                const [noteId] = payload.split("|");
                if (noteId.length === 0) return;
                onMoveNoteStatus(noteId, "open");
              }}
            >
              <h5>{text.openLabel}</h5>
              <ul className="company-notes-list">
                {openNotes.map((item) => (
                  <li key={item.id} draggable onDragStart={(event) => event.dataTransfer.setData(dragPayloadType, `${item.id}|open`)}>
                    <button
                      type="button"
                      className={`company-note-nav-btn${activeNoteId === item.id ? " is-active" : ""}`}
                      onClick={() => {
                        onSelectNote(item.id);
                      }}
                    >
                      <span>{item.title}</span>
                      <small>{item.author ?? "Team"} · {item.createdAt}</small>
                    </button>
                    <button
                      type="button"
                      className="company-note-move-btn"
                      onClick={() => onMoveNoteStatus(item.id, "closed")}
                    >
                      {closedLabel}
                    </button>
                  </li>
                ))}
                {openNotes.length === 0 ? <li className="company-notes-empty">{text.noNotes}</li> : null}
              </ul>
            </section>

            <section
              className={`company-notes-column company-notes-dropzone${dragOverColumn === "closed" ? " is-drag-over" : ""}`}
              onDragOver={(event) => { event.preventDefault(); setDragOverColumn("closed"); }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setDragOverColumn(null);
                }
              }}
              onDrop={(event) => {
                setDragOverColumn(null);
                const payload = event.dataTransfer.getData(dragPayloadType);
                if (payload.length === 0) return;
                const [noteId] = payload.split("|");
                if (noteId.length === 0) return;
                onMoveNoteStatus(noteId, "closed");
              }}
            >
              <h5>{closedLabel}</h5>
              <ul className="company-notes-list">
                {closedNotes.map((item) => (
                  <li key={item.id} draggable onDragStart={(event) => event.dataTransfer.setData(dragPayloadType, `${item.id}|closed`)}>
                    <button
                      type="button"
                      className={`company-note-nav-btn${activeNoteId === item.id ? " is-active" : ""}`}
                      onClick={() => {
                        onSelectNote(item.id);
                      }}
                    >
                      <span>{item.title}</span>
                      <small>{item.author ?? "Team"} · {item.createdAt}</small>
                    </button>
                    <button
                      type="button"
                      className="company-note-move-btn"
                      onClick={() => onMoveNoteStatus(item.id, "open")}
                    >
                      {text.openLabel}
                    </button>
                  </li>
                ))}
                {closedNotes.length === 0 ? <li className="company-notes-empty">{text.noNotes}</li> : null}
              </ul>
            </section>
          </div>
        </aside>

        <section className="company-notes-detail-pane">
          <strong>{text.notesDetailTitle}</strong>
          {activeNote === null ? (
            <p>{text.noNotes}</p>
          ) : (
            <article className="company-note-detail-card">
              <div className="company-note-detail-head">
                <h5>{activeNote.title}</h5>
                <span className={`company-note-detail-status company-note-detail-status--${activeNote.status ?? "open"}`}>
                  {(activeNote.status ?? "open") === "open" ? text.openLabel : closedLabel}
                </span>
              </div>
              <small>{activeNote.createdAt} · {activeNote.author ?? "Team"}</small>
              {activeNote.labels.length > 0 ? (
                <div className="company-note-label-row">
                  {activeNote.labels.map((labelId) => (
                    <span key={labelId} className="company-note-label-chip">
                      {noteLabelLookup.get(labelId) ?? labelId}
                    </span>
                  ))}
                </div>
              ) : null}
              {activeNote.linkedEvent !== null ? (
                <p className="company-note-linked-event-chip">
                  {appointmentLabelById.get(activeNote.linkedEvent) ?? activeNote.linkedEvent}
                </p>
              ) : null}
              <p>{activeNote.content}</p>
            </article>
          )}

          {isActiveNoteEditable ? (
            <div className="company-note-edit-pane">
              <strong>{text.notesEditHeader}</strong>
              <input
                value={editNoteTitle}
                onChange={(event) => onEditNoteTitleChange(event.target.value)}
              />
              <textarea
                value={editNoteContent}
                onChange={(event) => onEditNoteContentChange(event.target.value)}
              />
              <div className="company-note-label-picker">
                {text.noteLabels.map((label) => {
                  const isActive = editNoteLabels.includes(label.id);
                  return (
                    <button
                      key={label.id}
                      type="button"
                      className={`company-note-label-chip${isActive ? " is-active" : ""}`}
                      onClick={() => onToggleEditNoteLabel(label.id)}
                    >
                      {label.label}
                    </button>
                  );
                })}
              </div>
              <label className="company-note-event-link">
                <span>{text.notesLinkedEventLabel}</span>
                <select
                  value={editNoteLinkedEvent}
                  onChange={(event) => onEditNoteLinkedEventChange(event.target.value)}
                >
                  <option value="">{text.appointmentUnassigned}</option>
                  {appointmentItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {appointmentLabelById.get(item.id) ?? item.title}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={onSaveNoteEdit}>{text.notesEditSave}</button>
            </div>
          ) : null}

          <form className="company-note-compose" onSubmit={onAddNote}>
            <textarea
              value={noteDraft}
              onChange={(event) => onNoteDraftChange(event.target.value)}
              placeholder={text.notesComposerPlaceholder}
            />

            <div className="company-note-label-picker">
              {text.noteLabels.map((label) => {
                const isActive = noteDraftLabels.includes(label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    className={`company-note-label-chip${isActive ? " is-active" : ""}`}
                    onClick={() => onToggleCreateNoteLabel(label.id)}
                  >
                    {label.label}
                  </button>
                );
              })}
            </div>

            <label className="company-note-event-link">
              <span>{text.notesLinkedEventLabel}</span>
              <select
                value={noteDraftLinkedEvent}
                onChange={(event) => onNoteDraftLinkedEventChange(event.target.value)}
              >
                <option value="">{text.appointmentUnassigned}</option>
                {appointmentItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {appointmentLabelById.get(item.id) ?? item.title}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit">{text.addNote}</button>
          </form>
        </section>
      </div>
    </div>
  );
}

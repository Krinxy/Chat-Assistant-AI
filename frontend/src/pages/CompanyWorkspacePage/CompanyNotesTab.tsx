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
  const isActiveNoteEditable = activeNote !== null && activeNote.source !== "base";

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

          <ul className="company-notes-list">
            {notesForSelectedCompany.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`company-note-nav-btn${activeNoteId === item.id ? " is-active" : ""}`}
                  onClick={() => {
                    onSelectNote(item.id);
                  }}
                >
                  <span>{item.title}</span>
                  <small>{item.createdAt}</small>
                </button>
              </li>
            ))}
            {notesForSelectedCompany.length === 0 ? <li className="company-notes-empty">{text.noNotes}</li> : null}
          </ul>
        </aside>

        <section className="company-notes-detail-pane">
          <strong>{text.notesDetailTitle}</strong>
          {activeNote === null ? (
            <p>{text.noNotes}</p>
          ) : (
            <article className="company-note-detail-card">
              <h5>{activeNote.title}</h5>
              <small>{activeNote.createdAt}</small>
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

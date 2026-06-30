import { type ChangeEvent, useCallback, useMemo, useRef, useState } from "react";

import type { Language } from "../../chat/types/chat";
import type { UiText } from "../../../shared/i18n/uiText";
import { type MutationOutcome, useDocuments } from "../hooks/useDocuments";

interface DocumentsPanelProps {
  language: Language;
  token: string | null;
  isAdmin: boolean;
  copy: UiText["documents"];
}

interface StatusMessage {
  kind: "ok" | "error";
  text: string;
}

const ACCEPTED_EXTENSIONS = ".pdf,.docx,.txt";

export function DocumentsPanel({ language, token, isAdmin, copy }: DocumentsPanelProps) {
  const { documents, isLoading, loadError, reload, upload, remove } = useDocuments(token);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusMessage | null>(null);

  const locale = language === "de" ? "de-DE" : "en-US";
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }),
    [locale],
  );

  const describeError = useCallback(
    (outcome: MutationOutcome): string => {
      switch (outcome.statusCode) {
        case 409:
          return copy.errDuplicate;
        case 413:
          return copy.errTooLarge;
        case 415:
          return copy.errType;
        case 401:
          return copy.errAuth;
        case 403:
          return copy.errForbidden;
        default:
          return copy.errGeneric;
      }
    },
    [copy],
  );

  const handleFiles = useCallback(
    async (files: File[]): Promise<void> => {
      if (files.length === 0) {
        return;
      }
      setIsUploading(true);
      setStatus(null);

      let succeeded = 0;
      let lastError: string | null = null;
      for (const file of files) {
        const outcome = await upload(file);
        if (outcome.ok) {
          succeeded += 1;
        } else {
          lastError = describeError(outcome);
        }
      }

      if (lastError !== null) {
        setStatus({ kind: "error", text: lastError });
      } else {
        setStatus({ kind: "ok", text: copy.uploadSuccess.replace("{count}", String(succeeded)) });
      }
      setIsUploading(false);
    },
    [upload, describeError, copy],
  );

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = "";
      void handleFiles(files);
    },
    [handleFiles],
  );

  const handleDelete = useCallback(
    async (id: string): Promise<void> => {
      setPendingDeleteId(id);
      setStatus(null);
      const outcome = await remove(id);
      if (!outcome.ok) {
        setStatus({ kind: "error", text: describeError(outcome) });
      }
      setPendingDeleteId(null);
    },
    [remove, describeError],
  );

  return (
    <section className="documents-panel" aria-label={copy.title}>
      <header className="documents-header">
        <div>
          <h1>{copy.title}</h1>
          <p className="documents-subtitle">{copy.subtitle}</p>
        </div>
      </header>

      {isAdmin ? (
        <div className="documents-upload">
          <input
            ref={fileInputRef}
            className="documents-file-input"
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS}
            aria-label={copy.uploadButton}
            onChange={handleInputChange}
          />
          <button
            type="button"
            className="documents-upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? copy.uploading : copy.uploadButton}
          </button>
          <span className="documents-upload-hint">{copy.uploadHint}</span>
        </div>
      ) : (
        <p className="documents-readonly-note">{copy.adminOnlyNote}</p>
      )}

      {status !== null ? (
        <p className={`documents-status documents-status-${status.kind}`} role="status">
          {status.text}
        </p>
      ) : null}

      <div className="documents-list-section">
        <p className="documents-list-title">{copy.listTitle}</p>

        {isLoading ? (
          <p className="documents-empty">{copy.loading}</p>
        ) : loadError !== null ? (
          <div className="documents-empty">
            <p>{copy.loadError}</p>
            <button type="button" className="documents-retry-btn" onClick={() => void reload()}>
              {copy.retry}
            </button>
          </div>
        ) : documents.length === 0 ? (
          <p className="documents-empty">{copy.empty}</p>
        ) : (
          <ul className="documents-list">
            {documents.map((doc) => (
              <li className="documents-item" key={doc.id}>
                <div className="documents-item-main">
                  <span className="documents-item-name" title={doc.filename}>
                    {doc.filename}
                  </span>
                  <span className="documents-item-meta">
                    {doc.chunkCount} {copy.chunksSuffix} · {dateFormatter.format(new Date(doc.uploadedAt))}
                  </span>
                </div>
                {isAdmin ? (
                  <button
                    type="button"
                    className="documents-delete-btn"
                    onClick={() => void handleDelete(doc.id)}
                    disabled={pendingDeleteId === doc.id}
                  >
                    {pendingDeleteId === doc.id ? copy.deleting : copy.deleteLabel}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

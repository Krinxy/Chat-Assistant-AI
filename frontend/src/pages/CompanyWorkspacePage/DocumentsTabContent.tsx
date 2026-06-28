import type { ChangeEvent } from "react";
import { useRef } from "react";

import type { CompanyWorkspaceText } from "./companyWorkspace.text";
import type { CompanyRecord, UploadedCompanyDocument, WorkspaceDocumentItem } from "./companyWorkspace.types";
import { inferMimeTypeFromName } from "./companyWorkspace.utils";

interface DocumentsTabContentProps {
  selectedCompany: CompanyRecord;
  text: CompanyWorkspaceText;
  documentSearch: string;
  uploadedDocumentsByCompany: Record<string, UploadedCompanyDocument[]>;
  dismissedDocumentsByCompany: Record<string, string[]>;
  openedDocumentByCompany: Record<string, string>;
  onDocumentUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onDocumentOpen: (companyId: string, documentId: string) => void;
  onDocumentDownload: (companyName: string, docItem: WorkspaceDocumentItem) => void;
  onDocumentPrint: (companyName: string, docItem: WorkspaceDocumentItem) => void;
  onDocumentDelete: (companyId: string, docItem: WorkspaceDocumentItem) => void;
  onSearchChange: (value: string) => void;
}

export function DocumentsTabContent({
  selectedCompany,
  text,
  documentSearch,
  uploadedDocumentsByCompany,
  dismissedDocumentsByCompany,
  openedDocumentByCompany,
  onDocumentUpload,
  onDocumentOpen,
  onDocumentDownload,
  onDocumentPrint,
  onDocumentDelete,
  onSearchChange,
}: DocumentsTabContentProps) {
  const documentFileInputRef = useRef<HTMLInputElement | null>(null);

  const uploadedDocuments = uploadedDocumentsByCompany[selectedCompany.id] ?? [];
  const dismissedNames = new Set(
    (dismissedDocumentsByCompany[selectedCompany.id] ?? []).map((name) => name.toLowerCase()),
  );
  const baseDocuments: WorkspaceDocumentItem[] = selectedCompany.documents
    .filter((name) => !dismissedNames.has(name.toLowerCase()))
    .map((name, index) => ({
      id: `base-document-${selectedCompany.id}-${index}`,
      name,
      source: "base" as const,
      mimeType: inferMimeTypeFromName(name),
      sizeLabel: "-",
      objectUrl: null,
      uploadedAt: "-",
    }));
  const uploadedDocumentItems: WorkspaceDocumentItem[] = uploadedDocuments
    .filter((entry) => !dismissedNames.has(entry.name.toLowerCase()))
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      source: "upload" as const,
      mimeType: entry.mimeType,
      sizeLabel: entry.sizeLabel,
      objectUrl: entry.objectUrl,
      uploadedAt: entry.uploadedAt,
    }));
  const allDocuments = [...uploadedDocumentItems, ...baseDocuments];
  const docQuery = documentSearch.trim().toLowerCase();
  const visibleDocuments = docQuery.length === 0
    ? allDocuments
    : allDocuments.filter((item) => item.name.toLowerCase().includes(docQuery));
  const openedDocumentId = openedDocumentByCompany[selectedCompany.id] ?? "";
  const openedDocument = allDocuments.find((item) => item.id === openedDocumentId) ?? null;

  return (
    <div className="company-documents-panel">
      <div className="company-documents-toolbar">
        <input
          type="search"
          value={documentSearch}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={text.fileSearch}
          aria-label={text.fileSearch}
        />

        <button
          type="button"
          onClick={() => { documentFileInputRef.current?.click(); }}
        >
          {text.addFile}
        </button>

        <input
          ref={documentFileInputRef}
          className="company-file-input"
          type="file"
          multiple
          aria-label={text.addFile}
          onChange={onDocumentUpload}
        />
      </div>

      <p className="company-documents-hint">{text.documentsHint}</p>
      <div className="company-documents-layout">
        <div className="company-documents-list">
          {visibleDocuments.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`company-document-btn${openedDocumentId === item.id ? " is-opened" : ""}`}
              onClick={() => onDocumentOpen(selectedCompany.id, item.id)}
            >
              <span>{item.name}</span>
              <small>{item.sizeLabel !== "-" ? `${item.sizeLabel} · ${item.mimeType}` : item.mimeType}</small>
            </button>
          ))}
          {visibleDocuments.length === 0 ? <p className="company-documents-hint">{text.noDocumentResult}</p> : null}
        </div>

        <article className="company-document-preview-panel">
          <h4>{text.previewTitle}</h4>
          {openedDocument === null ? (
            <p className="company-document-preview-empty">{text.previewEmpty}</p>
          ) : (
            <div className="company-document-preview-body">
              <p className="company-document-preview-name">{openedDocument.name}</p>
              <p className="company-document-preview-meta">
                {openedDocument.sizeLabel !== "-" ? `${openedDocument.sizeLabel} · ` : ""}
                {openedDocument.mimeType}
              </p>

              {openedDocument.objectUrl !== null && openedDocument.mimeType.startsWith("image/") ? (
                <img src={openedDocument.objectUrl} alt={openedDocument.name} className="company-document-preview-image" />
              ) : null}
              {openedDocument.objectUrl !== null && openedDocument.mimeType === "application/pdf" ? (
                <iframe src={openedDocument.objectUrl} title={openedDocument.name} className="company-document-preview-frame" />
              ) : null}
              {openedDocument.objectUrl === null ? (
                <div className="company-document-preview-placeholder">
                  <p>{text.unknownFileType}</p>
                  <small>{text.openPreviewHint}</small>
                </div>
              ) : null}

              <div className="company-document-actions">
                <button type="button" onClick={() => onDocumentDownload(selectedCompany.name, openedDocument)}>
                  {text.downloadFile}
                </button>
                <button type="button" onClick={() => onDocumentPrint(selectedCompany.name, openedDocument)}>
                  {text.printFile}
                </button>
                <button
                  type="button"
                  className="is-danger"
                  onClick={() => onDocumentDelete(selectedCompany.id, openedDocument)}
                >
                  {text.deleteFile}
                </button>
              </div>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}

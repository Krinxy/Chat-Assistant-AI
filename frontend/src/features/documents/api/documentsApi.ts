import { API_BASE } from "../../../shared/api/auth_api";

/** A document in the shared RAG knowledge base, as returned by the backend. */
export interface DocumentItem {
  id: string;
  filename: string;
  chunkCount: number;
  uploadedAt: string;
}

interface DocumentItemWire {
  id: string;
  filename: string;
  chunk_count: number;
  uploaded_at: string;
}

/** Error carrying the HTTP status so callers can map 409/413/415/… to friendly copy. */
export class DocumentsApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "DocumentsApiError";
  }
}

function mapDocument(wire: DocumentItemWire): DocumentItem {
  return {
    id: wire.id,
    filename: wire.filename,
    chunkCount: wire.chunk_count,
    uploadedAt: wire.uploaded_at,
  };
}

function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { detail?: string };
  return body.detail ?? response.statusText;
}

export async function listDocuments(token: string | null): Promise<DocumentItem[]> {
  const response = await fetch(`${API_BASE}/api/documents`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new DocumentsApiError(response.status, await readError(response));
  }
  const wire = (await response.json()) as DocumentItemWire[];
  return wire.map(mapDocument);
}

export async function uploadDocument(file: File, token: string | null): Promise<DocumentItem> {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch(`${API_BASE}/api/documents/upload`, {
    method: "POST",
    headers: authHeaders(token),
    body: form,
  });
  if (!response.ok) {
    throw new DocumentsApiError(response.status, await readError(response));
  }
  return mapDocument((await response.json()) as DocumentItemWire);
}

export async function deleteDocument(id: string, token: string | null): Promise<void> {
  const response = await fetch(`${API_BASE}/api/documents/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new DocumentsApiError(response.status, await readError(response));
  }
}

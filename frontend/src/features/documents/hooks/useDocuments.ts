import { useCallback, useEffect, useState } from "react";

import {
  type DocumentItem,
  DocumentsApiError,
  deleteDocument,
  listDocuments,
  uploadDocument,
} from "../api/documentsApi";

/** Result of a mutating action, carrying the HTTP status so the UI can map it to copy. */
export interface MutationOutcome {
  ok: boolean;
  statusCode?: number;
  detail?: string;
}

export interface UseDocumentsResult {
  documents: DocumentItem[];
  isLoading: boolean;
  loadError: string | null;
  reload: () => Promise<void>;
  upload: (file: File) => Promise<MutationOutcome>;
  remove: (id: string) => Promise<MutationOutcome>;
}

function toOutcome(error: unknown): MutationOutcome {
  if (error instanceof DocumentsApiError) {
    return { ok: false, statusCode: error.statusCode, detail: error.message };
  }
  return { ok: false, detail: error instanceof Error ? error.message : "unknown_error" };
}

/**
 * Owns the knowledge-base document list and its mutations against the backend.
 *
 * Loads on mount (and whenever the token changes) and keeps the list in sync after
 * upload/delete without a full refetch. Mutations return a {@link MutationOutcome} instead of
 * throwing so the caller can surface a friendly, localized message per HTTP status.
 */
export function useDocuments(token: string | null): UseDocumentsResult {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setDocuments(await listDocuments(token));
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : "unknown_error");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const upload = useCallback(
    async (file: File): Promise<MutationOutcome> => {
      try {
        const created = await uploadDocument(file, token);
        // Prepend so the newest upload shows first, matching the backend's desc ordering.
        setDocuments((previous) => [created, ...previous.filter((doc) => doc.id !== created.id)]);
        return { ok: true };
      } catch (error: unknown) {
        return toOutcome(error);
      }
    },
    [token],
  );

  const remove = useCallback(
    async (id: string): Promise<MutationOutcome> => {
      try {
        await deleteDocument(id, token);
        setDocuments((previous) => previous.filter((doc) => doc.id !== id));
        return { ok: true };
      } catch (error: unknown) {
        return toOutcome(error);
      }
    },
    [token],
  );

  return { documents, isLoading, loadError, reload, upload, remove };
}

import { API_BASE } from "../../../shared/api/auth_api";
import type { ChatSource } from "../types/chat";

/** Raw source entry as serialised by the backend (snake_case wire format). */
interface ChatSourceWire {
  source: string;
  filename?: string;
  chunk_index: number;
  similarity: number;
}

export interface ChatApiResponse {
  status: string;
  message: string;
  session_id: string;
  user: string;
  sources: ChatSource[];
}

interface ChatApiResponseWire {
  status: string;
  message: string;
  session_id: string;
  user: string;
  sources?: ChatSourceWire[];
}

function mapSources(raw: ChatSourceWire[] | undefined): ChatSource[] {
  return (raw ?? []).map((entry) => ({
    source: entry.source,
    filename: entry.filename ?? entry.source,
    chunkIndex: entry.chunk_index,
    similarity: entry.similarity,
  }));
}

interface ChatErrorDetail {
  reason?: string;
  error?: string;
}

interface ChatErrorBody {
  detail?: string | ChatErrorDetail;
}

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function sendChatMessage(
  message: string,
  sessionId: string,
  provider: string,
  token: string | null,
): Promise<ChatApiResponse> {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, session_id: sessionId, provider }),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({ detail: response.statusText }))) as ChatErrorBody;
    const detail = errorBody.detail;
    const reason = typeof detail === "object" && detail !== null ? detail.reason : undefined;
    const errorMsg = reason ?? (typeof detail === "string" ? detail : response.statusText);
    throw new ApiError(response.status, errorMsg);
  }

  const body = (await response.json()) as ChatApiResponseWire;
  return {
    status: body.status,
    message: body.message,
    session_id: body.session_id,
    user: body.user,
    sources: mapSources(body.sources),
  };
}

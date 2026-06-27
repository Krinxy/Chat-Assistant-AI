import { API_BASE } from "../../../shared/api/auth_api";

export interface ChatApiResponse {
  status: string;
  message: string;
  session_id: string;
  user: string;
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

  return response.json() as Promise<ChatApiResponse>;
}

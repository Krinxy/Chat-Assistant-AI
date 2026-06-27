const API_BASE = (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL ?? "http://localhost:8000";

export interface AppConfig {
  persist_token_in_browser: boolean;
}

export interface MeResult {
  email: string;
  role: string;
}

export interface LoginResult {
  access_token: string;
  token_type: string;
}

export interface RegisterResult {
  id: number;
  email: string;
}

export async function apiLogin(email: string, password: string): Promise<LoginResult> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await (res.json() as Promise<{ detail?: string }>).catch((): { detail?: string } => ({}));
    throw new Error(data.detail ?? `Login fehlgeschlagen (${res.status})`);
  }

  return res.json() as Promise<LoginResult>;
}

export async function apiMe(token: string): Promise<MeResult> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("invalid_token");
  }

  return res.json() as Promise<MeResult>;
}

export async function apiFetchConfig(): Promise<AppConfig> {
  try {
    const res = await fetch(`${API_BASE}/api/config`);
    if (!res.ok) {
      return { persist_token_in_browser: false };
    }
    return res.json() as Promise<AppConfig>;
  } catch {
    return { persist_token_in_browser: false };
  }
}

export async function apiRegister(email: string, password: string): Promise<RegisterResult> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await (res.json() as Promise<{ detail?: string }>).catch((): { detail?: string } => ({}));
    throw new Error(data.detail ?? `Registrierung fehlgeschlagen (${res.status})`);
  }

  return res.json() as Promise<RegisterResult>;
}

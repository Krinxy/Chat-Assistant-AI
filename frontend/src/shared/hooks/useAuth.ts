import { useCallback, useEffect, useRef, useState } from "react";

import { apiFetchConfig, apiLogin, apiMe } from "../api/auth_api";
import { TOKEN_KEY } from "../constants/auth";

export interface AuthUser {
  email: string;
  token: string;
  /** "admin" unlocks document upload/delete; "user" is read-only on the knowledge base. */
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const persistRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const init = async (): Promise<void> => {
      const config = await apiFetchConfig();
      persistRef.current = config.persist_token_in_browser;

      if (config.persist_token_in_browser) {
        try {
          const stored = globalThis.localStorage.getItem(TOKEN_KEY);
          if (stored !== null) {
            const me = await apiMe(stored).catch(() => null);
            if (!cancelled && me !== null) {
              setUser({ email: me.email, token: stored, role: me.role });
            } else if (!cancelled) {
              globalThis.localStorage.removeItem(TOKEN_KEY);
            }
          }
        } catch {
          // localStorage may be unavailable in some browser privacy contexts
        }
      }

      if (!cancelled) {
        setIsLoading(false);
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const result = await apiLogin(email, password);
    if (persistRef.current) {
      try {
        globalThis.localStorage.setItem(TOKEN_KEY, result.access_token);
      } catch {
        // Ignore storage write failures
      }
    }
    // Resolve the role from /me so the UI can gate admin-only actions. A failure here
    // must not block login — default to the least-privileged "user" role.
    const me = await apiMe(result.access_token).catch(() => null);
    setUser({ email, token: result.access_token, role: me?.role ?? "user" });
  }, []);

  const logout = useCallback((): void => {
    try {
      globalThis.localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore storage failures
    }
    setUser(null);
  }, []);

  return {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    logout,
  };
}

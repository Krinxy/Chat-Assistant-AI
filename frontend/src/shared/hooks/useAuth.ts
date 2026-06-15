import { useCallback, useState } from "react";

import { apiLogin } from "../api/auth_api";

export interface AuthUser {
  email: string;
  token: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const result = await apiLogin(email, password);
    setUser({ email, token: result.access_token });
  }, []);

  const logout = useCallback((): void => {
    setUser(null);
  }, []);

  return {
    user,
    isAuthenticated: user !== null,
    login,
    logout,
  };
}

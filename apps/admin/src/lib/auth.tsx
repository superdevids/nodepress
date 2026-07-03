"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "AUTHOR" | "CONTRIBUTOR" | "SUBSCRIBER";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  capabilities?: string[];
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, apiUrl }: { children: React.ReactNode; apiUrl: string }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    let mounted = true;
    fetch(`${apiUrl}/auth/me`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Not authenticated");
        return res.json();
      })
      .then((user) => {
        if (mounted) {
          setState({ user, isLoading: false, isAuthenticated: true });
        }
      })
      .catch(() => {
        if (mounted) {
          setState({ user: null, isLoading: false, isAuthenticated: false });
        }
      });
    return () => {
      mounted = false;
    };
  }, [apiUrl]);

  const login = useCallback(
    async (email: string, password: string, remember = false) => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const response = await fetch(`${apiUrl}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          credentials: "include",
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message || "Login failed");
        }

        const data = await response.json();

        setState({
          user: data.user,
          isLoading: false,
          isAuthenticated: true,
        });
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }));
        throw error;
      }
    },
    [apiUrl],
  );

  const logout = useCallback(() => {
    fetch(`${apiUrl}/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, [apiUrl]);

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/auth/me`, {
        credentials: "include",
      });
      if (response.ok) {
        const user = await response.json();
        setState((prev) => ({ ...prev, user }));
      }
    } catch {
      // Silently fail — user will be refreshed on next page load
    }
  }, [apiUrl]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

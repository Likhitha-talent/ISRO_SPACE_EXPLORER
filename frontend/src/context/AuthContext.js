import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

const BASE = "/api/auth";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);   // { user_id, full_name, email, role }
  const [loading, setLoading] = useState(true);   // initial session check

  // ─── Restore session on mount ──────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const saved = localStorage.getItem("user");
    if (token && saved) {
      setUser(JSON.parse(saved));
    }
    setLoading(false);
  }, []);

  // ─── Register ─────────────────────────────────────────────────────
  const register = useCallback(async ({ full_name, email, password }) => {
    const data = await apiFetch("/register", {
      method: "POST",
      body: JSON.stringify({ full_name, email, password }),
    });
    localStorage.setItem("accessToken",  data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  // ─── Login ────────────────────────────────────────────────────────
  const login = useCallback(async ({ email, password }) => {
    const data = await apiFetch("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("accessToken",  data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  // ─── Logout ───────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    try {
      await apiFetch("/logout", { method: "POST", body: JSON.stringify({ refreshToken }) });
    } catch {}
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────────
  const isAdmin  = user?.role === "admin";
  const isLogged = !!user;

  // ─── Authenticated fetch (auto-injects Bearer token) ──────────────
  const authFetch = useCallback(async (url, options = {}) => {
    const token = localStorage.getItem("accessToken");
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    // If token expired, try refresh
    if (res.status === 401) {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) { logout(); throw new Error("Session expired"); }
      try {
        const r = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        const d = await r.json();
        localStorage.setItem("accessToken", d.accessToken);
        // Retry original request
        return fetch(url, {
          ...options,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${d.accessToken}`, ...options.headers },
        });
      } catch { logout(); throw new Error("Session expired"); }
    }
    return res;
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isLogged, login, register, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

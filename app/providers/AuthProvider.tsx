"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

function safeReturnTo(path: string | null | undefined, fallback = "/gallery"): string {
  if (path == null || typeof path !== "string") return fallback;
  const t = path.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return fallback;
  return t;
}

type User = { id: string; username: string; email: string; isAdmin: boolean };

export type RegisterFailure = {
  errors: string[];
  fieldErrors?: Partial<{ email: string; username: string }>;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  login: (
    login: string,
    password: string,
    returnTo?: string | null,
  ) => Promise<string[] | null>;
  register: (
    username: string,
    email: string,
    password: string,
    confirmPassword: string,
    returnTo?: string | null,
  ) => Promise<RegisterFailure | null>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  refreshUser: async () => {},
  login: async () => null,
  register: async () => ({ errors: ["Ошибка регистрации"] }) as RegisterFailure,
  logout: async () => {},
});

export function useAuth() {
  return useContext(Ctx);
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });
      const d = await r.json();
      const u = d.user;
      setUser(
        u
          ? {
              id: u.id,
              username: u.username,
              email: u.email,
              isAdmin: Boolean(u.isAdmin),
            }
          : null,
      );
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(
    async (
      loginVal: string,
      password: string,
      returnTo?: string | null,
    ): Promise<string[] | null> => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ login: loginVal, password }),
      });
      const data = await res.json();
      if (!res.ok) return data.errors ?? ["Ошибка входа"];
      const u = data.user;
      setUser({
        id: u.id,
        username: u.username,
        email: u.email,
        isAdmin: Boolean(u.isAdmin),
      });
      router.replace(safeReturnTo(returnTo));
      router.refresh();
      return null;
    },
    [router],
  );

  const register = useCallback(
    async (
      username: string,
      email: string,
      password: string,
      confirmPassword: string,
      returnTo?: string | null,
    ): Promise<RegisterFailure | null> => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, email, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          errors: Array.isArray(data.errors) ? data.errors : ["Ошибка регистрации"],
          fieldErrors: data.fieldErrors ?? undefined,
        };
      }
      const u = data.user;
      setUser({
        id: u.id,
        username: u.username,
        email: u.email,
        isAdmin: Boolean(u.isAdmin),
      });
      router.replace(safeReturnTo(returnTo));
      router.refresh();
      return null;
    },
    [router],
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
    router.replace("/auth/login");
    router.refresh();
  }, [router]);

  return (
    <Ctx.Provider value={{ user, loading, refreshUser, login, register, logout }}>
      {children}
    </Ctx.Provider>
  );
}

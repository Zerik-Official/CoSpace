"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { apiRequest } from "@/lib/api/client";
import { isApiErrorEnvelope } from "@/lib/api/envelope";
import type { SessionUser } from "@/lib/domain/types";

/** Value shared by every consumer of the session context. */
export interface SessionContextValue {
  user: SessionUser | null;
  isResolving: boolean;
  reload: () => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Resolves the authenticated principal in the browser, so pages that must stay
 * static do not depend on request cookies during the server render.
 *
 * @param props - Children rendered inside the provider.
 * @returns The provider element.
 */
export function SessionProvider({ children }: { children: ReactNode }): ReactNode {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isResolving, setIsResolving] = useState(true);

  const reload = useCallback(async (): Promise<void> => {
    const envelope = await apiRequest<{ user: SessionUser | null }>("/api/auth/session");
    setUser(isApiErrorEnvelope(envelope) ? null : envelope.data.user);
    setIsResolving(false);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await apiRequest<{ loggedOut: boolean }>("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<SessionContextValue>(
    () => ({ user, isResolving, reload, logout }),
    [user, isResolving, reload, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/**
 * Reads the session context.
 *
 * @returns The current session value.
 * @throws Error when used outside of SessionProvider.
 */
export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession must be used inside SessionProvider");
  }

  return value;
}

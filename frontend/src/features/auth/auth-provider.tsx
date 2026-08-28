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
import type { AppUser, Role } from "@/lib/types";
import { setAuthToken } from "@/lib/api";
import { getAuthRepository } from "./repository";

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  /** true saat autentikasi memakai Demo Mode (bukan Firebase) */
  isMockAuth: boolean;
  signInWithGoogle: () => Promise<AppUser | null>;
  signInWithEmail: (email: string, password: string) => Promise<AppUser>;
  signUpWithEmail: (email: string, password: string, role: Role | null) => Promise<AppUser>;
  signOutUser: () => Promise<void>;
  updateProfile: (patch: Partial<AppUser>) => Promise<AppUser>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const repo = useMemo(() => getAuthRepository(), []);
  const isMockAuth = repo.isMock;

  useEffect(() => {
    const unsub = repo.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, [repo]);

  useEffect(() => {
    let cancel = false;
    repo.getAuthToken().then((t) => {
      if (!cancel) setAuthToken(t);
    });
    return () => {
      cancel = true;
      setAuthToken(null);
    };
  }, [repo, user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const signInWithGoogle = useCallback(async () => {
    return repo.signInWithGoogle();
  }, [repo]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      return repo.signInWithEmail(email, password);
    },
    [repo]
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, role: Role | null) => {
      return repo.signUpWithEmail(email, password, role);
    },
    [repo]
  );

  const signOutUser = useCallback(async () => {
    await repo.signOut();
  }, [repo]);

  const updateProfile = useCallback(
    async (patch: Partial<AppUser>) => {
      if (!user) throw new Error("Belum ada sesi pengguna");
      return repo.updateProfile(user.uid, patch);
    },
    [repo, user]
  );

  const value: AuthContextValue = {
    user,
    loading,
    isMockAuth,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOutUser,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>");
  return ctx;
}

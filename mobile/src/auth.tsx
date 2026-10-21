import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Customer, apiLogin, apiRegister, apiLogout, apiMe } from "./api";
import { getTokens } from "./storage";
import { unregisterPush } from "./push";

interface AuthContextValue {
  customer: Customer | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { email: string; password: string; name: string; phone?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setCustomer: (c: Customer | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const t = await getTokens();
      if (t?.accessToken) {
        try {
          setCustomer(await apiMe());
        } catch {
          /* token invalid/expired → stay logged out */
        }
      }
      setLoading(false);
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setCustomer(await apiLogin(email, password));
  }, []);

  const signUp = useCallback(async (input: { email: string; password: string; name: string; phone?: string }) => {
    setCustomer(await apiRegister(input));
  }, []);

  const signOut = useCallback(async () => {
    await unregisterPush();
    await apiLogout();
    setCustomer(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      setCustomer(await apiMe());
    } catch {
      setCustomer(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ customer, loading, signIn, signUp, signOut, refreshProfile, setCustomer }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

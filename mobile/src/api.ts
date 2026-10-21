import Constants from "expo-constants";
import { getTokens, setTokens, clearTokens, Tokens } from "./storage";

// Προτεραιότητα: EXPO_PUBLIC_API_BASE_URL (EAS build profiles) → app.json extra → localhost.
export const API_BASE: string =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ||
  "http://localhost:3000";

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let refreshing: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const t = await getTokens();
  if (!t?.refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: t.refreshToken }),
    });
    if (!res.ok) {
      await clearTokens();
      return false;
    }
    const data = await res.json();
    await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return true;
  } catch {
    return false;
  }
}

interface Opts {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
}

export async function apiFetch(path: string, opts: Opts = {}, retry = true): Promise<Response> {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  let body: string | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
    body = typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body);
  }
  if (opts.auth !== false) {
    const t = await getTokens();
    if (t?.accessToken) headers["Authorization"] = `Bearer ${t.accessToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { method: opts.method ?? "GET", headers, body });

  if (res.status === 401 && opts.auth !== false && retry) {
    if (!refreshing) refreshing = doRefresh();
    const ok = await refreshing;
    refreshing = null;
    if (ok) return apiFetch(path, opts, false);
  }
  return res;
}

export async function apiJson<T = any>(path: string, opts: Opts = {}): Promise<T> {
  let res: Response;
  try {
    res = await apiFetch(path, opts);
  } catch {
    throw new ApiError("Χωρίς σύνδεση στο internet.", 0);
  }
  const data = await res.json().catch(() => ({}) as any);
  if (!res.ok || data.ok === false) {
    throw new ApiError(data.error ?? `Σφάλμα (${res.status})`, res.status, data.errorCode);
  }
  return data as T;
}

/* ----------------------------- Auth helpers ----------------------------- */
export interface Customer {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  favoriteBarberId?: string | null;
  notifyPush?: boolean;
}

export async function apiLogin(email: string, password: string): Promise<Customer> {
  const data = await apiJson("/api/v1/auth/login", { method: "POST", body: { email, password }, auth: false });
  await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken } as Tokens);
  return data.customer;
}

export async function apiRegister(input: {
  email: string;
  password: string;
  name: string;
  phone?: string;
}): Promise<Customer> {
  const data = await apiJson("/api/v1/auth/register", { method: "POST", body: input, auth: false });
  await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken } as Tokens);
  return data.customer;
}

export async function apiLogout(): Promise<void> {
  const t = await getTokens();
  if (t?.refreshToken) {
    await apiFetch("/api/v1/auth/logout", { method: "POST", body: { refreshToken: t.refreshToken }, auth: false }).catch(
      () => {},
    );
  }
  await clearTokens();
}

export async function apiMe(): Promise<Customer> {
  const data = await apiJson("/api/v1/me");
  return data.customer;
}

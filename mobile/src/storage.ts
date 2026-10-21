import * as SecureStore from "expo-secure-store";

const TOKENS_KEY = "k27_tokens";
const INSTALL_KEY = "k27_installation_id";

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export async function getTokens(): Promise<Tokens | null> {
  try {
    const raw = await SecureStore.getItemAsync(TOKENS_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

export async function setTokens(t: Tokens): Promise<void> {
  await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(t));
}

export async function clearTokens(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKENS_KEY);
  } catch {
    /* ignore */
  }
}

/** Σταθερό installation id ανά εγκατάσταση (για εγγραφή συσκευής push). */
export async function getInstallationId(): Promise<string> {
  let id = await SecureStore.getItemAsync(INSTALL_KEY);
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    await SecureStore.setItemAsync(INSTALL_KEY, id);
  }
  return id;
}

/**
 * Auth Client dla Portal BiuroAdmin
 * Łączy Portal (frontend & Next.js backend) z mikroserwisem autoryzacji ksef-outbox-pattern (PostgreSQL + Redis).
 * Obsługuje Google OAuth, ChatGPT Actions oraz role RBAC (ADMIN, ACCOUNTANT, CLIENT).
 */

export type UserRole = 'ADMIN' | 'ACCOUNTANT' | 'CLIENT';
export type AuthProvider = 'GOOGLE' | 'CHATGPT' | 'LOCAL';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  nip?: string | null;
  companyName?: string | null;
  provider: AuthProvider;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

export interface SessionData {
  token: string;
  expiresAt: string;
  user: AuthUser;
}

export interface LoginParams {
  provider: AuthProvider;
  email: string;
  name: string;
  nip?: string;
  companyName?: string;
}

export interface LoginResult {
  success: boolean;
  session?: {
    token: string;
    expiresAt: string;
  };
  user?: AuthUser;
  error?: string;
}

export interface SessionResult {
  success: boolean;
  user?: AuthUser;
  session?: {
    token: string;
    expiresAt: string;
  };
  error?: string;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
  lastUsedAt?: string;
}

export interface CreateApiKeyResult {
  success: boolean;
  apiKey?: ApiKeyItem;
  rawKey?: string;
  error?: string;
}

const TOKEN_STORAGE_KEY = 'biuroadmin_session_token';

/**
 * Zwraca bazowy URL API KSeF / Auth zależnie od środowiska (przeglądarka / SSR Node.js)
 */
export function getAuthApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // W przeglądarce odwołujemy się przez proxy Caddy /api/ksef
    const custom = (window as any).__KSEF_API_URL__;
    if (custom) return custom;
    return '/api/ksef';
  }
  // Po stronie serwera Next.js (w kontenerze portal-web)
  return process.env.INTERNAL_KSEF_API_URL || process.env.NEXT_PUBLIC_KSEF_API_URL || 'http://ksef-worker:3001';
}

/**
 * Pobiera zapamiętany token sesyjny (z localStorage w przeglądarce)
 */
export function getStoredSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Zapisuje token sesyjny w localStorage
 */
export function storeSessionToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch (err) {
    console.error('Błąd zapisu tokena sesji w localStorage:', err);
  }
}

/**
 * Usuwa token sesyjny z localStorage
 */
export function clearStoredSessionToken(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (err) {
    console.error('Błąd usuwania tokena sesji z localStorage:', err);
  }
}

/**
 * Rejestruje lub loguje użytkownika w bazie PostgreSQL i tworzy sesję w Redis
 */
export async function loginUser(params: LoginParams): Promise<LoginResult> {
  const baseUrl = getAuthApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || `HTTP ${res.status}: Nie udało się zalogować`,
      };
    }

    if (data.session?.token) {
      storeSessionToken(data.session.token);
    }

    return {
      success: true,
      session: data.session,
      user: data.user,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Błąd połączenia z serwerem autoryzacji',
    };
  }
}

/**
 * Sprawdza ważność aktywnej sesji (odpytuje Redis / PostgreSQL)
 */
export async function getCurrentSession(explicitToken?: string): Promise<SessionResult> {
  const baseUrl = getAuthApiBaseUrl();
  const token = explicitToken || getStoredSessionToken();

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-session-token'] = token;
  }

  try {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      if (res.status === 401) {
        clearStoredSessionToken();
      }
      return {
        success: false,
        error: data.error || `HTTP ${res.status}: Sesja nieważna`,
      };
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Błąd sprawdzania sesji',
    };
  }
}

/**
 * Kończy sesję w Redis i PostgreSQL oraz unieważnia ciasteczka
 */
export async function logoutUser(explicitToken?: string): Promise<{ success: boolean; error?: string }> {
  const baseUrl = getAuthApiBaseUrl();
  const token = explicitToken || getStoredSessionToken();

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-session-token'] = token;
  }

  try {
    const res = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers,
      credentials: 'include',
    });

    clearStoredSessionToken();
    const data = await res.json().catch(() => ({ success: true }));
    return { success: data.success ?? true };
  } catch (err: any) {
    clearStoredSessionToken();
    return { success: true };
  }
}

/**
 * Pobiera listę zarejestrowanych użytkowników (wymaga roli ADMIN)
 */
export async function listRegisteredUsers(explicitToken?: string): Promise<{ success: boolean; users?: AuthUser[]; error?: string }> {
  const baseUrl = getAuthApiBaseUrl();
  const token = explicitToken || getStoredSessionToken();

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-session-token'] = token;
  }

  try {
    const res = await fetch(`${baseUrl}/api/auth/users`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || `HTTP ${res.status}: Brak uprawnień do przeglądania użytkowników`,
      };
    }

    return {
      success: true,
      users: data.users,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Błąd pobierania listy użytkowników',
    };
  }
}

/**
 * Generuje nowy klucz API dla integracji z ChatGPT Actions / systemami zewnętrznymi (Zadanie W-05)
 */
export async function generateApiKey(
  params: { name: string; scopes: string[]; expiresInDays?: number },
  explicitToken?: string
): Promise<CreateApiKeyResult> {
  const baseUrl = getAuthApiBaseUrl();
  const token = explicitToken || getStoredSessionToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-session-token'] = token;
  }

  try {
    const res = await fetch(`${baseUrl}/api/auth/api-keys`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || `HTTP ${res.status}: Nie udało się wygenerować klucza API`,
      };
    }

    return {
      success: true,
      apiKey: data.apiKey,
      rawKey: data.rawKey || data.key,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Błąd połączenia z serwerem autoryzacji',
    };
  }
}

/**
 * Pobiera listę kluczy API bieżącego użytkownika lub organizacji
 */
export async function listApiKeys(
  explicitToken?: string
): Promise<{ success: boolean; apiKeys?: ApiKeyItem[]; error?: string }> {
  const baseUrl = getAuthApiBaseUrl();
  const token = explicitToken || getStoredSessionToken();

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-session-token'] = token;
  }

  try {
    const res = await fetch(`${baseUrl}/api/auth/api-keys`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || `HTTP ${res.status}: Nie udało się pobrać listy kluczy API`,
      };
    }

    return {
      success: true,
      apiKeys: data.apiKeys || data.keys || [],
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Błąd połączenia z serwerem autoryzacji',
    };
  }
}

/**
 * Unieważnia (odwołuje) klucz API po identyfikatorze
 */
export async function revokeApiKey(
  id: string,
  explicitToken?: string
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = getAuthApiBaseUrl();
  const token = explicitToken || getStoredSessionToken();

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-session-token'] = token;
  }

  try {
    const res = await fetch(`${baseUrl}/api/auth/api-keys/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || `HTTP ${res.status}: Nie udało się odwołać klucza API`,
      };
    }

    return {
      success: true,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Błąd połączenia z serwerem autoryzacji',
    };
  }
}

const AUTH_TOKEN_KEY = "ect_auth_token";
const AUTH_USER_ID_KEY = "ect_auth_user_id";
const ONBOARDING_CACHE_PREFIX = "act_onboarding_completed";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export function getAuthToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getAuthUserId() {
  try {
    const stored = localStorage.getItem(AUTH_USER_ID_KEY);
    if (stored) {
      const parsed = Number(stored);
      if (Number.isFinite(parsed)) return parsed;
    }
  } catch {
    // Ignore storage failures.
  }
  return userIdFromToken(getAuthToken());
}

export function setAuthToken(token: string, user?: AuthUser) {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    if (user) localStorage.setItem(AUTH_USER_ID_KEY, String(user.id));
  } catch {
    // Ignore storage failures (private mode, etc.).
  }
}

export function setAuthSession(token: string, user: AuthUser) {
  clearOnboardingCache();
  setAuthToken(token, user);
}

export function clearAuthToken() {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_ID_KEY);
  } catch {
    // Ignore storage failures.
  }
  clearOnboardingCache();
}

export function onboardingCacheKey(userId?: number | null) {
  return userId ? `${ONBOARDING_CACHE_PREFIX}_${userId}` : ONBOARDING_CACHE_PREFIX;
}

export function readOnboardingCompleted(userId?: number | null) {
  try {
    return sessionStorage.getItem(onboardingCacheKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function writeOnboardingCompleted(completed: boolean, userId?: number | null) {
  try {
    const key = onboardingCacheKey(userId);
    if (completed) sessionStorage.setItem(key, "1");
    else sessionStorage.removeItem(key);
  } catch {
    // Ignore storage failures (private mode, etc.).
  }
}

export function clearOnboardingCache() {
  try {
    const keys: string[] = [];
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index);
      if (key?.startsWith(ONBOARDING_CACHE_PREFIX)) keys.push(key);
    }
    for (const key of keys) sessionStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

function userIdFromToken(token: string | null) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as { sub?: unknown };
    const parsed = Number(payload.sub);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

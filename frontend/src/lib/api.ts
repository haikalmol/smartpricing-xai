export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const TOKEN_STORAGE_KEY = "smartpricing_token";
let authToken: string | null = localStorage.getItem(TOKEN_STORAGE_KEY);

export function setAuthToken(token: string | null): void {
  authToken = token;
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

export interface Merchant {
  id: number;
  name: string;
  business_name: string;
  location: string;
}

export interface MerchantStats {
  services_count: number;
  recommendations_count: number;
  approved_count: number;
}

export interface Service {
  id: number;
  merchant_id: number;
  name: string;
  listed_price: string;
  hpp: string;
}

export interface Recommendation {
  id: number;
  service_id: number;
  suggested_price: string;
  rationale_text: string;
  weather_snapshot_json: Record<string, unknown> | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  responded_at: string | null;
}

export interface PendingRecommendation {
  id: number;
  service_id: number;
  service_name: string;
  suggested_price: string;
  rationale_text: string;
  created_at: string;
}

export interface AuthResult {
  access_token: string;
  merchant: Merchant;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    // fetch() itself rejected: backend unreachable (down, cold-starting on a free
    // tier, CORS blocked, DNS/network failure). Never surface the raw browser
    // TypeError ("Failed to fetch") to a merchant.
    throw new Error("Layanan belum tersedia, coba lagi.");
  }
  if (res.status === 401 && authToken) {
    // Only force a session-expiry reload for a 401 on an *authenticated* call
    // (a token was sent and rejected). A 401 from /auth/login itself just
    // means "wrong credentials" -- there's no session to have expired, and
    // reloading here would wipe the error message before the user sees it.
    // ponytail: hard reload on 401, move to reactive auth state if this ever feels janky.
    setAuthToken(null);
    window.location.reload();
    throw new Error("Sesi berakhir, silakan masuk kembali.");
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // FastAPI's standard error shape is {"detail": "..."} -- surface that
    // directly instead of dumping the raw response body at the user.
    let detail: string | null = null;
    try {
      const parsed = JSON.parse(body);
      if (typeof parsed.detail === "string") detail = parsed.detail;
    } catch {
      // not JSON -- fall through to the generic message below
    }
    throw new Error(detail ?? `${init?.method ?? "GET"} ${path} gagal: ${res.status} ${body}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}

export function register(payload: {
  email: string;
  password: string;
  name: string;
  business_name: string;
  location: string;
}): Promise<AuthResult> {
  return request(`/auth/register`, { method: "POST", body: JSON.stringify(payload) });
}

export function login(email: string, password: string): Promise<AuthResult> {
  return request(`/auth/login`, { method: "POST", body: JSON.stringify({ email, password }) });
}

export function deleteAccount(): Promise<void> {
  return request(`/auth/account`, { method: "DELETE" });
}

export function fetchMerchant(): Promise<Merchant> {
  return request(`/merchants/me`);
}

export function fetchMerchantStats(): Promise<MerchantStats> {
  return request(`/merchants/me/stats`);
}

export function updateMerchant(payload: {
  name: string;
  business_name: string;
  location: string;
  maps_link?: string;
}): Promise<Merchant> {
  return request(`/merchants/me`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function fetchServices(): Promise<Service[]> {
  return request(`/services`);
}

export function createService(payload: {
  name: string;
  listed_price: number;
  hpp: number;
}): Promise<Service> {
  return request(`/services`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteService(serviceId: number): Promise<void> {
  return request(`/services/${serviceId}`, { method: "DELETE" });
}

export function updateServiceHpp(serviceId: number, hpp: number): Promise<Service> {
  return request(`/services/${serviceId}/hpp`, {
    method: "PUT",
    body: JSON.stringify({ hpp }),
  });
}

export function fetchCurrentRecommendation(serviceId: number): Promise<Recommendation> {
  return request(`/recommendations/current?service_id=${serviceId}`);
}

export function fetchPendingRecommendations(): Promise<PendingRecommendation[]> {
  return request(`/recommendations/pending`);
}

export function respondToRecommendation(
  recommendationId: number,
  status: "approved" | "rejected"
): Promise<Recommendation> {
  return request(`/recommendations/${recommendationId}/respond`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

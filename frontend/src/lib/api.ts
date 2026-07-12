export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

// TODO: no auth in MVP scope (per CLAUDE.md) — hardcoded until login exists.
export const DEFAULT_MERCHANT_ID = 1;

export interface Merchant {
  id: number;
  name: string;
  business_name: string;
  location: string;
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    // fetch() itself rejected: backend unreachable (down, cold-starting on a free
    // tier, CORS blocked, DNS/network failure). Never surface the raw browser
    // TypeError ("Failed to fetch") to a merchant.
    throw new Error("Layanan belum tersedia, coba lagi.");
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${init?.method ?? "GET"} ${path} gagal: ${res.status} ${body}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}

export function fetchMerchant(merchantId: number = DEFAULT_MERCHANT_ID): Promise<Merchant> {
  return request(`/merchants/${merchantId}`);
}

export function updateMerchant(
  merchantId: number,
  payload: { name: string; business_name: string; location: string }
): Promise<Merchant> {
  return request(`/merchants/${merchantId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function fetchServices(merchantId: number = DEFAULT_MERCHANT_ID): Promise<Service[]> {
  return request(`/services?merchant_id=${merchantId}`);
}

export function createService(payload: {
  merchant_id: number;
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

export function fetchPendingRecommendations(
  merchantId: number = DEFAULT_MERCHANT_ID
): Promise<PendingRecommendation[]> {
  return request(`/recommendations/pending?merchant_id=${merchantId}`);
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

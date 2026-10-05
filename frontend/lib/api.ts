const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("access_token", token);
  else localStorage.removeItem("access_token");
}

/**
 * FastAPI error bodies aren't always a plain string:
 * - simple errors: { detail: "message" }
 * - pydantic validation errors: { detail: [{ loc, msg, type }, ...] }
 * This normalizes both (and anything else) into a readable string so
 * error UI never renders "[object Object]".
 */
function extractErrorMessage(body: unknown, fallback: string): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          const field = Array.isArray((item as { loc?: unknown }).loc)
            ? (item as { loc: unknown[] }).loc.filter((p) => p !== "body").join(".")
            : undefined;
          const msg = String((item as { msg: unknown }).msg);
          return field ? `${field}: ${msg}` : msg;
        }
        return null;
      })
      .filter(Boolean);
    return messages.length ? messages.join("; ") : fallback;
  }
  if (typeof detail === "object") {
    return (detail as { msg?: string }).msg || fallback;
  }
  return fallback;
}

async function readErrorMessage(res: Response): Promise<string> {
  const fallback = res.statusText || `Request failed (${res.status})`;
  try {
    const body = await res.json();
    return extractErrorMessage(body, fallback);
  } catch {
    return fallback;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    throw new ApiError(res.status, await readErrorMessage(res));
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    throw new ApiError(res.status, await readErrorMessage(res));
  }

  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) => apiUpload<T>(path, formData),
};

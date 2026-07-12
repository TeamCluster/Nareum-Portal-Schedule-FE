// Thin fetch wrapper around the Flask API. Always sends credentials so the
// admin session cookie is included.

export const API_BASE = import.meta.env.VITE_API_BASE || "";

/** Build an absolute URL for a backend asset (e.g. facility images). */
export function assetUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE}${path}`;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
  const res = await fetch(`${API_BASE}/api${path}`, {
    credentials: "include",
    headers:
      options.body != null && !isForm
        ? { "Content-Type": "application/json", ...(options.headers || {}) }
        : options.headers,
    ...options,
  });

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : null) || "요청을 처리하지 못했습니다.";
    throw new ApiError(message, res.status);
  }

  return data as T;
}

/** Multipart 업로드. Content-Type 은 브라우저가 boundary 와 함께 자동 설정. */
async function upload<T>(path: string, form: FormData): Promise<T> {
  return request<T>(path, { method: "POST", body: form, headers: {} });
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body != null ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body != null ? JSON.stringify(body) : undefined }),
  del: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "DELETE", body: body != null ? JSON.stringify(body) : undefined }),
  upload: <T>(path: string, form: FormData) => upload<T>(path, form),
};

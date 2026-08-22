// Thin fetch wrapper around the Flask API. Always sends credentials so the
// admin session cookie is included.

export const API_BASE = import.meta.env.VITE_API_BASE || "";

/** Build an absolute URL for a backend asset (e.g. facility images). */
export function assetUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE}${path}`;
}

/**
 * 업로드 전 클라이언트 사전 검사.
 * 서버는 5MB(이미지)·6MB(요청 전체) 상한을 강제하는데, 상한을 넘는 요청은
 * 본문을 다 보내기 전에 끊기므로 브라우저에는 네트워크 오류로만 보인다.
 * 보내기 전에 걸러서 이유를 알려준다. (서버 검증을 대체하지 않는다.)
 */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

export function validateImageFile(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) {
    return "이미지 파일(png, jpg, gif, webp)만 업로드할 수 있습니다.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `이미지 용량은 5MB 이하여야 합니다. (선택한 파일: ${mb}MB)`;
  }
  return null;
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

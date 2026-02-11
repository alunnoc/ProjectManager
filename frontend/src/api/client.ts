/**
 * Client API REST - base URL e fetch wrapper
 */

const API_BASE = "/api";

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `Errore ${res.status}`);
  }
  return data as T;
}

export function apiGet<T>(path: string) {
  return api<T>(path, { method: "GET" });
}

export function apiPost<T>(path: string, body?: unknown) {
  return api<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
}

export function apiPatch<T>(path: string, body: unknown) {
  return api<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function apiDelete(path: string) {
  return api<void>(path, { method: "DELETE" });
}

/** Upload file (multipart): path, file, optional extra body fields */
export async function apiUpload<T>(
  path: string,
  file: File,
  fieldName = "file"
): Promise<T> {
  const form = new FormData();
  form.append(fieldName, file);
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    body: form,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Errore ${res.status}`);
  return data as T;
}

export function uploadsUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return path.startsWith("/") ? path : `/${path}`;
}

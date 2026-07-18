export class ApiClientError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiClientError(res.status, body.error ?? 'Request failed');
  return body as T;
}

// No Content-Type header here — the browser must set its own multipart boundary for FormData.
export async function apiUpload<T>(url: string, formData: FormData): Promise<T> {
  const res = await fetch(url, { method: 'POST', body: formData });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiClientError(res.status, body.error ?? 'Request failed');
  return body as T;
}

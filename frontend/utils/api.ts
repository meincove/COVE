// src/utils/api.ts

/**
 * Wrapper around fetch that returns JSON or throws an Error.
 * Makes sure errors are consistent across the app.
 */
export async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` – ${text}` : ""}`);
  }
  return (await res.json()) as T;
}

/**
 * Wrapper for POST requests with JSON body.
 * Returns parsed JSON or throws an Error.
 */
export async function postJson<T>(
  url: string,
  body: unknown,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    body: JSON.stringify(body),
    cache: "no-store",
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` – ${text}` : ""}`);
  }
  return (await res.json()) as T;
}

import { getToken } from "./auth";

const API_BASE = import.meta.env.PUBLIC_API_BASE || "http://localhost:4000";

function withAuth(headers: HeadersInit = {}): HeadersInit {
  const token = typeof window !== "undefined" ? getToken() : "";
  if (!token) return headers;

  const auth = token.toLowerCase().startsWith("bearer ")
    ? token
    : `Bearer ${token}`;
  return { ...headers, Authorization: auth };
}

function isFormData(body: any): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;

  const headers: Record<string, string> = {
    ...(init.headers as any),
    ...(withAuth(init.headers) as any),
  };

  // Si es JSON (body objeto/string), seteamos content-type (salvo que ya venga)
  // Si es FormData, NO tocar Content-Type.
  const body = init.body as any;
  const hasContentType = Object.keys(headers).some(
    (k) => k.toLowerCase() === "content-type"
  );

  if (body && !isFormData(body) && !hasContentType) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, { ...init, headers });

  const contentType = res.headers.get("content-type") || "";
  const text = await res.text().catch(() => "");

  let data: any = {};
  if (text) {
    if (contentType.includes("application/json")) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    } else {
      // Para HTML, CSV, etc.
      data = { raw: text };
    }
  }

  if (!res.ok) {
    const msg = data?.error || `HTTP ${res.status}`;
    throw Object.assign(new Error(msg), { status: res.status, data });
  }

  return data as T;
}

export async function apiDownload(path: string, filename: string) {
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    method: "GET",
    headers: withAuth(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    const msg = data?.error || text || `HTTP ${res.status}`;
    throw Object.assign(new Error(msg), { status: res.status, data });
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

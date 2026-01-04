import type { StudentRow } from "../lib/adminPeriod";
import { getToken } from "../lib/auth";

// For Admin Period Details
export const TOTAL_QUESTIONS = 103;

export function formatDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString();
}

export function safeFileName(name: string) {
  return (name || "periodo")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function downloadWithAuth(url: string, filename: string) {
  let token = getToken();

  if (!token) {
    throw new Error(
      "No hay token en localStorage (revisa cómo lo guarda tu login)"
    );
  }

  // evita "Bearer Bearer xxx"
  const authHeader = token.toLowerCase().startsWith("bearer ")
    ? token
    : `Bearer ${token}`;

  const r = await fetch(url, {
    method: "GET",
    headers: { Authorization: authHeader },
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(text || `HTTP ${r.status}`);
  }

  const blob = await r.blob();
  const objectUrl = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

export function progressPct(answeredCount?: number | null) {
  const v = clamp(Number(answeredCount ?? 0), 0, TOTAL_QUESTIONS);
  return Math.round((v / TOTAL_QUESTIONS) * 100);
}

export function statusLabel(s: "not_started" | "in_progress" | "finished") {
  if (s === "finished") return "Finalizado";
  if (s === "in_progress") return "En progreso";
  return "No iniciado";
}

export function statusPillClass(s: "not_started" | "in_progress" | "finished") {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";
  if (s === "finished") return `${base} bg-emerald-100 text-emerald-800`;
  if (s === "in_progress") return `${base} bg-sky-100 text-sky-800`;
  return `${base} bg-slate-100 text-slate-700`;
}

export function studentStatusPill(status: StudentRow["status"]) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";
  if (status === "finished") return `${base} bg-emerald-100 text-emerald-800`;
  if (status === "in_progress") return `${base} bg-sky-100 text-sky-800`;
  return `${base} bg-slate-100 text-slate-700`;
}

// For Dashboard Aside
export function getActiveHref(path: string, nav: { href: string }[]) {
  return nav
    .filter((it) => path === it.href || path.startsWith(it.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

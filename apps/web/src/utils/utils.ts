import type { StudentRow } from "../lib/adminPeriod";

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

export type UiError =
  | { kind: "invalid_id"; title: string; message: string }
  | { kind: "not_found"; title: string; message: string }
  | { kind: "forbidden"; title: string; message: string }
  | { kind: "unauthorized"; title: string; message: string }
  | { kind: "unknown"; title: string; message: string; details?: any };

export function toUiError(e: any): UiError {
  const status = e?.status;
  const apiMsg = e?.data?.error || e?.message;

  if (status === 404) {
    return {
      kind: "not_found",
      title: "No encontrado",
      message: "No pudimos encontrar el recurso solicitado.",
    };
  }
  if (status === 403) {
    return {
      kind: "forbidden",
      title: "Acceso restringido",
      message: "No tienes permisos para ver esta información.",
    };
  }
  if (status === 401) {
    return {
      kind: "unauthorized",
      title: "Sesión expirada",
      message: "Vuelve a iniciar sesión para continuar.",
    };
  }

  return {
    kind: "unknown",
    title: "Ocurrió un problema",
    message: apiMsg || "Error inesperado. Intenta nuevamente.",
    details: e?.data,
  };
}

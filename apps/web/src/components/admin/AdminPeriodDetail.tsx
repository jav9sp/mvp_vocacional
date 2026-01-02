import { useEffect, useMemo, useState } from "react";
import ImportStudentsModal from "./ImportStudentsModal";
import { requireAuth } from "../../lib/guards";
import { api } from "../../lib/api";
import { getToken } from "../../lib/auth";

type SummaryResp = {
  ok: boolean;
  period: {
    id: number;
    name: string;
    status: "draft" | "active" | "closed" | string;
    startAt: string | null;
    endAt: string | null;
    testId: number;
    createdAt: string;
  };
  counts: {
    studentsCount: number;
    startedCount: number;
    finishedCount: number;
    notStartedCount: number;
    completionPct: number;
  };
};

type StudentRow = {
  enrollmentId: number;
  student: { id: number; rut: string; name: string; email: string };
  status: "not_started" | "in_progress" | "finished";
  attempt: null | {
    id: number;
    status: "in_progress" | "finished";
    answeredCount: number;
    finishedAt: string | null;
    createdAt: string;
  };
};

type StudentsResp = {
  ok: boolean;
  period: { id: number; name: string; status: string; testId: number };
  page: number;
  pageSize: number;
  total: number;
  rows: StudentRow[];
};

function badgeStatus(status: string) {
  const s = (status || "").toLowerCase();
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";
  if (s === "active") return `${base} bg-emerald-100 text-emerald-800`;
  if (s === "closed") return `${base} bg-slate-100 text-slate-700`;
  if (s === "draft") return `${base} bg-amber-100 text-amber-800`;
  return `${base} bg-slate-100 text-slate-700`;
}

function studentStatusPill(status: StudentRow["status"]) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";
  if (status === "finished") return `${base} bg-emerald-100 text-emerald-800`;
  if (status === "in_progress") return `${base} bg-sky-100 text-sky-800`;
  return `${base} bg-slate-100 text-slate-700`;
}

function formatDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString();
}

function formatDateTime(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString();
}

async function downloadWithAuth(url: string, filename: string) {
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

function safeFileName(name: string) {
  return (name || "periodo")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const TOTAL_QUESTIONS = 103;

function statusLabel(s: "not_started" | "in_progress" | "finished") {
  if (s === "finished") return "Finalizado";
  if (s === "in_progress") return "En progreso";
  return "No iniciado";
}

function statusPillClass(s: "not_started" | "in_progress" | "finished") {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";
  if (s === "finished") return `${base} bg-emerald-100 text-emerald-800`;
  if (s === "in_progress") return `${base} bg-sky-100 text-sky-800`;
  return `${base} bg-slate-100 text-slate-700`;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function progressPct(answeredCount?: number | null) {
  const v = clamp(Number(answeredCount ?? 0), 0, TOTAL_QUESTIONS);
  return Math.round((v / TOTAL_QUESTIONS) * 100);
}

export default function AdminPeriodDetail({ periodId }: { periodId: string }) {
  const pid = Number(periodId);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [summary, setSummary] = useState<SummaryResp | null>(null);

  // students list state
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<
    "" | "not_started" | "in_progress" | "finished"
  >("");

  const [importOpen, setImportOpen] = useState(false);

  const [exporting, setExporting] = useState<null | "csv" | "pdf">(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  useEffect(() => {
    const ok = requireAuth("admin");
    if (!ok) return;
    if (!Number.isFinite(pid)) {
      setErr("ID de periodo inválido");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const s = await api<SummaryResp>(`/admin/periods/${pid}/summary`);
        setSummary(s);
      } catch (e: any) {
        setErr(e.message);
      }
    })();
  }, [pid]);

  async function loadStudents(opts?: { resetPage?: boolean }) {
    const nextPage = opts?.resetPage ? 1 : page;

    const params = new URLSearchParams();
    params.set("page", String(nextPage));
    params.set("pageSize", String(pageSize));
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);

    const r = await api<StudentsResp>(
      `/admin/periods/${pid}/students?${params.toString()}`
    );
    setRows(r.rows || []);
    setTotal(r.total || 0);
    setPage(r.page || nextPage);
  }

  useEffect(() => {
    const ok = requireAuth("admin");
    if (!ok) return;
    if (!Number.isFinite(pid)) return;

    setLoading(true);
    setErr(null);

    (async () => {
      try {
        await loadStudents({ resetPage: true });
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  function onApplyFilters() {
    setLoading(true);
    setErr(null);
    loadStudents({ resetPage: true })
      .catch((e: any) => setErr(e.message))
      .finally(() => setLoading(false));
  }

  function goPage(next: number) {
    const clamped = Math.min(Math.max(next, 1), totalPages);
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        // usa estado actual q/status
        const params = new URLSearchParams();
        params.set("page", String(clamped));
        params.set("pageSize", String(pageSize));
        if (q.trim()) params.set("q", q.trim());
        if (status) params.set("status", status);

        const r = await api<StudentsResp>(
          `/admin/periods/${pid}/students?${params.toString()}`
        );
        setRows(r.rows || []);
        setTotal(r.total || 0);
        setPage(r.page || clamped);
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }

  const sortedRows = [...rows].sort((a, b) => {
    const order = { not_started: 0, in_progress: 1, finished: 2 } as const;
    return order[a.status] - order[b.status];
  });

  if (err) {
    return (
      <div className="space-y-3">
        <a
          href="/admin/periods"
          className="text-sm text-slate-600 hover:underline">
          ← Volver a periodos
        </a>
        <div className="card border-red-200">
          <p className="text-sm text-red-600">Error: {err}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <a
        href="/admin/periods"
        className="text-sm text-slate-600 hover:underline">
        ← Volver a periodos
      </a>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {summary?.period?.name ?? `Periodo #${pid}`}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            {summary?.period?.status && (
              <span className={badgeStatus(summary.period.status)}>
                {summary.period.status}
              </span>
            )}
            <span>
              Rango: {formatDate(summary?.period?.startAt)} —{" "}
              {formatDate(summary?.period?.endAt)}
            </span>
          </div>
        </div>

        <div className="text-xs text-muted">
          Creado: {formatDate(summary?.period?.createdAt)}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => setImportOpen(true)}>
          Importar XLSX
        </button>

        <button
          className="btn btn-secondary"
          type="button"
          disabled={!!exporting}
          onClick={async () => {
            try {
              setExporting("csv");
              const base = import.meta.env.PUBLIC_API_BASE;
              const periodName = summary?.period?.name ?? `periodo-${pid}`;
              await downloadWithAuth(
                `${base}/admin/periods/${pid}/export.csv`,
                `reporte-${safeFileName(periodName)}.csv`
              );
            } catch (e: any) {
              alert(`No se pudo exportar CSV: ${e.message}`);
            } finally {
              setExporting(null);
            }
          }}>
          {exporting === "csv" ? "Exportando…" : "Exportar CSV"}
        </button>

        <button
          className="btn btn-primary"
          type="button"
          disabled={!!exporting}
          onClick={async () => {
            try {
              setExporting("pdf");
              const base = import.meta.env.PUBLIC_API_BASE;
              const periodName = summary?.period?.name ?? `periodo-${pid}`;
              await downloadWithAuth(
                `${base}/admin/periods/${pid}/report.pdf`,
                `reporte-${safeFileName(periodName)}.pdf`
              );
            } catch (e: any) {
              alert(`No se pudo exportar PDF: ${e.message}`);
            } finally {
              setExporting(null);
            }
          }}>
          {exporting === "pdf" ? "Generando PDF…" : "Exportar PDF"}
        </button>
      </div>

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="text-xs text-muted">Estudiantes cargados</div>
          <div className="mt-1 text-2xl font-extrabold">
            {summary?.counts.studentsCount ?? "—"}
          </div>
        </div>

        <div className="card">
          <div className="text-xs text-muted">Iniciados</div>
          <div className="mt-1 text-2xl font-extrabold">
            {summary?.counts.startedCount ?? "—"}
          </div>
        </div>

        <div className="card">
          <div className="text-xs text-muted">Finalizados</div>
          <div className="mt-1 text-2xl font-extrabold">
            {summary?.counts.finishedCount ?? "—"}
          </div>
        </div>

        <div className="card">
          <div className="text-xs text-muted">Completitud</div>
          <div className="mt-1 text-2xl font-extrabold">
            {summary?.counts.completionPct ?? 0}%
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">Estudiantes</h2>
            <p className="mt-1 text-sm text-muted">
              Filtra por estado o busca por RUT, nombre o email.
            </p>
          </div>

          <div className="text-xs text-muted">
            {total} {total === 1 ? "resultado" : "resultados"}
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_220px_auto]">
          <input
            className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Buscar por RUT, nombre o email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onApplyFilters();
            }}
          />

          <select
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}>
            <option value="">Todos</option>
            <option value="not_started">No iniciado</option>
            <option value="in_progress">En progreso</option>
            <option value="finished">Finalizado</option>
          </select>

          <button
            className="btn btn-primary"
            onClick={onApplyFilters}
            type="button"
            disabled={loading}>
            {loading ? "Cargando…" : "Aplicar"}
          </button>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="py-2">RUT</th>
                <th className="py-2">Nombre</th>
                <th className="py-2">Email</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Progreso</th>
                <th className="py-2">Finalizado</th>
                <th className="py-2 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr className="border-t border-border">
                  <td className="py-3 text-muted" colSpan={7}>
                    {loading ? "Cargando…" : "Sin resultados con esos filtros."}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.enrollmentId}
                    className="border-t border-border align-top">
                    <td className="py-3 font-mono text-xs">{r.student.rut}</td>

                    <td className="py-3">
                      <div className="font-semibold">{r.student.name}</div>
                      <div className="mt-0.5 text-xs text-muted">
                        ID: {r.student.id}
                      </div>
                    </td>

                    <td className="py-3 text-muted">{r.student.email}</td>

                    <td className="py-3">
                      <span className={statusPillClass(r.status)}>
                        {statusLabel(r.status)}
                      </span>
                    </td>

                    <td className="py-3">
                      {r.status === "not_started" ? (
                        <div className="text-xs text-muted">—</div>
                      ) : (
                        <div className="min-w-42.5">
                          <div className="flex items-center justify-between text-xs text-muted">
                            <span>
                              {r.attempt?.answeredCount ?? 0}/{TOTAL_QUESTIONS}
                            </span>
                            <span>
                              {progressPct(r.attempt?.answeredCount)}%
                            </span>
                          </div>

                          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full bg-slate-900"
                              style={{
                                width: `${progressPct(
                                  r.attempt?.answeredCount
                                )}%`,
                              }}
                            />
                          </div>

                          {r.status === "in_progress" && (
                            <div className="mt-1 text-[11px] text-muted">
                              Último guardado:{" "}
                              {r.attempt?.createdAt
                                ? new Date(r.attempt.createdAt).toLocaleString()
                                : "—"}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-muted">
                      {r.status === "finished"
                        ? r.attempt?.finishedAt
                          ? new Date(r.attempt.finishedAt).toLocaleString()
                          : "—"
                        : "—"}
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <a
                          href={`/admin/students/${r.student.id}`}
                          className="inline-flex items-center rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:bg-slate-50">
                          Ver
                        </a>

                        {r.status === "finished" ? (
                          <a
                            href={`/admin/attempts/${r.attempt?.id}/result`}
                            className="inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-100">
                            Resultado
                          </a>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted">
            Página {page} de {totalPages}
          </div>

          <div className="flex items-center gap-2">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => goPage(page - 1)}
              disabled={loading || page <= 1}>
              ← Anterior
            </button>

            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => goPage(page + 1)}
              disabled={loading || page >= totalPages}>
              Siguiente →
            </button>
          </div>
        </div>
      </section>
      <ImportStudentsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        periodId={pid}
        onImported={() => {
          // refrescar summary + tabla
          // (usa tus funciones existentes)
          loadStudents({ resetPage: true }).catch(() => {});
          api<SummaryResp>(`/admin/periods/${pid}/summary`)
            .then(setSummary)
            .catch(() => {});
        }}
      />
    </div>
  );
}

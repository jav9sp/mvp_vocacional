import { useEffect, useMemo, useState } from "react";
import { requireAuth } from "../../lib/guards";
import { apiZ } from "../../lib/apiZ";
import { z } from "zod";

const StudentRowSchema = z.object({
  id: z.number(),
  rut: z.string().nullable().optional(),
  name: z.string(),
  email: z.string().nullable().optional(),
  enrollmentsCount: z.number().optional().default(0),
  finishedAttemptsCount: z.number().optional().default(0),
  status: z.enum(["not_started", "in_progress", "finished"]),
  lastAttempt: z
    .object({
      id: z.number(),
      status: z.enum(["in_progress", "finished"]),
      answeredCount: z.number(),
      createdAt: z.string().nullable().optional(),
      finishedAt: z.string().nullable().optional(),
    })
    .nullable(),
});

const StudentsRespSchema = z.object({
  ok: z.literal(true),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  courses: z.array(z.string()).optional().default([]),
  rows: z.array(StudentRowSchema),
});

type StudentsResp = z.infer<typeof StudentsRespSchema>;
type StudentRow = StudentsResp["rows"][number];

function statusLabel(s: StudentRow["status"]) {
  if (s === "finished") return "Finalizado";
  if (s === "in_progress") return "En progreso";
  return "No iniciado";
}

function statusPillClass(s: StudentRow["status"]) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";
  if (s === "finished") return `${base} bg-emerald-100 text-emerald-800`;
  if (s === "in_progress") return `${base} bg-sky-100 text-sky-800`;
  return `${base} bg-slate-100 text-slate-700`;
}

function formatDateTime(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString();
}

const TOTAL_QUESTIONS = 103;
function progressPct(answeredCount?: number | null) {
  const v = Math.min(Math.max(Number(answeredCount ?? 0), 0), TOTAL_QUESTIONS);
  return Math.round((v / TOTAL_QUESTIONS) * 100);
}

export default function AdminStudentsList() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [rows, setRows] = useState<StudentRow[]>([]);
  const [courses, setCourses] = useState<string[]>([]);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState("");
  const [course, setCourse] = useState("");

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  async function load(opts?: { resetPage?: boolean }) {
    const ok = requireAuth("admin");
    if (!ok) return;

    const nextPage = opts?.resetPage ? 1 : page;

    const params = new URLSearchParams();
    params.set("page", String(nextPage));
    params.set("pageSize", String(pageSize));
    if (q.trim()) params.set("q", q.trim());
    if (course) params.set("course", course);

    const r = await apiZ(`/admin/students?${params}`, StudentsRespSchema);
    setRows(r.rows || []);
    setCourses(r.courses || []);
    setTotal(r.total || 0);
    setPage(r.page || nextPage);
  }

  useEffect(() => {
    setLoading(true);
    setErr(null);
    load({ resetPage: true })
      .catch((e: any) => setErr(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters() {
    setLoading(true);
    setErr(null);
    load({ resetPage: true })
      .catch((e: any) => setErr(e.message))
      .finally(() => setLoading(false));
  }

  function goPage(next: number) {
    const clamped = Math.min(Math.max(next, 1), totalPages);
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const params = new URLSearchParams();
        params.set("page", String(clamped));
        params.set("pageSize", String(pageSize));
        if (q.trim()) params.set("q", q.trim());
        if (course) params.set("course", course);

        const r = await apiZ(`/admin/students?${params}`, StudentsRespSchema);
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

  if (err) {
    return (
      <div className="card border-red-200">
        <p className="text-sm text-red-600">Error: {err}</p>
      </div>
    );
  }

  return (
    <section className="card">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Estudiantes
          </h1>
          <p className="mt-1 text-sm text-muted">
            Busca por RUT, nombre o email. Filtra por curso si aplica.
          </p>
        </div>
        <div className="text-xs text-muted">
          {total} {total === 1 ? "resultado" : "resultados"}
        </div>
      </div>

      {/* Filters */}
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_220px_auto]">
        <input
          className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          placeholder="Buscar por RUT, nombre o email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyFilters();
          }}
        />

        <select
          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          value={course}
          onChange={(e) => {
            setCourse(e.target.value);
            // recarga inmediata
            setTimeout(() => applyFilters(), 0);
          }}>
          <option value="">Todos los cursos</option>
          {courses.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button
          className="btn btn-primary"
          onClick={applyFilters}
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
              <th className="py-2">Último intento</th>
              <th className="py-2 text-right">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr className="border-t border-border">
                <td className="py-3 text-muted" colSpan={7}>
                  {loading ? "Cargando…" : "Sin resultados."}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="py-3 font-mono text-xs">{r.rut ?? "—"}</td>

                  <td className="py-3">
                    <div className="font-semibold">{r.name}</div>
                    <div className="mt-0.5 text-xs text-muted">ID: {r.id}</div>
                  </td>

                  <td className="py-3 text-muted">{r.email ?? "—"}</td>

                  <td className="py-3">
                    <span className={statusPillClass(r.status)}>
                      {statusLabel(r.status)}
                    </span>
                  </td>

                  <td className="py-3">
                    {r.status === "not_started" ? (
                      <span className="text-xs text-muted">—</span>
                    ) : (
                      <div className="min-w-45">
                        <div className="flex items-center justify-between text-xs text-muted">
                          <span>
                            {r.lastAttempt?.answeredCount ?? 0}/
                            {TOTAL_QUESTIONS}
                          </span>
                          <span>
                            {progressPct(r.lastAttempt?.answeredCount)}%
                          </span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full bg-slate-900"
                            style={{
                              width: `${progressPct(
                                r.lastAttempt?.answeredCount
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </td>

                  <td className="py-3 text-muted">
                    {r.lastAttempt
                      ? formatDateTime(
                          r.lastAttempt.finishedAt ?? r.lastAttempt.createdAt
                        )
                      : "—"}
                  </td>

                  <td className="py-3 text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      <a
                        href={`/admin/students/${r.id}`}
                        className="inline-flex items-center rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:bg-slate-50">
                        Ver
                      </a>

                      {r.lastAttempt?.status === "finished" ? (
                        <a
                          href={`/admin/attempts/${r.lastAttempt.id}/result`}
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
  );
}

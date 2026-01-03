import { useEffect, useMemo, useState } from "react";
import { requireAuth } from "../../lib/guards";
import { api } from "../../lib/api";

type StudentDetailResp = {
  ok: boolean;
  student: {
    id: number;
    rut: string;
    name: string;
    email: string;
    role: "student";
    createdAt: string;
  };
  summary: {
    totalPeriods: number;
    finished: number;
    inProgress: number;
    notStarted: number;
  };
  rows: Array<{
    enrollmentId: number;
    enrollmentStatus: string;
    meta: any;
    period: {
      id: number;
      name: string;
      status: string;
      startAt: string | null;
      endAt: string | null;
      testId: number;
      createdAt: string;
    };
    status: "not_started" | "in_progress" | "finished";
    attempt: null | {
      id: number;
      status: "in_progress" | "finished";
      answeredCount: number;
      createdAt: string;
      finishedAt: string | null;
      testId: number;
    };
  }>;
};

const TOTAL = 103;

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

function pct(answeredCount?: number | null) {
  const v = Math.max(0, Math.min(Number(answeredCount ?? 0), TOTAL));
  return Math.round((v / TOTAL) * 100);
}

export default function AdminStudentDetail({
  studentId,
}: {
  studentId: string;
}) {
  const id = Number(studentId);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<StudentDetailResp | null>(null);

  useEffect(() => {
    const ok = requireAuth("admin");
    if (!ok) return;

    if (!Number.isFinite(id)) {
      setErr("studentId inválido");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const resp = await api<StudentDetailResp>(`/admin/students/${id}`);
        setData(resp);
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const rows = useMemo(() => data?.rows ?? [], [data]);

  if (loading) {
    return (
      <div className="card">
        <p className="text-sm text-muted">Cargando estudiante…</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="space-y-3">
        <a
          href="/admin/periods"
          className="text-sm text-slate-600 hover:underline">
          ← Volver
        </a>
        <div className="card border-red-200">
          <p className="text-sm text-red-600">Error: {err}</p>
        </div>
      </div>
    );
  }

  if (!data?.ok) {
    return (
      <div className="card border-red-200">
        <p className="text-sm text-red-600">No se pudo cargar el estudiante.</p>
      </div>
    );
  }

  const s = data.student;
  const sum = data.summary;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{s.name}</h1>
          <div className="mt-1 text-sm text-muted">
            <span className="font-mono text-xs">{s.rut}</span>
            {s.email ? <span className="ml-2">· {s.email}</span> : null}
          </div>
        </div>

        <div className="text-xs text-muted">
          <div>
            ID: <span className="font-semibold text-slate-900">{s.id}</span>
          </div>
          <div>Creado: {formatDateTime(s.createdAt)}</div>
        </div>
      </div>

      {/* resumen */}
      <section className="grid gap-3 sm:grid-cols-4">
        <div className="card">
          <div className="text-xs text-muted">Periodos</div>
          <div className="mt-1 text-2xl font-extrabold">{sum.totalPeriods}</div>
        </div>
        <div className="card">
          <div className="text-xs text-muted">Finalizados</div>
          <div className="mt-1 text-2xl font-extrabold">{sum.finished}</div>
        </div>
        <div className="card">
          <div className="text-xs text-muted">En progreso</div>
          <div className="mt-1 text-2xl font-extrabold">{sum.inProgress}</div>
        </div>
        <div className="card">
          <div className="text-xs text-muted">No iniciado</div>
          <div className="mt-1 text-2xl font-extrabold">{sum.notStarted}</div>
        </div>
      </section>

      {/* historial */}
      <section className="card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Historial por periodo</h2>
            <p className="mt-1 text-sm text-muted">
              Estado y progreso del test dentro de cada periodo.
            </p>
          </div>
          <a
            href="/admin/periods"
            className="text-sm text-slate-600 hover:underline">
            ← Periodos
          </a>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="py-2">Periodo</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Rango</th>
                <th className="py-2">Progreso</th>
                <th className="py-2">Finalizado</th>
                <th className="py-2 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr className="border-t border-border">
                  <td className="py-3 text-muted" colSpan={6}>
                    No hay periodos para este estudiante en tu organización.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.enrollmentId}
                    className="border-t border-border align-top">
                    <td className="py-3">
                      <div className="font-semibold">
                        {r.period.name ?? `Periodo #${r.period.id}`}
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        Creado: {formatDate(r.period.createdAt)}
                      </div>
                    </td>

                    <td className="py-3">
                      <span className={statusPillClass(r.status)}>
                        {statusLabel(r.status)}
                      </span>
                      <div className="mt-1 text-xs text-muted">
                        Periodo: {r.period.status}
                      </div>
                    </td>

                    <td className="py-3 text-xs text-muted">
                      {formatDate(r.period.startAt)} —{" "}
                      {formatDate(r.period.endAt)}
                    </td>

                    <td className="py-3">
                      {r.status === "not_started" ? (
                        <div className="text-xs text-muted">—</div>
                      ) : (
                        <div className="min-w-42.5">
                          <div className="flex items-center justify-between text-xs text-muted">
                            <span>
                              {r.attempt?.answeredCount ?? 0}/{TOTAL}
                            </span>
                            <span>{pct(r.attempt?.answeredCount)}%</span>
                          </div>
                          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full bg-slate-900"
                              style={{
                                width: `${pct(r.attempt?.answeredCount)}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="py-3 text-muted">
                      {r.status === "finished"
                        ? formatDateTime(r.attempt?.finishedAt ?? null)
                        : "—"}
                    </td>

                    <td className="py-3 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <a
                          href={`/admin/periods/${r.period.id}`}
                          className="inline-flex items-center rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:bg-slate-50">
                          Ver periodo
                        </a>

                        {r.status === "finished" && r.attempt?.id ? (
                          <a
                            href={`/admin/attempts/${r.attempt.id}/result`}
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
      </section>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { requireAuth } from "../../lib/guards";
import { apiZ } from "../../lib/apiZ";
import {
  StudentDetailRespSchema,
  type StudentDetailResp,
} from "../../lib/adminStudent";
import { formatDate, progressPct } from "../../utils/utils";

type AdminStudentDetailProps = {
  studentId: string;
};

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

function badgePeriodStatus(status: string) {
  const s = (status || "").toLowerCase();
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";
  if (s === "active") return `${base} bg-emerald-100 text-emerald-800`;
  if (s === "closed") return `${base} bg-slate-100 text-slate-700`;
  if (s === "draft") return `${base} bg-amber-100 text-amber-800`;
  return `${base} bg-slate-100 text-slate-700`;
}

export default function AdminStudentDetail({
  studentId,
}: AdminStudentDetailProps) {
  const sid = Number(studentId);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [data, setData] = useState<StudentDetailResp | null>(null);

  const enrollmentsSorted = useMemo(() => {
    const rows = data?.enrollments ?? [];
    const order = { not_started: 0, in_progress: 1, finished: 2 } as const;
    return [...rows].sort(
      (a, b) => order[a.derivedStatus] - order[b.derivedStatus]
    );
  }, [data]);

  useEffect(() => {
    const ok = requireAuth("admin");
    if (!ok) return;

    if (!Number.isFinite(sid)) {
      setErr("ID de estudiante inválido");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr(null);

    (async () => {
      try {
        const r = await apiZ(`/admin/students/${sid}`, StudentDetailRespSchema);
        setData(r);
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [sid]);

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
          href="/admin/students"
          className="text-sm text-slate-600 hover:underline">
          ← Volver a estudiantes
        </a>
        <div className="card border-red-200">
          <p className="text-sm text-red-600">Error: {err}</p>
        </div>
      </div>
    );
  }

  const student = data!.student;

  return (
    <div className="space-y-4">
      <a
        href="/admin/students"
        className="text-sm text-slate-600 hover:underline">
        ← Volver a estudiantes
      </a>

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {student.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className="rounded-full border border-border px-3 py-1 text-xs">
              ID: <span className="font-semibold text-fg">{student.id}</span>
            </span>
            <span className="rounded-full border border-border px-3 py-1 text-xs font-mono">
              {student.rut ?? "—"}
            </span>
            <span className="text-xs">{student.email ?? "—"}</span>
          </div>
        </div>
      </div>

      {/* Enrollments */}
      <section className="card">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Periodos</h2>
            <p className="mt-1 text-sm text-muted">
              Historial de inscripciones e intentos del estudiante.
            </p>
          </div>
          <div className="text-xs text-muted">
            {enrollmentsSorted.length}{" "}
            {enrollmentsSorted.length === 1 ? "registro" : "registros"}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="py-2">Periodo</th>
                <th className="py-2">Estado periodo</th>
                <th className="py-2">Curso</th>
                <th className="py-2">Estado test</th>
                <th className="py-2">Progreso</th>
                <th className="py-2">Finalizado</th>
                <th className="py-2 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {enrollmentsSorted.length === 0 ? (
                <tr className="border-t border-border">
                  <td className="py-3 text-muted" colSpan={7}>
                    Este estudiante no está inscrito en ningún periodo.
                  </td>
                </tr>
              ) : (
                enrollmentsSorted.map((r) => (
                  <tr
                    key={r.enrollmentId}
                    className="border-t border-border align-top">
                    <td className="py-3">
                      <div className="font-semibold">{r.period.name}</div>
                      <div className="mt-0.5 text-xs text-muted">
                        Enrollment #{r.enrollmentId} · estado: {r.derivedStatus}
                      </div>
                    </td>

                    <td className="py-3">
                      <span className={badgePeriodStatus(r.period.status)}>
                        {r.period.status}
                      </span>
                    </td>

                    <td className="py-3 text-muted">{r.course ?? "—"}</td>

                    <td className="py-3">
                      <span className={statusPillClass(r.derivedStatus)}>
                        {statusLabel(r.derivedStatus)}
                      </span>
                    </td>

                    <td className="py-3">
                      {r.derivedStatus === "not_started" ? (
                        <span className="text-xs text-muted">—</span>
                      ) : (
                        <div className="min-w-45">
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
                        </div>
                      )}
                    </td>

                    <td className="py-3 text-muted">
                      {r.attempt?.status === "finished"
                        ? formatDate(r.attempt.finishedAt)
                        : "—"}
                    </td>

                    <td className="py-3 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <a
                          href={`/admin/periods/${r.period.id}`}
                          className="inline-flex items-center rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:bg-slate-50">
                          Ver periodo
                        </a>

                        {r.attempt?.status === "finished" ? (
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

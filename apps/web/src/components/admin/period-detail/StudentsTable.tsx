import type { StudentRow } from "../../../lib/adminPeriod";

type StudentsTableProps = {
  rows: StudentRow[];
  loading: boolean;
  totalQuestions: number;

  statusLabel: (s: "not_started" | "in_progress" | "finished") => string;
  statusPillClass: (s: "not_started" | "in_progress" | "finished") => string;
  progressPct: (answeredCount?: number | null) => number;
};

export default function StudentsTable({
  rows,
  loading,
  totalQuestions,
  statusLabel,
  statusPillClass,
  progressPct,
}: StudentsTableProps) {
  return (
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

                <td className="py-3 text-muted">{r.student.email ?? "—"}</td>

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
                          {r.attempt?.answeredCount ?? 0}/{totalQuestions}
                        </span>
                        <span>{progressPct(r.attempt?.answeredCount)}%</span>
                      </div>

                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full bg-slate-900"
                          style={{
                            width: `${progressPct(r.attempt?.answeredCount)}%`,
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
  );
}

import { useEffect, useMemo, useState } from "react";
import { requireAuth } from "../../lib/guards";
import { api } from "../../lib/api";

type DashboardResp = {
  ok: boolean;
  kpis: {
    totalPeriods: number;
    activePeriods: number;
    totalStudents: number;
    totalFinished: number;
  };
  periods: Array<{
    id: number;
    name: string;
    status: "draft" | "active" | "closed";
    startAt: string | null;
    endAt: string | null;
    createdAt: string;
    studentsCount: number;
    finishedCount: number;
    completionPct: number;
  }>;
};

function formatDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString();
}

function statusLabel(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "active") return "Activo";
  if (s === "closed") return "Cerrado";
  if (s === "draft") return "Borrador";
  return status || "—";
}

function statusClasses(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "active") return "bg-emerald-100 text-emerald-800";
  if (s === "closed") return "bg-slate-100 text-slate-700";
  if (s === "draft") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<DashboardResp | null>(null);

  useEffect(() => {
    const ok = requireAuth("admin");
    if (!ok) return;

    (async () => {
      try {
        const resp = await api<DashboardResp>("/admin/dashboard");
        setData(resp);
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const periods = data?.periods ?? [];
  const k = data?.kpis;

  const headline = useMemo(() => {
    if (!k) return "";
    return `${k.activePeriods} activos · ${k.totalPeriods} total`;
  }, [k]);

  if (loading) {
    return (
      <div className="card">
        <p className="text-sm text-muted">Cargando dashboard…</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="card border-red-200">
        <p className="text-sm text-red-600">Error: {err}</p>
      </div>
    );
  }

  if (!data?.ok || !k) {
    return (
      <div className="card border-red-200">
        <p className="text-sm text-red-600">No se pudo cargar el dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
          <div className="mt-1 text-sm text-muted">{headline}</div>
        </div>

        <a
          href="/admin/periods"
          className="inline-flex items-center rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:bg-slate-50">
          Ver periodos
        </a>
      </div>

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="text-xs text-muted">Periodos</div>
          <div className="mt-1 text-3xl font-extrabold">{k.totalPeriods}</div>
        </div>

        <div className="card">
          <div className="text-xs text-muted">Activos</div>
          <div className="mt-1 text-3xl font-extrabold">{k.activePeriods}</div>
        </div>

        <div className="card">
          <div className="text-xs text-muted">Estudiantes (enrolados)</div>
          <div className="mt-1 text-3xl font-extrabold">{k.totalStudents}</div>
        </div>

        <div className="card">
          <div className="text-xs text-muted">Finalizados</div>
          <div className="mt-1 text-3xl font-extrabold">{k.totalFinished}</div>
        </div>
      </section>

      {/* Progreso por periodo */}
      <section className="card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Progreso por periodo</h2>
            <p className="mt-1 text-sm text-muted">
              % completado = finalizados / enrolados
            </p>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="py-2">Periodo</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Rango</th>
                <th className="py-2">Enrolados</th>
                <th className="py-2">Finalizados</th>
                <th className="py-2">Progreso</th>
                <th className="py-2 text-right"></th>
              </tr>
            </thead>

            <tbody>
              {periods.length === 0 ? (
                <tr className="border-t border-border">
                  <td className="py-3 text-muted" colSpan={7}>
                    Aún no hay periodos. Crea uno para comenzar.
                  </td>
                </tr>
              ) : (
                periods.map((p) => (
                  <tr key={p.id} className="border-t border-border align-top">
                    <td className="py-3">
                      <div className="font-semibold">
                        {p.name ?? `Periodo #${p.id}`}
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        Creado: {formatDate(p.createdAt)}
                      </div>
                    </td>

                    <td className="py-3">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                          statusClasses(p.status),
                        ].join(" ")}>
                        {statusLabel(p.status)}
                      </span>
                    </td>

                    <td className="py-3 text-xs text-muted">
                      {formatDate(p.startAt)} — {formatDate(p.endAt)}
                    </td>

                    <td className="py-3 font-semibold">{p.studentsCount}</td>
                    <td className="py-3 font-semibold">{p.finishedCount}</td>

                    <td className="py-3">
                      <div className="min-w-45">
                        <div className="flex items-center justify-between text-xs text-muted">
                          <span>{p.completionPct}%</span>
                          <span>
                            {p.finishedCount}/{p.studentsCount || 0}
                          </span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full bg-slate-900"
                            style={{ width: `${p.completionPct}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 text-right">
                      <a
                        href={`/admin/periods/${p.id}`}
                        className="inline-flex items-center rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:bg-slate-50">
                        Ver
                      </a>
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

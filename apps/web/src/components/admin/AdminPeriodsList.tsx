import { useEffect, useMemo, useState } from "react";
import { requireAuth } from "../../lib/guards";
import { api } from "../../lib/api";

type PeriodRow = {
  id: number;
  name: string;
  status: string; // ej: "active" | "closed" | etc
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  studentsCount: number;
  finishedCount: number;
  test?: { id: number; name?: string; key?: string; version?: string };
};

type PeriodsResp = {
  ok: boolean;
  organization: { id: number; name: string };
  periods: PeriodRow[];
};

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

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString();
}

export default function AdminPeriodsList() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [orgName, setOrgName] = useState<string>("");
  const [periods, setPeriods] = useState<PeriodRow[]>([]);

  useEffect(() => {
    const ok = requireAuth("admin");
    if (!ok) return;

    (async () => {
      try {
        const resp = await api<PeriodsResp>("/admin/periods");
        setOrgName(resp.organization?.name ?? "");
        setPeriods(resp.periods ?? []);
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const countLabel = useMemo(() => {
    const n = periods.length;
    return `${n} ${n === 1 ? "periodo" : "periodos"}`;
  }, [periods.length]);

  if (loading) {
    return (
      <div className="card">
        <p className="text-sm text-muted">Cargando periodos…</p>
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

  return (
    <section className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Listado</h2>
          {orgName && (
            <div className="mt-0.5 text-xs text-muted">
              Organización:{" "}
              <span className="font-semibold text-fg">{orgName}</span>
            </div>
          )}
        </div>

        <span className="text-xs text-muted">{countLabel}</span>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr className="text-center">
              <th className="py-2">Nombre</th>
              <th className="py-2">Estado</th>
              <th className="py-2">Fechas</th>
              <th className="py-2">Test</th>
              <th className="py-2">Estudiantes</th>
              <th className="py-2">Finalizados</th>
              <th className="py-2"></th>
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
                    <div className="text-xs text-muted">
                      Creado: {formatDate(p.createdAt)}
                    </div>
                  </td>

                  <td className="py-3 text-center">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                        statusClasses(p.status),
                      ].join(" ")}>
                      {statusLabel(p.status)}
                    </span>
                  </td>

                  <td className="py-3 text-xs text-muted text-center">
                    {formatDate(p.startAt)} — {formatDate(p.endAt)}
                  </td>

                  <td className="py-3 text-xs text-muted text-center">
                    {p.test?.name ? (
                      <div className="text-fg">{p.test.name}</div>
                    ) : (
                      <div>Test #{p.test?.id ?? "—"}</div>
                    )}
                    {(p.test?.key || p.test?.version) && (
                      <div>
                        {p.test?.key} · {p.test?.version}
                      </div>
                    )}
                  </td>

                  <td className="py-3 text-center">{p.studentsCount}</td>
                  <td className="py-3 text-center">{p.finishedCount}</td>

                  <td className="py-3 text-center">
                    <a
                      href={`/admin/periods/${p.id}`}
                      className="inline-flex items-center rounded-xl border border-border px-3 py-1.5 text-sm hover:bg-slate-50">
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
  );
}

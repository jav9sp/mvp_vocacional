import { useEffect, useMemo, useState } from "react";
import { requireAuth } from "../../lib/guards";
import { api } from "../../lib/api";
import { INAPV_AREAS } from "../../../../../packages/shared/src/inapv/inapv.data";
import { formatDate } from "../../utils/utils";

type ResultResp = {
  ok: boolean;
  attempt: {
    id: number;
    status: "in_progress" | "finished";
    answeredCount: number;
    finishedAt: string | null;
    userId: number;
    testId: number;
  };
  result: {
    scoresByArea: Record<string, number>;
    scoresByAreaDim: Record<
      string,
      { total: number; interes: number; aptitud: number }
    >;
    topAreas: string[];
    createdAt: string;
  };
};

function areaName(key: string) {
  return INAPV_AREAS.find((a) => a.key === key)?.name ?? key;
}

function medal(i: number) {
  if (i === 0) return "🥇";
  if (i === 1) return "🥈";
  if (i === 2) return "🥉";
  return "•";
}

export default function StudentAttemptResult({
  attemptId,
}: {
  attemptId: string;
}) {
  const id = Number(attemptId);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ResultResp | null>(null);

  useEffect(() => {
    const ok = requireAuth("student");
    if (!ok) return;

    if (!Number.isFinite(id)) {
      setErr("attemptId inválido");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const resp = await api<ResultResp>(`/attempts/${id}/result`);
        setData(resp);
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const rowsByArea = useMemo(() => {
    const scores = data?.result?.scoresByArea ?? {};
    return Object.entries(scores)
      .map(([key, score]) => ({ key, score }))
      .sort((a, b) => b.score - a.score);
  }, [data]);

  const rowsByDim = useMemo(() => {
    const obj = data?.result?.scoresByAreaDim ?? {};
    return Object.entries(obj)
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [data]);

  const topCards = useMemo(() => {
    if (!data?.result) return [];

    const byDim = data.result.scoresByAreaDim || {};
    const byArea = data.result.scoresByArea || {};

    // máximo para escalar barras (usa total si existe)
    const totals = Object.keys({ ...byArea, ...byDim }).map((k) => {
      const t = byDim?.[k]?.total;
      return typeof t === "number" ? t : byArea?.[k] ?? 0;
    });
    const max = Math.max(1, ...totals);

    return (data.result.topAreas || []).slice(0, 3).map((k, idx) => {
      const total =
        typeof byDim?.[k]?.total === "number"
          ? byDim[k].total
          : byArea?.[k] ?? 0;

      const interes =
        typeof byDim?.[k]?.interes === "number" ? byDim[k].interes : null;

      const aptitud =
        typeof byDim?.[k]?.aptitud === "number" ? byDim[k].aptitud : null;

      const pct = Math.round((total / max) * 100);

      return { key: k, idx, total, interes, aptitud, pct };
    });
  }, [data]);

  if (loading) {
    return (
      <div className="card">
        <p className="text-sm text-muted">Cargando resultado…</p>
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
        <p className="text-sm text-red-600">No se pudo cargar el resultado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Resultado · Intento #{data.attempt.id}
          </h1>
          <div className="mt-1 text-sm text-muted">
            Usuario #{data.attempt.userId} · Test #{data.attempt.testId}
          </div>
        </div>

        <div className="text-xs text-muted">
          <div>
            Estado:{" "}
            <span className="font-semibold text-slate-900">
              {data.attempt.status}
            </span>
          </div>
          <div>Finalizado: {formatDate(data.attempt.finishedAt)}</div>
        </div>
      </div>

      {/* Top areas */}
      <section className="card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Top áreas</h2>
            <p className="mt-1 text-sm text-muted">
              Ranking según tu cálculo (mostrando puntaje total).
            </p>
          </div>

          <div className="text-xs text-muted">
            Respondidas:{" "}
            <span className="font-semibold text-slate-900">
              {data.attempt.answeredCount}
            </span>
            /103
          </div>
        </div>

        {topCards.length ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {topCards.map((c) => (
              <div
                key={c.key}
                className="rounded-2xl border border-border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs text-muted">
                    {medal(c.idx)} #{c.idx + 1}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted">Total</div>
                    <div className="text-lg font-extrabold leading-none">
                      {c.total}
                    </div>
                  </div>
                </div>

                <div className="mt-2 text-base font-extrabold">
                  {areaName(c.key)}
                </div>

                <div className="mt-1 text-xs text-muted">
                  Código: <span className="font-mono">{c.key}</span>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>Comparativo</span>
                    <span>{c.pct}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-slate-900"
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                </div>

                {(c.interes != null || c.aptitud != null) && (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl border border-border p-2">
                      <div className="text-muted">Interés</div>
                      <div className="font-extrabold text-slate-900">
                        {c.interes ?? "—"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border p-2">
                      <div className="text-muted">Aptitud</div>
                      <div className="font-extrabold text-slate-900">
                        {c.aptitud ?? "—"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 text-sm text-muted">—</div>
        )}
      </section>

      {/* Scores by area */}
      <section className="card">
        <div>
          <h2 className="text-lg font-bold">Puntajes por área</h2>
          <p className="mt-1 text-sm text-muted">
            Ordenado por puntaje (desc).
          </p>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="py-2">Área</th>
                <th className="py-2">Código</th>
                <th className="py-2">Puntaje</th>
              </tr>
            </thead>
            <tbody>
              {rowsByArea.map((r) => (
                <tr key={r.key} className="border-t border-border">
                  <td className="py-3 font-semibold">{areaName(r.key)}</td>
                  <td className="py-3 font-mono text-xs text-muted">{r.key}</td>
                  <td className="py-3 font-extrabold">{r.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Scores by area dim */}
      <section className="card">
        <div>
          <h2 className="text-lg font-bold">Detalle por dimensión</h2>
          <p className="mt-1 text-sm text-muted">
            Total, Interés y Aptitud por área.
          </p>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="py-2">Área</th>
                <th className="py-2">Total</th>
                <th className="py-2">Interés</th>
                <th className="py-2">Aptitud</th>
              </tr>
            </thead>
            <tbody>
              {rowsByDim.map((r) => (
                <tr key={r.key} className="border-t border-border">
                  <td className="py-3 font-semibold">{areaName(r.key)}</td>
                  <td className="py-3 font-extrabold">{r.total}</td>
                  <td className="py-3">{r.interes}</td>
                  <td className="py-3">{r.aptitud}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-muted">
          Generado: {formatDate(data.result.createdAt)}
        </div>
      </section>

      <div className="flex items-center justify-between">
        <a
          href="/admin/periods"
          className="text-sm text-slate-600 hover:underline">
          ← Volver a periodos
        </a>
      </div>
    </div>
  );
}

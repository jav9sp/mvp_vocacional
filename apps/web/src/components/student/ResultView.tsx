import { useEffect, useState } from "react";
import { requireAuth } from "../../lib/guards";
import { api } from "../../lib/api";

type ResultResp = {
  ok: boolean;
  status: "not_started" | "in_progress" | "finished";
  attempt: any;
  result: null | {
    topAreas: string[];
    scoresByAreaDim: Record<
      string,
      { interes: number; aptitud: number; total: number }
    >;
  };
};

export default function ResultView() {
  const [data, setData] = useState<ResultResp | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const auth = requireAuth("student");
    if (!auth) return;

    api<ResultResp>("/me/result")
      .then((d) => {
        setData(d);
        if (d.status !== "finished") window.location.href = "/student";
      })
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <p style={{ color: "crimson" }}>{err}</p>;
  if (!data) return <p>Cargando...</p>;
  if (!data.result) return null;

  const rows = Object.entries(data.result.scoresByAreaDim)
    .map(([area, v]) => ({ area, ...v }))
    .sort((a, b) => b.total - a.total);

  return (
    <main className="mx-auto my-6 max-w-225 p-4">
      <h1 className="text-2xl font-semibold">Resultado</h1>

      <p className="mt-2">
        Top 3 áreas: <b>{data.result.topAreas.join(", ")}</b>
      </p>

      <h3 className="mt-4 text-lg font-semibold">Puntajes</h3>

      <div className="mt-2 grid gap-2.5">
        {rows.map((r) => (
          <div
            key={r.area}
            className="rounded-xl border border-border bg-white p-3">
            <b>{r.area}</b>

            <div className="mt-1.5 text-sm">
              Interés: {r.interes} · Aptitud: {r.aptitud} · Total:{" "}
              <b>{r.total}</b>
            </div>

            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-border">
              <div
                className="h-full bg-primary"
                style={{ width: `${(r.total / 103) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4.5">
        <a href="/student" className="text-primary underline">
          Volver
        </a>
      </p>
    </main>
  );
}

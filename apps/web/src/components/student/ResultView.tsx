import { useEffect, useState } from "react";
import { requireAuth } from "../../lib/guards";
import { api } from "../../lib/api";
import LogoutButton from "../common/LogoutButton";

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
    <main style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <h1>Resultado</h1>
      <p>
        Top 3 áreas: <b>{data.result.topAreas.join(", ")}</b>
      </p>

      <h3>Puntajes</h3>
      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((r) => (
          <div
            key={r.area}
            style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
            <b>{r.area}</b>
            <div style={{ marginTop: 6 }}>
              Interés: {r.interes} · Aptitud: {r.aptitud} · Total:{" "}
              <b>{r.total}</b>
            </div>
            <div
              style={{
                height: 8,
                background: "#eee",
                borderRadius: 999,
                overflow: "hidden",
                marginTop: 10,
              }}>
              <div
                style={{
                  width: `${(r.total / 103) * 100}%`,
                  height: "100%",
                  background: "#222",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 18 }}>
        <a href="/student">Volver</a>
      </p>
      <LogoutButton />
    </main>
  );
}

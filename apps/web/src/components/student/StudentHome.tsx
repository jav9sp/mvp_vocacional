import React, { useEffect, useMemo, useState } from "react";
import { requireAuth } from "../../lib/guards";
import { api } from "../../lib/api";

type CurrentTestResp = {
  ok: boolean;
  test: { id: number; key: string; version: string; name: string };
  attempt: {
    id: number;
    status: "in_progress" | "finished";
    answeredCount: number;
  };
};

export default function StudentHome() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<CurrentTestResp | null>(null);

  useEffect(() => {
    const auth = requireAuth("student");
    if (!auth) return;

    (async () => {
      try {
        const resp = await api<CurrentTestResp>("/test/current");
        setData(resp);
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const total = 103;

  const statusLabel = useMemo(() => {
    if (!data) return "—";
    if (data.attempt.status === "finished") return "Finalizado";
    if (data.attempt.answeredCount > 0) return "En progreso";
    return "No iniciado";
  }, [data]);

  const answered = data?.attempt.answeredCount ?? 0;
  const pct = Math.min(100, Math.round((answered / total) * 100));

  const cta = useMemo(() => {
    if (!data) return { href: "/student/test", label: "Ir al test" };

    if (data.attempt.status === "finished") {
      return { href: "/student/result", label: "Ver resultados" };
    }
    if (data.attempt.answeredCount > 0) {
      return { href: "/student/test", label: "Continuar test" };
    }
    return { href: "/student/test", label: "Comenzar test" };
  }, [data]);

  if (loading) return <p style={{ margin: 24 }}>Cargando...</p>;
  if (err) return <p style={{ margin: 24, color: "crimson" }}>{err}</p>;

  return (
    <main style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}>
        <div>
          <h1 style={{ margin: 0 }}>Inicio</h1>
          <p style={{ margin: "6px 0", color: "#555" }}>
            Estado del test: <b>{statusLabel}</b>
          </p>
        </div>
      </header>

      <section style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <div
          style={{ border: "1px solid #eee", borderRadius: 14, padding: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "baseline",
            }}>
            <div>
              <div style={{ color: "#666", fontSize: 12 }}>Test activo</div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>
                {data?.test?.name || "INAP-V"}
              </div>
              <div style={{ color: "#666", fontSize: 12 }}>
                {data?.test?.key} · {data?.test?.version}
              </div>
            </div>

            <a href={cta.href} style={{ textDecoration: "none" }}>
              <button style={{ padding: "10px 14px", borderRadius: 12 }}>
                {cta.label}
              </button>
            </a>
          </div>

          <div style={{ marginTop: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "#666",
                fontSize: 12,
              }}>
              <span>Progreso</span>
              <span>
                {answered}/{total} ({pct}%)
              </span>
            </div>
            <div
              style={{
                height: 10,
                background: "#eee",
                borderRadius: 999,
                overflow: "hidden",
                marginTop: 6,
              }}>
              <div
                style={{ height: "100%", width: `${pct}%`, background: "#111" }}
              />
            </div>
          </div>

          {data?.attempt.status === "finished" && (
            <p style={{ marginTop: 10, color: "#116b3b" }}>
              ✓ Ya completaste el test. Puedes ver tus resultados cuando
              quieras.
            </p>
          )}
        </div>

        {/* Sugerencia UX extra */}
        <div
          style={{ border: "1px solid #eee", borderRadius: 14, padding: 14 }}>
          <b>Recomendación</b>
          <p style={{ margin: "6px 0", color: "#555" }}>
            Responde con calma y honestidad. No hay respuestas correctas o
            incorrectas.
          </p>
        </div>
      </section>
    </main>
  );
}

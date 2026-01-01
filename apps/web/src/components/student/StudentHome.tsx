import React, { useEffect, useMemo, useState } from "react";
import { requireAuth } from "../../lib/guards";
import { api } from "../../lib/api";
import LogoutButton from "../common/LogoutButton";

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

  const statusPill = useMemo(() => {
    if (!data) return "bg-slate-100 text-slate-600";
    if (data.attempt.status === "finished")
      return "bg-emerald-100 text-emerald-800";
    if (data.attempt.answeredCount > 0) return "bg-amber-100 text-amber-800";
    return "bg-slate-100 text-slate-700";
  }, [data]);

  const answered = data?.attempt.answeredCount ?? 0;
  const pct = Math.min(100, Math.round((answered / total) * 100));

  const cta = useMemo(() => {
    if (!data) return { href: "/student/test", label: "Ir al test" };

    if (data.attempt.status === "finished")
      return { href: "/student/result", label: "Ver resultados" };
    if (data.attempt.answeredCount > 0)
      return { href: "/student/test", label: "Continuar test" };
    return { href: "/student/test", label: "Comenzar test" };
  }, [data]);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="card">
          <p className="text-sm text-muted">Cargando...</p>
        </div>
      </main>
    );
  }

  if (err) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="card border-red-200">
          <p className="text-sm text-red-600">{err}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-4">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Inicio</h1>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-muted">Estado del test:</span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusPill}`}>
              {statusLabel}
            </span>
          </div>
        </div>
      </header>

      {/* Card principal */}
      <section className="card space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="text-xs text-muted">Test activo</div>
            <div className="text-lg font-extrabold">
              {data?.test?.name || "INAP-V"}
            </div>
            <div className="text-xs text-muted">
              {data?.test?.key} · {data?.test?.version}
            </div>
          </div>

          <a href={cta.href} className="sm:self-center">
            <button className="btn btn-primary w-full sm:w-auto">
              {cta.label}
            </button>
          </a>
        </div>

        {/* Progreso */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Progreso</span>
            <span>
              {answered}/{total} ({pct}%)
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
          </div>

          {data?.attempt.status === "finished" && (
            <p className="text-sm text-emerald-700">
              ✓ Ya completaste el test. Puedes ver tus resultados cuando
              quieras.
            </p>
          )}
        </div>
      </section>

      {/* Card recomendación */}
      <section className="card">
        <h2 className="font-bold">Recomendación</h2>
        <p className="mt-1 text-sm text-muted">
          Responde con calma y honestidad. No hay respuestas correctas o
          incorrectas.
        </p>
      </section>
    </main>
  );
}

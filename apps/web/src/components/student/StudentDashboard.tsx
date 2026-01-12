import { useEffect, useMemo, useState } from "react";
import { requireAuth } from "../../lib/guards";
import { api } from "../../lib/api";
import { formatDate } from "../../utils/utils";

type MeResp = {
  ok: boolean;
  user: {
    id: number;
    rut: string;
    name: string;
    email: string | null;
    role: "student" | "admin";
  };
  organization?: { id: number; name: string };
};

type ActiveEnrollmentsResp = {
  ok: boolean;
  items: Array<{
    enrollmentId: number;
    status: "active";
    period: {
      id: number;
      name: string;
      status: "draft" | "active" | "closed" | string;
      startAt: string | null;
      endAt: string | null;
    };
    test: null | { id: number; key: string; version: string; name: string };
    attempt: null | {
      id: number;
      status: "in_progress" | "finished";
      answeredCount: number;
      finishedAt: string | null;
    };
  }>;
};

function pill(cls: string) {
  return `inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`;
}

function attemptPill(status?: string | null) {
  if (status === "finished") return pill("bg-emerald-100 text-emerald-800");
  if (status === "in_progress") return pill("bg-sky-100 text-sky-800");
  return pill("bg-slate-100 text-slate-700");
}

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [me, setMe] = useState<MeResp["user"] | null>(null);
  const [org, setOrg] = useState<MeResp["organization"] | null>(null);

  const [items, setItems] = useState<ActiveEnrollmentsResp["items"]>([]);

  useEffect(() => {
    const ok = requireAuth("student");
    if (!ok) return;

    (async () => {
      try {
        setErr(null);
        setLoading(true);

        const [meResp, enrResp] = await Promise.all([
          api<MeResp>("/auth/me"),
          api<ActiveEnrollmentsResp>("/enrollments/active"),
        ]);

        setMe(meResp.user);
        setOrg(meResp.organization ?? null);
        setItems(enrResp.items ?? []);
      } catch (e: any) {
        setErr(e.message || "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const finished = items.filter(
      (x) => x.attempt?.status === "finished"
    ).length;
    const inProgress = items.filter(
      (x) => x.attempt?.status === "in_progress"
    ).length;
    const notStarted = total - finished - inProgress;
    return { total, finished, inProgress, notStarted };
  }, [items]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="card">
          <p className="text-sm text-muted">Cargando…</p>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="card border-red-200">
          <p className="text-sm text-red-600">Error: {err}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-0px)] bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Top header */}
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Inicio</h1>
            <p className="mt-1 text-sm text-muted">
              Bienvenido{me?.name ? `, ${me.name}` : ""}.
            </p>
          </div>

          {org?.name && (
            <div className="text-xs text-muted">
              Organización:{" "}
              <span className="font-semibold text-fg">{org.name}</span>
            </div>
          )}
        </div>

        {/* Profile + KPIs */}
        <section className="grid gap-3 lg:grid-cols-[1.2fr_2fr]">
          <div className="card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-muted">Perfil</div>
                <div className="mt-1 text-lg font-extrabold">
                  {me?.name ?? "—"}
                </div>
                <div className="mt-1 text-sm text-muted">
                  <div>
                    RUT:{" "}
                    <span className="font-mono text-fg">{me?.rut ?? "—"}</span>
                  </div>
                  <div>
                    Email: <span className="text-fg">{me?.email ?? "—"}</span>
                  </div>
                </div>
              </div>

              <div className={pill("bg-slate-100 text-slate-700")}>
                Estudiante
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <a
                className="btn btn-secondary w-full justify-center"
                href="/student/tests">
                Mis tests
              </a>
              <a
                className="btn btn-secondary w-full justify-center"
                href="/student/result">
                Resultado
              </a>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card">
              <div className="text-xs text-muted">Tests activos</div>
              <div className="mt-1 text-2xl font-extrabold">{stats.total}</div>
            </div>
            <div className="card">
              <div className="text-xs text-muted">En progreso</div>
              <div className="mt-1 text-2xl font-extrabold">
                {stats.inProgress}
              </div>
            </div>
            <div className="card">
              <div className="text-xs text-muted">Finalizados</div>
              <div className="mt-1 text-2xl font-extrabold">
                {stats.finished}
              </div>
            </div>
            <div className="card">
              <div className="text-xs text-muted">No iniciados</div>
              <div className="mt-1 text-2xl font-extrabold">
                {stats.notStarted}
              </div>
            </div>
          </div>
        </section>

        {/* Active tests preview */}
        <section className="card mt-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Mis tests</h2>
              <p className="mt-1 text-sm text-muted">
                Periodos activos asignados a tu cuenta.
              </p>
            </div>
            <a
              className="text-sm text-slate-600 hover:underline"
              href="/student/tests">
              Ver todos →
            </a>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {items.length === 0 ? (
              <div className="rounded-xl border border-border bg-white p-4 text-sm text-muted">
                No tienes periodos activos en este momento.
              </div>
            ) : (
              items.slice(0, 4).map((it) => (
                <a
                  key={it.enrollmentId}
                  href={`/student/enrollments/${it.enrollmentId}`}
                  className="group rounded-2xl border border-border bg-white p-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-muted">Periodo</div>
                      <div className="mt-1 font-bold">{it.period.name}</div>
                      <div className="mt-1 text-xs text-muted">
                        {formatDate(it.period.startAt)} —{" "}
                        {formatDate(it.period.endAt)}
                      </div>
                      {it.test?.name && (
                        <div className="mt-2 text-xs text-muted">
                          Test:{" "}
                          <span className="font-semibold text-fg">
                            {it.test.name}
                          </span>
                        </div>
                      )}
                    </div>

                    <div
                      className={attemptPill(
                        it.attempt?.status ?? "not_started"
                      )}>
                      {it.attempt?.status === "finished"
                        ? "Finalizado"
                        : it.attempt?.status === "in_progress"
                        ? "En progreso"
                        : "No iniciado"}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-muted">
                    <span>
                      {it.attempt?.status === "in_progress"
                        ? `Respondidas: ${it.attempt.answeredCount ?? 0}`
                        : it.attempt?.status === "finished"
                        ? `Finalizado: ${formatDate(it.attempt.finishedAt)}`
                        : "Listo para comenzar"}
                    </span>

                    <span className="font-semibold text-slate-700 group-hover:text-slate-900">
                      Abrir →
                    </span>
                  </div>
                </a>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { requireAuth } from "../../lib/guards";
import { api } from "../../lib/api";

type TestRow = {
  id: number;
  key?: string;
  version?: string;
  name?: string;
  isActive?: boolean;
};

type TestsResp = { ok: boolean; tests: TestRow[] };

type CreateResp = {
  ok: boolean;
  period: { id: number; name: string; status: string };
};

function toLocalInputValue(d: Date) {
  // yyyy-MM-ddTHH:mm
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function AdminPeriodCreate() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [tests, setTests] = useState<TestRow[]>([]);
  const activeTest = useMemo(
    () => tests.find((t) => t.isActive) ?? null,
    [tests]
  );

  const [name, setName] = useState("");
  const [testId, setTestId] = useState<number | "">("");
  const [status, setStatus] = useState<"draft" | "active" | "closed">("draft");
  const [startAt, setStartAt] = useState<string>("");
  const [endAt, setEndAt] = useState<string>("");

  useEffect(() => {
    const ok = requireAuth("admin");
    if (!ok) return;

    (async () => {
      try {
        // si no implementaste /admin/tests, comenta este bloque y listo
        const t = await api<TestsResp>("/admin/tests");
        setTests(t.tests ?? []);
      } catch {
        // fail-safe: puedes crear igual (usará test activo en el back)
        setTests([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    // preseleccionar test activo si existe
    if (activeTest && testId === "") setTestId(activeTest.id);
  }, [activeTest, testId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const n = name.trim();
    if (n.length < 3) {
      setErr("El nombre debe tener al menos 3 caracteres.");
      return;
    }

    setSaving(true);
    try {
      const body: any = {
        name: n,
        status,
        testId: typeof testId === "number" ? testId : undefined,
        startAt: startAt ? new Date(startAt).toISOString() : null,
        endAt: endAt ? new Date(endAt).toISOString() : null,
      };

      const resp = await api<CreateResp>("/admin/periods", {
        method: "POST",
        body: JSON.stringify(body),
      });

      // ir al detalle del periodo recién creado
      window.location.href = `/admin/periods/${resp.period.id}`;
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <p className="text-sm text-muted">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <a
        href="/admin/periods"
        className="text-sm text-slate-600 hover:underline">
        ← Volver a periodos
      </a>

      <div className="card">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Crear nuevo periodo
            </h1>
            <p className="mt-1 text-sm text-muted">
              Define nombre, test y rango (opcional). Puedes dejarlo en
              borrador.
            </p>
          </div>
        </div>

        {err && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-4 grid gap-3">
          <div className="grid gap-1">
            <label className="text-sm font-semibold">Nombre</label>
            <input
              className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              placeholder='Ej: "Aplicación 4° Medio - Enero 2026"'
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1">
              <label className="text-sm font-semibold">Estado</label>
              <select
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}>
                <option value="draft">Borrador</option>
                <option value="active">Activo</option>
                <option value="closed">Cerrado</option>
              </select>
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-semibold">Test</label>
              <select
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                value={testId}
                onChange={(e) =>
                  setTestId(e.target.value ? Number(e.target.value) : "")
                }>
                {tests.length === 0 ? (
                  <option value="">
                    (Se usará el test activo del sistema)
                  </option>
                ) : (
                  tests.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name ?? `Test #${t.id}`}
                      {t.isActive ? " (activo)" : ""}
                      {t.key || t.version
                        ? ` — ${t.key ?? ""} ${t.version ?? ""}`
                        : ""}
                    </option>
                  ))
                )}
              </select>
              {tests.length === 0 && (
                <div className="text-xs text-muted">
                  No se pudo cargar la lista de tests. Igual puedes crear el
                  periodo.
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1">
              <label className="text-sm font-semibold">Inicio (opcional)</label>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-semibold">
                Término (opcional)
              </label>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
            <a
              href="/admin/periods"
              className="inline-flex items-center rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-slate-50">
              Cancelar
            </a>

            <button
              type="submit"
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              disabled={saving}>
              {saving ? "Creando…" : "Crear periodo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

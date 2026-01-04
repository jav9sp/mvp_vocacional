type StudentsFiltersProps = {
  total: number;
  loading: boolean;

  q: string;
  setQ: (v: string) => void;

  status: "" | "not_started" | "in_progress" | "finished";
  setStatus: (v: "" | "not_started" | "in_progress" | "finished") => void;

  course: string;
  courses: string[];
  onCourseChange: (v: string) => void;

  onApply: () => void;
};

export default function StudentsFilters({
  total,
  loading,
  q,
  setQ,
  status,
  setStatus,
  course,
  courses,
  onCourseChange,
  onApply,
}: StudentsFiltersProps) {
  return (
    <section className="card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">Estudiantes</h2>
          <p className="mt-1 text-sm text-muted">
            Filtra por estado o busca por RUT, nombre o email.
          </p>
        </div>

        <div className="text-xs text-muted">
          {total} {total === 1 ? "resultado" : "resultados"}
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_220px_auto]">
        <input
          className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          placeholder="Buscar por RUT, nombre o email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onApply();
          }}
        />

        <select
          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}>
          <option value="">Todos</option>
          <option value="not_started">No iniciado</option>
          <option value="in_progress">En progreso</option>
          <option value="finished">Finalizado</option>
        </select>

        <button
          className="btn btn-primary"
          onClick={onApply}
          type="button"
          disabled={loading}>
          {loading ? "Cargando…" : "Aplicar"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="text-sm text-muted">Curso</label>
        <select
          value={course}
          onChange={(e) => onCourseChange(e.target.value)}
          className="rounded-lg border border-border px-3 py-1.5 text-sm">
          <option value="">Todos</option>
          {courses.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}

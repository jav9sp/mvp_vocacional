type PeriodKpisProps = {
  studentsCount?: number;
  startedCount?: number;
  finishedCount?: number;
  completionPct?: number;
};

export default function PeriodKpis({
  studentsCount,
  startedCount,
  finishedCount,
  completionPct,
}: PeriodKpisProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="card">
        <div className="text-xs text-muted">Estudiantes cargados</div>
        <div className="mt-1 text-2xl font-extrabold">
          {studentsCount ?? "—"}
        </div>
      </div>

      <div className="card">
        <div className="text-xs text-muted">Iniciados</div>
        <div className="mt-1 text-2xl font-extrabold">
          {startedCount ?? "—"}
        </div>
      </div>

      <div className="card">
        <div className="text-xs text-muted">Finalizados</div>
        <div className="mt-1 text-2xl font-extrabold">
          {finishedCount ?? "—"}
        </div>
      </div>

      <div className="card">
        <div className="text-xs text-muted">Completitud</div>
        <div className="mt-1 text-2xl font-extrabold">
          {completionPct ?? 0}%
        </div>
      </div>
    </section>
  );
}

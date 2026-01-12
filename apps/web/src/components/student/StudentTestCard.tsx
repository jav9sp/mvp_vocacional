import type { StudentEnrollmentItem } from "../../lib/schemas/student.schemas";
import { progressPct } from "../../utils/utils";

const TOTAL = 103;

function pill(status: string) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";
  const s = (status || "").toLowerCase();

  if (s === "active") return `${base} bg-emerald-100 text-emerald-800`;
  if (s === "closed") return `${base} bg-slate-100 text-slate-700`;
  if (s === "draft") return `${base} bg-amber-100 text-amber-800`;
  return `${base} bg-slate-100 text-slate-700`;
}

export default function StudentTestCard({
  item,
}: {
  item: StudentEnrollmentItem;
}) {
  const period = item.period;
  const test = item.test;
  const attempt = item.attempt;

  const periodStatus = (period.status || "").toLowerCase();
  const isClosed = periodStatus === "closed";
  const isDraft = periodStatus === "draft";

  const attemptStatus = attempt?.status;
  const finished = attemptStatus === "finished";
  const inProgress = attemptStatus === "in_progress";

  // Ajusta a tus rutas reales del student
  const startHref = `/student/enrollments/${item.enrollmentId}/start`;
  const resultHref = `/student/attempts/${attempt?.id}/result`;

  const canStart = !isClosed && !isDraft;

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-muted">Periodo</div>
          <div className="text-base font-extrabold">{period.name}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={pill(period.status)}>{period.status}</span>
            {test?.name && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {test.name}
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-muted">Estado</div>
          <div className="text-sm font-bold">
            {finished
              ? "Finalizado"
              : inProgress
              ? "En progreso"
              : "No iniciado"}
          </div>
          <div className="text-xs text-muted">
            {attempt ? `${attempt.answeredCount}/${TOTAL}` : `0/${TOTAL}`}
          </div>
        </div>
      </div>

      {attempt && (inProgress || finished) && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Progreso</span>
            <span>{progressPct(attempt.answeredCount)}%</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-slate-900"
              style={{ width: `${progressPct(attempt.answeredCount)}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {finished ? (
          <a className="btn btn-primary" href={resultHref}>
            Ver resultado
          </a>
        ) : !canStart ? (
          <span className="text-sm text-muted">
            {isClosed
              ? "Este periodo está cerrado."
              : "Este periodo aún no está activo."}
          </span>
        ) : (
          <a className="btn btn-primary" href={startHref}>
            {inProgress ? "Continuar" : "Comenzar"}
          </a>
        )}

        {test?.key && test?.version && (
          <span className="self-center text-xs text-muted">
            {test.key} · {test.version}
          </span>
        )}
      </div>
    </div>
  );
}

type PeriodHeaderProps = {
  pid: number;
  name?: string | null;
  status?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  createdAt?: string | null;
  badgeStatus: (status: string) => string;
  formatDate: (d?: string | null) => string;
};

export default function PeriodHeader({
  pid,
  name,
  status,
  startAt,
  endAt,
  createdAt,
  badgeStatus,
  formatDate,
}: PeriodHeaderProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {name ?? `Periodo #${pid}`}
        </h1>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
          {status && <span className={badgeStatus(status)}>{status}</span>}
          <span>
            Rango: {formatDate(startAt)} — {formatDate(endAt)}
          </span>
        </div>
      </div>

      <div className="text-xs text-muted">Creado: {formatDate(createdAt)}</div>
    </div>
  );
}

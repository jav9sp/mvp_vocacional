type PeriodStatusActionsProps = {
  status?: string | null;
  mutating: null | "activate" | "close";
  onActivate: () => void;
  onClose: () => void;
};

export default function PeriodStatusActions({
  status,
  mutating,
  onActivate,
  onClose,
}: PeriodStatusActionsProps) {
  if (!status) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "draft" && (
        <button
          type="button"
          className="btn btn-primary"
          disabled={!!mutating}
          onClick={onActivate}>
          {mutating === "activate" ? "Activando…" : "Activar periodo"}
        </button>
      )}

      {status === "active" && (
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!!mutating}
          onClick={onClose}>
          {mutating === "close" ? "Cerrando…" : "Cerrar periodo"}
        </button>
      )}
    </div>
  );
}

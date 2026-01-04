type StudentsPaginationProps = {
  page: number;
  totalPages: number;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
};

export default function StudentsPagination({
  page,
  totalPages,
  loading,
  onPrev,
  onNext,
}: StudentsPaginationProps) {
  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs text-muted">
        Página {page} de {totalPages}
      </div>

      <div className="flex items-center gap-2">
        <button
          className="btn btn-secondary"
          type="button"
          onClick={onPrev}
          disabled={loading || page <= 1}>
          ← Anterior
        </button>

        <button
          className="btn btn-secondary"
          type="button"
          onClick={onNext}
          disabled={loading || page >= totalPages}>
          Siguiente →
        </button>
      </div>
    </div>
  );
}

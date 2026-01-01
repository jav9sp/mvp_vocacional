export type WizardNavProps = {
  page: number;
  totalPages: number;
  isLastPage: boolean;
  canGoNext: boolean;
  finishing: boolean;
  onPrev: () => void;
  onNext: () => void;
  onOpenFinish: () => void;
};

export default function WizardNav(props: WizardNavProps) {
  const {
    page,
    totalPages,
    isLastPage,
    canGoNext,
    finishing,
    onPrev,
    onNext,
    onOpenFinish,
  } = props;

  return (
    <div className="mt-3 flex items-center justify-between">
      <button
        className="btn btn-secondary"
        onClick={onPrev}
        disabled={page === 0}>
        Atrás
      </button>

      <span className="text-xs text-slate-600">
        Página {page + 1} de {totalPages}
      </span>

      {!isLastPage ? (
        <button
          className="btn btn-primary"
          onClick={onNext}
          disabled={!canGoNext}>
          Siguiente
        </button>
      ) : (
        <button
          className="btn btn-primary"
          onClick={onOpenFinish}
          disabled={!canGoNext || finishing}>
          Finalizar
        </button>
      )}
    </div>
  );
}

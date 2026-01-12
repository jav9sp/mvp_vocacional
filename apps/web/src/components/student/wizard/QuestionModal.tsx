type Question = {
  id: number;
  externalId: number;
  text: string;
};

export type QuestionModalProps = {
  open: boolean;
  q: Question | null;
  value: boolean | undefined;
  index: number;
  total: number;
  disabled?: boolean;
  onAnswer: (val: boolean) => void;
  onPrev?: () => void;
  onClose?: () => void;
};

export default function QuestionModal({
  open,
  q,
  value,
  index,
  total,
  disabled,
  onAnswer,
  onPrev,
  onClose,
}: QuestionModalProps) {
  if (!open || !q) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-border bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="text-sm text-muted">
            Pregunta {index + 1} de {total}
          </div>

          <button
            type="button"
            onClick={() => onClose?.()}
            className="rounded-lg px-2 py-1 text-sm hover:bg-slate-100">
            ✕
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl border border-border bg-slate-50 px-3 py-1 text-sm font-bold">
              #{q.externalId}
            </div>
            <div className="text-base font-semibold leading-relaxed">
              {q.text}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={disabled}
              className={[
                "btn btn-primary h-12",
                value === true ? "ring-2 ring-slate-900/10" : "",
              ].join(" ")}
              onClick={() => onAnswer(true)}>
              Sí
            </button>

            <button
              type="button"
              disabled={disabled}
              className={[
                "btn btn-secondary h-12",
                value === false ? "ring-2 ring-slate-900/10" : "",
              ].join(" ")}
              onClick={() => onAnswer(false)}>
              No
            </button>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onPrev}
              disabled={!onPrev || disabled || index === 0}>
              ← Anterior
            </button>

            <div className="text-xs text-muted">
              Responde y avanzamos automáticamente
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

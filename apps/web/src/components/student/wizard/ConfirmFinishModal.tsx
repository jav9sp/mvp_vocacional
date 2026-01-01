export type ConfirmFinishModalProps = {
  open: boolean;
  finishing: boolean;
  answeredCount: number;
  total: number;
  saveState: "idle" | "saving" | "saved" | "error";
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
};

export default function ConfirmFinishModal(props: ConfirmFinishModalProps) {
  const {
    open,
    finishing,
    answeredCount,
    total,
    saveState,
    onClose,
    onConfirm,
  } = props;
  if (!open) return null;

  return (
    <div
      onClick={() => !finishing && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-130 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-3.5">
          <b>Confirmar envío</b>
        </div>

        <div className="grid gap-2.5 p-3.5">
          <p className="m-0">
            Estás a punto de <b>finalizar</b> el test y enviar tus respuestas.
          </p>

          <div className="rounded-xl border border-slate-200 p-3">
            <div className="text-xs text-slate-600">Progreso</div>
            <div className="text-base font-extrabold">
              {answeredCount}/{total}
            </div>
          </div>

          <p className="m-0 text-amber-700">
            ⚠️ Al finalizar, no podrás modificar tus respuestas.
          </p>

          {saveState === "saving" && (
            <p className="m-0 text-xs text-slate-600">
              Guardando cambios antes de finalizar…
            </p>
          )}
          {saveState === "error" && (
            <p className="m-0 text-xs text-red-600">
              Hay cambios pendientes (reintentando guardado). Si puedes, espera
              unos segundos.
            </p>
          )}

          <div className="mt-1.5 flex justify-end gap-2.5">
            <button
              className="btn btn-secondary"
              onClick={onClose}
              disabled={finishing}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={() => onConfirm()}
              disabled={finishing}>
              {finishing ? "Finalizando..." : "Sí, finalizar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

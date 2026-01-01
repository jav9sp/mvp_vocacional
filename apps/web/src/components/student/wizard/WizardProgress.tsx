export type WizardProgressProps = {
  isOnline: boolean;
  restored: boolean;
  answeredCount: number;
  totalQuestions: number;
  pct: number;
  pendingCount: number;
  saveState: "idle" | "saving" | "saved" | "error";
};

export default function WizardProgress(props: WizardProgressProps) {
  const {
    isOnline,
    restored,
    answeredCount,
    totalQuestions,
    pct,
    pendingCount,
    saveState,
  } = props;

  return (
    <div className="space-y-2">
      {!isOnline && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Estás sin conexión. Guardaremos tus respuestas en este dispositivo y
          sincronizaremos cuando vuelva internet.
        </div>
      )}

      {restored && (
        <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
          Recuperamos tu progreso desde este dispositivo.
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 p-3">
        <div className="flex justify-between text-xs text-slate-600">
          <span>Progreso</span>
          <span>
            {answeredCount}/{totalQuestions} ({pct}%)
          </span>
        </div>

        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-2 text-xs text-slate-600">
          {!isOnline &&
            pendingCount > 0 &&
            `Pendientes de sincronizar: ${pendingCount}`}
          {isOnline && saveState === "saving" && "Guardando..."}
          {isOnline && saveState === "saved" && "✓ Guardado"}
          {isOnline &&
            saveState === "error" &&
            "Error al guardar (reintentando...)"}
        </div>
      </div>
    </div>
  );
}

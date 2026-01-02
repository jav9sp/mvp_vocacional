import { useMemo, useState } from "react";

type ImportStudentsModalProps = {
  open: boolean;
  onClose: () => void;
  periodId: number;
  onImported?: () => void;
};

type ImportResp = {
  ok: boolean;
  period: { id: number; name: string };
  summary: {
    rows: number;
    createdUsers: number;
    updatedUsers: number;
    enrolled: number;
    alreadyEnrolled: number;
    errors: number;
  };
  errors: Array<{ row: number; message: string }>;
};

export default function ImportStudentsModal({
  open,
  onClose,
  periodId,
  onImported,
}: ImportStudentsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resp, setResp] = useState<ImportResp | null>(null);

  const canUpload = useMemo(() => !!file && !busy, [file, busy]);

  if (!open) return null;

  async function upload() {
    if (!file) return;
    setBusy(true);
    setErr(null);
    setResp(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      // api() asume JSON; para multipart conviene fetch directo
      const r = await fetch(
        `${
          import.meta.env.PUBLIC_API_BASE
        }/admin/periods/${periodId}/import-xlsx`,
        {
          method: "POST",
          body: fd,
          headers: {
            // deja que el browser ponga el boundary
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        }
      );

      const data = (await r.json()) as ImportResp;

      if (!r.ok || !data.ok) {
        throw new Error((data as any)?.error || `HTTP ${r.status}`);
      }

      setResp(data);
      onImported?.();
    } catch (e: any) {
      setErr(e.message || "Error al importar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !busy && onClose()}>
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h3 className="text-base font-extrabold">
              Importar estudiantes (XLSX)
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              Sube una planilla .xlsx con columnas tipo: RUT, Nombre, Email,
              Curso.
            </p>
          </div>

          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            onClick={onClose}
            disabled={busy}
            aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="grid gap-3 px-4 py-4">
          {err && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          )}

          <div className="rounded-2xl border border-dashed border-border p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                <div className="font-semibold">Archivo</div>
                <div className="text-xs text-muted">
                  Acepta .xlsx (recomendado). La primera hoja será importada.
                </div>
              </div>

              <label className="btn btn-secondary inline-flex cursor-pointer items-center justify-center">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setFile(f);
                    setResp(null);
                    setErr(null);
                  }}
                  disabled={busy}
                />
                Elegir archivo
              </label>
            </div>

            <div className="mt-3 text-sm">
              {file ? (
                <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{file.name}</div>
                    <div className="text-xs text-muted">
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-slate-600 hover:underline disabled:opacity-50"
                    onClick={() => setFile(null)}
                    disabled={busy}>
                    Quitar
                  </button>
                </div>
              ) : (
                <div className="text-xs text-muted">
                  No hay archivo seleccionado.
                </div>
              )}
            </div>
          </div>

          {resp && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-sm font-bold text-emerald-900">
                Importación completada
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Stat label="Filas leídas" value={resp.summary.rows} />
                <Stat
                  label="Usuarios creados"
                  value={resp.summary.createdUsers}
                />
                <Stat
                  label="Usuarios actualizados"
                  value={resp.summary.updatedUsers}
                />
                <Stat label="Enrolados" value={resp.summary.enrolled} />
                <Stat
                  label="Ya enrolados"
                  value={resp.summary.alreadyEnrolled}
                />
                <Stat label="Errores" value={resp.summary.errors} />
              </div>

              {resp.errors?.length > 0 && (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3">
                  <div className="text-xs font-semibold text-emerald-900">
                    Errores (primeros {Math.min(resp.errors.length, 20)})
                  </div>
                  <ul className="mt-2 max-h-40 overflow-auto text-xs text-emerald-900">
                    {resp.errors.slice(0, 20).map((e, idx) => (
                      <li key={idx} className="py-0.5">
                        Fila {e.row}: {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={busy}>
            Cerrar
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={upload}
            disabled={!canUpload}>
            {busy ? "Importando…" : "Importar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="text-lg font-extrabold">{value}</div>
    </div>
  );
}

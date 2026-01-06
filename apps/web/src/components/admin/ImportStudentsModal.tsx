import { useMemo, useState } from "react";
import { api } from "../../lib/api";

type ImportErrorResp = {
  ok: false;
  error?: string;
  details?: {
    missingColumns?: string[];
    expected?: string[];
  };
  errors?: Array<{ row: number; message: string; field?: string }>;
};

type ImportSuccessResp = {
  ok: true;
  period: { id: number; name: string };
  summary: {
    rows: number;
    createdUsers: number;
    updatedUsers: number;
    enrolled: number;
    alreadyEnrolled: number;
    errors: number;
  };
  errors?: Array<{ row: number; message: string; field?: string }>;
};

type ImportResp = ImportSuccessResp | ImportErrorResp;

type ImportStudentsModalProps = {
  open: boolean;
  onClose: () => void;
  periodId: number;
  onImported?: (resp: ImportResp) => void;
};

const API_BASE = import.meta.env.PUBLIC_API_BASE || "http://localhost:4000";

export default function ImportStudentsModal({
  open,
  onClose,
  periodId,
  onImported,
}: ImportStudentsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportSuccessResp | null>(null);
  const [serverError, setServerError] = useState<ImportErrorResp | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => !!file && !submitting, [file, submitting]);

  if (!open) return null;

  function close() {
    if (submitting) return;
    setFile(null);
    setResult(null);
    setServerError(null);
    setErrMsg(null);
    onClose();
  }

  async function onSubmit() {
    setErrMsg(null);
    setResult(null);
    setServerError(null);

    if (!file) {
      setErrMsg("Selecciona un archivo .xlsx");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const data = await api<ImportResp>(
        `/admin/periods/${periodId}/import-xlsx`,
        { method: "POST", body: fd }
      );

      if (data.ok) {
        setResult(data);
        onImported?.(data);
      } else {
        setServerError(data);
        setErrMsg(data.error || "Error al importar");
      }
    } catch (e: any) {
      // api.ts adjunta e.data si el server respondió JSON
      if (e?.data && typeof e.data === "object") {
        setServerError(e.data as ImportErrorResp);
        setErrMsg(e.data?.error || e.message);
      } else {
        setErrMsg(e.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={close}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl border border-border bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="font-extrabold">Importar estudiantes (XLSX)</div>
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            className="rounded-lg px-2 py-1 text-sm hover:bg-slate-100">
            ✕
          </button>
        </div>

        <div className="grid gap-3 p-4">
          <div className="rounded-xl border border-border bg-slate-50 p-3 text-sm text-slate-700">
            <div className="font-semibold">Formato esperado</div>
            <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
              <li>
                Columnas (mínimo): <b>rut</b>, <b>nombre</b>, <b>email</b>
              </li>
              <li>
                Opcional: <b>curso</b>
              </li>
              <li>Se importa la primera hoja del Excel</li>
            </ul>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-semibold">Archivo .xlsx</label>
            <input
              type="file"
              accept=".xlsx"
              disabled={submitting}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
            />
            {file && (
              <div className="text-xs text-muted">
                Seleccionado: <span className="font-semibold">{file.name}</span>
              </div>
            )}
          </div>

          {errMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errMsg}
            </div>
          )}

          {result?.summary && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <div className="font-semibold">Importación completada</div>
              <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                <div>Filas: {result.summary.rows}</div>
                <div>Creados: {result.summary.createdUsers}</div>
                <div>Actualizados: {result.summary.updatedUsers}</div>
                <div>Enrolados: {result.summary.enrolled}</div>
                <div>Ya inscritos: {result.summary.alreadyEnrolled}</div>
                <div>Errores: {result.summary.errors}</div>
              </div>
            </div>
          )}

          {result?.errors?.length ? (
            <div className="rounded-xl border border-border p-3">
              <div className="text-sm font-bold">Errores</div>
              <div className="mt-2 max-h-48 overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] uppercase text-muted">
                    <tr>
                      <th className="py-1">Fila</th>
                      <th className="py-1">Mensaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((e, idx) => (
                      <tr key={idx} className="border-t border-border">
                        <td className="py-1 font-mono">{e.row}</td>
                        <td className="py-1">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {serverError?.details?.missingColumns?.length ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="font-semibold">Plantilla inválida</div>
              <div className="mt-1 text-xs">
                Faltan columnas: {serverError.details.missingColumns.join(", ")}
              </div>
              <div className="mt-2 text-xs text-amber-800">
                Esperado: {serverError.details.expected?.join(" · ")}
              </div>
            </div>
          ) : null}

          {serverError?.errors?.length ? (
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-sm font-semibold">
                Errores ({serverError.errors.length})
              </div>
              <ul className="mt-2 max-h-56 list-disc overflow-auto pl-5 text-xs text-slate-700">
                {serverError.errors.slice(0, 50).map((er: any, idx: number) => (
                  <li key={idx}>
                    Fila {er.row}: {er.field ? `[${er.field}] ` : ""}
                    {er.message}
                  </li>
                ))}
              </ul>
              {serverError.errors.length > 50 && (
                <div className="mt-2 text-xs text-muted">
                  Mostrando 50 de {serverError.errors.length}…
                </div>
              )}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={close}
              disabled={submitting}>
              Cerrar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onSubmit}
              disabled={!canSubmit}>
              {submitting ? "Importando…" : "Importar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

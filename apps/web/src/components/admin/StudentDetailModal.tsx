import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { areaName } from "../../lib/inapv";

type Props = {
  open: boolean;
  onClose: () => void;
  row: any | null;
};

type AdminAttemptResultResp = {
  ok: boolean;
  attempt: {
    id: number;
    status: string;
    answeredCount: number;
    finishedAt: string | null;
  };
  result: null | {
    topAreas: string[];
    scoresByAreaDim: Record<
      string,
      { interes: number; aptitud: number; total: number }
    >;
    createdAt: string;
  };
};

export default function StudentDetailModal({ open, onClose, row }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AdminAttemptResultResp | null>(null);
  const [error, setError] = useState<string | null>(null);

  const attemptId = row?.attempt?.id ?? null;

  useEffect(() => {
    if (!open) return;
    setData(null);
    setError(null);

    if (!attemptId) return;

    setLoading(true);
    api<AdminAttemptResultResp>(`/admin/attempts/${attemptId}/result`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, attemptId]);

  const rows = useMemo(() => {
    const dim = data?.result?.scoresByAreaDim || {};
    return Object.entries(dim)
      .map(([area, v]) => ({ area, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [data]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.35)] p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-230 overflow-hidden rounded-[16px] border border-border bg-white">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border p-3.5">
          <div>
            <b>Detalle estudiante</b>
            <div className="text-xs text-muted">
              {row?.student?.name}{" "}
              {row?.student?.email ? `· ${row.student.email}` : ""}
            </div>
          </div>

          <button onClick={onClose} className="btn btn-secondary">
            Cerrar
          </button>
        </div>

        {/* Body */}
        <div className="grid gap-3 p-3.5">
          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl border border-border p-3">
              <div className="text-xs text-muted">Estado</div>
              <div className="font-bold">{row?.progressStatus}</div>
            </div>

            <div className="rounded-xl border border-border p-3">
              <div className="text-xs text-muted">Progreso</div>
              <div className="font-bold">
                {row?.attempt ? `${row.attempt.answeredCount}/103` : "—"}
              </div>
            </div>

            <div className="flex-1 basis-55 rounded-xl border border-border p-3">
              <div className="text-xs text-muted">Top áreas</div>
              <div className="font-bold">
                {row?.result?.topAreas?.length
                  ? row.result.topAreas.map(areaName).join(", ")
                  : "—"}
              </div>
            </div>
          </div>

          {!attemptId && (
            <p className="text-muted">
              Este estudiante aún no tiene intento asociado para este
              test/periodo.
            </p>
          )}

          {attemptId && loading && (
            <p className="text-sm">Cargando resultados...</p>
          )}
          {attemptId && error && <p className="text-danger">{error}</p>}

          {attemptId && data?.result && (
            <>
              <h3 className="mt-2 text-lg font-semibold">Puntajes por área</h3>

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-surface">
                    <tr>
                      <th className="border-b border-border p-2.5 text-left font-semibold">
                        Área
                      </th>
                      <th className="border-b border-border p-2.5 text-right font-semibold">
                        Interés
                      </th>
                      <th className="border-b border-border p-2.5 text-right font-semibold">
                        Aptitud
                      </th>
                      <th className="border-b border-border p-2.5 text-right font-semibold">
                        Total
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.area} className="hover:bg-surface">
                        <td className="border-b border-[rgba(0,0,0,0.06)] p-2.5">
                          {areaName(r.area)}
                        </td>
                        <td className="border-b border-[rgba(0,0,0,0.06)] p-2.5 text-right">
                          {r.interes}
                        </td>
                        <td className="border-b border-[rgba(0,0,0,0.06)] p-2.5 text-right">
                          {r.aptitud}
                        </td>
                        <td className="border-b border-[rgba(0,0,0,0.06)] p-2.5 text-right font-bold">
                          {r.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {attemptId && data && !data.result && (
            <p className="text-muted">
              El intento existe, pero aún no hay resultado (no finalizado).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

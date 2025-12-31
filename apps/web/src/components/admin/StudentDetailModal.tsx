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
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
        zIndex: 50,
      }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(920px, 100%)",
          background: "#fff",
          borderRadius: 16,
          border: "1px solid #eee",
          overflow: "hidden",
        }}>
        <div
          style={{
            padding: 14,
            borderBottom: "1px solid #eee",
            display: "flex",
            justifyContent: "space-between",
          }}>
          <div>
            <b>Detalle estudiante</b>
            <div style={{ color: "#666", fontSize: 12 }}>
              {row?.student?.name}{" "}
              {row?.student?.email ? `· ${row.student.email}` : ""}
            </div>
          </div>
          <button onClick={onClose}>Cerrar</button>
        </div>

        <div style={{ padding: 14, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div
              style={{
                border: "1px solid #eee",
                borderRadius: 12,
                padding: 12,
              }}>
              <div style={{ color: "#666", fontSize: 12 }}>Estado</div>
              <div style={{ fontWeight: 700 }}>{row?.progressStatus}</div>
            </div>
            <div
              style={{
                border: "1px solid #eee",
                borderRadius: 12,
                padding: 12,
              }}>
              <div style={{ color: "#666", fontSize: 12 }}>Progreso</div>
              <div style={{ fontWeight: 700 }}>
                {row?.attempt ? `${row.attempt.answeredCount}/103` : "—"}
              </div>
            </div>
            <div
              style={{
                border: "1px solid #eee",
                borderRadius: 12,
                padding: 12,
                flex: "1 1 220px",
              }}>
              <div style={{ color: "#666", fontSize: 12 }}>Top áreas</div>
              <div style={{ fontWeight: 700 }}>
                {row?.result?.topAreas?.length
                  ? row.result.topAreas.map(areaName).join(", ")
                  : "—"}
              </div>
            </div>
          </div>

          {!attemptId && (
            <p style={{ color: "#666" }}>
              Este estudiante aún no tiene intento asociado para este
              test/periodo.
            </p>
          )}

          {attemptId && loading && <p>Cargando resultados...</p>}
          {attemptId && error && <p style={{ color: "crimson" }}>{error}</p>}

          {attemptId && data?.result && (
            <>
              <h3 style={{ margin: "8px 0 0" }}>Puntajes por área</h3>
              <div
                style={{
                  overflowX: "auto",
                  border: "1px solid #eee",
                  borderRadius: 12,
                }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ background: "#fafafa" }}>
                    <tr>
                      <th
                        style={{
                          textAlign: "left",
                          padding: 10,
                          borderBottom: "1px solid #eee",
                        }}>
                        Área
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: 10,
                          borderBottom: "1px solid #eee",
                        }}>
                        Interés
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: 10,
                          borderBottom: "1px solid #eee",
                        }}>
                        Aptitud
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: 10,
                          borderBottom: "1px solid #eee",
                        }}>
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.area}>
                        <td
                          style={{
                            padding: 10,
                            borderBottom: "1px solid #f2f2f2",
                          }}>
                          {areaName(r.area)}
                        </td>
                        <td
                          style={{
                            padding: 10,
                            textAlign: "right",
                            borderBottom: "1px solid #f2f2f2",
                          }}>
                          {r.interes}
                        </td>
                        <td
                          style={{
                            padding: 10,
                            textAlign: "right",
                            borderBottom: "1px solid #f2f2f2",
                          }}>
                          {r.aptitud}
                        </td>
                        <td
                          style={{
                            padding: 10,
                            textAlign: "right",
                            borderBottom: "1px solid #f2f2f2",
                            fontWeight: 700,
                          }}>
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
            <p style={{ color: "#666" }}>
              El intento existe, pero aún no hay resultado (no finalizado).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { requireAuth } from "../../lib/guards";
import { api } from "../../lib/api";
import { clearAuth } from "../../lib/auth";

import StudentDetailModal from "./StudentDetailModal";

import { areaName } from "../../lib/inapv";
import { downloadFile } from "../../lib/download";

type Period = {
  id: number;
  name: string;
  status: "draft" | "active" | "closed";
  startAt: string | null;
  endAt: string | null;
  test?: { id: number; key?: string; version?: string; name?: string };
};

type PeriodsResp = {
  ok: boolean;
  organization: { id: number; name: string };
  periods: Period[];
};

type EnrollmentRow = {
  enrollment: { id: number; status: string; meta: any; createdAt: string };
  student: { id: number; name: string; email: string | null };
  attempt: null | {
    id: number;
    status: string;
    answeredCount: number;
    finishedAt: string | null;
  };
  result: null | { topAreas: string[]; createdAt: string };
  progressStatus: "not_started" | "in_progress" | "finished";
};

type EnrollmentsResp = {
  ok: boolean;
  period: { id: number; name: string; status: string; testId: number };
  enrollments: EnrollmentRow[];
};

type ReportResp = {
  ok: boolean;
  period: { id: number; name: string; status: string; testId: number };
  totals: {
    enrolled: number;
    notStarted: number;
    inProgress: number;
    finished: number;
    completionRate: number;
  };
  byCourse: Record<
    string,
    {
      enrolled: number;
      notStarted: number;
      inProgress: number;
      finished: number;
    }
  >;
  topAreas: {
    distribution: Record<string, number>;
    top5: Array<{ area: string; count: number }>;
  };
};

function badgeStyle(kind: "gray" | "green" | "yellow") {
  const bg =
    kind === "green" ? "#e7f7ee" : kind === "yellow" ? "#fff6db" : "#f2f2f2";
  const color =
    kind === "green" ? "#116b3b" : kind === "yellow" ? "#7a5a00" : "#444";
  return {
    background: bg,
    color,
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
  };
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState<string>("");
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);

  const [rows, setRows] = useState<EnrollmentRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const [report, setReport] = useState<ReportResp | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    const auth = requireAuth("admin");
    if (!auth) return;

    (async () => {
      try {
        const data = await api<PeriodsResp>("/admin/periods");
        setOrgName(data.organization.name);
        setPeriods(data.periods);

        // auto-select: primer periodo si existe
        if (data.periods.length > 0) {
          setSelectedPeriodId(data.periods[0].id);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedPeriodId) return;

    (async () => {
      setLoadingRows(true);
      setLoadingReport(true);
      setError(null);

      try {
        const [enrData, repData] = await Promise.all([
          api<EnrollmentsResp>(
            `/admin/periods/${selectedPeriodId}/enrollments`
          ),
          api<ReportResp>(`/admin/periods/${selectedPeriodId}/report`),
        ]);

        setRows(enrData.enrollments);
        setReport(repData);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoadingRows(false);
        setLoadingReport(false);
      }
    })();
  }, [selectedPeriodId]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = r.student.name?.toLowerCase() || "";
      const email = (r.student.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [rows, query]);

  function logout() {
    clearAuth();
    window.location.href = "/login";
  }

  function openDetail(row: any) {
    setSelectedRow(row);
    setModalOpen(true);
  }

  async function importXlsx(file: File) {
    if (!selectedPeriodId) return;

    setImporting(true);
    setImportMsg(null);

    const form = new FormData();
    form.append("file", file);

    const token = localStorage.getItem("auth_token") || "";
    const base = import.meta.env.PUBLIC_API_BASE;

    const res = await fetch(
      `${base}/admin/periods/${selectedPeriodId}/import-xlsx`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

    setImportMsg(
      `Import OK: +${data.summary.createdUsers} nuevos, ~${data.summary.updatedUsers} actualizados, ` +
        `inscritos ${data.summary.enrolled} (duplicados ${data.summary.alreadyEnrolled}), errores ${data.summary.errors}`
    );

    // refrescar tabla
    const refreshed = await api<any>(
      `/admin/periods/${selectedPeriodId}/enrollments`
    );
    setRows(refreshed.enrollments);
  }

  if (loading) return <p style={{ margin: 24 }}>Cargando admin...</p>;
  if (error) return <p style={{ color: "crimson", margin: 24 }}>{error}</p>;

  return (
    <main style={{ maxWidth: 1100, margin: "24px auto", padding: 16 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}>
        <div>
          <h1 style={{ margin: 0 }}>Admin</h1>
          <p style={{ margin: "6px 0", color: "#555" }}>
            Organización: <b>{orgName || "—"}</b>
          </p>
        </div>
        <button onClick={logout}>Cerrar sesión</button>
      </header>

      <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
        <input
          type="file"
          accept=".xlsx"
          disabled={!selectedPeriodId || importing}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              await importXlsx(f);
            } catch (err: any) {
              setImportMsg(`Error: ${err.message}`);
            } finally {
              // reset input para poder subir el mismo archivo otra vez
              e.currentTarget.value = "";
              setImporting(false);
            }
          }}
        />
      </label>

      {importMsg && (
        <p
          style={{
            margin: "8px 0",
            color: importMsg.startsWith("Error") ? "crimson" : "#116b3b",
          }}>
          {importMsg}
        </p>
      )}

      <section style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            Periodo:
            <select
              value={selectedPeriodId ?? ""}
              onChange={(e) => setSelectedPeriodId(Number(e.target.value))}>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.status})
                </option>
              ))}
            </select>
          </label>

          <input
            placeholder="Buscar por nombre o email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: "1 1 260px",
              padding: 8,
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
          />
        </div>

        <section style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              border: "1px solid #eee",
              borderRadius: 14,
              padding: 12,
              display: "grid",
              gap: 12,
            }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
              }}>
              <b>Resumen del periodo</b>
              <span style={{ color: "#666", fontSize: 12 }}>
                {loadingReport ? "Cargando..." : report ? `Actualizado` : "—"}
              </span>
            </div>

            {!report && !loadingReport && (
              <p style={{ color: "#666", margin: 0 }}>
                No hay datos de reporte.
              </p>
            )}

            {(loadingReport || report) && (
              <div style={{ display: "grid", gap: 12 }}>
                {/* KPIs */}
                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                  }}>
                  <div
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 12,
                      padding: 10,
                    }}>
                    <div style={{ color: "#666", fontSize: 12 }}>Inscritos</div>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>
                      {report?.totals.enrolled ?? "—"}
                    </div>
                  </div>
                  <div
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 12,
                      padding: 10,
                    }}>
                    <div style={{ color: "#666", fontSize: 12 }}>
                      No iniciado
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>
                      {report?.totals.notStarted ?? "—"}
                    </div>
                  </div>
                  <div
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 12,
                      padding: 10,
                    }}>
                    <div style={{ color: "#666", fontSize: 12 }}>
                      En progreso
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>
                      {report?.totals.inProgress ?? "—"}
                    </div>
                  </div>
                  <div
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 12,
                      padding: 10,
                    }}>
                    <div style={{ color: "#666", fontSize: 12 }}>
                      Finalizados
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>
                      {report?.totals.finished ?? "—"}
                    </div>
                  </div>
                  <div
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 12,
                      padding: 10,
                    }}>
                    <div style={{ color: "#666", fontSize: 12 }}>
                      % finalización
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>
                      {report ? `${report.totals.completionRate}%` : "—"}
                    </div>
                  </div>
                </div>

                {/* Top áreas */}
                <div style={{ display: "grid", gap: 8 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}>
                    <b>Top áreas (Top #1)</b>
                    <p style={{ margin: 0, color: "#666", fontSize: 12 }}>
                      Base: {report?.totals.finished ?? 0} finalizados
                    </p>
                    <span style={{ color: "#666", fontSize: 12 }}>Top 5</span>
                  </div>

                  {report?.topAreas?.top5?.length ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {(() => {
                        const max = Math.max(
                          ...report.topAreas.top5.map((x) => x.count),
                          1
                        );
                        return report.topAreas.top5.map((x) => {
                          const pct = Math.round((x.count / max) * 100);
                          return (
                            <div
                              key={x.area}
                              style={{ display: "grid", gap: 6 }}>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: 12,
                                }}>
                                <span style={{ fontWeight: 600 }}>
                                  {x.area}
                                </span>
                                <span style={{ color: "#444" }}>
                                  <b>{x.count}</b>
                                </span>
                              </div>
                              <div
                                style={{
                                  height: 10,
                                  background: "#eee",
                                  borderRadius: 999,
                                  overflow: "hidden",
                                }}>
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${pct}%`,
                                    background: "#111",
                                  }}
                                />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <p style={{ margin: 0, color: "#666" }}>
                      Aún no hay finalizados con resultados.
                    </p>
                  )}
                </div>

                {/* Por curso */}
                <div style={{ display: "grid", gap: 8 }}>
                  <b>Por curso</b>
                  {report?.byCourse &&
                  Object.keys(report.byCourse).length > 0 ? (
                    <div
                      style={{
                        overflowX: "auto",
                        border: "1px solid #eee",
                        borderRadius: 12,
                      }}>
                      <table
                        style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead style={{ background: "#fafafa" }}>
                          <tr>
                            <th
                              style={{
                                textAlign: "left",
                                padding: 10,
                                borderBottom: "1px solid #eee",
                              }}>
                              Curso
                            </th>
                            <th
                              style={{
                                textAlign: "right",
                                padding: 10,
                                borderBottom: "1px solid #eee",
                              }}>
                              Inscritos
                            </th>
                            <th
                              style={{
                                textAlign: "right",
                                padding: 10,
                                borderBottom: "1px solid #eee",
                              }}>
                              No iniciado
                            </th>
                            <th
                              style={{
                                textAlign: "right",
                                padding: 10,
                                borderBottom: "1px solid #eee",
                              }}>
                              En progreso
                            </th>
                            <th
                              style={{
                                textAlign: "right",
                                padding: 10,
                                borderBottom: "1px solid #eee",
                              }}>
                              Finalizados
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(report.byCourse)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([course, v]) => (
                              <tr key={course}>
                                <td
                                  style={{
                                    padding: 10,
                                    borderBottom: "1px solid #f2f2f2",
                                  }}>
                                  {course}
                                </td>
                                <td
                                  style={{
                                    padding: 10,
                                    textAlign: "right",
                                    borderBottom: "1px solid #f2f2f2",
                                  }}>
                                  {v.enrolled}
                                </td>
                                <td
                                  style={{
                                    padding: 10,
                                    textAlign: "right",
                                    borderBottom: "1px solid #f2f2f2",
                                  }}>
                                  {v.notStarted}
                                </td>
                                <td
                                  style={{
                                    padding: 10,
                                    textAlign: "right",
                                    borderBottom: "1px solid #f2f2f2",
                                  }}>
                                  {v.inProgress}
                                </td>
                                <td
                                  style={{
                                    padding: 10,
                                    textAlign: "right",
                                    borderBottom: "1px solid #f2f2f2",
                                  }}>
                                  {v.finished}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ margin: 0, color: "#666" }}>
                      Sin información por curso.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 14,
            overflow: "hidden",
          }}>
          <div
            style={{
              padding: "10px 12px",
              borderBottom: "1px solid #eee",
              display: "flex",
              justifyContent: "space-between",
            }}>
            <b>Estudiantes</b>
            <span style={{ color: "#666" }}>
              {loadingRows ? "Cargando..." : `${filteredRows.length} registros`}
            </span>
            <button
              disabled={!selectedPeriodId}
              onClick={async () => {
                if (!selectedPeriodId) return;
                const filename = `period_${selectedPeriodId}_export.csv`;
                try {
                  await downloadFile(
                    `${
                      import.meta.env.PUBLIC_API_BASE
                    }/admin/periods/${selectedPeriodId}/export.csv`,
                    `period_${selectedPeriodId}_export.csv`
                  );
                  setImportMsg(null);
                } catch (e: any) {
                  setImportMsg(`Error: ${e.message}`);
                }
              }}>
              Exportar CSV
            </button>
            <button
              disabled={!selectedPeriodId}
              onClick={async () => {
                if (!selectedPeriodId) return;
                const filename = `period_${selectedPeriodId}_report.pdf`;
                try {
                  await downloadFile(
                    `${
                      import.meta.env.PUBLIC_API_BASE
                    }/admin/periods/${selectedPeriodId}/report.pdf`,
                    `period_${selectedPeriodId}_report.pdf`
                  );
                  setImportMsg(null);
                } catch (e: any) {
                  setImportMsg(`Error: ${e.message}`);
                }
              }}>
              Descargar PDF
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", background: "#fafafa" }}>
                  <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                    Estudiante
                  </th>
                  <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                    Estado
                  </th>
                  <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                    Progreso
                  </th>
                  <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                    Top áreas
                  </th>
                  <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                    Intento
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => {
                  const kind =
                    r.progressStatus === "finished"
                      ? "green"
                      : r.progressStatus === "in_progress"
                      ? "yellow"
                      : "gray";

                  const progress = r.attempt
                    ? `${r.attempt.answeredCount}/103`
                    : "—";
                  const topAreas = r.result?.topAreas?.length
                    ? r.result.topAreas.map(areaName).join(", ")
                    : "—";
                  const attemptInfo = r.attempt
                    ? `#${r.attempt.id} (${r.attempt.status})`
                    : "—";

                  return (
                    <tr
                      key={r.enrollment.id}
                      onClick={() => openDetail(r)}
                      style={{ cursor: "pointer" }}>
                      <td
                        style={{
                          padding: 10,
                          borderBottom: "1px solid #f2f2f2",
                        }}>
                        <div style={{ fontWeight: 600 }}>
                          {r.student.name || "Sin nombre"}
                        </div>
                        <div style={{ color: "#666", fontSize: 12 }}>
                          {r.student.email || ""}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: 10,
                          borderBottom: "1px solid #f2f2f2",
                        }}>
                        <span style={badgeStyle(kind as any)}>
                          {r.progressStatus}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: 10,
                          borderBottom: "1px solid #f2f2f2",
                        }}>
                        {progress}
                      </td>
                      <td
                        style={{
                          padding: 10,
                          borderBottom: "1px solid #f2f2f2",
                        }}>
                        {topAreas}
                      </td>
                      <td
                        style={{
                          padding: 10,
                          borderBottom: "1px solid #f2f2f2",
                        }}>
                        {attemptInfo}
                      </td>
                    </tr>
                  );
                })}

                {!loadingRows && filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 14, color: "#666" }}>
                      No hay estudiantes para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <StudentDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        row={selectedRow}
      />
    </main>
  );
}

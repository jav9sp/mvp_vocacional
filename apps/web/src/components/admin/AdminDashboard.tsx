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

const badgeClass = (kind: "gray" | "green" | "yellow") => `badge badge-${kind}`;

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
    <main className="mx-auto my-6 max-w-275 p-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-xl font-semibold">Admin</h1>
          <p className="my-1.5 text-muted">
            Organización: <b>{orgName || "—"}</b>
          </p>
        </div>

        <button onClick={logout} className="btn btn-secondary">
          Cerrar sesión
        </button>
      </header>

      <label className="inline-flex items-center gap-2">
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
              e.currentTarget.value = "";
              setImporting(false);
            }
          }}
          className="text-sm disabled:opacity-50"
        />
      </label>

      {importMsg && (
        <p
          className={[
            "my-2",
            importMsg.startsWith("Error") ? "text-danger" : "text-success",
          ].join(" ")}>
          {importMsg}
        </p>
      )}

      <section className="mt-4 grid gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            Periodo:
            <select
              value={selectedPeriodId ?? ""}
              onChange={(e) => setSelectedPeriodId(Number(e.target.value))}
              className="rounded-md border border-border bg-white px-2 py-1 text-sm">
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
            className="flex-1 basis-65 rounded-[10px] border border-border px-2 py-2 text-sm"
          />
        </div>

        <section className="grid gap-3">
          {/* Resumen */}
          <div className="grid gap-3 rounded-[14px] border border-border bg-white p-3">
            <div className="flex items-baseline justify-between gap-3">
              <b>Resumen del periodo</b>
              <span className="text-xs text-muted">
                {loadingReport ? "Cargando..." : report ? "Actualizado" : "—"}
              </span>
            </div>

            {!report && !loadingReport && (
              <p className="m-0 text-muted">No hay datos de reporte.</p>
            )}

            {(loadingReport || report) && (
              <div className="grid gap-3">
                {/* KPIs */}
                <div className="grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
                  {[
                    ["Inscritos", report?.totals.enrolled ?? "—"],
                    ["No iniciado", report?.totals.notStarted ?? "—"],
                    ["En progreso", report?.totals.inProgress ?? "—"],
                    ["Finalizados", report?.totals.finished ?? "—"],
                    [
                      "% finalización",
                      report ? `${report.totals.completionRate}%` : "—",
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      className="rounded-xl border border-border bg-white p-2.5">
                      <div className="text-xs text-muted">{label}</div>
                      <div className="text-lg font-extrabold">{value}</div>
                    </div>
                  ))}
                </div>

                {/* Top áreas */}
                <div className="grid gap-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <b>Top áreas (Top #1)</b>
                    <p className="m-0 text-xs text-muted">
                      Base: {report?.totals.finished ?? 0} finalizados
                    </p>
                    <span className="text-xs text-muted">Top 5</span>
                  </div>

                  {report?.topAreas?.top5?.length ? (
                    <div className="grid gap-2">
                      {(() => {
                        const max = Math.max(
                          ...report.topAreas.top5.map((x) => x.count),
                          1
                        );
                        return report.topAreas.top5.map((x) => {
                          const pct = Math.round((x.count / max) * 100);
                          return (
                            <div key={x.area} className="grid gap-1.5">
                              <div className="flex justify-between gap-3">
                                <span className="font-semibold">{x.area}</span>
                                <span className="text-[#444]">
                                  <b>{x.count}</b>
                                </span>
                              </div>
                              <div className="h-2.5 overflow-hidden rounded-full bg-border">
                                <div
                                  className="h-full bg-primary"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <p className="m-0 text-muted">
                      Aún no hay finalizados con resultados.
                    </p>
                  )}
                </div>

                {/* Por curso */}
                <div className="grid gap-2">
                  <b>Por curso</b>

                  {report?.byCourse &&
                  Object.keys(report.byCourse).length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-border">
                      <table className="w-full border-collapse text-sm">
                        <thead className="bg-surface">
                          <tr>
                            <th className="border-b border-border p-2.5 text-left font-semibold">
                              Curso
                            </th>
                            {[
                              "Inscritos",
                              "No iniciado",
                              "En progreso",
                              "Finalizados",
                            ].map((h) => (
                              <th
                                key={h}
                                className="border-b border-border p-2.5 text-right font-semibold">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(report.byCourse)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([course, v]) => (
                              <tr key={course} className="hover:bg-surface">
                                <td className="border-b border-[rgba(0,0,0,0.06)] p-2.5">
                                  {course}
                                </td>
                                <td className="border-b border-[rgba(0,0,0,0.06)] p-2.5 text-right">
                                  {v.enrolled}
                                </td>
                                <td className="border-b border-[rgba(0,0,0,0.06)] p-2.5 text-right">
                                  {v.notStarted}
                                </td>
                                <td className="border-b border-[rgba(0,0,0,0.06)] p-2.5 text-right">
                                  {v.inProgress}
                                </td>
                                <td className="border-b border-[rgba(0,0,0,0.06)] p-2.5 text-right">
                                  {v.finished}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="m-0 text-muted">Sin información por curso.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Estudiantes */}
        <div className="overflow-hidden rounded-[14px] border border-border bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
            <b>Estudiantes</b>

            <span className="text-sm text-muted">
              {loadingRows ? "Cargando..." : `${filteredRows.length} registros`}
            </span>

            <div className="flex items-center gap-2">
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
                      filename
                    );
                    setImportMsg(null);
                  } catch (e: any) {
                    setImportMsg(`Error: ${e.message}`);
                  }
                }}
                className="btn btn-secondary">
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
                      filename
                    );
                    setImportMsg(null);
                  } catch (e: any) {
                    setImportMsg(`Error: ${e.message}`);
                  }
                }}
                className="btn btn-secondary">
                Descargar PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-surface text-left">
                  {[
                    "Estudiante",
                    "Estado",
                    "Progreso",
                    "Top áreas",
                    "Intento",
                  ].map((h) => (
                    <th
                      key={h}
                      className="border-b border-border p-2.5 font-semibold">
                      {h}
                    </th>
                  ))}
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
                      className="cursor-pointer hover:bg-surface">
                      <td className="border-b border-[rgba(0,0,0,0.06)] p-2.5">
                        <div className="font-semibold">
                          {r.student.name || "Sin nombre"}
                        </div>
                        <div className="text-xs text-muted">
                          {r.student.email || ""}
                        </div>
                      </td>

                      <td className="border-b border-[rgba(0,0,0,0.06)] p-2.5">
                        <span className={badgeClass(kind)}>
                          {r.progressStatus}
                        </span>
                      </td>

                      <td className="border-b border-[rgba(0,0,0,0.06)] p-2.5">
                        {progress}
                      </td>

                      <td className="border-b border-[rgba(0,0,0,0.06)] p-2.5">
                        {topAreas}
                      </td>

                      <td className="border-b border-[rgba(0,0,0,0.06)] p-2.5">
                        {attemptInfo}
                      </td>
                    </tr>
                  );
                })}

                {!loadingRows && filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-3.5 text-muted">
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

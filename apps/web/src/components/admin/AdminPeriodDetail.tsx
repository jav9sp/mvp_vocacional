import { useEffect, useMemo, useState } from "react";
import ImportStudentsModal from "./ImportStudentsModal";

import PeriodHeader from "./period-detail/PeriodHeader";
import PeriodStatusActions from "./period-detail/PeriodStatusActions";
import ExportActions from "./period-detail/ExportActions";
import PeriodKpis from "./period-detail/PeriodKpis";
import StudentsFilters from "./period-detail/StudentsFilters";
import StudentsTable from "./period-detail/StudentsTable";
import StudentsPagination from "./period-detail/StudentsPagination";

import { api } from "../../lib/api";
import { apiZ } from "../../lib/apiZ";
import { requireAuth } from "../../lib/guards";

import {
  StudentsRespSchema,
  SummaryRespSchema,
  type StudentRow,
  type SummaryResp,
} from "../../lib/adminPeriod";

import {
  downloadWithAuth,
  formatDate,
  progressPct,
  safeFileName,
  statusLabel,
  statusPillClass,
  TOTAL_QUESTIONS,
} from "../../utils/utils";

function badgeStatus(status: string) {
  const s = (status || "").toLowerCase();
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";
  if (s === "active") return `${base} bg-emerald-100 text-emerald-800`;
  if (s === "closed") return `${base} bg-slate-100 text-slate-700`;
  if (s === "draft") return `${base} bg-amber-100 text-amber-800`;
  return `${base} bg-slate-100 text-slate-700`;
}

export default function AdminPeriodDetail({ periodId }: { periodId: string }) {
  const pid = Number(periodId);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [summary, setSummary] = useState<SummaryResp | null>(null);

  // students list state
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<
    "" | "not_started" | "in_progress" | "finished"
  >("");

  const [importOpen, setImportOpen] = useState(false);

  const [exporting, setExporting] = useState<null | "csv" | "pdf">(null);

  const [course, setCourse] = useState<string>("");
  const [courses, setCourses] = useState<string[]>([]);

  const [mutating, setMutating] = useState<null | "activate" | "close">(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  useEffect(() => {
    const ok = requireAuth("admin");
    if (!ok) return;
    if (!Number.isFinite(pid)) {
      setErr("ID de periodo inválido");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const s = await apiZ(
          SummaryRespSchema,
          `/admin/periods/${pid}/summary`
        );
        setSummary(s);
      } catch (e: any) {
        setErr(e.message);
      }
    })();
  }, [pid]);

  async function loadStudents(opts?: { resetPage?: boolean }) {
    const nextPage = opts?.resetPage ? 1 : page;

    const params = new URLSearchParams();
    params.set("page", String(nextPage));
    params.set("pageSize", String(pageSize));
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    if (course) params.set("course", course);

    const r = await apiZ(
      StudentsRespSchema,
      `/admin/periods/${pid}/students?${params.toString()}`
    );

    setRows(r.rows || []);
    setTotal(r.total || 0);
    setPage(r.page || nextPage);
    setCourses(r.courses || []);
  }

  useEffect(() => {
    const ok = requireAuth("admin");
    if (!ok) return;
    if (!Number.isFinite(pid)) return;

    setLoading(true);
    setErr(null);

    (async () => {
      try {
        await loadStudents({ resetPage: true });
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  function onApplyFilters() {
    setLoading(true);
    setErr(null);
    loadStudents({ resetPage: true })
      .catch((e: any) => setErr(e.message))
      .finally(() => setLoading(false));
  }

  function goPage(next: number) {
    const clamped = Math.min(Math.max(next, 1), totalPages);
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        // usa estado actual q/status
        const params = new URLSearchParams();
        if (course) params.set("course", course);
        params.set("page", String(clamped));
        params.set("pageSize", String(pageSize));
        if (q.trim()) params.set("q", q.trim());
        if (status) params.set("status", status);

        const r = await apiZ(
          StudentsRespSchema,
          `/admin/periods/${pid}/students?${params.toString()}`
        );
        setRows(r.rows || []);
        setTotal(r.total || 0);
        setPage(r.page || clamped);
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }

  async function setPeriodStatus(next: "active" | "closed") {
    setErr(null);
    setMutating(next === "active" ? "activate" : "close");
    try {
      await api<any>(`/admin/periods/${pid}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });

      apiZ(SummaryRespSchema, `/admin/periods/${pid}/summary`)
        .then(setSummary)
        .catch(() => {});
    } catch (e: any) {
      alert(e.message);
    } finally {
      setMutating(null);
    }
  }

  if (err) {
    return (
      <div className="space-y-3">
        <a
          href="/admin/periods"
          className="text-sm text-slate-600 hover:underline">
          ← Volver a periodos
        </a>
        <div className="card border-red-200">
          <p className="text-sm text-red-600">Error: {err}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <a
        href="/admin/periods"
        className="text-sm text-slate-600 hover:underline">
        ← Volver a periodos
      </a>
      <PeriodHeader
        pid={pid}
        name={summary?.period?.name}
        status={summary?.period?.status}
        startAt={summary?.period?.startAt}
        endAt={summary?.period?.endAt}
        createdAt={summary?.period?.createdAt}
        badgeStatus={badgeStatus}
        formatDate={formatDate}
      />

      <PeriodStatusActions
        status={summary?.period?.status}
        mutating={mutating}
        onActivate={() => setPeriodStatus("active")}
        onClose={() => setPeriodStatus("closed")}
      />

      <ExportActions
        onOpenImport={() => setImportOpen(true)}
        exporting={exporting}
        onExportCsv={async () => {
          try {
            setExporting("csv");
            const base = import.meta.env.PUBLIC_API_BASE;
            const periodName = summary?.period?.name ?? `periodo-${pid}`;
            await downloadWithAuth(
              `${base}/admin/periods/${pid}/export.csv`,
              `reporte-${safeFileName(periodName)}.csv`
            );
          } catch (e: any) {
            alert(`No se pudo exportar CSV: ${e.message}`);
          } finally {
            setExporting(null);
          }
        }}
        onExportPdf={async () => {
          try {
            setExporting("pdf");
            const base = import.meta.env.PUBLIC_API_BASE;
            const periodName = summary?.period?.name ?? `periodo-${pid}`;
            await downloadWithAuth(
              `${base}/admin/periods/${pid}/report.pdf`,
              `reporte-${safeFileName(periodName)}.pdf`
            );
          } catch (e: any) {
            alert(`No se pudo exportar PDF: ${e.message}`);
          } finally {
            setExporting(null);
          }
        }}
      />

      <PeriodKpis
        studentsCount={summary?.counts.studentsCount}
        startedCount={summary?.counts.startedCount}
        finishedCount={summary?.counts.finishedCount}
        completionPct={summary?.counts.completionPct}
      />

      <StudentsFilters
        total={total}
        loading={loading}
        q={q}
        setQ={setQ}
        status={status}
        setStatus={setStatus}
        course={course}
        courses={courses}
        onCourseChange={(v) => {
          setCourse(v);
        }}
        onApply={onApplyFilters}
      />

      <section className="card">
        <StudentsTable
          rows={rows}
          loading={loading}
          totalQuestions={TOTAL_QUESTIONS}
          statusLabel={statusLabel}
          statusPillClass={statusPillClass}
          progressPct={progressPct}
        />

        <StudentsPagination
          page={page}
          totalPages={totalPages}
          loading={loading}
          onPrev={() => goPage(page - 1)}
          onNext={() => goPage(page + 1)}
        />
      </section>
      <ImportStudentsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        periodId={pid}
        onImported={() => {
          // refrescar summary + tabla
          // (usa tus funciones existentes)
          loadStudents({ resetPage: true }).catch(() => {});
          api<SummaryResp>(`/admin/periods/${pid}/summary`)
            .then(setSummary)
            .catch(() => {});
        }}
      />
    </div>
  );
}

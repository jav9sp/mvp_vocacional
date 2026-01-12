import { useEffect, useState } from "react";
import StudentTestCard from "./StudentTestCard.tsx";
import { requireAuth } from "../../lib/guards.ts";
import { apiZ } from "../../lib/apiZ.ts";
import {
  StudentMyTestsRespSchema,
  type StudentEnrollmentItem,
} from "../../lib/schemas/student.schemas.ts";

export default function MyTests() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<StudentEnrollmentItem[]>([]);

  useEffect(() => {
    const ok = requireAuth("student");
    if (!ok) return;

    (async () => {
      try {
        const resp = await apiZ(
          "/enrollments/active",
          StudentMyTestsRespSchema
        );
        setRows(resp.items ?? []);
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      {loading && (
        <div className="card">
          <p className="text-sm text-muted">Cargando…</p>
        </div>
      )}

      {!loading && err && (
        <div className="card border-red-200">
          <p className="text-sm text-red-700">Error: {err}</p>
        </div>
      )}

      {!loading && !err && (
        <div className="grid gap-3">
          <div className="card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold">Tus periodos activos</h2>
                <p className="mt-1 text-sm text-muted">
                  Aquí verás tus inscripciones (enrollments) y el estado de cada
                  test.
                </p>
              </div>
              <div className="text-xs text-muted">
                {rows.length} {rows.length === 1 ? "item" : "items"}
              </div>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="card">
              <p className="text-sm text-muted">
                No tienes tests activos por ahora. Si crees que es un error,
                contacta a tu institución.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {rows.map((r) => (
                <StudentTestCard key={r.enrollmentId} item={r} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

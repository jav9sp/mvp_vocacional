import { useEffect, useState } from "react";
import { requireAuth } from "../../lib/guards";
import { api } from "../../lib/api";

type Resp = {
  ok: boolean;
  attempt: {
    id: number;
    status: string;
    answeredCount: number;
    finishedAt: string | null;
    periodId: number;
  };
};

export default function StartEnrollment({
  enrollmentId,
}: {
  enrollmentId: string;
}) {
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ok = requireAuth("student");
    if (!ok) return;

    const idNum = Number(enrollmentId);
    if (!Number.isFinite(idNum)) {
      setErr("Enrollment inválido.");
      return;
    }

    (async () => {
      try {
        const r = await api<Resp>(`/enrollments/${idNum}/attempt`, {
          method: "GET",
        });
        const attemptId = r.attempt?.id;

        if (!attemptId) throw new Error("Respuesta inválida: falta attemptId");

        window.location.href = `/student/attempts/${attemptId}/wizard`;
      } catch (e: any) {
        setErr(e.message);
      }
    })();
  }, [enrollmentId]);

  if (err) {
    return (
      <div className="space-y-3">
        <a
          className="text-sm text-slate-600 hover:underline"
          href="/student/tests">
          ← Volver a Mis tests
        </a>
        <div className="card border-red-200">
          <div className="text-sm font-bold text-red-700">
            No se pudo iniciar
          </div>
          <div className="mt-1 text-sm text-red-600">{err}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="text-sm font-semibold">Preparando tu test…</div>
      <div className="mt-1 text-xs text-muted">Un momento, por favor.</div>
    </div>
  );
}

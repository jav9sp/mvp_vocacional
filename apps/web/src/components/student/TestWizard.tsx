/*
Nota: por ahora el wizard no hidrata respuestas existentes (porque no tenemos endpoint GET /attempts/:id/answers). Si quieres, lo agregamos en backend y el front se vuelve “continuable” real al recargar.
*/

import { useEffect, useMemo, useRef, useState } from "react";
import { requireAuth } from "../../lib/guards";
import { api } from "../../lib/api";

type Question = {
  id: number; // DB id
  externalId: number; // 1..103
  text: string;
  area: string;
  dim: string[];
  orderIndex: number;
};

type CurrentTestResp = {
  ok: boolean;
  test: any;
  areas: any[];
  attempt: {
    id: number;
    status: "in_progress" | "finished";
    answeredCount: number;
  };
  questions: Question[];
};

type SaveResp = {
  ok: boolean;
  attempt: { id: number; status: string; answeredCount: number };
};

type AttemptAnswersResp = {
  ok: boolean;
  attempt: {
    id: number;
    status: "in_progress" | "finished";
    answeredCount: number;
    testId: number;
  };
  answers: Array<{ questionId: number; value: boolean }>;
};

const LS_KEY = "inapv_test_cache_v1";

type LocalCache = {
  attemptId: number;
  page: number;
  answers: Record<number, boolean>;
  updatedAt: number; // Date.now()
};

function loadCache(): LocalCache | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalCache;
  } catch {
    return null;
  }
}

function saveCache(cache: LocalCache) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cache));
  } catch {
    // storage full / blocked: ignoramos
  }
}

function clearCache() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {}
}

const PAGE_SIZE = 10;
const DEBOUNCE_MS = 1200;
const MAX_BATCH = 10;

export default function TestWizard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [page, setPage] = useState(0);

  // respuestas en memoria: questionId -> boolean
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  // cola de cambios pendientes
  const pendingRef = useRef<Map<number, boolean>>(new Map());
  const saveTimer = useRef<number | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const pendingCount = pendingRef.current.size;

  const [restored, setRestored] = useState(false);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  useEffect(() => {
    if (!attemptId) return;
    // guardamos cache “suave”
    saveCache({
      attemptId,
      page,
      answers,
      updatedAt: Date.now(),
    });
  }, [attemptId, page, answers]);

  const [checkingFinished, setCheckingFinished] = useState(true);
  const [finishing, setFinishing] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      // intenta drenar cola
      flushSave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const onlineRef = useRef(true);
  useEffect(() => {
    onlineRef.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    let alive = true;

    api<{ status: string }>("/me/result")
      .then((r) => {
        if (!alive) return;
        if (r.status === "finished") {
          clearCache();
          window.location.href = "/student/result";
          return;
        }
      })
      .catch(() => {
        // si falla, no bloqueamos al estudiante
      })
      .finally(() => {
        if (!alive) return;
        setCheckingFinished(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const auth = requireAuth("student");
    if (!auth) return;
    if (checkingFinished) return;

    (async () => {
      try {
        const data = await api<CurrentTestResp>("/test/current");
        if (data.attempt.status === "finished") {
          window.location.href = "/student/result";
          return;
        }
        setAttemptId(data.attempt.id);
        setQuestions(data.questions);

        const cached = loadCache();
        const cachedForThisAttempt =
          cached && cached.attemptId === data.attempt.id ? cached : null;

        if (cachedForThisAttempt) setRestored(true);

        const existing = await api<AttemptAnswersResp>(
          `/attempts/${data.attempt.id}/answers`
        );

        const initialFromServer: Record<number, boolean> = {};
        for (const a of existing.answers)
          initialFromServer[a.questionId] = a.value;

        // merge: server gana si ya tiene respuesta para ese qid
        const merged: Record<number, boolean> = cachedForThisAttempt
          ? { ...cachedForThisAttempt.answers, ...initialFromServer }
          : initialFromServer;

        setAnswers(merged);

        const answered = Object.keys(merged).length;

        const computedNextPage = Math.min(
          Math.floor(answered / PAGE_SIZE),
          Math.ceil(data.questions.length / PAGE_SIZE) - 1
        );

        const nextPage = cachedForThisAttempt
          ? Math.min(
              cachedForThisAttempt.page,
              Math.ceil(data.questions.length / PAGE_SIZE) - 1
            )
          : computedNextPage;

        setPage(nextPage);

        setLoading(false);
      } catch (e: any) {
        setErr(e.message);
        setLoading(false);
      }
    })();
  }, [checkingFinished]);

  function scheduleSave() {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(flushSave, DEBOUNCE_MS);
  }

  async function flushSave() {
    if (!isOnline) {
      // dejamos los pending tal cual, se sincronizan cuando vuelva internet
      setSaveState("idle");
      return;
    }

    if (!onlineRef.current) return;

    if (!attemptId) return;
    const pending = pendingRef.current;
    if (pending.size === 0) return;

    // batch de MAX_BATCH
    const batchEntries = Array.from(pending.entries()).slice(0, MAX_BATCH);
    batchEntries.forEach(([qid]) => pending.delete(qid));

    setSaveState("saving");
    try {
      await api<SaveResp>(`/attempts/${attemptId}/answers`, {
        method: "PUT",
        body: JSON.stringify({
          answers: batchEntries.map(([questionId, value]) => ({
            questionId,
            value,
          })),
          answeredCount: Object.keys(answers).length, // cache (aprox)
        }),
      });

      setSaveState("saved");

      // si quedó cola, sigue drenando rápido
      if (pending.size > 0) {
        saveTimer.current = window.setTimeout(flushSave, 150);
      }
    } catch {
      setSaveState("error");
      // reintento suave
      saveTimer.current = window.setTimeout(flushSave, 2000);
    }
  }

  function setAnswer(questionId: number, value: boolean) {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: value };
      return next;
    });
    pendingRef.current.set(questionId, value);
    setSaveState("idle");
    scheduleSave();
  }

  const totalPages = Math.ceil(questions.length / PAGE_SIZE);
  const pageQuestions = questions.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  );

  const canGoNext = useMemo(() => {
    if (pageQuestions.length === 0) return false;
    return pageQuestions.every((q) => answers[q.id] !== undefined);
  }, [pageQuestions, answers]);

  const isLastPage = page === totalPages - 1;

  async function onFinish() {
    if (!attemptId || finishing) return;
    setFinishing(true);

    await flushSave();

    try {
      const resp = await api<any>(`/attempts/${attemptId}/finish`, {
        method: "POST",
      });
      if (resp.ok) {
        clearCache();
        setConfirmOpen(false);
        window.location.href = "/student/result";
      }
    } catch (e: any) {
      alert(`No se pudo finalizar: ${e.message}`);
    } finally {
      setFinishing(false);
    }
  }

  const totalQuestions = questions.length || 103;
  const pct = totalQuestions
    ? Math.round((answeredCount / totalQuestions) * 100)
    : 0;

  if (loading || checkingFinished)
    return <p style={{ margin: 24 }}>Cargando...</p>;
  if (err) return <p style={{ color: "crimson" }}>{err}</p>;

  return (
    <main className="mx-auto max-w-225 px-4 py-6">
      {!isOnline && (
        <div className="mb-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Estás sin conexión. Guardaremos tus respuestas en este dispositivo y
          sincronizaremos cuando vuelva internet.
        </div>
      )}

      {restored && (
        <div className="mb-2.5 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
          Recuperamos tu progreso desde este dispositivo.
        </div>
      )}

      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="m-0 text-2xl font-extrabold tracking-tight">INAP-V</h1>
        </div>
      </header>

      <div className="mb-3 rounded-2xl border border-slate-200 p-3">
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

      <section className="grid gap-3.5">
        {pageQuestions.map((q) => (
          <div key={q.id} className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-baseline gap-2">
              <b>#{q.externalId}</b>
              <span>{q.text}</span>
            </div>

            <div className="mt-2.5 flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`q_${q.id}`}
                  checked={answers[q.id] === true}
                  onChange={() => setAnswer(q.id, true)}
                />
                Sí
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`q_${q.id}`}
                  checked={answers[q.id] === false}
                  onChange={() => setAnswer(q.id, false)}
                />
                No
              </label>
            </div>
          </div>
        ))}
      </section>

      <div className="mt-3 flex items-center justify-between">
        <button
          className="btn btn-secondary"
          onClick={() => setPage((p) => Math.max(p - 1, 0))}
          disabled={page === 0}>
          Atrás
        </button>

        <span className="text-xs text-slate-600">
          Página {page + 1} de {totalPages}
        </span>

        {!isLastPage ? (
          <button
            className="btn btn-primary"
            onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
            disabled={!canGoNext}>
            Siguiente
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={() => setConfirmOpen(true)}
            disabled={!canGoNext || finishing}>
            Finalizar
          </button>
        )}
      </div>

      {answeredCount < 103 && page === totalPages - 1 && (
        <p className="mt-2.5 text-sm text-slate-600">
          Para finalizar debes responder las 103 preguntas.
        </p>
      )}

      {confirmOpen && (
        <div
          onClick={() => !finishing && setConfirmOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-130 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-3.5">
              <b>Confirmar envío</b>
            </div>

            <div className="grid gap-2.5 p-3.5">
              <p className="m-0">
                Estás a punto de <b>finalizar</b> el test y enviar tus
                respuestas.
              </p>

              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs text-slate-600">Progreso</div>
                <div className="text-base font-extrabold">
                  {answeredCount}/{questions.length || 103}
                </div>
              </div>

              <p className="m-0 text-amber-700">
                ⚠️ Al finalizar, no podrás modificar tus respuestas.
              </p>

              {saveState === "saving" && (
                <p className="m-0 text-xs text-slate-600">
                  Guardando cambios antes de finalizar…
                </p>
              )}

              {saveState === "error" && (
                <p className="m-0 text-xs text-red-600">
                  Hay cambios pendientes (reintentando guardado). Si puedes,
                  espera unos segundos.
                </p>
              )}

              <div className="mt-1.5 flex justify-end gap-2.5">
                <button
                  className="btn btn-secondary"
                  onClick={() => setConfirmOpen(false)}
                  disabled={finishing}>
                  Cancelar
                </button>

                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    // aquí sí finalizamos
                    await onFinish();
                  }}
                  disabled={finishing}>
                  {finishing ? "Finalizando..." : "Sí, finalizar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

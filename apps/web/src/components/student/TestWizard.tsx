import { useEffect, useMemo, useRef, useState } from "react";

import WizardProgress from "./wizard/WizardProgress";
import QuestionModal from "./wizard/QuestionModal";
import ConfirmFinishModal from "./wizard/ConfirmFinishModal";

import { requireAuth } from "../../lib/guards";
import { api } from "../../lib/api";

type Question = {
  id: number;
  externalId: number;
  text: string;
  area: string;
  dim: string[];
  orderIndex: number;
};

type AttemptContextResp = {
  ok: boolean;
  test: { id: number; key: string; version: string; name: string };
  period: {
    id: number;
    name: string;
    status: string;
    startAt: string | null;
    endAt: string | null;
  };
  attempt: {
    id: number;
    periodId: number;
    status: "in_progress" | "finished";
    answeredCount: number;
    finishedAt: string | null;
  };
  areas: any[];
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
  index: number;
  answers: Record<number, boolean>;
  updatedAt: number;
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
  } catch {}
}

function clearCache() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {}
}

const DEBOUNCE_MS = 1200;
const MAX_BATCH = 10;

export default function TestWizard({ attemptId }: { attemptId: string }) {
  const attemptIdNum = Number(attemptId);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [attemptIdState, setAttemptIdState] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const pendingRef = useRef<Map<number, boolean>>(new Map());
  const saveTimer = useRef<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);

  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const pendingCount = pendingRef.current.size;

  const [restored, setRestored] = useState(false);
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  const [checkingFinished, setCheckingFinished] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  const onlineRef = useRef(true);
  useEffect(() => {
    onlineRef.current = isOnline;
  }, [isOnline]);

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

  // cache suava
  useEffect(() => {
    if (!attemptIdState) return;
    saveCache({
      attemptId: attemptIdState,
      index: currentIndex,
      answers,
      updatedAt: Date.now(),
    });
  }, [attemptIdState, currentIndex, answers]);

  useEffect(() => {
    if (isOnline) flushSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // si ya tiene resultado global, manda a /student/result
  useEffect(() => {
    let alive = true;

    api<{ status: string }>("/me/result")
      .then((r) => {
        if (!alive) return;
        if (r.status === "finished") {
          clearCache();
          window.location.href = "/student/result";
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!alive) return;
        setCheckingFinished(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  // carga contexto del attempt
  useEffect(() => {
    const auth = requireAuth("student");
    if (!auth) return;
    if (checkingFinished) return;

    if (!Number.isFinite(attemptIdNum)) {
      setErr("AttemptId inválido");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const ctx = await api<AttemptContextResp>(`/attempts/${attemptIdNum}`);

        if (ctx.attempt.status === "finished") {
          clearCache();
          window.location.href = "/student/result";
          return;
        }

        setAttemptIdState(ctx.attempt.id);
        setQuestions(ctx.questions);

        const cached = loadCache();
        const cachedForThisAttempt =
          cached && cached.attemptId === ctx.attempt.id ? cached : null;

        if (cachedForThisAttempt) setRestored(true);

        const existing = await api<AttemptAnswersResp>(
          `/attempts/${ctx.attempt.id}/answers`
        );

        const initialFromServer: Record<number, boolean> = {};
        for (const a of existing.answers)
          initialFromServer[a.questionId] = a.value;

        const merged: Record<number, boolean> = cachedForThisAttempt
          ? { ...cachedForThisAttempt.answers, ...initialFromServer }
          : initialFromServer;

        setAnswers(merged);

        const nextIndex = cachedForThisAttempt
          ? Math.min(cachedForThisAttempt.index ?? 0, ctx.questions.length - 1)
          : Math.min(Object.keys(merged).length, ctx.questions.length - 1);

        setCurrentIndex(nextIndex);
        setLoading(false);
      } catch (e: any) {
        setErr(e.message);
        setLoading(false);
      }
    })();
  }, [checkingFinished, attemptIdNum]);

  function scheduleSave() {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(flushSave, DEBOUNCE_MS);
  }

  async function flushSave() {
    if (!isOnline) {
      setSaveState("idle");
      return;
    }
    if (!onlineRef.current) return;
    if (!attemptIdState) return;

    const pending = pendingRef.current;
    if (pending.size === 0) return;

    const batchEntries = Array.from(pending.entries()).slice(0, MAX_BATCH);
    batchEntries.forEach(([qid]) => pending.delete(qid));

    setSaveState("saving");
    try {
      await api<SaveResp>(`/attempts/${attemptIdState}/answers`, {
        method: "PUT",
        body: JSON.stringify({
          answers: batchEntries.map(([questionId, value]) => ({
            questionId,
            value,
          })),
          answeredCount: Object.keys(answers).length,
        }),
      });

      setSaveState("saved");

      if (pending.size > 0) {
        saveTimer.current = window.setTimeout(flushSave, 150);
      }
    } catch {
      setSaveState("error");
      saveTimer.current = window.setTimeout(flushSave, 2000);
    }
  }

  function answerAndMaybeAdvance(questionId: number, value: boolean) {
    // actualizar answers
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: value };

      const allAnswered =
        questions.length > 0 &&
        questions.every((q) => next[q.id] !== undefined);

      // si ya están todas, podrías abrir confirm inmediatamente
      // pero solo si el modal está en la última pregunta o si quieres permitirlo siempre:
      if (allAnswered) {
        // opcional: si quieres abrir confirm apenas complete la última respuesta:
        // setConfirmOpen(true);
      }

      return next;
    });

    pendingRef.current.set(questionId, value);
    setSaveState("idle");
    scheduleSave();

    // avanzar índice (y si queda fuera, clamp)
    setCurrentIndex((idx) =>
      Math.min(idx + 1, Math.max(0, questions.length - 1))
    );
  }

  const canFinish = useMemo(() => {
    if (!questions.length) return false;
    return questions.every((q) => answers[q.id] !== undefined);
  }, [questions, answers]);

  async function onFinish() {
    if (!attemptIdState || finishing) return;
    setFinishing(true);

    await flushSave();

    try {
      const resp = await api<any>(`/attempts/${attemptIdState}/finish`, {
        method: "POST",
      });

      if (resp.ok) {
        clearCache();
        setConfirmOpen(false);
        window.location.href = `/student/attempts/${attemptIdState}/result`;
      }
    } catch (e: any) {
      alert(`No se pudo finalizar: ${e.message}`);
    } finally {
      setFinishing(false);
    }
  }

  function isAnswered(qid: number) {
    return answers[qid] !== undefined;
  }

  const totalQuestions = questions.length || 103;
  const pct = totalQuestions
    ? Math.round((answeredCount / totalQuestions) * 100)
    : 0;

  const currentQ = questions[currentIndex] || null;

  if (loading || checkingFinished) return <p className="p-6">Cargando...</p>;
  if (err) return <p className="p-6 text-red-600">{err}</p>;

  return (
    <main className="mx-auto max-w-225 px-4 py-6">
      <WizardProgress
        isOnline={isOnline}
        restored={restored}
        answeredCount={answeredCount}
        totalQuestions={totalQuestions}
        pct={pct}
        pendingCount={pendingCount}
        saveState={saveState}
      />

      {/* Barra de acciones */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted">
          {answeredCount}/{questions.length} respondidas
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setModalOpen(true)}
            disabled={!questions.length}>
            {modalOpen ? "Respondiendo…" : "Continuar"}
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setConfirmOpen(true)}
            disabled={!canFinish || finishing}>
            Finalizar
          </button>
        </div>
      </div>

      {/* GRID de preguntas */}
      <section className="mt-4">
        <div className="mb-2 text-sm font-bold">Preguntas</div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {questions.map((q, idx) => {
            const answered = isAnswered(q.id);
            const val = answers[q.id];

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  setCurrentIndex(idx);
                  setModalOpen(true);
                }}
                className={[
                  "relative text-left rounded-2xl border border-border bg-white p-3 hover:bg-slate-50",
                  idx === currentIndex ? "ring-2 ring-slate-900/10" : "",
                ].join(" ")}>
                {/* Check */}
                {answered && (
                  <span className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    ✓
                  </span>
                )}

                <div className="flex items-start gap-2">
                  <div className="rounded-xl border border-border bg-slate-50 px-2 py-0.5 text-xs font-bold">
                    #{q.externalId}
                  </div>

                  <div className="line-clamp-2 text-sm font-semibold">
                    {q.text}
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-muted">
                  <span>{answered ? "Respondida" : "Pendiente"}</span>

                  {answered && (
                    <span className="font-semibold text-slate-700">
                      {val === true ? "Sí" : "No"}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Modal de pregunta */}
      <QuestionModal
        open={modalOpen && !confirmOpen}
        q={currentQ}
        value={currentQ ? answers[currentQ.id] : undefined}
        index={currentIndex}
        total={questions.length}
        disabled={finishing}
        onPrev={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
        onClose={() => setModalOpen(false)}
        onAnswer={(val) => {
          if (!currentQ) return;

          const wasLast = currentIndex >= questions.length - 1;

          answerAndMaybeAdvance(currentQ.id, val);

          if (wasLast) {
            // calcula si ahora están todas respondidas (incluye la actual)
            const allAnswered = questions.every((q) => {
              const v = q.id === currentQ.id ? val : answers[q.id];
              return v !== undefined;
            });
            if (allAnswered) setConfirmOpen(true);
          }

          setModalOpen(true);
        }}
      />

      <ConfirmFinishModal
        open={confirmOpen}
        finishing={finishing}
        answeredCount={answeredCount}
        total={totalQuestions}
        saveState={saveState}
        onClose={() => setConfirmOpen(false)}
        onConfirm={onFinish}
      />
    </main>
  );
}

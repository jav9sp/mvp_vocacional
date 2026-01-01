/*
Nota: por ahora el wizard no hidrata respuestas existentes (porque no tenemos endpoint GET /attempts/:id/answers). Si quieres, lo agregamos en backend y el front se vuelve “continuable” real al recargar.
*/

import { useEffect, useMemo, useRef, useState } from "react";

import WizardProgress from "./wizard/WizardProgress";
import QuestionCard from "./wizard/QuestionCard";
import WizardNav from "./wizard/WizardNav";
import ConfirmFinishModal from "./wizard/ConfirmFinishModal";

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
      <WizardProgress
        isOnline={isOnline}
        restored={restored}
        answeredCount={answeredCount}
        totalQuestions={totalQuestions}
        pct={pct}
        pendingCount={pendingCount}
        saveState={saveState}
      />

      <section className="mt-3 grid gap-3.5">
        {pageQuestions.map((q) => (
          <QuestionCard
            key={q.id}
            q={q}
            value={answers[q.id]}
            onChange={(val) => setAnswer(q.id, val)}
          />
        ))}
      </section>

      <WizardNav
        page={page}
        totalPages={totalPages}
        isLastPage={isLastPage}
        canGoNext={canGoNext}
        finishing={finishing}
        onPrev={() => setPage((p) => Math.max(p - 1, 0))}
        onNext={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
        onOpenFinish={() => setConfirmOpen(true)}
      />

      <ConfirmFinishModal
        open={confirmOpen}
        finishing={finishing}
        answeredCount={answeredCount}
        total={answeredCount}
        saveState={saveState}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => onFinish()}
      />
    </main>
  );
}

/*
Nota: por ahora el wizard no hidrata respuestas existentes (porque no tenemos endpoint GET /attempts/:id/answers). Si quieres, lo agregamos en backend y el front se vuelve “continuable” real al recargar.
*/

import { useEffect, useMemo, useRef, useState } from "react";
import { requireAuth } from "../../lib/guards";
import { api } from "../../lib/api";

import LogoutButton from "../common/LogoutButton";

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

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  useEffect(() => {
    const auth = requireAuth("student");
    if (!auth) return;

    (async () => {
      try {
        const data = await api<CurrentTestResp>("/test/current");
        if (data.attempt.status === "finished") {
          window.location.href = "/student/result";
          return;
        }
        setAttemptId(data.attempt.id);
        setQuestions(data.questions);

        const existing = await api<AttemptAnswersResp>(
          `/attempts/${data.attempt.id}/answers`
        );

        const initial: Record<number, boolean> = {};
        for (const a of existing.answers) initial[a.questionId] = a.value;

        setAnswers(initial);

        const answered = Object.keys(initial).length;
        const nextPage = Math.min(
          Math.floor(answered / PAGE_SIZE),
          Math.ceil(data.questions.length / PAGE_SIZE) - 1
        );
        setPage(nextPage);

        setLoading(false);
      } catch (e: any) {
        setErr(e.message);
        setLoading(false);
      }
    })();
  }, []);

  function scheduleSave() {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(flushSave, DEBOUNCE_MS);
  }

  async function flushSave() {
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

  async function onFinish() {
    if (!attemptId) return;

    // flush final (mejor esfuerzo)
    await flushSave();

    try {
      const resp = await api<any>(`/attempts/${attemptId}/finish`, {
        method: "POST",
      });
      if (resp.ok) window.location.href = "/student/result";
    } catch (e: any) {
      alert(`No se pudo finalizar: ${e.message}`);
    }
  }

  if (loading) return <p style={{ margin: 24 }}>Cargando...</p>;
  if (err) return <p style={{ color: "crimson" }}>{err}</p>;

  return (
    <main style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}>
        <div>
          <h1 style={{ margin: 0 }}>INAP-V</h1>
          <p style={{ margin: "8px 0" }}>
            Progreso: <b>{answeredCount}</b>/103 · Página {page + 1}/
            {totalPages}
          </p>
        </div>
        <small>
          {saveState === "saving" && "Guardando..."}
          {saveState === "saved" && "Guardado ✓"}
          {saveState === "error" && "Error al guardar (reintentando)"}
        </small>
        <LogoutButton />
      </header>

      <div
        style={{
          height: 8,
          background: "#eee",
          borderRadius: 999,
          overflow: "hidden",
          margin: "12px 0 20px",
        }}>
        <div
          style={{
            width: `${(answeredCount / 103) * 100}%`,
            height: "100%",
            background: "#222",
          }}
        />
      </div>

      <section style={{ display: "grid", gap: 14 }}>
        {pageQuestions.map((q) => (
          <div
            key={q.id}
            style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <b>#{q.externalId}</b>
              <span>{q.text}</span>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="radio"
                  name={`q_${q.id}`}
                  checked={answers[q.id] === true}
                  onChange={() => setAnswer(q.id, true)}
                />
                Sí
              </label>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
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

      <footer
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 18,
        }}>
        <button
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}>
          Atrás
        </button>

        {page < totalPages - 1 ? (
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
            Siguiente
          </button>
        ) : (
          <button disabled={answeredCount < 103} onClick={onFinish}>
            Finalizar
          </button>
        )}
      </footer>

      {answeredCount < 103 && page === totalPages - 1 && (
        <p style={{ color: "#666", marginTop: 10 }}>
          Para finalizar debes responder las 103 preguntas.
        </p>
      )}
    </main>
  );
}

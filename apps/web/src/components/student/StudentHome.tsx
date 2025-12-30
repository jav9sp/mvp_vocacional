import { useEffect, useState } from "react";
import { requireAuth } from "../../lib/guards";
import { api } from "../../lib/api";

import LogoutButton from "../common/LogoutButton";

type CurrentTestResp = {
  ok: boolean;
  attempt: {
    id: number;
    status: "in_progress" | "finished";
    answeredCount: number;
  };
  questions: any[];
  areas: any[];
  test: any;
};

export default function StudentHome() {
  const [state, setState] = useState<CurrentTestResp | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const auth = requireAuth("student");
    if (!auth) return;

    api<CurrentTestResp>("/test/current")
      .then(setState)
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <p style={{ color: "crimson" }}>{err}</p>;
  if (!state) return <p>Cargando...</p>;

  return (
    <main style={{ maxWidth: 720, margin: "40px auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
        <h1>Tu test vocacional</h1>
        <LogoutButton />
      </div>
      <h1>Tu test vocacional</h1>
      <p>Progreso: {state.attempt.answeredCount}/103</p>

      {state.attempt.status === "finished" ? (
        <a href="/student/result">Ver resultado</a>
      ) : (
        <a href="/student/test">Continuar test</a>
      )}
    </main>
  );
}

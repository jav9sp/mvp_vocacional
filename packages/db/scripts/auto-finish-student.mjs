const API_BASE = process.env.API_BASE || "http://localhost:4000";

// Cambia si quieres otro alumno
const EMAIL = process.env.STUDENT_EMAIL || "student1@demo.cl";
const PASSWORD = process.env.STUDENT_PASSWORD || "Student123!";

// Estrategia de respuestas: random o patrón
// "random": sí/no aleatorio
// "yes": todo sí
// "no": todo no
const STRATEGY = process.env.STRATEGY || "random";

// batch size para autosave
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 25);

function pickAnswer() {
  if (STRATEGY === "yes") return true;
  if (STRATEGY === "no") return false;
  // random
  return Math.random() < 0.5;
}

async function httpJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${res.statusText}`);
    err.details = data;
    throw err;
  }
  return data;
}

async function main() {
  console.log("1) Login:", EMAIL);

  const login = await httpJson(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  const token = login.token;
  if (!token) throw new Error("No token returned from /auth/login");

  const authHeaders = { Authorization: `Bearer ${token}` };

  console.log("2) Get current test + attempt");
  const current = await httpJson(`${API_BASE}/test/current`, {
    headers: authHeaders,
  });

  const attemptId = current?.attempt?.id;
  const questions = current?.questions || [];

  if (!attemptId) throw new Error("No attempt.id returned from /test/current");
  if (!Array.isArray(questions) || questions.length === 0)
    throw new Error("No questions returned from /test/current");

  console.log(`   Attempt: ${attemptId} | Questions: ${questions.length}`);

  console.log("3) Save answers in batches");
  // Construir answers para todas las preguntas (usa question.id DB)
  const allAnswers = questions.map((q) => ({
    questionId: q.id,
    value: pickAnswer(),
  }));

  // Enviar en batches
  let sent = 0;
  for (let i = 0; i < allAnswers.length; i += BATCH_SIZE) {
    const batch = allAnswers.slice(i, i + BATCH_SIZE);
    sent += batch.length;

    await httpJson(`${API_BASE}/attempts/${attemptId}/answers`, {
      method: "PUT",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        answers: batch,
        answeredCount: sent, // cache, sin COUNT
      }),
    });

    process.stdout.write(`   - saved ${sent}/${allAnswers.length}\r`);
  }
  process.stdout.write("\n");

  console.log("4) Finish attempt");
  const finished = await httpJson(`${API_BASE}/attempts/${attemptId}/finish`, {
    method: "POST",
    headers: authHeaders,
  });

  console.log("✅ Finished. Top areas:", finished?.result?.topAreas);

  // Pretty print scores (ordenadas)
  const scoresByAreaDim = finished?.result?.scoresByAreaDim || {};
  const rows = Object.entries(scoresByAreaDim)
    .map(([area, v]) => ({ area, ...v }))
    .sort((a, b) => b.total - a.total);

  console.log("Scores (area, interes, aptitud, total):");
  for (const r of rows) {
    console.log(
      `- ${r.area}: interes=${r.interes} aptitud=${r.aptitud} total=${r.total}`
    );
  }
}

main().catch((e) => {
  console.error("❌ Script failed:", e.message);
  if (e.details) console.error("Details:", JSON.stringify(e.details, null, 2));
  process.exit(1);
});

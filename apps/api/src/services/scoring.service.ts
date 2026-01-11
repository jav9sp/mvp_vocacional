type ScoresByArea = Record<string, number>;
type ScoresByAreaDim = Record<
  string,
  { interes: number; aptitud: number; total: number }
>;

export function computeInapvScores(args: {
  // questionId -> { area, dim[] }
  questionsById: Map<number, { area: string; dim: string[] }>;
  // list of answers with questionId + value
  answers: Array<{ questionId: number; value: boolean }>;
}) {
  const { questionsById, answers } = args;

  const scoresByArea: ScoresByArea = {};
  const scoresByAreaDim: ScoresByAreaDim = {};

  const ensureArea = (area: string) => {
    if (scoresByArea[area] == null) scoresByArea[area] = 0;
    if (!scoresByAreaDim[area]) {
      scoresByAreaDim[area] = { interes: 0, aptitud: 0, total: 0 };
    }
  };

  for (const a of answers) {
    if (!a.value) continue; // NO suma

    const q = questionsById.get(a.questionId);
    if (!q) continue; // por seguridad, no debería pasar

    ensureArea(q.area);

    scoresByArea[q.area] += 1;

    const dims = q.dim;
    if (dims.includes("interes")) scoresByAreaDim[q.area].interes += 1;
    if (dims.includes("aptitud")) scoresByAreaDim[q.area].aptitud += 1;

    scoresByAreaDim[q.area].total =
      scoresByAreaDim[q.area].interes + scoresByAreaDim[q.area].aptitud;
  }

  // Asegura que total exista aunque no haya dims (por si acaso)
  for (const area of Object.keys(scoresByArea)) {
    ensureArea(area);
    scoresByAreaDim[area].total =
      scoresByAreaDim[area].interes + scoresByAreaDim[area].aptitud;
  }

  // Top 3 con desempate estable:
  // 1) total desc
  // 2) interes desc
  // 3) aptitud desc
  // 4) areaKey asc
  const topAreas = Object.keys(scoresByAreaDim)
    .sort((a, b) => {
      const A = scoresByAreaDim[a];
      const B = scoresByAreaDim[b];

      if (B.total !== A.total) return B.total - A.total;
      if (B.interes !== A.interes) return B.interes - A.interes;
      if (B.aptitud !== A.aptitud) return B.aptitud - A.aptitud;
      return a.localeCompare(b);
    })
    .slice(0, 3);

  return { scoresByArea, scoresByAreaDim, topAreas };
}

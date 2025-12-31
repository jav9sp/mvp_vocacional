import type { PeriodReport } from "../services/period-report.service.js";

function esc(s: any) {
  return (s ?? "")
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderPeriodReportHtml(data: PeriodReport) {
  const { period, totals, byCourse, topAreas } = data;

  const topBars = topAreas.top5.length
    ? (() => {
        const max = Math.max(...topAreas.top5.map((x) => x.count), 1);
        return topAreas.top5
          .map((x) => {
            const pct = Math.round((x.count / max) * 100);
            return `
              <div class="bar-row">
                <div class="bar-head">
                  <div class="bar-label">${esc(x.area)}</div>
                  <div class="bar-value">${esc(x.count)}</div>
                </div>
                <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
              </div>
            `;
          })
          .join("");
      })()
    : `<div class="muted">Aún no hay finalizados con resultados.</div>`;

  const courseRows = Object.entries(byCourse)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([course, v]) => `
      <tr>
        <td>${esc(course)}</td>
        <td class="r">${v.enrolled}</td>
        <td class="r">${v.notStarted}</td>
        <td class="r">${v.inProgress}</td>
        <td class="r"><b>${v.finished}</b></td>
      </tr>
    `
    )
    .join("");

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, Helvetica, sans-serif; margin: 32px; color: #111; }
    h1 { margin: 0 0 4px; font-size: 22px; }
    .muted { color: #666; }
    .grid { display: grid; gap: 12px; }
    .kpis { display: grid; gap: 10px; grid-template-columns: repeat(5, minmax(0, 1fr)); }
    .card { border: 1px solid #eaeaea; border-radius: 12px; padding: 12px; }
    .label { font-size: 11px; color: #666; margin-bottom: 6px; }
    .value { font-weight: 800; font-size: 18px; }
    .row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
    .section-title { font-weight: 800; margin: 0 0 8px; }
    .bar-row { display: grid; gap: 6px; margin-bottom: 10px; }
    .bar-head { display: flex; justify-content: space-between; gap: 12px; }
    .bar-track { height: 10px; background: #eee; border-radius: 999px; overflow: hidden; }
    .bar-fill { height: 100%; background: #111; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px; border-bottom: 1px solid #f0f0f0; font-size: 12px; }
    th { text-align: left; background: #fafafa; border-bottom: 1px solid #eaeaea; }
    .r { text-align: right; }
    .footer { margin-top: 18px; font-size: 11px; color: #666; }
  </style>
</head>
<body>
  <div class="row">
    <div>
      <h1>Reporte de Periodo</h1>
      <div class="muted">${esc(period.name)} · Estado: ${esc(
    period.status
  )} · TestID: ${period.testId}</div>
    </div>
    <div class="muted">Generado: ${new Date().toLocaleString("es-CL")}</div>
  </div>

  <div class="grid" style="margin-top:16px;">
    <div class="kpis">
      <div class="card"><div class="label">Inscritos</div><div class="value">${
        totals.enrolled
      }</div></div>
      <div class="card"><div class="label">No iniciado</div><div class="value">${
        totals.notStarted
      }</div></div>
      <div class="card"><div class="label">En progreso</div><div class="value">${
        totals.inProgress
      }</div></div>
      <div class="card"><div class="label">Finalizados</div><div class="value">${
        totals.finished
      }</div></div>
      <div class="card"><div class="label">% finalización</div><div class="value">${
        totals.completionRate
      }%</div></div>
    </div>

    <div class="card">
      <div class="row">
        <div class="section-title">Top áreas (Top #1)</div>
        <div class="muted">Base: ${totals.finished} finalizados</div>
      </div>
      <div style="margin-top:10px;">${topBars}</div>
    </div>

    <div class="card">
      <div class="section-title">Resumen por curso</div>
      <table>
        <thead>
          <tr>
            <th>Curso</th>
            <th class="r">Inscritos</th>
            <th class="r">No iniciado</th>
            <th class="r">En progreso</th>
            <th class="r">Finalizados</th>
          </tr>
        </thead>
        <tbody>
          ${
            courseRows ||
            `<tr><td colspan="5" class="muted">Sin cursos</td></tr>`
          }
        </tbody>
      </table>
    </div>
  </div>

  <div class="footer">
    Este PDF es un reporte resumen. Para detalle por estudiante usar el panel Admin.
  </div>
</body>
</html>`;
}

// src/ui/charts.js
// Lot 5 — Graphiques Chart.js : amortissement du crédit + trésorerie projetée.
import Chart from 'chart.js/auto';

// Conserve les instances pour pouvoir détruire un chart avant de le recréer
// (sinon Chart.js conserve un canvas attaché et plante au re-render).
const instances = new WeakMap();

function destroyIfAny(canvas) {
  const prev = instances.get(canvas);
  if (prev) prev.destroy();
}

/**
 * Graphique d'amortissement : capital restant dû par année, capital remboursé
 * cumulé et intérêts cumulés.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Array<{mois,interets,capitalRembourse,capitalRestant}>} amortMensuel
 */
export function renderAmortissementChart(canvas, amortMensuel) {
  destroyIfAny(canvas);
  if (!amortMensuel || amortMensuel.length === 0) return;

  // Agrégation par année (12 mois) — on prend la dernière ligne de chaque année.
  const labels = ['Année 0'];
  const capitalRestant = [amortMensuel[0].capitalRestant + amortMensuel[0].capitalRembourse];
  let interetsCumul = 0;
  let capitalCumul = 0;
  const interetsCumulSerie = [0];
  const capitalCumulSerie = [0];

  for (let an = 1; an <= Math.ceil(amortMensuel.length / 12); an++) {
    const idxFin = Math.min(an * 12, amortMensuel.length) - 1;
    // Cumul jusqu'à cette année
    interetsCumul = 0;
    capitalCumul = 0;
    for (let k = 0; k <= idxFin; k++) {
      interetsCumul += amortMensuel[k].interets;
      capitalCumul += amortMensuel[k].capitalRembourse;
    }
    labels.push(`Année ${an}`);
    capitalRestant.push(amortMensuel[idxFin].capitalRestant);
    interetsCumulSerie.push(interetsCumul);
    capitalCumulSerie.push(capitalCumul);
  }

  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Capital restant dû',
          data: capitalRestant,
          borderColor: 'rgb(79, 70, 229)',     // indigo-600
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          tension: 0.1,
          fill: true
        },
        {
          label: 'Capital remboursé cumulé',
          data: capitalCumulSerie,
          borderColor: 'rgb(34, 197, 94)',     // green-500
          backgroundColor: 'rgba(34, 197, 94, 0.05)',
          tension: 0.1,
          fill: false
        },
        {
          label: 'Intérêts cumulés',
          data: interetsCumulSerie,
          borderColor: 'rgb(239, 68, 68)',     // red-500
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          borderDash: [4, 3],
          tension: 0.1,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label} : ${Math.round(ctx.parsed.y).toLocaleString('fr-FR')} €`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => `${(v / 1000).toFixed(0)} k€` }
        }
      }
    }
  });

  instances.set(canvas, chart);
  return chart;
}

/**
 * Graphique de trésorerie projetée sur 10 ans :
 * - barres = flux annuels (apport année 0, cash-flow années 1-9, cash-flow + revente année 10)
 * - ligne = trésorerie cumulée
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object} tri10ans - sortie de tri10ans()
 * @param {number} apport
 */
export function renderCashflowChart(canvas, tri10ans, apport) {
  destroyIfAny(canvas);
  if (!tri10ans || !tri10ans.fluxAnnuels) return;

  const flux = tri10ans.fluxAnnuels;
  const labels = flux.map((_, k) => `An ${k}`);

  // Trésorerie cumulée (somme courante des flux).
  const cumul = [];
  let acc = 0;
  for (const f of flux) {
    acc += f;
    cumul.push(acc);
  }

  // Couleurs par flux : rouge si négatif, vert si positif.
  const couleurs = flux.map((f) => f >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)');

  const chart = new Chart(canvas, {
    data: {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'Flux annuel',
          data: flux,
          backgroundColor: couleurs,
          borderColor: couleurs.map((c) => c.replace('0.7', '1')),
          borderWidth: 1,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Trésorerie cumulée',
          data: cumul,
          borderColor: 'rgb(79, 70, 229)',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          tension: 0.2,
          yAxisID: 'y'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label} : ${Math.round(ctx.parsed.y).toLocaleString('fr-FR')} €`
          }
        }
      },
      scales: {
        y: {
          ticks: { callback: (v) => `${(v / 1000).toFixed(0)} k€` }
        }
      }
    }
  });

  instances.set(canvas, chart);
  return chart;
}

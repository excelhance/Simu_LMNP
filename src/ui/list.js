// src/ui/list.js
// Écran « Liste des biens ».

import { listBiens, deleteBien } from '../persistence/storage.js';
import { calculerLot1 } from '../core/calcul.js';
import { formatEuros, formatDateFR, formatNombre, couleurScore } from '../utils/format.js';
import { navigate } from '../utils/router.js';

const LIBELLE_TYPE = {
  LD_nue: 'LD nue',
  LD_meublee: 'LD meublée',
  LCD: 'LCD',
  LMD: 'LMD',
  coloc: 'Colocation',
  coloc_meublee: 'Coloc meublée',
  coloc_nue: 'Coloc nue'
};

const LIBELLE_REGIME = {
  'micro-foncier': 'Micro-foncier',
  'reel-foncier': 'Réel foncier',
  'micro-bic-lmnp': 'Micro-BIC LMNP',
  'reel-lmnp': 'Réel LMNP',
  'micro-bic-tourisme-classe': 'Micro-BIC tourisme classé',
  'micro-bic-tourisme-non-classe': 'Micro-BIC tourisme non classé'
};

export function renderList(container) {
  // Pré-calcul du score pour chaque bien, puis tri décroissant.
  // Les biens dont le score n'est pas calculable sont relégués en fin de liste.
  const biensAvecScore = listBiens().map((b) => {
    let score = null;
    try {
      score = calculerLot1(b).scoring.global;
    } catch { /* données partielles */ }
    return { bien: b, score };
  });
  biensAvecScore.sort((a, b) => {
    if (a.score == null && b.score == null) return 0;
    if (a.score == null) return 1;
    if (b.score == null) return -1;
    return b.score - a.score;
  });
  const biens = biensAvecScore.map((x) => x.bien);

  const corps = biens.length === 0
    ? `<div class="card text-slate-500 text-center py-10">Aucun bien sauvegardé. Commencez par en ajouter un.</div>`
    : `
      <div class="card overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-slate-500 border-b border-slate-200">
              <th class="py-2 pr-3">Nom</th>
              <th class="py-2 pr-3">Type</th>
              <th class="py-2 pr-3">Régime</th>
              <th class="py-2 pr-3 text-right">Prix</th>
              <th class="py-2 pr-3 text-center">Score ↓</th>
              <th class="py-2 pr-3">Date</th>
              <th class="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            ${biensAvecScore.map(({ bien: b, score }) => {
              const scoreCell = score == null
                ? '<span class="text-slate-400">—</span>'
                : `<span class="${couleurScore(score)} px-2 py-0.5 rounded text-xs font-semibold">${formatNombre(score, 1)}</span>`;
              return `
                <tr class="border-b border-slate-100 last:border-0">
                  <td class="py-2 pr-3 font-medium">${b.nom || '—'}</td>
                  <td class="py-2 pr-3">${LIBELLE_TYPE[b.typeLocation] || b.typeLocation}</td>
                  <td class="py-2 pr-3">${LIBELLE_REGIME[b.regimeFiscal] || b.regimeFiscal}</td>
                  <td class="py-2 pr-3 text-right">${b.prix ? formatEuros(b.prix) : '—'}</td>
                  <td class="py-2 pr-3 text-center">${scoreCell}</td>
                  <td class="py-2 pr-3 text-slate-500">${formatDateFR(b.updatedAt || b.createdAt)}</td>
                  <td class="py-2 pr-3 text-right whitespace-nowrap">
                    <button class="btn-ghost text-xs" data-action="view" data-id="${b.id}">Voir</button>
                    <button class="btn-ghost text-xs" data-action="edit" data-id="${b.id}">Éditer</button>
                    <button class="btn-ghost text-xs text-red-600" data-action="delete" data-id="${b.id}">Suppr.</button>
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;

  container.innerHTML = `
    <header class="mb-4 flex items-center justify-between gap-2 flex-wrap">
      <div>
        <h1 class="text-xl font-bold">Mes biens</h1>
        <p class="text-sm text-slate-500">Lot 1 — calculateur LD nue / micro-foncier</p>
      </div>
      <div class="flex items-center gap-2">
        <select id="filtreType" class="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm">
          <option value="">Tous les types</option>
          <option value="LD_nue">LD nue</option>
          <option value="LD_meublee">LD meublée</option>
          <option value="LCD">LCD</option>
          <option value="LMD">LMD</option>
          <option value="coloc_meublee">Coloc meublée</option>
          <option value="coloc_nue">Coloc nue</option>
        </select>
        <select id="filtreRegime" class="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm">
          <option value="">Tous les régimes</option>
          <option value="micro-foncier">Micro-foncier</option>
          <option value="reel-foncier">Réel foncier</option>
          <option value="micro-bic-lmnp">Micro-BIC LMNP</option>
          <option value="micro-bic-tourisme-classe">Micro-BIC tourisme classé</option>
          <option value="micro-bic-tourisme-non-classe">Micro-BIC tourisme non classé</option>
          <option value="reel-lmnp">Réel LMNP</option>
        </select>
        <button class="btn-secondary" data-action="settings" title="Pondérations">⚙ Pondérations</button>
        <button class="btn-primary" data-action="new">+ Nouveau bien</button>
      </div>
    </header>
    ${corps}
  `;

  container.querySelector('[data-action="new"]').addEventListener('click', () => navigate('/new'));
  container.querySelector('[data-action="settings"]').addEventListener('click', () => navigate('/settings'));

  container.querySelectorAll('[data-action="view"]').forEach((b) =>
    b.addEventListener('click', (e) => navigate(`/view/${e.currentTarget.dataset.id}`)));
  container.querySelectorAll('[data-action="edit"]').forEach((b) =>
    b.addEventListener('click', (e) => navigate(`/edit/${e.currentTarget.dataset.id}`)));
  container.querySelectorAll('[data-action="delete"]').forEach((b) =>
    b.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const bien = biens.find((x) => x.id === id);
      if (confirm(`Supprimer définitivement « ${bien?.nom || 'ce bien'} » ?`)) {
        deleteBien(id);
        renderList(container);
      }
    }));
}

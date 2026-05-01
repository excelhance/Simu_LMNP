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
  coloc: 'Colocation'
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
  const biens = listBiens();

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
              <th class="py-2 pr-3 text-center">Score</th>
              <th class="py-2 pr-3">Date</th>
              <th class="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            ${biens.map((b) => {
              let scoreCell = '<span class="text-slate-400">—</span>';
              try {
                const r = calculerLot1(b);
                const cls = couleurScore(r.scoring.global);
                scoreCell = `<span class="${cls} px-2 py-0.5 rounded text-xs font-semibold">${formatNombre(r.scoring.global, 1)}</span>`;
              } catch {
                /* score non calculable si données partielles */
              }
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
        </select>
        <select id="filtreRegime" class="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm">
          <option value="">Tous les régimes</option>
          <option value="micro-foncier">Micro-foncier</option>
        </select>
        <button class="btn-primary" data-action="new">+ Nouveau bien</button>
      </div>
    </header>
    ${corps}
  `;

  container.querySelector('[data-action="new"]').addEventListener('click', () => navigate('/new'));

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

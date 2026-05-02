// src/ui/list.js
// Écran « Liste des biens » — multi-sélection pour comparaison + export/import JSON.

import { listBiens, deleteBien } from '../persistence/storage.js';
import { calculerLot1 } from '../core/calcul.js';
import { telechargerExport, parseImport, appliquerImport } from '../persistence/exporter.js';
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

/** Rafraîchit l'état du bouton « Comparer » selon le nombre de cases cochées. */
function rafraichirBoutonComparer(container) {
  const checked = container.querySelectorAll('input[data-role="select-bien"]:checked');
  const btn = container.querySelector('[data-action="compare"]');
  if (!btn) return;
  btn.disabled = checked.length < 2;
  btn.classList.toggle('opacity-50', btn.disabled);
  btn.classList.toggle('cursor-not-allowed', btn.disabled);
  btn.textContent = `Comparer (${checked.length})`;
}

function lancerImport(container) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parse = parseImport(reader.result);
      if (!parse.ok) {
        alert(`Import impossible : ${parse.erreur}`);
        return;
      }
      const nb = parse.data.biens.length;
      const choix = prompt(
        `${nb} bien(s) trouvé(s) dans le fichier.\n\n` +
        `Tape "remplacer" pour écraser tous tes biens existants,\n` +
        `ou "fusionner" pour les ajouter à la liste actuelle.\n\n` +
        `(Annuler pour ne rien faire)`,
        'fusionner'
      );
      if (!choix) return;
      const mode = choix.trim().toLowerCase().startsWith('rem') ? 'replace' : 'merge';
      const res = appliquerImport(parse.data, mode);
      alert(
        mode === 'replace'
          ? `Import terminé : ${res.ajoutes} bien(s) chargés (état précédent écrasé).`
          : `Import fusionné : ${res.ajoutes} ajoutés, ${res.remplaces} dupliqués (collisions d'id).`
      );
      renderList(container);
    };
    reader.readAsText(file);
  });
  input.click();
}

export function renderList(container) {
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
    ? `<div class="card text-slate-500 text-center py-10">Aucun bien sauvegardé. Commencez par en ajouter un, ou importe un fichier JSON.</div>`
    : `
      <div class="card overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-slate-500 border-b border-slate-200">
              <th class="py-2 pr-3 w-8 text-center" title="Sélectionner pour comparer">
                <input type="checkbox" data-role="select-all" class="h-4 w-4 rounded border-slate-300" />
              </th>
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
                  <td class="py-2 pr-3 text-center">
                    <input type="checkbox" data-role="select-bien" data-id="${b.id}" class="h-4 w-4 rounded border-slate-300" />
                  </td>
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
        <p class="text-sm text-slate-500">Calculateur locatif personnel</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <button class="btn-secondary" data-action="compare" disabled>Comparer (0)</button>
        <button class="btn-ghost text-sm" data-action="export" title="Télécharger JSON">⤓ Export</button>
        <button class="btn-ghost text-sm" data-action="import" title="Importer JSON">⤒ Import</button>
        <button class="btn-secondary" data-action="settings" title="Pondérations">⚙ Pondérations</button>
        <button class="btn-primary" data-action="new">+ Nouveau bien</button>
      </div>
    </header>
    ${corps}
  `;

  container.querySelector('[data-action="new"]').addEventListener('click', () => navigate('/new'));
  container.querySelector('[data-action="settings"]').addEventListener('click', () => navigate('/settings'));
  container.querySelector('[data-action="export"]').addEventListener('click', () => {
    if (biens.length === 0) {
      alert('Aucun bien à exporter.');
      return;
    }
    telechargerExport();
  });
  container.querySelector('[data-action="import"]').addEventListener('click', () => lancerImport(container));

  // Cases à cocher : "tout sélectionner" + activation du bouton Comparer.
  const selectAll = container.querySelector('[data-role="select-all"]');
  const cbBiens = container.querySelectorAll('[data-role="select-bien"]');
  if (selectAll) {
    selectAll.addEventListener('change', () => {
      cbBiens.forEach((cb) => { cb.checked = selectAll.checked; });
      rafraichirBoutonComparer(container);
    });
  }
  cbBiens.forEach((cb) => cb.addEventListener('change', () => rafraichirBoutonComparer(container)));

  container.querySelector('[data-action="compare"]').addEventListener('click', () => {
    const ids = [...container.querySelectorAll('input[data-role="select-bien"]:checked')]
      .map((cb) => cb.dataset.id);
    if (ids.length < 2) return;
    navigate(`/compare/${ids.join(',')}`);
  });

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

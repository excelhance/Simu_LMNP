// src/ui/comparison.js
// Lot 4 — Comparaison multi-biens : tableau côte à côte, surlignage des
// meilleures valeurs sur chaque ligne.

import { getBien } from '../persistence/storage.js';
import { calculerLot1 } from '../core/calcul.js';
import {
  formatEuros,
  formatPourcent,
  formatNombre,
  couleurScore
} from '../utils/format.js';
import { NIVEAUX } from '../core/alertes.js';
import { navigate } from '../utils/router.js';

const LIBELLE_TYPE = {
  LD_nue: 'LD nue',
  LD_meublee: 'LD meublée',
  LCD: 'LCD',
  LMD: 'LMD',
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

/**
 * Définition des lignes du tableau de comparaison.
 * - extract: récupère la valeur numérique brute depuis (bien, indicateurs)
 * - format : formate la valeur pour l'affichage
 * - sens   : 'max' (plus grand = meilleur) ou 'min' (plus petit = meilleur)
 *            ou null (pas de surlignage)
 */
const LIGNES = [
  // ─── Identité ────────────────────────────────────────────────────
  { groupe: 'Identité', label: 'Type',
    extract: (b) => null, format: (_, b) => LIBELLE_TYPE[b.typeLocation] || b.typeLocation, sens: null },
  { groupe: 'Identité', label: 'Régime fiscal',
    extract: () => null, format: (_, b) => LIBELLE_REGIME[b.regimeFiscal] || b.regimeFiscal, sens: null },
  { groupe: 'Identité', label: 'Surface',
    extract: (b) => b.surface, format: (v) => v != null ? `${formatNombre(v, 0)} m²` : '—', sens: null },
  { groupe: 'Identité', label: 'Prix',
    extract: (b) => b.prix, format: (v) => v != null ? formatEuros(v) : '—', sens: 'min' },

  // ─── Score ───────────────────────────────────────────────────────
  { groupe: 'Score', label: 'Score global',
    extract: (_, i) => i.scoring.global, format: (v) => formatNombre(v, 2),
    sens: 'max',
    cellRender: (v) => `<span class="${couleurScore(v)} px-2 py-0.5 rounded text-xs font-semibold">${formatNombre(v, 1)}</span>` },
  { groupe: 'Score', label: 'F1 — Financier',
    extract: (_, i) => i.scoring.parFamille.F1, format: (v) => formatNombre(v, 2), sens: 'max' },
  { groupe: 'Score', label: 'F2 — Bien',
    extract: (_, i) => i.scoring.parFamille.F2, format: (v) => formatNombre(v, 2), sens: 'max' },
  { groupe: 'Score', label: 'F3 — Marché',
    extract: (_, i) => i.scoring.parFamille.F3, format: (v) => formatNombre(v, 2), sens: 'max' },
  { groupe: 'Score', label: 'F4 — Risque',
    extract: (_, i) => i.scoring.parFamille.F4, format: (v) => formatNombre(v, 2), sens: 'max' },

  // ─── Indicateurs financiers ──────────────────────────────────────
  { groupe: 'Indicateurs', label: 'Rendement brut',
    extract: (_, i) => i.rendementBrut, format: (v) => formatPourcent(v), sens: 'max' },
  { groupe: 'Indicateurs', label: 'Rendement net',
    extract: (_, i) => i.rendementNet, format: (v) => formatPourcent(v), sens: 'max' },
  { groupe: 'Indicateurs', label: 'Rendement net-net',
    extract: (_, i) => i.rendementNetNet, format: (v) => formatPourcent(v), sens: 'max' },
  { groupe: 'Indicateurs', label: 'Cash-flow mensuel',
    extract: (_, i) => i.cashflowMensuel, format: (v) => formatEuros(v, 2), sens: 'max' },
  { groupe: 'Indicateurs', label: 'Mensualité totale',
    extract: (_, i) => i.mensualiteTotale, format: (v) => formatEuros(v, 2), sens: 'min' },
  { groupe: 'Indicateurs', label: "Effort d'épargne",
    extract: (_, i) => i.effortEpargne, format: (v) => formatEuros(v, 2), sens: 'min' },
  { groupe: 'Indicateurs', label: 'Impôt + PS annuel',
    extract: (_, i) => i.fiscalite.impotTotal, format: (v) => formatEuros(v), sens: 'min' },
  { groupe: 'Indicateurs', label: 'TRI 10 ans',
    extract: (_, i) => i.tri?.tri != null ? i.tri.tri * 100 : null,
    format: (v) => v != null ? formatPourcent(v) : '—', sens: 'max' },

  // ─── Alertes ─────────────────────────────────────────────────────
  { groupe: 'Alertes', label: 'Alertes',
    extract: (_, i) => i.alertes?.length ?? 0,
    format: (_, b, i) => {
      const alertes = i.alertes || [];
      if (alertes.length === 0) return '<span class="text-emerald-600 text-xs">aucune</span>';
      const r = alertes.filter((a) => a.niveau === NIVEAUX.ROUGE).length;
      const o = alertes.filter((a) => a.niveau === NIVEAUX.ORANGE).length;
      const parts = [];
      if (r > 0) parts.push(`<span class="text-red-600 font-semibold">🔴 ${r}</span>`);
      if (o > 0) parts.push(`<span class="text-orange-500 font-semibold">🟠 ${o}</span>`);
      return parts.join(' · ');
    },
    sens: 'min' }
];

/** Renvoie l'index du bien gagnant pour une ligne donnée (null si non comparable). */
function indexGagnant(valeurs, sens) {
  if (!sens) return null;
  const valides = valeurs
    .map((v, idx) => ({ v, idx }))
    .filter((x) => typeof x.v === 'number' && !isNaN(x.v));
  if (valides.length < 2) return null;
  const meilleur = sens === 'max'
    ? valides.reduce((a, b) => (b.v > a.v ? b : a))
    : valides.reduce((a, b) => (b.v < a.v ? b : a));
  return meilleur.idx;
}

export function renderComparison(container, ids) {
  const biens = ids.map((id) => getBien(id)).filter(Boolean);
  if (biens.length < 2) {
    container.innerHTML = `
      <div class="card text-slate-600">
        <p>Pas assez de biens à comparer.</p>
        <button class="btn-primary mt-3" data-action="back">← Retour à la liste</button>
      </div>`;
    container.querySelector('[data-action="back"]').addEventListener('click', () => navigate('/'));
    return;
  }

  // Calcul des indicateurs pour chaque bien.
  const indicateurs = biens.map((b) => {
    try { return calculerLot1(b); } catch { return null; }
  });

  // Construction du tableau ligne par ligne (avec surlignage du gagnant).
  let groupeCourant = '';
  const corpsTable = LIGNES.map((ligne) => {
    const valeurs = biens.map((b, i) => ligne.extract(b, indicateurs[i] || {}));
    const gagnant = indexGagnant(valeurs, ligne.sens);

    // En-tête de groupe (rendu une seule fois quand le groupe change).
    let header = '';
    if (ligne.groupe !== groupeCourant) {
      groupeCourant = ligne.groupe;
      header = `
        <tr class="bg-slate-50">
          <td colspan="${biens.length + 1}" class="py-1.5 px-3 text-xs uppercase tracking-wide text-slate-500 font-semibold">${ligne.groupe}</td>
        </tr>`;
    }

    const cellules = biens.map((b, i) => {
      const v = valeurs[i];
      const ind = indicateurs[i];
      const formate = ligne.cellRender
        ? ligne.cellRender(v, b, ind)
        : ligne.format(v, b, ind);
      const cls = (i === gagnant)
        ? 'bg-emerald-50 font-semibold text-emerald-900'
        : '';
      return `<td class="py-1.5 px-3 text-sm ${cls}">${formate}</td>`;
    }).join('');

    return `${header}
      <tr class="border-b border-slate-100">
        <td class="py-1.5 px-3 text-sm text-slate-600 sticky left-0 bg-white">${ligne.label}</td>
        ${cellules}
      </tr>`;
  }).join('');

  const enTetes = biens.map((b) => `
    <th class="py-2 px-3 text-left bg-slate-50">
      <div class="font-semibold text-slate-800">${b.nom || 'Sans nom'}</div>
      <div class="text-xs text-slate-500 font-normal">${b.adresse || ''}</div>
    </th>`).join('');

  container.innerHTML = `
    <header class="mb-4 flex items-center justify-between flex-wrap gap-2">
      <div>
        <h1 class="text-xl font-bold">Comparaison de ${biens.length} biens</h1>
        <p class="text-sm text-slate-500">Surlignage en vert = meilleure valeur sur la ligne.</p>
      </div>
      <button type="button" class="btn-ghost" data-action="back">← Liste</button>
    </header>

    <div class="card overflow-x-auto">
      <table class="w-full border-collapse">
        <thead>
          <tr class="border-b-2 border-slate-200">
            <th class="py-2 px-3 text-left bg-slate-50 sticky left-0 w-48"></th>
            ${enTetes}
          </tr>
        </thead>
        <tbody>${corpsTable}</tbody>
      </table>
    </div>
  `;

  container.querySelector('[data-action="back"]').addEventListener('click', () => navigate('/'));
}

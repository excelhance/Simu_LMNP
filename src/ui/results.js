// src/ui/results.js
// Écran « Restitution » : score partiel + indicateurs + détail + scoring détaillé.

import { getBien, deleteBien } from '../persistence/storage.js';
import { calculerLot1 } from '../core/calcul.js';
import {
  formatEuros,
  formatPourcent,
  formatNombre,
  couleurScore,
  libelleScore
} from '../utils/format.js';
import { navigate } from '../utils/router.js';

function bloc(titre, contenu) {
  return `<section class="card"><h2 class="font-semibold text-slate-800 mb-3">${titre}</h2>${contenu}</section>`;
}

function ligneIndicateur(label, valeur) {
  return `<div class="flex justify-between border-b border-slate-100 last:border-0 py-1.5 text-sm"><span class="text-slate-600">${label}</span><span class="font-medium text-slate-900">${valeur}</span></div>`;
}

function tableauScoring(parCritere, parFamille) {
  const lignes = Object.values(parCritere).map((c) => {
    const valeur = c.valeur === null || c.valeur === undefined ? '—'
      : typeof c.valeur === 'number' ? formatNombre(c.valeur, 2)
      : c.valeur;
    const sousScore = formatNombre(c.sousScore, 2);
    const pondPct = formatNombre(c.ponderation * 100, 0) + ' %';
    const contribFamille = formatNombre(c.sousScore * c.ponderation, 2);
    return `
      <tr class="border-b border-slate-100">
        <td class="py-1.5 pr-2 text-slate-700">${c.code}</td>
        <td class="py-1.5 pr-2 text-slate-700">${c.label}${c.neutralise ? ' <span class="text-amber-600 text-xs">(neutralisé)</span>' : ''}</td>
        <td class="py-1.5 pr-2 text-right">${valeur}</td>
        <td class="py-1.5 pr-2 text-right">${sousScore}</td>
        <td class="py-1.5 pr-2 text-right">${pondPct}</td>
        <td class="py-1.5 pr-2 text-right">${contribFamille}</td>
        <td class="py-1.5 pr-2 text-slate-500">${c.famille}</td>
      </tr>`;
  }).join('');

  return `
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-slate-500 border-b border-slate-200">
            <th class="py-1.5 pr-2">Code</th>
            <th class="py-1.5 pr-2">Critère</th>
            <th class="py-1.5 pr-2 text-right">Valeur</th>
            <th class="py-1.5 pr-2 text-right">Sous-score /10</th>
            <th class="py-1.5 pr-2 text-right">Pond. famille</th>
            <th class="py-1.5 pr-2 text-right">Contribution</th>
            <th class="py-1.5 pr-2">Famille</th>
          </tr>
        </thead>
        <tbody>${lignes}</tbody>
        <tfoot>
          <tr class="border-t-2 border-slate-300 font-medium">
            <td colspan="3" class="py-1.5 text-right pr-2">Total famille F1 :</td>
            <td colspan="4" class="py-1.5 pr-2">${formatNombre(parFamille.F1, 2)} / 10</td>
          </tr>
          <tr class="font-medium">
            <td colspan="3" class="py-1.5 text-right pr-2">Total famille F2 :</td>
            <td colspan="4" class="py-1.5 pr-2">${formatNombre(parFamille.F2, 2)} / 10</td>
          </tr>
        </tfoot>
      </table>
    </div>`;
}

export function renderResults(container, id) {
  const bien = getBien(id);
  if (!bien) {
    container.innerHTML = `<p class="text-red-600">Bien introuvable.</p>`;
    return;
  }

  const r = calculerLot1(bien);
  const s = r.scoring;
  const scoreClass = couleurScore(s.global);

  container.innerHTML = `
    <header class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold">${bien.nom || 'Bien sans nom'}</h1>
        <p class="text-sm text-slate-500">${bien.adresse || ''}</p>
      </div>
      <div class="flex gap-2">
        <button type="button" class="btn-ghost" data-action="back">← Liste</button>
        <button type="button" class="btn-secondary" data-action="edit">Éditer</button>
        <button type="button" class="btn-danger" data-action="delete">Supprimer</button>
      </div>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      ${bloc('Bloc 1 — Score partiel', `
        <div class="flex items-center gap-4">
          <div class="${scoreClass} rounded-full w-24 h-24 flex flex-col items-center justify-center shadow-inner">
            <span class="text-3xl font-bold">${formatNombre(s.global, 1)}</span>
            <span class="text-xs">/ 10</span>
          </div>
          <div>
            <div class="font-semibold">${libelleScore(s.global)}</div>
            <div class="text-sm text-slate-500">F1 : ${formatNombre(s.parFamille.F1, 2)} · F2 : ${formatNombre(s.parFamille.F2, 2)}</div>
            <div class="text-xs text-amber-700 mt-2">Score partiel (financier + bien). Critères marché et risque non encore intégrés.</div>
          </div>
        </div>
      `)}

      ${bloc('Bloc 2 — Indicateurs', `
        ${ligneIndicateur('Rendement brut', formatPourcent(r.rendementBrut))}
        ${ligneIndicateur('Rendement net', formatPourcent(r.rendementNet))}
        ${ligneIndicateur('Rendement net-net', formatPourcent(r.rendementNetNet))}
        ${ligneIndicateur('Cash-flow mensuel', formatEuros(r.cashflowMensuel, 2))}
        ${ligneIndicateur('Mensualité crédit', formatEuros(r.mensualiteCredit, 2))}
        ${ligneIndicateur('Mensualité assurance', formatEuros(r.mensualiteAssurance, 2))}
        ${ligneIndicateur('Mensualité totale', formatEuros(r.mensualiteTotale, 2))}
        ${ligneIndicateur("Effort d'épargne mensuel", formatEuros(r.effortEpargne, 2))}
        ${ligneIndicateur('TRI 10 ans', '— (Lot 3)')}
      `)}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
      ${bloc('Bloc 3 — Détail des calculs', `
        ${ligneIndicateur('Coût total acquisition (CTA)', formatEuros(r.CTA))}
        ${ligneIndicateur('Capital emprunté', formatEuros(r.capitalEmprunte))}
        ${ligneIndicateur('Loyer annuel net vacance', formatEuros(r.loyerAnnuelNetVacance))}
        ${ligneIndicateur('Charges annuelles', formatEuros(r.chargesAnnuelles))}
        ${ligneIndicateur('Revenu imposable micro-foncier', formatEuros(r.fiscalite.revenuImposable))}
        ${ligneIndicateur('Impôt IR', formatEuros(r.fiscalite.impotIR))}
        ${ligneIndicateur('Prélèvements sociaux', formatEuros(r.fiscalite.impotPS))}
        ${ligneIndicateur('Impôt + PS annuel', formatEuros(r.fiscalite.impotTotal))}
        ${ligneIndicateur('Capital restant à 5 ans', r.resumeAmort.a5 != null ? formatEuros(r.resumeAmort.a5) : '—')}
        ${ligneIndicateur('Capital restant à 10 ans', r.resumeAmort.a10 != null ? formatEuros(r.resumeAmort.a10) : '—')}
        ${ligneIndicateur('Capital restant à 15 ans', r.resumeAmort.a15 != null ? formatEuros(r.resumeAmort.a15) : '—')}
        ${ligneIndicateur('Capital restant à 20 ans', r.resumeAmort.a20 != null ? formatEuros(r.resumeAmort.a20) : '—')}
      `)}

      ${bloc('Bloc 4 — Détail scoring', tableauScoring(s.parCritere, s.parFamille))}
    </div>
  `;

  container.querySelector('[data-action="back"]').addEventListener('click', () => navigate('/'));
  container.querySelector('[data-action="edit"]').addEventListener('click', () => navigate(`/edit/${id}`));
  container.querySelector('[data-action="delete"]').addEventListener('click', () => {
    if (confirm(`Supprimer définitivement « ${bien.nom || 'ce bien'} » ?`)) {
      deleteBien(id);
      navigate('/');
    }
  });
}

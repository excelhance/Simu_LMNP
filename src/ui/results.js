// src/ui/results.js
// Écran « Restitution » : score global, indicateurs, alertes, détail des calculs et scoring.

import { getBien, deleteBien } from '../persistence/storage.js';
import { calculerLot1 } from '../core/calcul.js';
import { NIVEAUX } from '../core/alertes.js';
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

/**
 * Détail du TRI 10 ans : valeur de revente projetée, capital restant dû,
 * impôt sur la plus-value, valeur nette de revente.
 */
function detailTRI(t) {
  if (!t) return '';
  const parts = [
    `<div class="mt-3 pt-3 border-t border-slate-200 text-xs uppercase tracking-wide text-slate-500">TRI 10 ans</div>`,
    ligneIndicateur('Valeur de revente projetée', formatEuros(t.valeurRevente)),
    ligneIndicateur('Capital restant dû à 10 ans', formatEuros(t.capitalRestantA10)),
    ligneIndicateur('Plus-value brute', formatEuros(t.pv.plusValueBrute)),
    ligneIndicateur('Impôt sur PV (IR + PS)', formatEuros(t.pv.impotTotal)),
    ligneIndicateur('Valeur nette de revente', formatEuros(t.valeurNetteRevente)),
    ligneIndicateur('TRI calculé', t.tri != null ? formatPourcent(t.tri * 100) : '—')
  ];
  return parts.join('');
}

/**
 * Détail fiscal spécifique au régime sélectionné. La sortie de
 * calculerLot1().fiscalite varie selon le régime, on affiche les bonnes lignes.
 */
function detailFiscal(f) {
  const lignes = [];
  switch (f.regime) {
    case 'micro-foncier':
      lignes.push(ligneIndicateur('Régime', `Micro-foncier · abattement ${(f.abattement * 100).toFixed(0)} %`));
      lignes.push(ligneIndicateur('Revenu imposable', formatEuros(f.revenuImposable)));
      break;
    case 'micro-bic':
      lignes.push(ligneIndicateur('Régime', `Micro-BIC · abattement ${(f.abattement * 100).toFixed(0)} %`));
      lignes.push(ligneIndicateur('Revenu imposable', formatEuros(f.revenuImposable)));
      break;
    case 'reel-foncier':
      lignes.push(ligneIndicateur('Régime', 'Réel foncier'));
      lignes.push(ligneIndicateur('Charges déductibles totales', formatEuros(f.chargesDeductibles)));
      lignes.push(ligneIndicateur('Résultat foncier brut', formatEuros(f.resultatAvantAmort)));
      if (f.deficit > 0) {
        lignes.push(ligneIndicateur('Déficit foncier', formatEuros(f.deficit)));
        lignes.push(ligneIndicateur('  · imputable au revenu global', formatEuros(f.deficitImputableRevenuGlobal)));
        lignes.push(ligneIndicateur('  · reportable (10 ans)', formatEuros(f.deficitReportable)));
      } else {
        lignes.push(ligneIndicateur('Revenu imposable', formatEuros(f.revenuImposable)));
      }
      break;
    case 'reel-lmnp':
      lignes.push(ligneIndicateur('Régime', 'Réel LMNP avec amortissement'));
      lignes.push(ligneIndicateur('Charges déductibles (hors amort.)', formatEuros(f.chargesDeductibles)));
      lignes.push(ligneIndicateur('Résultat avant amortissement', formatEuros(f.resultatAvantAmort)));
      lignes.push(ligneIndicateur('Amortissement bâti', formatEuros(f.amortBati)));
      lignes.push(ligneIndicateur('Amortissement mobilier', formatEuros(f.amortMobilier)));
      lignes.push(ligneIndicateur('Amortissement travaux', formatEuros(f.amortTravaux)));
      lignes.push(ligneIndicateur('Amortissement total annuel', formatEuros(f.amortTotal)));
      lignes.push(ligneIndicateur('  · déductible cette année', formatEuros(f.amortDeductible)));
      lignes.push(ligneIndicateur('  · reporté (sans limite)', formatEuros(f.amortReporte)));
      lignes.push(ligneIndicateur('Résultat fiscal', formatEuros(f.resultatFiscal)));
      if (f.deficitBIC > 0) {
        lignes.push(ligneIndicateur('Déficit BIC reportable (10 ans)', formatEuros(f.deficitBIC)));
      }
      break;
    default:
      lignes.push(ligneIndicateur('Revenu imposable', formatEuros(f.revenuImposable)));
  }
  lignes.push(ligneIndicateur('Impôt IR', formatEuros(f.impotIR)));
  lignes.push(ligneIndicateur('Prélèvements sociaux', formatEuros(f.impotPS)));
  lignes.push(ligneIndicateur('Impôt + PS annuel', formatEuros(f.impotTotal)));
  return lignes.join('');
}

/** Mini-jauge horizontale pour un score de famille. */
function jaugeFamille(label, score, poids) {
  const pct = Math.max(0, Math.min(100, score * 10));
  const cls = couleurScore(score);
  return `
    <div class="space-y-1">
      <div class="flex justify-between text-xs">
        <span class="font-medium text-slate-700">${label}</span>
        <span class="text-slate-500">${formatNombre(score, 2)} / 10 · poids ${formatNombre(poids * 100, 0)} %</span>
      </div>
      <div class="h-2 rounded bg-slate-200 overflow-hidden">
        <div class="${cls} h-2" style="width:${pct}%"></div>
      </div>
    </div>`;
}

function blocAlertes(alertes) {
  if (!alertes || alertes.length === 0) {
    return bloc('Bloc 4 — Alertes', `<p class="text-sm text-emerald-700">Aucune alerte. ✓</p>`);
  }
  const lis = alertes.map((a) => {
    const styles = a.niveau === NIVEAUX.ROUGE
      ? 'border-l-4 border-red-600 bg-red-50 text-red-800'
      : 'border-l-4 border-orange-500 bg-orange-50 text-orange-800';
    const icone = a.niveau === NIVEAUX.ROUGE ? '🔴' : '🟠';
    return `<li class="${styles} px-3 py-2 rounded-r"><span class="mr-1">${icone}</span>${a.message}</li>`;
  }).join('');
  return bloc('Bloc 4 — Alertes', `<ul class="space-y-2 text-sm">${lis}</ul>`);
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

  const totaux = ['F1', 'F2', 'F3', 'F4'].map((f) =>
    `<tr class="font-medium"><td colspan="3" class="py-1.5 text-right pr-2">Total famille ${f} :</td><td colspan="4" class="py-1.5 pr-2">${formatNombre(parFamille[f], 2)} / 10</td></tr>`
  ).join('');

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
        <tfoot class="border-t-2 border-slate-300">${totaux}</tfoot>
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
      ${bloc('Bloc 1 — Score global', `
        <div class="flex items-center gap-4 mb-4">
          <div class="${scoreClass} rounded-full w-24 h-24 flex flex-col items-center justify-center shadow-inner">
            <span class="text-3xl font-bold">${formatNombre(s.global, 1)}</span>
            <span class="text-xs">/ 10</span>
          </div>
          <div>
            <div class="font-semibold">${libelleScore(s.global)}</div>
            <div class="text-xs text-slate-500 mt-1">Score complet F1 + F2 + F3 + F4 (TRI 10 ans neutralisé jusqu’au Lot 3).</div>
          </div>
        </div>
        <div class="space-y-2">
          ${jaugeFamille('F1 — Financier', s.parFamille.F1, s.pondsFamille.F1)}
          ${jaugeFamille('F2 — Bien', s.parFamille.F2, s.pondsFamille.F2)}
          ${jaugeFamille('F3 — Marché', s.parFamille.F3, s.pondsFamille.F3)}
          ${jaugeFamille('F4 — Risque', s.parFamille.F4, s.pondsFamille.F4)}
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
        ${ligneIndicateur('TRI 10 ans', r.tri?.tri != null ? formatPourcent(r.tri.tri * 100) : '—')}
      `)}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
      ${bloc('Bloc 3 — Détail des calculs', `
        ${ligneIndicateur('Coût total acquisition (CTA)', formatEuros(r.CTA))}
        ${ligneIndicateur('Capital emprunté', formatEuros(r.capitalEmprunte))}
        ${ligneIndicateur('Loyer annuel net vacance', formatEuros(r.loyerAnnuelNetVacance))}
        ${ligneIndicateur('Charges annuelles déductibles', formatEuros(r.chargesAnnuelles))}
        ${ligneIndicateur('Intérêts d’emprunt année 1', formatEuros(r.interetsAnnee1))}
        ${detailFiscal(r.fiscalite)}
        ${ligneIndicateur('Capital restant à 5 ans', r.resumeAmort.a5 != null ? formatEuros(r.resumeAmort.a5) : '—')}
        ${ligneIndicateur('Capital restant à 10 ans', r.resumeAmort.a10 != null ? formatEuros(r.resumeAmort.a10) : '—')}
        ${ligneIndicateur('Capital restant à 15 ans', r.resumeAmort.a15 != null ? formatEuros(r.resumeAmort.a15) : '—')}
        ${ligneIndicateur('Capital restant à 20 ans', r.resumeAmort.a20 != null ? formatEuros(r.resumeAmort.a20) : '—')}
        ${detailTRI(r.tri)}
      `)}

      ${blocAlertes(r.alertes)}
    </div>

    <div class="mt-4">
      ${bloc('Bloc 5 — Détail scoring', tableauScoring(s.parCritere, s.parFamille))}
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

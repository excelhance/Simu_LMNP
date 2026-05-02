// src/ui/settings.js
// Lot 5 — Panneau de paramètres : 2 onglets
//   1. Pondérations (Lot 2)
//   2. Constantes fiscales (Lot 5) — TMI, abattements, plafonds, durées d'amort.

import {
  loadPonderations,
  savePonderations,
  resetPonderations,
  loadFiscal,
  saveFiscal,
  resetFiscal
} from '../persistence/storage.js';
import { FISCAL } from '../core/constants.js';
import { formatNombre } from '../utils/format.js';
import { navigate } from '../utils/router.js';

// ─── Onglet 1 : pondérations ──────────────────────────────────────────

const TYPES_PONDERES = ['LD_nue']; // les autres types réutilisent ces poids ; saisie spécifique 3b non livrée

const LIBELLES_POIDS = {
  F1: {
    titre: 'F1 — Financier',
    C01: 'Rendement brut',
    C02: 'Rendement net charges',
    C03: 'Rendement net-net',
    C04: 'Cash-flow mensuel',
    C05: 'TRI 10 ans',
    C06: "Effort d'épargne"
  },
  F2: {
    titre: 'F2 — Bien',
    C07: 'Prix au m² vs marché',
    C08: 'État général',
    C09: 'DPE',
    C10: 'Charges copro',
    C11: 'Travaux à prévoir',
    C12: 'Surface adaptée'
  },
  F3: {
    titre: 'F3 — Marché',
    C13: 'Tension locative',
    C14: 'Proximité commodités'
  },
  F4: {
    titre: 'F4 — Risque',
    C20: 'Risque de vacance',
    C22: 'État copropriété (risque)',
    C23: 'Encadrement loyers'
  }
};

function champPoidsPct(id, label, valeurDecimale) {
  const v = (valeurDecimale * 100).toFixed(0);
  return `
    <div class="grid grid-cols-[1fr_auto] items-center gap-2">
      <label for="${id}" class="text-sm text-slate-700">${label}</label>
      <div class="flex items-center gap-2">
        <input type="number" id="${id}" min="0" max="100" step="1" value="${v}"
               class="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm text-right" />
        <span class="text-xs text-slate-500">%</span>
      </div>
    </div>`;
}

function lignesPoids(prefix, mapDecimal) {
  return Object.entries(mapDecimal).map(([code, val]) => {
    const lib = LIBELLES_POIDS[prefix.split('-')[0]]?.[code] || code;
    return champPoidsPct(`${prefix}-${code}`, `${code} — ${lib}`, val);
  }).join('');
}

function carteFamille(titre, prefix, mapDecimal, sommePctId) {
  const somme = Object.values(mapDecimal).reduce((a, b) => a + b, 0);
  return `
    <section class="card">
      <h3 class="font-semibold mb-3">${titre}</h3>
      <div class="space-y-2">${lignesPoids(prefix, mapDecimal)}</div>
      <div class="mt-3 text-xs text-slate-500" id="${sommePctId}">Somme : ${formatNombre(somme * 100, 0)} % (renormalisée à 100 % au calcul)</div>
    </section>`;
}

function lireValeursPoids(form) {
  const out = { inter: {}, F1: {}, F2: {}, F3: {}, F4: {} };
  for (const t of TYPES_PONDERES) {
    out.inter[t] = {};
    for (const f of ['F1', 'F2', 'F3', 'F4']) {
      const el = form.querySelector(`#inter-${t}-${f}`);
      out.inter[t][f] = (Number(el.value) || 0) / 100;
    }
  }
  for (const c of Object.keys(LIBELLES_POIDS.F1).filter((k) => k !== 'titre')) {
    const el = form.querySelector(`#F1-${c}`);
    out.F1[c] = (Number(el.value) || 0) / 100;
  }
  for (const c of Object.keys(LIBELLES_POIDS.F2).filter((k) => k !== 'titre')) {
    const el = form.querySelector(`#F2-${c}`);
    out.F2[c] = (Number(el.value) || 0) / 100;
  }
  for (const t of TYPES_PONDERES) {
    out.F3[t] = {};
    out.F4[t] = {};
    for (const c of Object.keys(LIBELLES_POIDS.F3).filter((k) => k !== 'titre')) {
      const el = form.querySelector(`#F3-${t}-${c}`);
      if (el) out.F3[t][c] = (Number(el.value) || 0) / 100;
    }
    for (const c of Object.keys(LIBELLES_POIDS.F4).filter((k) => k !== 'titre')) {
      const el = form.querySelector(`#F4-${t}-${c}`);
      if (el) out.F4[t][c] = (Number(el.value) || 0) / 100;
    }
  }
  return out;
}

function rafraichirSommesPoids(container, p) {
  const sInter = ['F1', 'F2', 'F3', 'F4'].reduce((a, f) => a + (p.inter.LD_nue[f] || 0), 0);
  const elI = container.querySelector('#somme-inter-LD_nue');
  if (elI) elI.textContent = `Somme : ${formatNombre(sInter * 100, 0)} % (renormalisée à 100 % au calcul)`;
  const setSomme = (key, vals) => {
    const el = container.querySelector(`#somme-${key}`);
    const s = Object.values(vals).reduce((a, b) => a + b, 0);
    if (el) el.textContent = `Somme : ${formatNombre(s * 100, 0)} % (renormalisée à 100 % au calcul)`;
  };
  setSomme('F1', p.F1);
  setSomme('F2', p.F2);
  setSomme('F3-LD_nue', p.F3.LD_nue || {});
  setSomme('F4-LD_nue', p.F4.LD_nue || {});
}

function rendrePonderations(container) {
  const p = loadPonderations();
  container.innerHTML = `
    <form id="ponderationsForm" class="space-y-4 pb-24">
      <section class="card">
        <h3 class="font-semibold mb-3">Inter-familles (LD nue)</h3>
        <div class="space-y-2">
          ${champPoidsPct('inter-LD_nue-F1', 'F1 — Financier', p.inter.LD_nue.F1)}
          ${champPoidsPct('inter-LD_nue-F2', 'F2 — Bien', p.inter.LD_nue.F2)}
          ${champPoidsPct('inter-LD_nue-F3', 'F3 — Marché', p.inter.LD_nue.F3)}
          ${champPoidsPct('inter-LD_nue-F4', 'F4 — Risque', p.inter.LD_nue.F4)}
        </div>
        <div class="mt-3 text-xs text-slate-500" id="somme-inter-LD_nue"></div>
      </section>

      ${carteFamille('Intra F1 (financier)', 'F1', p.F1, 'somme-F1')}
      ${carteFamille('Intra F2 (bien)', 'F2', p.F2, 'somme-F2')}
      ${carteFamille('Intra F3 (marché — LD nue)', 'F3-LD_nue', p.F3.LD_nue || {}, 'somme-F3-LD_nue')}
      ${carteFamille('Intra F4 (risque — LD nue)', 'F4-LD_nue', p.F4.LD_nue || {}, 'somme-F4-LD_nue')}

      <div class="flex justify-between gap-2">
        <button type="button" class="btn-secondary" data-action="reset-pond">Réinitialiser aux valeurs par défaut</button>
        <button type="submit" class="btn-primary">Sauvegarder pondérations</button>
      </div>
    </form>
  `;

  const form = container.querySelector('#ponderationsForm');
  rafraichirSommesPoids(container, p);
  form.addEventListener('input', () => rafraichirSommesPoids(container, lireValeursPoids(form)));
  form.querySelector('[data-action="reset-pond"]').addEventListener('click', () => {
    if (confirm('Réinitialiser toutes les pondérations aux valeurs par défaut ?')) {
      resetPonderations();
      rendrePonderations(container);
    }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    savePonderations(lireValeursPoids(form));
    alert('Pondérations sauvegardées.');
  });
}

// ─── Onglet 2 : constantes fiscales ───────────────────────────────────

/**
 * Définition des champs éditables sur le panneau « Constantes fiscales ».
 * Chaque entrée : { key, label, group, type:'pct'|'eur'|'years', step, hint }
 */
const CHAMPS_FISCAL = [
  { group: 'Imposition générale', key: 'TMI', label: 'TMI par défaut', type: 'pct', step: 1, hint: 'Tranche marginale d\'imposition (par défaut nouveaux biens)' },
  { group: 'Imposition générale', key: 'PS', label: 'Prélèvements sociaux', type: 'pct', step: 0.1, hint: 'Taux global PS (CSG + CRDS + …)' },

  { group: 'Micro-foncier', key: 'abattementMicroFoncier', label: 'Abattement', type: 'pct', step: 1 },
  { group: 'Micro-foncier', key: 'plafondMicroFoncier', label: 'Plafond annuel de loyers', type: 'eur', step: 100 },

  { group: 'Réel foncier', key: 'plafondDeficitFoncierImputable', label: 'Déficit foncier imputable', type: 'eur', step: 100, hint: 'Plafond imputable au revenu global' },

  { group: 'Micro-BIC LMNP / tourisme classé', key: 'abattementMicroBIC_LMNP', label: 'Abattement LMNP', type: 'pct', step: 1 },
  { group: 'Micro-BIC LMNP / tourisme classé', key: 'plafondMicroBIC_LMNP', label: 'Plafond LMNP', type: 'eur', step: 100 },
  { group: 'Micro-BIC LMNP / tourisme classé', key: 'abattementMicroBIC_TourismeClasse', label: 'Abattement tourisme classé', type: 'pct', step: 1 },
  { group: 'Micro-BIC LMNP / tourisme classé', key: 'plafondMicroBIC_TourismeClasse', label: 'Plafond tourisme classé', type: 'eur', step: 100 },

  { group: 'Tourisme non classé', key: 'abattementMicroBIC_TourismeNonClasse', label: 'Abattement', type: 'pct', step: 1 },
  { group: 'Tourisme non classé', key: 'plafondMicroBIC_TourismeNonClasse', label: 'Plafond', type: 'eur', step: 100 },

  { group: 'Réel LMNP — amortissements', key: 'amortBatiQuotePart', label: 'Quote-part bâti', type: 'pct', step: 1, hint: 'Part de (prix + frais notaire) amortissable' },
  { group: 'Réel LMNP — amortissements', key: 'amortBatiDuree', label: 'Durée bâti', type: 'years', step: 1 },
  { group: 'Réel LMNP — amortissements', key: 'amortMobilierDuree', label: 'Durée mobilier', type: 'years', step: 1 },
  { group: 'Réel LMNP — amortissements', key: 'amortTravauxDuree', label: 'Durée travaux', type: 'years', step: 1 },

  { group: 'Hypothèses macro', key: 'inflationLoyersAnnuelle', label: 'Inflation loyers annuelle', type: 'pct', step: 0.1, hint: 'Indexation IRL prévisionnelle' },
  { group: 'Hypothèses macro', key: 'revalorisationBienAnnuelle', label: 'Revalorisation bien annuelle', type: 'pct', step: 0.1, hint: 'Hypothèse PV à la revente — TRI 10 ans' },
  { group: 'Hypothèses macro', key: 'fraisNotaireAncienTaux', label: 'Frais de notaire (ancien)', type: 'pct', step: 0.1 }
];

function champFiscal(c, valeur) {
  // Conversion vers la valeur affichée (% pour pct, € pour eur, années pour years).
  let vAffichee;
  if (c.type === 'pct') vAffichee = (valeur * 100).toFixed(2).replace(/\.?0+$/, '');
  else if (c.type === 'eur') vAffichee = String(Math.round(valeur));
  else vAffichee = String(valeur);
  const suffix = c.type === 'pct' ? '%' : c.type === 'eur' ? '€' : 'ans';
  return `
    <div class="grid grid-cols-[1fr_auto] items-center gap-2">
      <div>
        <label for="fiscal-${c.key}" class="text-sm text-slate-700">${c.label}</label>
        ${c.hint ? `<div class="text-xs text-slate-400">${c.hint}</div>` : ''}
      </div>
      <div class="flex items-center gap-1">
        <input type="number" id="fiscal-${c.key}" name="fiscal-${c.key}" step="${c.step}" value="${vAffichee}"
               class="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm text-right" />
        <span class="text-xs text-slate-500 w-6">${suffix}</span>
      </div>
    </div>`;
}

function lireFiscal(form) {
  const out = {};
  for (const c of CHAMPS_FISCAL) {
    const el = form.querySelector(`#fiscal-${c.key}`);
    if (!el) continue;
    const raw = Number(String(el.value).replace(',', '.'));
    if (isNaN(raw)) continue;
    if (c.type === 'pct') out[c.key] = raw / 100;
    else out[c.key] = raw;
  }
  return out;
}

function rendreFiscal(container) {
  const fiscal = loadFiscal();
  // Regrouper par groupe.
  const groups = {};
  for (const c of CHAMPS_FISCAL) {
    if (!groups[c.group]) groups[c.group] = [];
    groups[c.group].push(c);
  }
  const sections = Object.entries(groups).map(([titre, champs]) => `
    <section class="card">
      <h3 class="font-semibold mb-3">${titre}</h3>
      <div class="space-y-3">
        ${champs.map((c) => champFiscal(c, fiscal[c.key])).join('')}
      </div>
    </section>
  `).join('');

  container.innerHTML = `
    <form id="fiscalForm" class="space-y-4 pb-24">
      <p class="text-sm text-slate-500">
        Ces valeurs servent de base à l'ensemble des calculs (impôts, plafonds, amortissements, TRI).
        Les biens existants seront recalculés avec les nouvelles valeurs au prochain affichage.
      </p>
      ${sections}

      <div class="flex justify-between gap-2">
        <button type="button" class="btn-secondary" data-action="reset-fiscal">Réinitialiser aux valeurs par défaut</button>
        <button type="submit" class="btn-primary">Sauvegarder constantes</button>
      </div>
    </form>
  `;

  const form = container.querySelector('#fiscalForm');
  form.querySelector('[data-action="reset-fiscal"]').addEventListener('click', () => {
    if (confirm('Réinitialiser toutes les constantes fiscales aux valeurs par défaut ?')) {
      resetFiscal();
      rendreFiscal(container);
    }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    saveFiscal(lireFiscal(form));
    alert('Constantes fiscales sauvegardées.');
  });
}

// ─── Wrapper avec onglets ─────────────────────────────────────────────

export function renderSettings(container, ongletInitial = 'pond') {
  container.innerHTML = `
    <header class="mb-4 flex items-center justify-between flex-wrap gap-2">
      <div>
        <h1 class="text-xl font-bold">Paramètres</h1>
        <p class="text-sm text-slate-500">Pondérations du score et constantes fiscales.</p>
      </div>
      <button type="button" class="btn-ghost" data-action="back">← Retour</button>
    </header>

    <div class="border-b border-slate-200 mb-4 flex gap-1">
      <button type="button" class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
              data-tab="pond">Pondérations</button>
      <button type="button" class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
              data-tab="fiscal">Constantes fiscales</button>
    </div>

    <div id="settingsContent"></div>
  `;

  container.querySelector('[data-action="back"]').addEventListener('click', () => navigate('/'));

  const content = container.querySelector('#settingsContent');
  const tabs = container.querySelectorAll('[data-tab]');

  function activerOnglet(nom) {
    tabs.forEach((t) => {
      const actif = t.dataset.tab === nom;
      t.className = actif
        ? 'px-4 py-2 text-sm font-medium border-b-2 border-indigo-600 text-indigo-700'
        : 'px-4 py-2 text-sm font-medium border-b-2 border-transparent text-slate-600 hover:text-slate-900';
    });
    if (nom === 'pond') rendrePonderations(content);
    else rendreFiscal(content);
  }

  tabs.forEach((t) => t.addEventListener('click', () => activerOnglet(t.dataset.tab)));
  activerOnglet(ongletInitial);
}

// Aliases nommés pour permettre `navigate('/settings/fiscal')`.
export function renderSettingsFiscal(container) {
  renderSettings(container, 'fiscal');
}

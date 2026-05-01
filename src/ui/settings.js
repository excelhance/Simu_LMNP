// src/ui/settings.js
// Lot 2 — Panneau de pondérations modifiables.
// Édition libre des poids, normalisation auto à 100 % au moment du calcul du score.
// Sauvegarde en localStorage via persistence/storage.js.

import { loadPonderations, savePonderations, resetPonderations } from '../persistence/storage.js';
import { formatNombre } from '../utils/format.js';
import { navigate } from '../utils/router.js';

const TYPES_LOT2 = ['LD_nue']; // Les autres types arrivent au Lot 3.

const LIBELLES = {
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

/** Champ slider + input numérique, valeur entre 0 et 100 (en pourcentage). */
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

/** Affiche un total (somme des poids saisis dans une famille). */
function lignesPoids(prefix, mapDecimal) {
  return Object.entries(mapDecimal).map(([code, val]) => {
    const lib = LIBELLES[prefix.split('-')[0]]?.[code] || code;
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

function lireValeurs(form) {
  const out = { inter: {}, F1: {}, F2: {}, F3: {}, F4: {} };
  // Inter-familles par type.
  for (const t of TYPES_LOT2) {
    out.inter[t] = {};
    for (const f of ['F1', 'F2', 'F3', 'F4']) {
      const el = form.querySelector(`#inter-${t}-${f}`);
      out.inter[t][f] = (Number(el.value) || 0) / 100;
    }
  }
  // Intra F1 / F2 (identiques pour tous types).
  for (const c of Object.keys(LIBELLES.F1).filter((k) => k !== 'titre')) {
    const el = form.querySelector(`#F1-${c}`);
    out.F1[c] = (Number(el.value) || 0) / 100;
  }
  for (const c of Object.keys(LIBELLES.F2).filter((k) => k !== 'titre')) {
    const el = form.querySelector(`#F2-${c}`);
    out.F2[c] = (Number(el.value) || 0) / 100;
  }
  // Intra F3 / F4 (variables par type).
  for (const t of TYPES_LOT2) {
    out.F3[t] = {};
    out.F4[t] = {};
    for (const c of Object.keys(LIBELLES.F3).filter((k) => k !== 'titre')) {
      const el = form.querySelector(`#F3-${t}-${c}`);
      if (el) out.F3[t][c] = (Number(el.value) || 0) / 100;
    }
    for (const c of Object.keys(LIBELLES.F4).filter((k) => k !== 'titre')) {
      const el = form.querySelector(`#F4-${t}-${c}`);
      if (el) out.F4[t][c] = (Number(el.value) || 0) / 100;
    }
  }
  return out;
}

function rafraichirSommes(container, p) {
  // Inter
  const sInter = ['F1', 'F2', 'F3', 'F4'].reduce((a, f) => a + (p.inter.LD_nue[f] || 0), 0);
  const elI = container.querySelector('#somme-inter-LD_nue');
  if (elI) elI.textContent = `Somme : ${formatNombre(sInter * 100, 0)} % (renormalisée à 100 % au calcul)`;
  // Intra
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

function rendre(container, p) {
  container.innerHTML = `
    <header class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold">Pondérations</h1>
        <p class="text-sm text-slate-500">Modifie les poids de chaque critère et famille. Les sommes sont renormalisées à 100 % au calcul.</p>
      </div>
      <button type="button" class="btn-ghost" data-action="back">← Retour</button>
    </header>

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

      <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 flex justify-between gap-2 z-10">
        <button type="button" class="btn-secondary" data-action="reset">Réinitialiser aux valeurs par défaut</button>
        <button type="submit" class="btn-primary">Sauvegarder</button>
      </div>
    </form>
  `;

  const form = container.querySelector('#ponderationsForm');
  rafraichirSommes(container, p);

  // Mettre à jour les sommes en live à chaque saisie.
  form.addEventListener('input', () => {
    rafraichirSommes(container, lireValeurs(form));
  });

  container.querySelector('[data-action="back"]').addEventListener('click', () => navigate('/'));

  form.querySelector('[data-action="reset"]').addEventListener('click', () => {
    if (confirm('Réinitialiser toutes les pondérations aux valeurs par défaut ?')) {
      resetPonderations();
      rendre(container, loadPonderations());
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const valeurs = lireValeurs(form);
    savePonderations(valeurs);
    alert('Pondérations sauvegardées.');
    navigate('/');
  });
}

export function renderSettings(container) {
  rendre(container, loadPonderations());
}

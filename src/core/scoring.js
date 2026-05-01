// src/core/scoring.js
// Lot 2 : scoring complet F1 (financier) + F2 (bien) + F3 (marché) + F4 (risque).
// Les pondérations utilisateurs (panneau Pondérations) sont injectables via
// le paramètre `ponderations`. Si non fourni, on retombe sur les valeurs par défaut.
import {
  PONDERATIONS_F1,
  PONDERATIONS_F2,
  PONDERATIONS_F3,
  PONDERATIONS_F4,
  PONDERATIONS_FAMILLES,
  SEUILS_SCORING,
  SCORE_DPE,
  scoreQualitatif,
  MARCHE_NANCY
} from './constants.js';

/** Score « zone tendue / encadrement loyers » — plus c'est tendu, plus c'est risqué. */
export const SCORE_ZONE_TENDUE = {
  aucune: 10,                 // commune libre, aucun encadrement
  observatoire: 7,            // simple observatoire des loyers
  encadrement_actif: 4        // encadrement appliqué, plafonds de loyer
};

/** Interpolation linéaire entre paliers ordonnés par valeur croissante. */
function scoreLineaire(valeur, seuils) {
  if (!seuils || seuils.length === 0) return 0;
  const tries = [...seuils].sort((a, b) => a.valeur - b.valeur);
  if (valeur <= tries[0].valeur) return tries[0].score;
  if (valeur >= tries[tries.length - 1].valeur) return tries[tries.length - 1].score;
  for (let k = 0; k < tries.length - 1; k++) {
    const a = tries[k], b = tries[k + 1];
    if (valeur >= a.valeur && valeur <= b.valeur) {
      const ratio = (valeur - a.valeur) / (b.valeur - a.valeur);
      return a.score + ratio * (b.score - a.score);
    }
  }
  return 0;
}

/** Score prix au m² vs marché Nancy. */
function scorePrixM2(prixM2Bien, prixM2Marche = MARCHE_NANCY.prixMoyenM2) {
  if (!prixM2Marche) return 0;
  const ratio = prixM2Bien / prixM2Marche;
  if (ratio <= 0.80) return 10;
  if (ratio >= 1.30) return 0;
  if (ratio <= 1.00) return 10 - (ratio - 0.80) / 0.20 * 4;
  return 6 - (ratio - 1.00) / 0.30 * 6;
}

function scoreSurface(surface) {
  if (surface >= 35) return 10;
  if (surface >= 25) return 7 + (surface - 25) / 10 * 3;
  if (surface >= 15) return 4 + (surface - 15) / 10 * 3;
  if (surface > 0) return Math.max(0, surface / 15 * 4);
  return 0;
}

function scoreChargesCopro(chargesAnnuelles, loyerAnnuel) {
  if (loyerAnnuel <= 0) return 0;
  const ratio = chargesAnnuelles / loyerAnnuel;
  if (ratio <= 0.10) return 10;
  if (ratio >= 0.40) return 0;
  return 10 - (ratio - 0.10) / 0.30 * 10;
}

/**
 * Calcule un score de famille = Σ (sousScore × poids) / Σ (poids).
 * Robuste si certaines pondérations sont manquantes (poids 0).
 */
function scoreFamille(map) {
  let totalPoids = 0;
  let totalScore = 0;
  for (const { sousScore, poids } of map) {
    if (poids > 0) {
      totalPoids += poids;
      totalScore += sousScore * poids;
    }
  }
  return totalPoids > 0 ? totalScore / totalPoids : 0;
}

/**
 * Score complet Lot 2 : F1 + F2 + F3 + F4 pondérés selon le type de location.
 *
 * @param {object} bien - Données saisies.
 * @param {object} indicateursFinanciers
 * @param {object} [ponderations] - { inter, F1, F2, F3, F4 } ; défauts utilisés sinon.
 * @returns {{global:number, parFamille:{F1,F2,F3,F4}, pondsFamille, parCritere:object}}
 */
export function scoreBien(bien, indicateursFinanciers, ponderations) {
  const ind = indicateursFinanciers || {};
  const p = {
    inter: ponderations?.inter || PONDERATIONS_FAMILLES,
    F1: ponderations?.F1 || PONDERATIONS_F1,
    F2: ponderations?.F2 || PONDERATIONS_F2,
    F3: ponderations?.F3 || PONDERATIONS_F3,
    F4: ponderations?.F4 || PONDERATIONS_F4
  };
  const type = bien.typeLocation || 'LD_nue';

  // ─── Sous-scores F1 ────────────────────────────────────────────────
  const sC01 = scoreLineaire(ind.rendementBrut ?? 0, SEUILS_SCORING.C01_rendementBrut);
  const sC02 = scoreLineaire(ind.rendementNet ?? 0, SEUILS_SCORING.C02_rendementNet);
  const sC03 = scoreLineaire(ind.rendementNetNet ?? 0, SEUILS_SCORING.C03_rendementNetNet);
  const sC04 = scoreLineaire(ind.cashflowMensuel ?? 0, SEUILS_SCORING.C04_cashflow);
  // C05 (TRI 10 ans) — toujours neutralisé en Lot 2 (Lot 3 livre le TRI).
  const sC05 = 5;
  const sC06 = scoreLineaire(ind.effortEpargne ?? 0, SEUILS_SCORING.C06_effortEpargne);

  const F1 = scoreFamille([
    { sousScore: sC01, poids: p.F1.C01 },
    { sousScore: sC02, poids: p.F1.C02 },
    { sousScore: sC03, poids: p.F1.C03 },
    { sousScore: sC04, poids: p.F1.C04 },
    { sousScore: sC05, poids: p.F1.C05 },
    { sousScore: sC06, poids: p.F1.C06 }
  ]);

  // ─── Sous-scores F2 ────────────────────────────────────────────────
  const surface = bien.surface || 0;
  const prix = bien.prix || 0;
  const prixM2 = surface > 0 ? prix / surface : 0;
  const loyerAnnuel = (bien.loyerMensuelHC || 0) * 12;

  const sC07 = scorePrixM2(prixM2);
  const sC08 = scoreQualitatif(bien.etatGeneral || 1);
  const sC09 = SCORE_DPE[bien.dpe] !== undefined ? SCORE_DPE[bien.dpe] : 5;
  const sC10 = scoreChargesCopro(bien.chargesCopro || 0, loyerAnnuel);
  const sC11 = scoreQualitatif(bien.etatCopro || 1);
  const sC12 = scoreSurface(surface);

  const F2 = scoreFamille([
    { sousScore: sC07, poids: p.F2.C07 },
    { sousScore: sC08, poids: p.F2.C08 },
    { sousScore: sC09, poids: p.F2.C09 },
    { sousScore: sC10, poids: p.F2.C10 },
    { sousScore: sC11, poids: p.F2.C11 },
    { sousScore: sC12, poids: p.F2.C12 }
  ]);

  // ─── Sous-scores F3 (variables par type — ici LD_nue) ─────────────
  const f3Type = p.F3[type] || {};
  const sC13 = scoreQualitatif(bien.tensionLocative || 3);   // 1 (faible) → 5 (forte tension)
  const sC14 = scoreQualitatif(bien.proximiteCommodites || 3);
  const F3 = scoreFamille([
    { sousScore: sC13, poids: f3Type.C13 || 0 },
    { sousScore: sC14, poids: f3Type.C14 || 0 }
  ]);

  // ─── Sous-scores F4 (LD_nue) ───────────────────────────────────────
  const f4Type = p.F4[type] || {};
  // C20 : 1 = très risqué (vacance forte) → 0 ; 5 = très peu risqué → 10.
  const sC20 = scoreQualitatif(bien.risqueVacance || 3);
  const sC22 = scoreQualitatif(bien.etatCopro || 3);
  const sC23 = SCORE_ZONE_TENDUE[bien.zoneTendue] !== undefined
    ? SCORE_ZONE_TENDUE[bien.zoneTendue]
    : SCORE_ZONE_TENDUE.aucune;
  const F4 = scoreFamille([
    { sousScore: sC20, poids: f4Type.C20 || 0 },
    { sousScore: sC22, poids: f4Type.C22 || 0 },
    { sousScore: sC23, poids: f4Type.C23 || 0 }
  ]);

  // ─── Score global : pondération inter-familles renormalisée à 100 % ─
  const pf = p.inter[type] || PONDERATIONS_FAMILLES.LD_nue;
  const somme = (pf.F1 || 0) + (pf.F2 || 0) + (pf.F3 || 0) + (pf.F4 || 0);
  const wF1 = somme > 0 ? (pf.F1 || 0) / somme : 0;
  const wF2 = somme > 0 ? (pf.F2 || 0) / somme : 0;
  const wF3 = somme > 0 ? (pf.F3 || 0) / somme : 0;
  const wF4 = somme > 0 ? (pf.F4 || 0) / somme : 0;
  const global = F1 * wF1 + F2 * wF2 + F3 * wF3 + F4 * wF4;

  return {
    global,
    parFamille: { F1, F2, F3, F4 },
    pondsFamille: { F1: wF1, F2: wF2, F3: wF3, F4: wF4 },
    parCritere: {
      C01: { code: 'C01', label: 'Rendement brut',         valeur: ind.rendementBrut,    sousScore: sC01, ponderation: p.F1.C01, famille: 'F1' },
      C02: { code: 'C02', label: 'Rendement net charges',  valeur: ind.rendementNet,     sousScore: sC02, ponderation: p.F1.C02, famille: 'F1' },
      C03: { code: 'C03', label: 'Rendement net-net',      valeur: ind.rendementNetNet,  sousScore: sC03, ponderation: p.F1.C03, famille: 'F1' },
      C04: { code: 'C04', label: 'Cash-flow mensuel',      valeur: ind.cashflowMensuel,  sousScore: sC04, ponderation: p.F1.C04, famille: 'F1' },
      C05: { code: 'C05', label: 'TRI 10 ans (Lot 3)',     valeur: null,                 sousScore: sC05, ponderation: p.F1.C05, famille: 'F1', neutralise: true },
      C06: { code: 'C06', label: "Effort d'épargne",       valeur: ind.effortEpargne,    sousScore: sC06, ponderation: p.F1.C06, famille: 'F1' },
      C07: { code: 'C07', label: 'Prix au m² vs marché',   valeur: prixM2,               sousScore: sC07, ponderation: p.F2.C07, famille: 'F2' },
      C08: { code: 'C08', label: 'État général (1-5)',     valeur: bien.etatGeneral,     sousScore: sC08, ponderation: p.F2.C08, famille: 'F2' },
      C09: { code: 'C09', label: 'DPE',                    valeur: bien.dpe,             sousScore: sC09, ponderation: p.F2.C09, famille: 'F2' },
      C10: { code: 'C10', label: 'Charges copro / loyer',  valeur: bien.chargesCopro,    sousScore: sC10, ponderation: p.F2.C10, famille: 'F2' },
      C11: { code: 'C11', label: 'État copro (1-5)',       valeur: bien.etatCopro,       sousScore: sC11, ponderation: p.F2.C11, famille: 'F2' },
      C12: { code: 'C12', label: 'Surface adaptée',        valeur: surface,              sousScore: sC12, ponderation: p.F2.C12, famille: 'F2' },
      C13: { code: 'C13', label: 'Tension locative (1-5)', valeur: bien.tensionLocative, sousScore: sC13, ponderation: f3Type.C13 || 0, famille: 'F3' },
      C14: { code: 'C14', label: 'Proximité commodités (1-5)', valeur: bien.proximiteCommodites, sousScore: sC14, ponderation: f3Type.C14 || 0, famille: 'F3' },
      C20: { code: 'C20', label: 'Risque de vacance (1-5)', valeur: bien.risqueVacance,  sousScore: sC20, ponderation: f4Type.C20 || 0, famille: 'F4' },
      C22: { code: 'C22', label: 'État copropriété (risque)', valeur: bien.etatCopro,    sousScore: sC22, ponderation: f4Type.C22 || 0, famille: 'F4' },
      C23: { code: 'C23', label: 'Encadrement loyers',     valeur: bien.zoneTendue,      sousScore: sC23, ponderation: f4Type.C23 || 0, famille: 'F4' }
    }
  };
}

/**
 * Compatibilité Lot 1 : ancien export `scoreLot1` continue de fonctionner mais
 * délègue désormais au scoring complet (les nouveaux champs F3/F4 utilisent leurs
 * valeurs neutres si non renseignés).
 */
export function scoreLot1(bien, indicateursFinanciers) {
  return scoreBien(bien, indicateursFinanciers);
}

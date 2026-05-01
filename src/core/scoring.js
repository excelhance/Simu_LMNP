// src/core/scoring.js
// Lot 1 : scoring F1 (financier) + F2 (bien) uniquement, normalisé sur 100 %.
import {
  PONDERATIONS_F1,
  PONDERATIONS_F2,
  PONDERATIONS_FAMILLES,
  SEUILS_SCORING,
  SCORE_DPE,
  scoreQualitatif,
  MARCHE_NANCY
} from './constants.js';

/**
 * Interpolation linéaire entre paliers ordonnés par valeur croissante.
 * En dehors des bornes, on clampe au score min/max.
 */
function scoreLineaire(valeur, seuils) {
  if (!seuils || seuils.length === 0) return 0;
  // Trier par valeur croissante (sécurité, le tableau d'origine peut l'être déjà).
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
  if (ratio <= 1.00) return 10 - (ratio - 0.80) / 0.20 * 4;   // 10 → 6
  return 6 - (ratio - 1.00) / 0.30 * 6;                       // 6 → 0
}

/** Score surface : on considère qu'au-dessus de 25 m² c'est correct, en-dessous pénalisé. */
function scoreSurface(surface) {
  if (surface >= 35) return 10;
  if (surface >= 25) return 7 + (surface - 25) / 10 * 3;
  if (surface >= 15) return 4 + (surface - 15) / 10 * 3;
  if (surface > 0) return Math.max(0, surface / 15 * 4);
  return 0;
}

/**
 * Score charges copro : barème basé sur le ratio charges/loyer annuel.
 *  - ≤10 % loyer : 10
 *  - ≥40 % loyer : 0
 *  - linéaire entre les deux
 */
function scoreChargesCopro(chargesAnnuelles, loyerAnnuel) {
  if (loyerAnnuel <= 0) return 0;
  const ratio = chargesAnnuelles / loyerAnnuel;
  if (ratio <= 0.10) return 10;
  if (ratio >= 0.40) return 0;
  return 10 - (ratio - 0.10) / 0.30 * 10;
}

/**
 * Score Lot 1 partiel : F1 + F2 normalisés à 100 %.
 *
 * @param {object} bien - Données saisies par l'utilisateur.
 * @param {object} indicateursFinanciers - { rendementBrut, rendementNet, rendementNetNet, cashflowMensuel, effortEpargne }
 * @returns {{global:number, parFamille:{F1:number,F2:number}, parCritere:object}}
 */
export function scoreLot1(bien, indicateursFinanciers) {
  const ind = indicateursFinanciers || {};

  // ─── F1 : critères financiers ──────────────────────────────────────
  const sC01 = scoreLineaire(ind.rendementBrut ?? 0, SEUILS_SCORING.C01_rendementBrut);
  const sC02 = scoreLineaire(ind.rendementNet ?? 0, SEUILS_SCORING.C02_rendementNet);
  const sC03 = scoreLineaire(ind.rendementNetNet ?? 0, SEUILS_SCORING.C03_rendementNetNet);
  const sC04 = scoreLineaire(ind.cashflowMensuel ?? 0, SEUILS_SCORING.C04_cashflow);
  // C05 (TRI) non disponible en Lot 1 — on neutralise le critère en utilisant son
  // équivalent au score médian (5/10) afin de ne pas pénaliser arbitrairement.
  const sC05 = 5;
  const sC06 = scoreLineaire(ind.effortEpargne ?? 0, SEUILS_SCORING.C06_effortEpargne);

  const F1 =
    sC01 * PONDERATIONS_F1.C01 +
    sC02 * PONDERATIONS_F1.C02 +
    sC03 * PONDERATIONS_F1.C03 +
    sC04 * PONDERATIONS_F1.C04 +
    sC05 * PONDERATIONS_F1.C05 +
    sC06 * PONDERATIONS_F1.C06;

  // ─── F2 : critères « bien » ────────────────────────────────────────
  const surface = bien.surface || 0;
  const prix = bien.prix || 0;
  const prixM2 = surface > 0 ? prix / surface : 0;
  const loyerAnnuel = (bien.loyerMensuelHC || 0) * 12;

  const sC07 = scoreLineaire(0, [{ valeur: 0, score: 0 }]); // placeholder, écrasé ci-dessous
  const sC07Real = scorePrixM2(prixM2);
  const sC08 = scoreQualitatif(bien.etatGeneral || 1);                         // 1-5
  const sC09 = SCORE_DPE[bien.dpe] !== undefined ? SCORE_DPE[bien.dpe] : 5;     // par défaut médian
  const sC10 = scoreChargesCopro(bien.chargesCopro || 0, loyerAnnuel);
  // C11 — travaux à prévoir : score qualitatif inversé. travauxAPrevoir = 1-5 (1 = beaucoup à faire).
  const sC11 = scoreQualitatif(bien.etatCopro || 1);
  const sC12 = scoreSurface(surface);

  const F2 =
    sC07Real * PONDERATIONS_F2.C07 +
    sC08 * PONDERATIONS_F2.C08 +
    sC09 * PONDERATIONS_F2.C09 +
    sC10 * PONDERATIONS_F2.C10 +
    sC11 * PONDERATIONS_F2.C11 +
    sC12 * PONDERATIONS_F2.C12;

  // ─── Score global Lot 1 : F1 + F2 normalisés à 100 % ──────────────
  // Pondérations LD_nue : F1 = 0.40, F2 = 0.25 → renormalisation 0.40+0.25 = 0.65.
  // F1_norm = 0.40 / 0.65 = 0.615 ; F2_norm = 0.25 / 0.65 = 0.385.
  const pf = PONDERATIONS_FAMILLES[bien.typeLocation] || PONDERATIONS_FAMILLES.LD_nue;
  const sommeF1F2 = pf.F1 + pf.F2;
  const wF1 = pf.F1 / sommeF1F2;
  const wF2 = pf.F2 / sommeF1F2;
  const global = F1 * wF1 + F2 * wF2;

  return {
    global,
    parFamille: { F1, F2 },
    pondsFamille: { F1: wF1, F2: wF2 },
    parCritere: {
      C01: { code: 'C01', label: 'Rendement brut',         valeur: ind.rendementBrut,    sousScore: sC01, ponderation: PONDERATIONS_F1.C01, famille: 'F1' },
      C02: { code: 'C02', label: 'Rendement net charges',  valeur: ind.rendementNet,     sousScore: sC02, ponderation: PONDERATIONS_F1.C02, famille: 'F1' },
      C03: { code: 'C03', label: 'Rendement net-net',      valeur: ind.rendementNetNet,  sousScore: sC03, ponderation: PONDERATIONS_F1.C03, famille: 'F1' },
      C04: { code: 'C04', label: 'Cash-flow mensuel',      valeur: ind.cashflowMensuel,  sousScore: sC04, ponderation: PONDERATIONS_F1.C04, famille: 'F1' },
      C05: { code: 'C05', label: 'TRI 10 ans (Lot 3)',     valeur: null,                 sousScore: sC05, ponderation: PONDERATIONS_F1.C05, famille: 'F1', neutralise: true },
      C06: { code: 'C06', label: "Effort d'épargne",       valeur: ind.effortEpargne,    sousScore: sC06, ponderation: PONDERATIONS_F1.C06, famille: 'F1' },
      C07: { code: 'C07', label: 'Prix au m² vs marché',   valeur: prixM2,               sousScore: sC07Real, ponderation: PONDERATIONS_F2.C07, famille: 'F2' },
      C08: { code: 'C08', label: 'État général (1-5)',     valeur: bien.etatGeneral,     sousScore: sC08, ponderation: PONDERATIONS_F2.C08, famille: 'F2' },
      C09: { code: 'C09', label: 'DPE',                    valeur: bien.dpe,             sousScore: sC09, ponderation: PONDERATIONS_F2.C09, famille: 'F2' },
      C10: { code: 'C10', label: 'Charges copro / loyer',  valeur: bien.chargesCopro,    sousScore: sC10, ponderation: PONDERATIONS_F2.C10, famille: 'F2' },
      C11: { code: 'C11', label: 'État copro (1-5)',       valeur: bien.etatCopro,       sousScore: sC11, ponderation: PONDERATIONS_F2.C11, famille: 'F2' },
      C12: { code: 'C12', label: 'Surface adaptée',        valeur: surface,              sousScore: sC12, ponderation: PONDERATIONS_F2.C12, famille: 'F2' }
    }
  };
}

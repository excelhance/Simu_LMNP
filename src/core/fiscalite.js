// src/core/fiscalite.js
// Calcul fiscal — Lot 1 : régime micro-foncier uniquement (LD nue).
import { FISCAL } from './constants.js';

/**
 * Calcul fiscal micro-foncier.
 * Abattement forfaitaire de 30 % sur les loyers nets de vacance,
 * puis IR au TMI + prélèvements sociaux 17.2 %.
 *
 * @param {number} loyersAnnuels - Loyers annuels nets de vacance (€)
 * @param {number} [tmi=FISCAL.TMI] - Tranche marginale d'imposition (ex 0.30)
 * @param {number} [ps=FISCAL.PS] - Taux prélèvements sociaux (ex 0.172)
 * @returns {{revenuImposable:number, impotIR:number, impotPS:number, impotTotal:number, depassePlafond:boolean}}
 */
export function microFoncier(loyersAnnuels, tmi = FISCAL.TMI, ps = FISCAL.PS) {
  const revenuImposable = loyersAnnuels * (1 - FISCAL.abattementMicroFoncier);
  const impotIR = revenuImposable * tmi;
  const impotPS = revenuImposable * ps;
  return {
    revenuImposable,
    impotIR,
    impotPS,
    impotTotal: impotIR + impotPS,
    depassePlafond: loyersAnnuels > FISCAL.plafondMicroFoncier
  };
}

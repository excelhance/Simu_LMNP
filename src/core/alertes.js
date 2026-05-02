// src/core/alertes.js
// Alertes contextuelles affichées sur l'écran de restitution.
// `fiscal` accepte les constantes utilisateur (Lot 5).
import { FISCAL } from './constants.js';

export const NIVEAUX = {
  ROUGE: 'rouge',
  ORANGE: 'orange'
};

/**
 * Évalue les alertes pour un bien + ses indicateurs calculés.
 * Retourne un tableau d'objets { niveau, code, message }.
 *
 * @param {object} bien
 * @param {object} indicateurs - sortie de calculerLot1() : cashflowMensuel,
 *                               loyerAnnuelNetVacance, mensualiteTotale, etc.
 */
export function evaluerAlertes(bien, indicateurs, fiscal = FISCAL) {
  const alertes = [];

  // 🔴 DPE F ou G : interdiction progressive de location en LD nue.
  if (bien.dpe === 'F' || bien.dpe === 'G') {
    alertes.push({
      niveau: NIVEAUX.ROUGE,
      code: 'DPE_FG',
      message: `DPE ${bien.dpe} : location longue durée interdite à terme (calendrier réglementaire en vigueur).`
    });
  }

  // 🔴 Cash-flow mensuel < -200 €
  if (indicateurs.cashflowMensuel < -200) {
    alertes.push({
      niveau: NIVEAUX.ROUGE,
      code: 'CF_NEGATIF',
      message: `Cash-flow mensuel très négatif (${Math.round(indicateurs.cashflowMensuel)} €). Effort d'épargne lourd.`
    });
  }

  // 🟠 Plafond micro-foncier dépassé (15 000 €/an de loyers)
  if (
    bien.regimeFiscal === 'micro-foncier' &&
    indicateurs.loyerAnnuelNetVacance > fiscal.plafondMicroFoncier
  ) {
    alertes.push({
      niveau: NIVEAUX.ORANGE,
      code: 'PLAFOND_MICRO_FONCIER',
      message: `Loyers ${Math.round(indicateurs.loyerAnnuelNetVacance)} € > plafond micro-foncier ${fiscal.plafondMicroFoncier} €. Bascule au régime réel à envisager.`
    });
  }

  // 🟠 Plafond micro-BIC LMNP dépassé (77 700 €)
  if (
    bien.regimeFiscal === 'micro-bic-lmnp' &&
    indicateurs.loyerAnnuelNetVacance > fiscal.plafondMicroBIC_LMNP
  ) {
    alertes.push({
      niveau: NIVEAUX.ORANGE,
      code: 'PLAFOND_MICRO_BIC_LMNP',
      message: `Recettes ${Math.round(indicateurs.loyerAnnuelNetVacance)} € > plafond micro-BIC LMNP ${fiscal.plafondMicroBIC_LMNP} €. Bascule au régime réel obligatoire.`
    });
  }

  // 🟠 Plafond micro-BIC tourisme classé dépassé (77 700 €)
  if (
    bien.regimeFiscal === 'micro-bic-tourisme-classe' &&
    indicateurs.loyerAnnuelNetVacance > fiscal.plafondMicroBIC_TourismeClasse
  ) {
    alertes.push({
      niveau: NIVEAUX.ORANGE,
      code: 'PLAFOND_MICRO_BIC_TOURISME_CLASSE',
      message: `Recettes ${Math.round(indicateurs.loyerAnnuelNetVacance)} € > plafond micro-BIC tourisme classé ${fiscal.plafondMicroBIC_TourismeClasse} €.`
    });
  }

  // 🔴 Plafond micro-BIC tourisme NON classé dépassé (15 000 €) — bloquant.
  if (
    bien.regimeFiscal === 'micro-bic-tourisme-non-classe' &&
    indicateurs.loyerAnnuelNetVacance > fiscal.plafondMicroBIC_TourismeNonClasse
  ) {
    alertes.push({
      niveau: NIVEAUX.ROUGE,
      code: 'PLAFOND_MICRO_BIC_TOURISME_NON_CLASSE',
      message: `Recettes ${Math.round(indicateurs.loyerAnnuelNetVacance)} € > plafond ${fiscal.plafondMicroBIC_TourismeNonClasse} € micro-BIC tourisme non classé. Classement Atout France ou bascule au réel obligatoire.`
    });
  }

  // 🟠 Réel LMNP : amortissements > recettes → plafonnés (info)
  if (
    bien.regimeFiscal === 'reel-lmnp' &&
    indicateurs.fiscalite?.amortReporte > 0
  ) {
    alertes.push({
      niveau: NIVEAUX.ORANGE,
      code: 'AMORT_PLAFONNE',
      message: `Amortissement plafonné : ${Math.round(indicateurs.fiscalite.amortReporte)} € reportés sur les exercices suivants (sans limite de durée).`
    });
  }

  // 🟠 Charges copro > 35 €/m²/an : copropriété lourde.
  if (bien.surface > 0 && bien.chargesCopro / bien.surface > 35) {
    const ratio = bien.chargesCopro / bien.surface;
    alertes.push({
      niveau: NIVEAUX.ORANGE,
      code: 'CHARGES_COPRO_LOURDES',
      message: `Charges copro ${ratio.toFixed(0)} €/m²/an > 35 €/m². Copropriété potentiellement coûteuse.`
    });
  }

  // 🟠 Taux d'effort > 35 % (mensualité totale / revenus mensuels nets du foyer).
  if (bien.revenusMensuelsNets > 0) {
    const tauxEffort = indicateurs.mensualiteTotale / bien.revenusMensuelsNets;
    if (tauxEffort > 0.35) {
      alertes.push({
        niveau: NIVEAUX.ORANGE,
        code: 'TAUX_EFFORT',
        message: `Taux d'effort ${(tauxEffort * 100).toFixed(0)} % > 35 % (mensualité ${Math.round(indicateurs.mensualiteTotale)} € / revenus ${Math.round(bien.revenusMensuelsNets)} €). Risque de refus bancaire.`
      });
    }
  }

  return alertes;
}

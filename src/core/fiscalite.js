// src/core/fiscalite.js
// Calculs fiscaux par régime.
// Lot 3a : ajout du réel foncier, micro-BIC (LMNP / tourisme), réel LMNP avec amortissements.
import { FISCAL } from './constants.js';

/**
 * Calcul fiscal micro-foncier (LD nue).
 * Abattement forfaitaire de 30 % sur les loyers nets de vacance,
 * puis IR au TMI + prélèvements sociaux 17.2 %.
 */
export function microFoncier(loyersAnnuels, tmi = FISCAL.TMI, ps = FISCAL.PS) {
  const revenuImposable = loyersAnnuels * (1 - FISCAL.abattementMicroFoncier);
  const impotIR = revenuImposable * tmi;
  const impotPS = revenuImposable * ps;
  return {
    regime: 'micro-foncier',
    revenuImposable,
    impotIR,
    impotPS,
    impotTotal: impotIR + impotPS,
    abattement: FISCAL.abattementMicroFoncier,
    plafond: FISCAL.plafondMicroFoncier,
    depassePlafond: loyersAnnuels > FISCAL.plafondMicroFoncier
  };
}

/**
 * Calcul fiscal micro-BIC (LMNP classique, meublé tourisme classé/non classé).
 * Abattement variable selon le sous-régime, plafond également.
 *
 * @param {number} loyersAnnuels
 * @param {number} abattement - ex 0.50 pour LMNP, 0.30 pour tourisme non classé
 * @param {number} plafond
 * @param {number} [tmi]
 * @param {number} [ps]
 */
export function microBIC(loyersAnnuels, abattement, plafond, tmi = FISCAL.TMI, ps = FISCAL.PS) {
  const revenuImposable = loyersAnnuels * (1 - abattement);
  const impotIR = revenuImposable * tmi;
  const impotPS = revenuImposable * ps;
  return {
    regime: 'micro-bic',
    revenuImposable,
    impotIR,
    impotPS,
    impotTotal: impotIR + impotPS,
    abattement,
    plafond,
    depassePlafond: loyersAnnuels > plafond
  };
}

/**
 * Calcul fiscal réel foncier (LD nue).
 *
 * Charges déductibles totales = charges récurrentes + intérêts d'emprunt + travaux + assurance + taxe foncière.
 * Si revenu foncier brut < 0 :
 *   - la part hors intérêts est imputable au revenu global jusqu'à 10 700 € (économie fiscale au TMI),
 *   - le reste (et la part liée aux intérêts) est reportable sur les revenus fonciers futurs (10 ans).
 *
 * @param {number} loyersAnnuels
 * @param {number} chargesAnnuellesHorsInterets - charges récurrentes hors emprunt
 * @param {number} interetsAnnuels - intérêts d'emprunt année 1
 * @param {number} [tmi]
 * @param {number} [ps]
 */
export function reelFoncier(
  loyersAnnuels,
  chargesAnnuellesHorsInterets,
  interetsAnnuels,
  tmi = FISCAL.TMI,
  ps = FISCAL.PS
) {
  const chargesDeductibles = chargesAnnuellesHorsInterets + interetsAnnuels;
  const revenuFoncierBrut = loyersAnnuels - chargesDeductibles;

  if (revenuFoncierBrut >= 0) {
    return {
      regime: 'reel-foncier',
      chargesDeductibles,
      interetsAnnuels,
      resultatAvantAmort: revenuFoncierBrut,
      revenuImposable: revenuFoncierBrut,
      impotIR: revenuFoncierBrut * tmi,
      impotPS: revenuFoncierBrut * ps,
      impotTotal: revenuFoncierBrut * (tmi + ps),
      deficit: 0,
      deficitImputableRevenuGlobal: 0,
      deficitReportable: 0,
      depassePlafond: false
    };
  }

  // Déficit foncier : la part hors intérêts est imputable au revenu global,
  // dans la limite annuelle de 10 700 €. La part liée aux intérêts et le surplus
  // sont reportables sur les revenus fonciers des 10 années suivantes.
  const deficit = -revenuFoncierBrut;
  const deficitHorsInterets = Math.max(0, deficit - interetsAnnuels);
  const deficitImputable = Math.min(deficitHorsInterets, FISCAL.plafondDeficitFoncierImputable);
  const deficitReportable = deficit - deficitImputable;
  // Économie fiscale = imputation du déficit au TMI (les PS ne sont pas dus).
  const economieFiscale = deficitImputable * tmi;

  return {
    regime: 'reel-foncier',
    chargesDeductibles,
    interetsAnnuels,
    resultatAvantAmort: revenuFoncierBrut,
    revenuImposable: 0,
    impotIR: -economieFiscale,
    impotPS: 0,
    impotTotal: -economieFiscale,
    deficit,
    deficitImputableRevenuGlobal: deficitImputable,
    deficitReportable,
    depassePlafond: false
  };
}

/**
 * Calcul fiscal réel LMNP (avec amortissement).
 *
 * Bases d'amortissement :
 *   - bâti : (prix + frais notaire) × quote-part bâti / durée bâti
 *   - mobilier : mobilier / durée mobilier
 *   - travaux : travaux / durée travaux
 *
 * L'amortissement ne peut pas créer de déficit : il est plafonné à
 * MAX(résultatAvantAmort, 0). Le surplus est reporté sans limite de durée.
 * Si le résultat avant amort est lui-même négatif, on a un déficit BIC
 * reportable 10 ans (sur BIC futurs uniquement, pas d'imputation revenu global).
 *
 * @param {object} p
 * @param {number} p.loyersAnnuels
 * @param {number} p.chargesDeductiblesHorsAmort - charges récurrentes (hors intérêts)
 * @param {number} p.interetsAnnuels
 * @param {number} p.prixAcquisition
 * @param {number} p.fraisNotaire
 * @param {number} [p.mobilier]
 * @param {number} [p.travaux]
 * @param {number} [p.tmi]
 * @param {number} [p.ps]
 * @param {number} [p.plafond] - plafond du régime (77 700 € LMNP par défaut)
 */
export function reelLMNP({
  loyersAnnuels,
  chargesDeductiblesHorsAmort,
  interetsAnnuels,
  prixAcquisition,
  fraisNotaire,
  mobilier = 0,
  travaux = 0,
  tmi = FISCAL.TMI,
  ps = FISCAL.PS,
  plafond = FISCAL.plafondMicroBIC_LMNP
}) {
  const baseBati = (prixAcquisition + fraisNotaire) * FISCAL.amortBatiQuotePart;
  const amortBati = baseBati / FISCAL.amortBatiDuree;
  const amortMobilier = mobilier > 0 ? mobilier / FISCAL.amortMobilierDuree : 0;
  const amortTravaux = travaux > 0 ? travaux / FISCAL.amortTravauxDuree : 0;
  const amortTotal = amortBati + amortMobilier + amortTravaux;

  const chargesDeductibles = chargesDeductiblesHorsAmort + interetsAnnuels;
  const resultatAvantAmort = loyersAnnuels - chargesDeductibles;

  // L'amortissement ne peut pas créer ni aggraver un déficit.
  const amortDeductible = Math.min(amortTotal, Math.max(resultatAvantAmort, 0));
  const amortReporte = amortTotal - amortDeductible;

  let resultatFiscal;
  if (resultatAvantAmort >= 0) {
    resultatFiscal = resultatAvantAmort - amortDeductible;
  } else {
    resultatFiscal = resultatAvantAmort;
  }

  let impotIR = 0, impotPS = 0;
  if (resultatFiscal > 0) {
    impotIR = resultatFiscal * tmi;
    impotPS = resultatFiscal * ps;
  }

  return {
    regime: 'reel-lmnp',
    chargesDeductibles,
    interetsAnnuels,
    amortBati,
    amortMobilier,
    amortTravaux,
    amortTotal,
    amortDeductible,
    amortReporte,
    resultatAvantAmort,
    resultatFiscal,
    revenuImposable: Math.max(0, resultatFiscal),
    impotIR,
    impotPS,
    impotTotal: impotIR + impotPS,
    deficitBIC: resultatFiscal < 0 ? -resultatFiscal : 0,
    plafond,
    depassePlafond: loyersAnnuels > plafond
  };
}

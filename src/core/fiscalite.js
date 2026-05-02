// src/core/fiscalite.js
// Calculs fiscaux par régime.
// Lot 5 : les fonctions acceptent un paramètre `fiscal` (constantes effectives,
// fournies par calcul.js depuis loadFiscal()). Si non fourni, on retombe sur
// les défauts livrés dans constants.js.
import { FISCAL } from './constants.js';

/** Calcul fiscal micro-foncier (LD nue, abattement 30 %). */
export function microFoncier(loyersAnnuels, tmi, ps, fiscal = FISCAL) {
  const _tmi = tmi ?? fiscal.TMI;
  const _ps = ps ?? fiscal.PS;
  const revenuImposable = loyersAnnuels * (1 - fiscal.abattementMicroFoncier);
  const impotIR = revenuImposable * _tmi;
  const impotPS = revenuImposable * _ps;
  return {
    regime: 'micro-foncier',
    revenuImposable,
    impotIR,
    impotPS,
    impotTotal: impotIR + impotPS,
    abattement: fiscal.abattementMicroFoncier,
    plafond: fiscal.plafondMicroFoncier,
    depassePlafond: loyersAnnuels > fiscal.plafondMicroFoncier
  };
}

/** Micro-BIC (LMNP / tourisme classé / non classé) : abattement et plafond paramétriques. */
export function microBIC(loyersAnnuels, abattement, plafond, tmi, ps, fiscal = FISCAL) {
  const _tmi = tmi ?? fiscal.TMI;
  const _ps = ps ?? fiscal.PS;
  const revenuImposable = loyersAnnuels * (1 - abattement);
  const impotIR = revenuImposable * _tmi;
  const impotPS = revenuImposable * _ps;
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
 * Réel foncier (LD nue) : déduction des charges + intérêts d'emprunt, gestion
 * du déficit foncier (part hors intérêts imputable au revenu global jusqu'à
 * 10 700 € au TMI ; la part liée aux intérêts et le surplus sont reportables
 * sur les revenus fonciers des 10 années suivantes).
 */
export function reelFoncier(
  loyersAnnuels,
  chargesAnnuellesHorsInterets,
  interetsAnnuels,
  tmi,
  ps,
  fiscal = FISCAL
) {
  const _tmi = tmi ?? fiscal.TMI;
  const _ps = ps ?? fiscal.PS;
  const chargesDeductibles = chargesAnnuellesHorsInterets + interetsAnnuels;
  const revenuFoncierBrut = loyersAnnuels - chargesDeductibles;

  if (revenuFoncierBrut >= 0) {
    return {
      regime: 'reel-foncier',
      chargesDeductibles,
      interetsAnnuels,
      resultatAvantAmort: revenuFoncierBrut,
      revenuImposable: revenuFoncierBrut,
      impotIR: revenuFoncierBrut * _tmi,
      impotPS: revenuFoncierBrut * _ps,
      impotTotal: revenuFoncierBrut * (_tmi + _ps),
      deficit: 0,
      deficitImputableRevenuGlobal: 0,
      deficitReportable: 0,
      depassePlafond: false
    };
  }

  const deficit = -revenuFoncierBrut;
  const deficitHorsInterets = Math.max(0, deficit - interetsAnnuels);
  const deficitImputable = Math.min(deficitHorsInterets, fiscal.plafondDeficitFoncierImputable);
  const deficitReportable = deficit - deficitImputable;
  const economieFiscale = deficitImputable * _tmi;

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
 * Réel LMNP avec amortissement.
 * L'amortissement ne peut pas créer/aggraver de déficit : il est plafonné à
 * MAX(résultatAvantAmort, 0). Le surplus est reporté sans limite de durée.
 */
export function reelLMNP({
  loyersAnnuels,
  chargesDeductiblesHorsAmort,
  interetsAnnuels,
  prixAcquisition,
  fraisNotaire,
  mobilier = 0,
  travaux = 0,
  tmi,
  ps,
  plafond,
  fiscal = FISCAL
}) {
  const _tmi = tmi ?? fiscal.TMI;
  const _ps = ps ?? fiscal.PS;
  const _plafond = plafond ?? fiscal.plafondMicroBIC_LMNP;

  const baseBati = (prixAcquisition + fraisNotaire) * fiscal.amortBatiQuotePart;
  const amortBati = baseBati / fiscal.amortBatiDuree;
  const amortMobilier = mobilier > 0 ? mobilier / fiscal.amortMobilierDuree : 0;
  const amortTravaux = travaux > 0 ? travaux / fiscal.amortTravauxDuree : 0;
  const amortTotal = amortBati + amortMobilier + amortTravaux;

  const chargesDeductibles = chargesDeductiblesHorsAmort + interetsAnnuels;
  const resultatAvantAmort = loyersAnnuels - chargesDeductibles;

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
    impotIR = resultatFiscal * _tmi;
    impotPS = resultatFiscal * _ps;
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
    plafond: _plafond,
    depassePlafond: loyersAnnuels > _plafond
  };
}

// src/core/calcul.js
// Orchestrateur : à partir d'un objet « bien » saisi, calcule l'ensemble des
// indicateurs financiers, fiscaux et de scoring nécessaires à la restitution.

import {
  mensualiteCredit,
  mensualiteAssurance,
  tableauAmortissement,
  coutTotalAcquisition,
  rendementBrut,
  rendementNet,
  rendementNetNet,
  cashflowMensuel
} from './finance.js';
import { microFoncier, microBIC, reelFoncier, reelLMNP } from './fiscalite.js';
import { FISCAL } from './constants.js';
import { scoreBien } from './scoring.js';
import { evaluerAlertes } from './alertes.js';
import { loadPonderations } from '../persistence/storage.js';

/**
 * Loyer annuel brut net de vacance, selon le type de location.
 * - LD nue / meublée : loyerMensuelHC × (12 - vacanceMois)
 * - LCD              : ADR × 365 × tauxOccupation
 * - LMD              : loyer mensuel forfaitaire × 12 × tauxOccupation
 * - Coloc            : nbChambres × loyerChambre × (12 - vacanceChambre)
 */
function loyerAnnuelBrut(bien) {
  const type = bien.typeLocation || 'LD_nue';
  switch (type) {
    case 'LCD': {
      const adr = bien.lcdADR || 0;
      const to = bien.lcdTauxOccupation || 0;
      return adr * 365 * to;
    }
    case 'LMD': {
      const loyer = bien.lmdLoyerMensuel || 0;
      const to = bien.lmdTauxOccupation || 0;
      return loyer * 12 * to;
    }
    case 'coloc_meublee':
    case 'coloc_nue': {
      const n = bien.colocNbChambres || 0;
      const lc = bien.colocLoyerChambre || 0;
      const vc = bien.colocVacanceChambre ?? 0;
      return n * lc * (12 - vc);
    }
    default: { // LD_nue, LD_meublee
      const loyer = bien.loyerMensuelHC || 0;
      const vacance = bien.vacanceMois ?? 0;
      return loyer * (12 - vacance);
    }
  }
}

/**
 * Frais d'exploitation annuels (LCD principalement) qui s'ajoutent aux
 * charges déductibles. Pour les autres types : 0 (les frais de gestion
 * locative sont déjà gérés via fraisGestionTaux).
 */
function fraisExploitationAnnuels(bien, loyerAnnuel) {
  if (bien.typeLocation === 'LCD') {
    const conciergerie = (bien.lcdFraisConciergerie || 0) * loyerAnnuel;
    const consommables = (bien.lcdConsommablesMensuels || 0) * 12;
    return conciergerie + consommables;
  }
  return 0;
}

/**
 * Loyer mensuel pour le calcul du cash-flow (convention « gros chiffres » du
 * cahier des charges : on prend le loyer mensuel typique sans soustraire la
 * vacance pour cette ligne, car la vacance est déjà reflétée dans l'annuel).
 */
function loyerMensuelTypique(bien) {
  const type = bien.typeLocation || 'LD_nue';
  switch (type) {
    case 'LCD':
      return ((bien.lcdADR || 0) * 365 * (bien.lcdTauxOccupation || 0)) / 12;
    case 'LMD':
      return (bien.lmdLoyerMensuel || 0) * (bien.lmdTauxOccupation || 0);
    case 'coloc_meublee':
    case 'coloc_nue':
      return (bien.colocNbChambres || 0) * (bien.colocLoyerChambre || 0);
    default:
      return bien.loyerMensuelHC || 0;
  }
}

/**
 * Sélectionne et exécute le calcul fiscal correspondant au régime du bien.
 * @returns {object} sortie standardisée incluant `regime`, `impotTotal`, etc.
 */
function calculerFiscalite(bien, contexte) {
  const tmi = bien.tmi ?? FISCAL.TMI;
  const ps = FISCAL.PS;
  const regime = bien.regimeFiscal || 'micro-foncier';

  switch (regime) {
    case 'micro-foncier':
      return microFoncier(contexte.loyersAnnuels, tmi, ps);

    case 'reel-foncier':
      return reelFoncier(
        contexte.loyersAnnuels,
        contexte.chargesAnnuellesHorsInterets,
        contexte.interetsAnnuels,
        tmi,
        ps
      );

    case 'micro-bic-lmnp':
      return microBIC(
        contexte.loyersAnnuels,
        FISCAL.abattementMicroBIC_LMNP,
        FISCAL.plafondMicroBIC_LMNP,
        tmi,
        ps
      );

    case 'micro-bic-tourisme-classe':
      return microBIC(
        contexte.loyersAnnuels,
        FISCAL.abattementMicroBIC_TourismeClasse,
        FISCAL.plafondMicroBIC_TourismeClasse,
        tmi,
        ps
      );

    case 'micro-bic-tourisme-non-classe':
      return microBIC(
        contexte.loyersAnnuels,
        FISCAL.abattementMicroBIC_TourismeNonClasse,
        FISCAL.plafondMicroBIC_TourismeNonClasse,
        tmi,
        ps
      );

    case 'reel-lmnp':
      return reelLMNP({
        loyersAnnuels: contexte.loyersAnnuels,
        chargesDeductiblesHorsAmort: contexte.chargesAnnuellesHorsInterets,
        interetsAnnuels: contexte.interetsAnnuels,
        prixAcquisition: bien.prix || 0,
        fraisNotaire: bien.fraisNotaire || 0,
        mobilier: bien.mobilier || 0,
        travaux: bien.travauxAPrevoir || 0,
        tmi,
        ps,
        plafond: FISCAL.plafondMicroBIC_LMNP
      });

    default:
      return microFoncier(contexte.loyersAnnuels, tmi, ps);
  }
}

/**
 * Construit l'ensemble des indicateurs pour un bien (LD nue / LD meublée).
 * @param {object} bien
 * @returns {object} indicateurs + fiscalité + scoring + alertes + amortissement résumé
 */
export function calculerLot1(bien) {
  // ─── Coût total d'acquisition + capital emprunté ──────────────────
  const CTA = coutTotalAcquisition({
    prix: bien.prix || 0,
    fraisNotaire: bien.fraisNotaire || 0,
    travaux: bien.travauxAPrevoir || 0,
    mobilier: bien.mobilier || 0
  });
  const capitalEmprunte = Math.max(0, CTA - (bien.apport || 0));

  // ─── Mensualités ──────────────────────────────────────────────────
  const mCredit = mensualiteCredit(capitalEmprunte, bien.tauxNominal || 0, bien.dureeCredit || 0);
  const mAssurance = mensualiteAssurance(capitalEmprunte, bien.tauxAssurance || 0);
  const mensualiteTotale = mCredit + mAssurance;

  // ─── Tableau d'amortissement (mois par mois sur toute la durée) ───
  const amort = tableauAmortissement(capitalEmprunte, bien.tauxNominal || 0, bien.dureeCredit || 0);
  function capitalRestantA(annees) {
    const i = annees * 12 - 1;
    if (i < 0 || i >= amort.length) return null;
    return amort[i].capitalRestant;
  }
  const resumeAmort = {
    a5: capitalRestantA(5),
    a10: capitalRestantA(10),
    a15: capitalRestantA(15),
    a20: capitalRestantA(20)
  };
  // Intérêts d'emprunt année 1 — utiles pour les régimes au réel.
  const interetsAnnee1 = amort.slice(0, 12).reduce((s, l) => s + l.interets, 0);

  // ─── Loyers ───────────────────────────────────────────────────────
  const loyerMensuelHC = loyerMensuelTypique(bien);
  const loyerAnnuelNetVacance = loyerAnnuelBrut(bien);

  // ─── Charges récurrentes annuelles (hors emprunt) ─────────────────
  const fraisGestionTaux = bien.fraisGestionTaux || 0;
  const assurancePNO = bien.assurancePNO || 0;
  const fraisGestionAnnuel = loyerAnnuelNetVacance * fraisGestionTaux;
  const fraisExploitation = fraisExploitationAnnuels(bien, loyerAnnuelNetVacance);
  // Honoraires comptables : par défaut 800 €/an si régime au réel BIC.
  const isReelBIC = bien.regimeFiscal === 'reel-lmnp';
  const honorairesComptables = isReelBIC
    ? (bien.honorairesComptables ?? 800)
    : 0;
  const chargesAnnuellesHorsInterets =
    (bien.chargesCopro || 0) +
    (bien.taxeFonciere || 0) +
    assurancePNO +
    fraisGestionAnnuel +
    fraisExploitation +
    honorairesComptables;

  // ─── Fiscalité (dispatch par régime) ──────────────────────────────
  const fisc = calculerFiscalite(bien, {
    loyersAnnuels: loyerAnnuelNetVacance,
    chargesAnnuellesHorsInterets,
    interetsAnnuels: interetsAnnee1
  });
  const impotMensuel = fisc.impotTotal / 12;

  // ─── Indicateurs financiers ───────────────────────────────────────
  const rB = rendementBrut(loyerAnnuelNetVacance, CTA);
  const rN = rendementNet(loyerAnnuelNetVacance, chargesAnnuellesHorsInterets, CTA);
  const rNN = rendementNetNet(loyerAnnuelNetVacance, chargesAnnuellesHorsInterets, fisc.impotTotal, CTA);
  // Cash-flow mensuel : convention « gros chiffres » du cahier des charges :
  // loyer mensuel HC - charges mensualisées - mensualité totale - impôt mensuel.
  const cashflow = cashflowMensuel({
    loyerMensuel: loyerMensuelHC,
    chargesMensuelles: chargesAnnuellesHorsInterets / 12,
    mensualite: mensualiteTotale,
    impotMensuel
  });
  // Effort d'épargne = sortie de trésorerie nette mensuelle (positif = effort).
  const effortEpargne = -cashflow;

  // ─── Scoring complet (F1 + F2 + F3 + F4) ──────────────────────────
  const ponderations = loadPonderations();
  const scoring = scoreBien(
    bien,
    {
      rendementBrut: rB,
      rendementNet: rN,
      rendementNetNet: rNN,
      cashflowMensuel: cashflow,
      effortEpargne
    },
    ponderations
  );

  const indicateurs = {
    CTA,
    capitalEmprunte,
    mensualiteCredit: mCredit,
    mensualiteAssurance: mAssurance,
    mensualiteTotale,
    loyerAnnuelNetVacance,
    chargesAnnuelles: chargesAnnuellesHorsInterets,
    interetsAnnee1,
    rendementBrut: rB,
    rendementNet: rN,
    rendementNetNet: rNN,
    cashflowMensuel: cashflow,
    effortEpargne,
    fiscalite: fisc,
    impotMensuel,
    resumeAmort,
    scoring
  };

  indicateurs.alertes = evaluerAlertes(bien, indicateurs);
  return indicateurs;
}

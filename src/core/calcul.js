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
import { microFoncier } from './fiscalite.js';
import { scoreBien } from './scoring.js';
import { evaluerAlertes } from './alertes.js';
import { loadPonderations } from '../persistence/storage.js';

/**
 * Construit l'ensemble des indicateurs pour un bien LD nue / micro-foncier.
 * @param {object} bien
 * @returns {object} indicateurs + fiscalité + scoring + alertes + amortissement résumé
 */
export function calculerLot1(bien) {
  // ─── Coût total d'acquisition + capital emprunté ──────────────────
  const CTA = coutTotalAcquisition({
    prix: bien.prix || 0,
    fraisNotaire: bien.fraisNotaire || 0,
    travaux: 0,
    mobilier: 0
  });
  const capitalEmprunte = Math.max(0, CTA - (bien.apport || 0));

  // ─── Mensualités ──────────────────────────────────────────────────
  const mCredit = mensualiteCredit(capitalEmprunte, bien.tauxNominal || 0, bien.dureeCredit || 0);
  const mAssurance = mensualiteAssurance(capitalEmprunte, bien.tauxAssurance || 0);
  const mensualiteTotale = mCredit + mAssurance;

  // ─── Loyers ───────────────────────────────────────────────────────
  const loyerMensuelHC = bien.loyerMensuelHC || 0;
  const vacanceMois = bien.vacanceMois ?? 0;
  // Loyers annuels nets de vacance.
  const loyerAnnuelNetVacance = loyerMensuelHC * (12 - vacanceMois);

  // ─── Charges récurrentes annuelles ────────────────────────────────
  const fraisGestionTaux = bien.fraisGestionTaux || 0; // ex 0.05
  const assurancePNO = bien.assurancePNO || 0;
  const fraisGestionAnnuel = loyerAnnuelNetVacance * fraisGestionTaux;
  const chargesAnnuelles =
    (bien.chargesCopro || 0) +
    (bien.taxeFonciere || 0) +
    assurancePNO +
    fraisGestionAnnuel;

  // ─── Fiscalité micro-foncier ──────────────────────────────────────
  const fisc = microFoncier(loyerAnnuelNetVacance, bien.tmi, undefined);
  const impotMensuel = fisc.impotTotal / 12;

  // ─── Indicateurs financiers ───────────────────────────────────────
  const rB = rendementBrut(loyerAnnuelNetVacance, CTA);
  const rN = rendementNet(loyerAnnuelNetVacance, chargesAnnuelles, CTA);
  const rNN = rendementNetNet(loyerAnnuelNetVacance, chargesAnnuelles, fisc.impotTotal, CTA);
  // Cash-flow mensuel : on suit la convention du cahier des charges :
  // loyer mensuel HC - charges mensualisées - mensualité totale - impôt mensuel.
  const cashflow = cashflowMensuel({
    loyerMensuel: loyerMensuelHC,
    chargesMensuelles: chargesAnnuelles / 12,
    mensualite: mensualiteTotale,
    impotMensuel
  });
  // Effort d'épargne = sortie de trésorerie nette mensuelle (positif = effort).
  const effortEpargne = -cashflow;

  // ─── Tableau d'amortissement (résumé 5/10/15/20 ans) ──────────────
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
    chargesAnnuelles,
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

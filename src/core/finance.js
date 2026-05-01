// src/core/finance.js
// Calculs financiers : crédit, rendements, cash-flow.

/**
 * Mensualité de crédit (annuité constante hors assurance).
 * Formule classique : M = C × i / (1 - (1 + i)^-n)
 *  - C : capital emprunté
 *  - i : taux mensuel = tauxAnnuel / 12
 *  - n : nombre de mensualités
 *
 * @param {number} capital - Capital emprunté (€)
 * @param {number} tauxAnnuel - Taux nominal annuel (ex: 0.0326)
 * @param {number} dureeAnnees - Durée en années
 * @returns {number} Mensualité hors assurance (€)
 */
export function mensualiteCredit(capital, tauxAnnuel, dureeAnnees) {
  if (capital <= 0 || dureeAnnees <= 0) return 0;
  const n = dureeAnnees * 12;
  if (tauxAnnuel === 0) return capital / n;
  const i = tauxAnnuel / 12;
  return (capital * i) / (1 - Math.pow(1 + i, -n));
}

/**
 * Mensualité d'assurance emprunteur calculée sur capital initial
 * (taux constant, indépendant du capital restant dû).
 * @param {number} capital - Capital initial (€)
 * @param {number} tauxAssuranceAnnuel - Taux annuel d'assurance (ex: 0.002)
 * @returns {number} Mensualité d'assurance (€)
 */
export function mensualiteAssurance(capital, tauxAssuranceAnnuel) {
  if (capital <= 0) return 0;
  return (capital * tauxAssuranceAnnuel) / 12;
}

/**
 * Tableau d'amortissement complet, mois par mois.
 * @param {number} capital
 * @param {number} tauxAnnuel
 * @param {number} dureeAnnees
 * @returns {Array<{mois:number, interets:number, capitalRembourse:number, capitalRestant:number}>}
 */
export function tableauAmortissement(capital, tauxAnnuel, dureeAnnees) {
  const lignes = [];
  if (capital <= 0 || dureeAnnees <= 0) return lignes;
  const n = dureeAnnees * 12;
  const i = tauxAnnuel / 12;
  const M = mensualiteCredit(capital, tauxAnnuel, dureeAnnees);
  let restant = capital;
  for (let mois = 1; mois <= n; mois++) {
    const interets = restant * i;
    let capitalRembourse = M - interets;
    if (mois === n) capitalRembourse = restant; // ajuster la dernière ligne
    restant = Math.max(0, restant - capitalRembourse);
    lignes.push({
      mois,
      interets,
      capitalRembourse,
      capitalRestant: restant
    });
  }
  return lignes;
}

/** Coût total d'acquisition (CTA). */
export function coutTotalAcquisition({ prix, fraisNotaire, travaux = 0, mobilier = 0 }) {
  return (prix || 0) + (fraisNotaire || 0) + (travaux || 0) + (mobilier || 0);
}

/** Rendement brut annuel (%). */
export function rendementBrut(loyerAnnuelHC, CTA) {
  if (!CTA) return 0;
  return (loyerAnnuelHC / CTA) * 100;
}

/**
 * Rendement net avant fiscalité (%).
 * Le « net charges » se calcule avant impôt : (loyer net vacance - charges récurrentes) / CTA
 */
export function rendementNet(loyerAnnuel, chargesAnnuelles, CTA) {
  if (!CTA) return 0;
  return ((loyerAnnuel - chargesAnnuelles) / CTA) * 100;
}

/**
 * Rendement net-net après fiscalité (%).
 * @param {number} loyerAnnuel - loyer annuel net de vacance
 * @param {number} chargesAnnuelles - charges récurrentes annuelles
 * @param {number} impotAnnuel - impôt + PS annuel
 * @param {number} CTA
 * @returns {number} Rendement net-net (%)
 */
export function rendementNetNet(loyerAnnuel, chargesAnnuelles, impotAnnuel, CTA) {
  if (!CTA) return 0;
  return ((loyerAnnuel - chargesAnnuelles - impotAnnuel) / CTA) * 100;
}

/**
 * Cash-flow mensuel net.
 * On part du loyer net de vacance (mensualisé) et on retranche : charges, mensualité, impôt.
 * @param {{loyerMensuel:number, chargesMensuelles:number, mensualite:number, impotMensuel:number, vacanceMensuelle?:number}} p
 *  - vacanceMensuelle: optionnel, si fourni est déjà retranché du loyerMensuel,
 *    sinon on suppose que `loyerMensuel` est déjà net de vacance.
 * @returns {number} Cash-flow mensuel (€)
 */
export function cashflowMensuel({ loyerMensuel, chargesMensuelles, mensualite, impotMensuel, vacanceMensuelle = 0 }) {
  return loyerMensuel - vacanceMensuelle - chargesMensuelles - mensualite - impotMensuel;
}

// src/core/tri.js
// TRI sur 10 ans : projection des flux de trésorerie + plus-value à la revente.
import { FISCAL } from './constants.js';

/**
 * Plus-value imposable à la revente après 10 ans (régime des PV immobilières
 * des particuliers).
 *
 * Abattements pour 10 ans de détention :
 *   - IR : 6 ans × 6 %  = 36 %  (à partir de la 6e année)
 *   - PS : 6 ans × 1.65 % = 9.9 %
 *
 * Pour le réel LMNP (loi de finances 2025) : réintégration des amortissements
 * bâti cumulés dans la base imposable. Pour les autres régimes : pas de
 * réintégration.
 *
 * @param {object} p
 * @param {number} p.valeurRevente
 * @param {number} p.prixAcquisition
 * @param {number} p.fraisNotaire
 * @param {number} [p.travaux]
 * @param {string} p.regime
 * @param {number} [p.amortBatiAnnuel] - utile uniquement pour le réel LMNP
 * @param {number} [p.dureeAns]
 */
export function impotPlusValue({
  valeurRevente,
  prixAcquisition,
  fraisNotaire,
  travaux = 0,
  regime,
  amortBatiAnnuel = 0,
  dureeAns = 10
}) {
  const baseAcquisition = prixAcquisition + fraisNotaire + travaux;
  let plusValueBrute = valeurRevente - baseAcquisition;

  // Réintégration amortissements bâti cumulés (LMNP réel uniquement).
  if (regime === 'reel-lmnp') {
    plusValueBrute += amortBatiAnnuel * dureeAns;
  }

  if (plusValueBrute <= 0) {
    return { plusValueBrute, plusValueImposableIR: 0, plusValueImposablePS: 0, impotIR: 0, impotPS: 0, impotTotal: 0 };
  }

  // À 10 ans : 5 années comptées (6e à 10e) pour IR à 6 % = 30 %... non, en fait
  // c'est la 6e année comprise. Le cahier des charges arrête : 6 × 6 % = 36 %
  // pour IR (6 années entre la 6e et la 10e incluses) et 6 × 1.65 % = 9.9 % pour PS.
  const abattementIR = 6 * 0.06;     // 36 %
  const abattementPS = 6 * 0.0165;   // 9.9 %

  const pvIR = plusValueBrute * (1 - abattementIR);
  const pvPS = plusValueBrute * (1 - abattementPS);
  const impotIR = pvIR * 0.19;
  const impotPS = pvPS * 0.172;

  return {
    plusValueBrute,
    plusValueImposableIR: pvIR,
    plusValueImposablePS: pvPS,
    impotIR,
    impotPS,
    impotTotal: impotIR + impotPS
  };
}

/**
 * VAN d'une suite de flux à un taux donné.
 * flux[0] est le flux à l'instant 0 (typiquement négatif).
 */
function VAN(flux, taux) {
  let s = 0;
  for (let k = 0; k < flux.length; k++) {
    s += flux[k] / Math.pow(1 + taux, k);
  }
  return s;
}

/**
 * Calcul du TRI par bisection.
 * @param {number[]} flux - flux annuels (k = 0 à n)
 * @param {number} [borneMin]
 * @param {number} [borneMax]
 * @param {number} [tolerance]
 * @returns {number|null} TRI en décimal (ex 0.065 pour 6.5 %), ou null si non convergent
 */
export function calculerTRI(flux, borneMin = -0.5, borneMax = 0.5, tolerance = 0.0001) {
  let a = borneMin, b = borneMax;
  let vanA = VAN(flux, a);
  let vanB = VAN(flux, b);
  // Si VAN ne change pas de signe sur [a, b], on étend les bornes une fois.
  if (vanA * vanB > 0) {
    a = -0.95;
    b = 5;
    vanA = VAN(flux, a);
    vanB = VAN(flux, b);
    if (vanA * vanB > 0) return null;
  }
  for (let iter = 0; iter < 200; iter++) {
    const m = (a + b) / 2;
    const vanM = VAN(flux, m);
    if (Math.abs(vanM) < 0.01 || (b - a) < tolerance) return m;
    if (vanA * vanM < 0) {
      b = m;
      vanB = vanM;
    } else {
      a = m;
      vanA = vanM;
    }
  }
  return (a + b) / 2;
}

/**
 * TRI 10 ans pour un bien.
 * Hypothèses simplificatrices :
 *  - Cash-flow annuel constant (pas d'inflation des loyers).
 *  - Revalorisation du bien : revalorisationBienAnnuelle (1 % / an par défaut).
 *  - Capital restant dû à 10 ans lu dans le tableau d'amortissement.
 *
 * @param {object} bien
 * @param {object} indicateurs - sortie de calculerLot1 (avant scoring)
 * @returns {{tri:number|null, valeurRevente:number, capitalRestantA10:number, valeurNetteRevente:number, fluxAnnuels:number[], pv:object}}
 */
export function tri10ans(bien, indicateurs) {
  const apport = bien.apport || 0;
  const cashflowAnnuel = (indicateurs.cashflowMensuel || 0) * 12;

  const valeurRevente = (bien.prix || 0)
    * Math.pow(1 + FISCAL.revalorisationBienAnnuelle, 10);
  const capitalRestantA10 = indicateurs.resumeAmort?.a10 ?? 0;

  const pv = impotPlusValue({
    valeurRevente,
    prixAcquisition: bien.prix || 0,
    fraisNotaire: bien.fraisNotaire || 0,
    travaux: bien.travauxAPrevoir || 0,
    regime: bien.regimeFiscal,
    amortBatiAnnuel: indicateurs.fiscalite?.amortBati || 0,
    dureeAns: 10
  });

  const valeurNetteRevente = valeurRevente - capitalRestantA10 - pv.impotTotal;

  // Vecteur de flux : flux 0 = -apport, flux 1..9 = cash-flow annuel,
  // flux 10 = cash-flow année 10 + valeur nette de revente.
  const flux = [];
  flux.push(-apport);
  for (let k = 1; k <= 9; k++) flux.push(cashflowAnnuel);
  flux.push(cashflowAnnuel + valeurNetteRevente);

  const tri = calculerTRI(flux);

  return {
    tri,
    valeurRevente,
    capitalRestantA10,
    valeurNetteRevente,
    fluxAnnuels: flux,
    pv
  };
}

// src/utils/validators.js
// Validations basiques pour le formulaire de saisie.

export function isPositiveNumber(v) {
  return typeof v === 'number' && !isNaN(v) && v > 0;
}

export function isNonNegativeNumber(v) {
  return typeof v === 'number' && !isNaN(v) && v >= 0;
}

export function isInRange(v, min, max) {
  return typeof v === 'number' && !isNaN(v) && v >= min && v <= max;
}

export function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Valide un objet bien (LD nue / micro-foncier — Lot 1).
 * Retourne { ok:boolean, errors: { [field]: message } }.
 */
export function validerBien(bien) {
  const errors = {};

  if (!isNonEmptyString(bien.nom)) errors.nom = 'Nom requis.';
  if (!isPositiveNumber(bien.surface)) errors.surface = 'Surface > 0 requise.';
  if (!isPositiveNumber(bien.prix)) errors.prix = 'Prix > 0 requis.';
  if (!isNonNegativeNumber(bien.fraisNotaire)) errors.fraisNotaire = 'Frais notaire ≥ 0.';
  if (!isNonNegativeNumber(bien.apport)) errors.apport = 'Apport ≥ 0.';
  if (!isPositiveNumber(bien.dureeCredit)) errors.dureeCredit = 'Durée > 0.';
  if (!isInRange(bien.tauxNominal, 0, 0.20)) errors.tauxNominal = 'Taux nominal entre 0 et 20 %.';
  if (!isInRange(bien.tauxAssurance, 0, 0.05)) errors.tauxAssurance = 'Taux assurance entre 0 et 5 %.';
  if (!isPositiveNumber(bien.loyerMensuelHC)) errors.loyerMensuelHC = 'Loyer > 0 requis.';
  if (!isInRange(bien.vacanceMois, 0, 12)) errors.vacanceMois = 'Vacance entre 0 et 12 mois.';
  if (!isNonNegativeNumber(bien.chargesCopro)) errors.chargesCopro = 'Charges copro ≥ 0.';
  if (!isNonNegativeNumber(bien.taxeFonciere)) errors.taxeFonciere = 'Taxe foncière ≥ 0.';
  if (!isInRange(bien.tmi, 0, 0.45)) errors.tmi = 'TMI entre 0 et 45 %.';
  if (bien.apport > bien.prix + (bien.fraisNotaire || 0)) {
    errors.apport = 'Apport supérieur au coût d’acquisition.';
  }
  // Lot 2 — F3 / F4
  if (!isInRange(bien.tensionLocative, 1, 5)) errors.tensionLocative = 'Note entre 1 et 5.';
  if (!isInRange(bien.proximiteCommodites, 1, 5)) errors.proximiteCommodites = 'Note entre 1 et 5.';
  if (!isInRange(bien.risqueVacance, 1, 5)) errors.risqueVacance = 'Note entre 1 et 5.';
  if (bien.revenusMensuelsNets != null && bien.revenusMensuelsNets <= 0) {
    errors.revenusMensuelsNets = 'Revenus > 0 ou laisser vide.';
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

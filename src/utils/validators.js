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
  // Hypothèses locatives — règles spécifiques au type.
  const type = bien.typeLocation || 'LD_nue';
  switch (type) {
    case 'LD_nue':
    case 'LD_meublee':
      if (!isPositiveNumber(bien.loyerMensuelHC)) errors.loyerMensuelHC = 'Loyer > 0 requis.';
      if (!isInRange(bien.vacanceMois, 0, 12)) errors.vacanceMois = 'Vacance entre 0 et 12 mois.';
      break;
    case 'LCD':
      if (!isPositiveNumber(bien.lcdADR)) errors.lcdADR = 'ADR > 0 requis.';
      if (!isInRange(bien.lcdTauxOccupation, 0, 1)) errors.lcdTauxOccupation = 'Taux d’occupation entre 0 et 100 %.';
      if (!isInRange(bien.lcdFraisConciergerie, 0, 1)) errors.lcdFraisConciergerie = 'Frais conciergerie entre 0 et 100 %.';
      break;
    case 'LMD':
      if (!isPositiveNumber(bien.lmdLoyerMensuel)) errors.lmdLoyerMensuel = 'Loyer mensuel > 0 requis.';
      if (!isInRange(bien.lmdTauxOccupation, 0, 1)) errors.lmdTauxOccupation = 'Taux d’occupation entre 0 et 100 %.';
      break;
    case 'coloc_meublee':
    case 'coloc_nue':
      if (!isPositiveNumber(bien.colocNbChambres)) errors.colocNbChambres = 'Nombre de chambres > 0.';
      if (!isPositiveNumber(bien.colocLoyerChambre)) errors.colocLoyerChambre = 'Loyer par chambre > 0.';
      if (!isInRange(bien.colocVacanceChambre, 0, 12)) errors.colocVacanceChambre = 'Vacance entre 0 et 12 mois.';
      break;
  }
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
  // Lot 3a — types meublés / régime réel.
  if (bien.mobilier != null && bien.mobilier < 0) {
    errors.mobilier = 'Mobilier ≥ 0.';
  }
  if (bien.honorairesComptables != null && bien.honorairesComptables < 0) {
    errors.honorairesComptables = 'Honoraires comptables ≥ 0.';
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

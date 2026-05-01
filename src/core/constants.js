// src/core/constants.js
// Constantes fiscales + pondérations + seuils de scoring (validés mai 2026)

export const VERSION = '1.0';
export const STORAGE_KEY = 'calculateur-locatif-v1';

// ─── Constantes fiscales ──────────────────────────────────────────────
export const FISCAL = {
  TMI: 0.30,
  PS: 0.172,
  abattementMicroFoncier: 0.30,
  abattementMicroBIC_LMNP: 0.50,
  abattementMicroBIC_TourismeClasse: 0.50,
  abattementMicroBIC_TourismeNonClasse: 0.30,
  plafondMicroFoncier: 15000,
  plafondMicroBIC_LMNP: 77700,
  plafondMicroBIC_TourismeClasse: 77700,
  plafondMicroBIC_TourismeNonClasse: 15000,
  plafondDeficitFoncierImputable: 10700,
  amortBatiQuotePart: 0.85,
  amortBatiDuree: 30,
  amortMobilierDuree: 7,
  amortTravauxDuree: 10,
  inflationLoyersAnnuelle: 0.015,
  revalorisationBienAnnuelle: 0.010,
  fraisNotaireAncienTaux: 0.08
};

// ─── Pondérations inter-familles par type de location ─────────────────
export const PONDERATIONS_FAMILLES = {
  LD_nue:      { F1: 0.40, F2: 0.25, F3: 0.20, F4: 0.15 },
  LD_meublee:  { F1: 0.40, F2: 0.25, F3: 0.20, F4: 0.15 },
  LCD:         { F1: 0.35, F2: 0.20, F3: 0.25, F4: 0.20 },
  LMD:         { F1: 0.35, F2: 0.25, F3: 0.25, F4: 0.15 },
  coloc:       { F1: 0.35, F2: 0.20, F3: 0.30, F4: 0.15 }
};

// ─── Pondérations intra-famille (F1 et F2 identiques pour tous types) ─
export const PONDERATIONS_F1 = {
  C01: 0.10, // Rendement brut
  C02: 0.20, // Rendement net charges
  C03: 0.25, // Rendement net-net
  C04: 0.25, // Cash-flow mensuel
  C05: 0.15, // TRI 10 ans
  C06: 0.05  // Effort d'épargne
};

export const PONDERATIONS_F2 = {
  C07: 0.25, // Prix au m² vs marché
  C08: 0.20, // État général
  C09: 0.20, // DPE
  C10: 0.15, // Charges copro
  C11: 0.10, // Travaux à prévoir
  C12: 0.10  // Surface adaptée
};

// ─── Pondérations F3 (variables par type) — Lot 2 ─────────────────────
export const PONDERATIONS_F3 = {
  LD_nue:     { C13: 0.60, C14: 0.40 },
  LD_meublee: { C13: 0.60, C14: 0.40 },
  LCD:        { C15: 0.40, C16: 0.40, C17: 0.20 },
  LMD:        { C13: 0.40, C14: 0.30, C19: 0.30 },
  coloc:      { C13: 0.40, C14: 0.25, C18: 0.35 }
};

// ─── Pondérations F4 (variables par type) — Lot 2 ─────────────────────
export const PONDERATIONS_F4 = {
  LD_nue:     { C20: 0.40, C22: 0.30, C23: 0.30 },
  LD_meublee: { C20: 0.35, C22: 0.25, C23: 0.20, C24: 0.20 },
  LCD:        { C20: 0.25, C21: 0.35, C22: 0.15, C24: 0.25 },
  LMD:        { C20: 0.35, C22: 0.25, C24: 0.40 },
  coloc:      { C20: 0.35, C22: 0.25, C23: 0.20, C24: 0.20 }
};

// ─── Seuils de scoring financier (linéaire par paliers) ───────────────
// Pour chaque critère : tableau de { valeur, score }, interpolation linéaire.
export const SEUILS_SCORING = {
  C01_rendementBrut: [
    { valeur: 0,  score: 0  },
    { valeur: 4,  score: 3  },
    { valeur: 6,  score: 6  },
    { valeur: 8,  score: 9  },
    { valeur: 12, score: 10 }
  ],
  C02_rendementNet: [
    { valeur: 0, score: 0  },
    { valeur: 2, score: 3  },
    { valeur: 4, score: 6  },
    { valeur: 6, score: 9  },
    { valeur: 9, score: 10 }
  ],
  C03_rendementNetNet: [
    { valeur: -2, score: 0  },
    { valeur: 1,  score: 3  },
    { valeur: 3,  score: 6  },
    { valeur: 5,  score: 9  },
    { valeur: 8,  score: 10 }
  ],
  C04_cashflow: [
    { valeur: -300, score: 0  },
    { valeur: -100, score: 3  },
    { valeur: 0,    score: 6  },
    { valeur: 100,  score: 9  },
    { valeur: 300,  score: 10 }
  ],
  C05_tri: [
    { valeur: 0,  score: 0  },
    { valeur: 3,  score: 3  },
    { valeur: 6,  score: 6  },
    { valeur: 9,  score: 9  },
    { valeur: 12, score: 10 }
  ],
  C06_effortEpargne: [   // échelle inversée : effort élevé = mauvais score
    { valeur: -200, score: 10 },  // cash-flow positif marqué
    { valeur: 0,    score: 9  },
    { valeur: 50,   score: 6  },
    { valeur: 150,  score: 3  },
    { valeur: 300,  score: 0  }
  ]
};

// ─── Mappings catégoriels ─────────────────────────────────────────────
export const SCORE_DPE = {
  'A': 10, 'B': 9, 'C': 7.5, 'D': 6, 'E': 4, 'F': 1, 'G': 0
};

// Score qualitatif 1-5 → /10
export function scoreQualitatif(saisie) {
  return (saisie - 1) * 2.5;
}

// ─── Marché Nancy (référentiel par défaut) ────────────────────────────
export const MARCHE_NANCY = {
  prixMoyenM2: 2400,         // €/m² appartement ancien
  loyerMoyenLD_M2: 13.5,     // €/m² LD
  ADRMoyenT2: 70             // €/nuit T2 LCD
};

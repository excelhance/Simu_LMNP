# BRIEF CLAUDE CODE — Lot 1 (MVP)

> Ce document est le brief opérationnel du **Lot 1** uniquement.
> Pour le périmètre complet de l'application, se référer à `CAHIER_DES_CHARGES.md`.

---

## 1. Mission

Livrer le **squelette fonctionnel** de l'application : un calculateur opérationnel sur **un seul type de location (LD nue) + un seul régime fiscal (micro-foncier)**, avec scoring partiel **F1+F2 uniquement**. L'objectif est d'obtenir une chaîne de bout en bout (saisie → calcul → score → persistance → restitution) sur laquelle s'appuieront les Lots 2 à 5.

Pas de sur-ingénierie : c'est un outil personnel, pas un SaaS. Code lisible, modulaire, sans test E2E.

---

## 2. Périmètre Lot 1

### Inclus
- Setup projet : Vite + TailwindCSS + Chart.js (Chart.js installé mais pas utilisé en Lot 1).
- Arborescence complète des modules (`core/`, `ui/`, `persistence/`, `utils/`) — fichiers vides ou stubs autorisés pour ceux non utilisés en Lot 1.
- Module `core/finance.js` : mensualité de crédit, rendements (brut, net), cash-flow mensuel.
- Module `core/fiscalite.js` : **micro-foncier uniquement**.
- Module `core/scoring.js` : familles **F1 (Financier) et F2 (Bien)** uniquement, pondérations en dur depuis `constants.js`.
- Module `core/constants.js` : **livré pré-rempli** (cf. section 5).
- Module `persistence/storage.js` : CRUD biens dans `localStorage`.
- 3 écrans UI :
  1. **Liste des biens** (vide par défaut, bouton "+ Nouveau bien").
  2. **Saisie** : formulaire LD nue / micro-foncier.
  3. **Restitution** : score partiel + indicateurs financiers + détail.
- Routing minimal (hash-based, pas de lib).
- Workflow GitHub Actions de build et déploiement.

### Exclu (Lots ultérieurs)
- ❌ Autres types de location (LD meublée, LCD, LMD, coloc) → Lot 3.
- ❌ Autres régimes fiscaux (réel foncier, micro-BIC, réel LMNP) → Lot 3.
- ❌ Familles de scoring F3 (Marché) et F4 (Risque) → Lot 2.
- ❌ Alertes complexes (DPE, plafonds, ratio endettement) → Lot 2.
- ❌ TRI sur 10 ans → Lot 3.
- ❌ Comparaison multi-biens → Lot 4.
- ❌ Export/import JSON → Lot 4.
- ❌ Graphiques Chart.js → Lot 5.
- ❌ Panneau pondérations modifiables → Lot 2.
- ❌ Panneau constantes fiscales modifiables → Lot 5.

### Score partiel — précision UX
Le score affiché en Lot 1 est calculé **uniquement sur F1+F2 normalisé à 100 %** (F1 = 61.5 %, F2 = 38.5 %). Afficher clairement en UI : *« Score partiel (financier + bien). Critères marché et risque non encore intégrés. »* — pour éviter toute ambiguïté.

---

## 3. Stack et environnement

### Versions
- Node.js ≥ 20
- Vite 5.x
- TailwindCSS 3.x
- Chart.js 4.x (installé mais non utilisé Lot 1)

### Initialisation
```bash
npm create vite@latest . -- --template vanilla
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install chart.js
```

### Configuration GitHub Pages
- Branche `main` : code source.
- `vite.config.js` doit définir `base: '/<nom-du-repo>/'` pour GitHub Pages.
- Workflow `.github/workflows/deploy.yml` :
  - Trigger : `push` sur `main`.
  - Étapes : checkout → setup-node@v4 → `npm ci` → `npm run build` → `actions/upload-pages-artifact@v3` (path: `dist`) → `actions/deploy-pages@v4`.
  - Permissions : `pages: write`, `id-token: write`.

---

## 4. Arborescence à créer

```
/
├── .github/workflows/deploy.yml
├── .gitignore
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── README.md
├── CAHIER_DES_CHARGES.md       (déjà présent)
├── BRIEF_CLAUDE_CODE.md        (ce fichier)
└── /src
    ├── main.js
    ├── style.css
    ├── /core
    │   ├── constants.js        ✅ Lot 1 — voir section 5
    │   ├── finance.js          ✅ Lot 1
    │   ├── fiscalite.js        ✅ Lot 1 (micro-foncier seul)
    │   ├── scoring.js          ✅ Lot 1 (F1+F2 seul)
    │   └── alertes.js          ⏳ stub (Lot 2)
    ├── /ui
    │   ├── form.js             ✅ Lot 1 (LD nue / micro-foncier)
    │   ├── results.js          ✅ Lot 1
    │   ├── list.js             ✅ Lot 1
    │   ├── comparison.js       ⏳ stub (Lot 4)
    │   ├── settings.js         ⏳ stub (Lot 2)
    │   └── charts.js           ⏳ stub (Lot 5)
    ├── /persistence
    │   ├── storage.js          ✅ Lot 1
    │   └── exporter.js         ⏳ stub (Lot 4)
    └── /utils
        ├── format.js           ✅ Lot 1 (€, %, dates)
        ├── validators.js       ✅ Lot 1 (validations basiques)
        └── router.js           ✅ Lot 1 (hash-based)
```

---

## 5. Module `constants.js` — à livrer **tel quel**

Les pondérations et seuils ci-dessous sont **validés par l'utilisateur** et doivent être copiés tels quels.

```javascript
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
```

---

## 6. Spécifications fonctionnelles Lot 1

### Écran "Liste des biens" (`#/`)
- Tableau : nom, type, régime, prix, score (avec couleur), date.
- En Lot 1, le filtre type/régime n'a qu'une seule option chacun (LD nue / micro-foncier).
- Boutons : "+ Nouveau bien", "Voir", "Éditer", "Supprimer".
- Si aucun bien : message "Aucun bien sauvegardé. Commencez par en ajouter un."

### Écran "Saisie" (`#/edit/:id` et `#/new`)
Sections accordéon :
- **A. Identification** : nom (texte), adresse (texte). Type de location : `select` avec une seule option visible "LD nue". Régime fiscal : `select` avec une seule option visible "Micro-foncier".
- **B. Bien** : surface, nb pièces, étage, ascenseur, extérieur, DPE, état général (1-5), travaux, charges copro, état copro (1-5).
- **C. Financier** : prix, frais notaire (auto = 8 % par défaut, modifiable), apport, durée crédit, taux nominal (défaut 3.26 %), taux assurance (défaut 0.20 %). Capital emprunté + mensualité affichés en lecture seule, recalculés à chaque modif.
- **D. Hypothèses locatives** : loyer mensuel HC, vacance (mois/an, défaut 0.5).
- **E. Charges récurrentes** : taxe foncière, assurance PNO, frais gestion (% loyer, défaut 0).
- **F. Fiscalité** : TMI (défaut 30 %, lecture seule en Lot 1).

Validation à `blur`. Bouton "Calculer et sauvegarder" actif si tous les champs requis valides.

### Écran "Restitution" (`#/view/:id`)
- **Bloc 1 — Score partiel** : cercle ou barre /10, avec libellé "Score partiel (F1 + F2)". Couleur selon grille (rouge < 3, orange 3-5, jaune 5-7, vert clair 7-8.5, vert foncé 8.5-10).
- **Bloc 2 — Indicateurs** : rendement brut, rendement net, rendement net-net, cash-flow mensuel, mensualité crédit, effort d'épargne. Pas de TRI en Lot 1.
- **Bloc 3 — Détail des calculs** : revenu imposable micro-foncier, impôt + PS, décomposition cash-flow (loyer net vacance – charges – mensualité – impôt). Tableau d'amortissement résumé : capital restant à 5/10/15/20 ans.
- **Bloc 4 — Détail scoring** : tableau des 12 critères (C01-C12), valeur saisie/calculée, sous-score /10, pondération, contribution au score de famille.

---

## 7. Module `finance.js` — signatures attendues

```javascript
// src/core/finance.js

/**
 * Mensualité de crédit (amortissement constant).
 * @param {number} capital - Capital emprunté (€)
 * @param {number} tauxAnnuel - Taux nominal annuel (ex: 0.0326)
 * @param {number} dureeAnnees - Durée en années
 * @returns {number} Mensualité hors assurance (€)
 */
export function mensualiteCredit(capital, tauxAnnuel, dureeAnnees) { /* ... */ }

/**
 * Mensualité d'assurance emprunteur (sur capital initial).
 */
export function mensualiteAssurance(capital, tauxAssuranceAnnuel) { /* ... */ }

/**
 * Tableau d'amortissement complet, mois par mois.
 * @returns {Array<{mois, interets, capitalRembourse, capitalRestant}>}
 */
export function tableauAmortissement(capital, tauxAnnuel, dureeAnnees) { /* ... */ }

/** Coût total d'acquisition. */
export function coutTotalAcquisition({ prix, fraisNotaire, travaux = 0, mobilier = 0 }) { /* ... */ }

/** Rendement brut annuel (%). */
export function rendementBrut(loyerAnnuelHC, CTA) { /* ... */ }

/** Rendement net avant fiscalité (%). */
export function rendementNet(loyerAnnuel, chargesAnnuelles, CTA) { /* ... */ }

/** Cash-flow mensuel net (€). */
export function cashflowMensuel({ loyerMensuel, chargesMensuelles, mensualite, impotMensuel, vacanceMensuelle }) { /* ... */ }
```

---

## 8. Module `fiscalite.js` — signature Lot 1

```javascript
// src/core/fiscalite.js
import { FISCAL } from './constants.js';

/**
 * Calcul fiscal micro-foncier.
 * @param {number} loyersAnnuels - Loyers nets de vacance (€)
 * @returns {{ revenuImposable, impotIR, impotPS, impotTotal, depassePlafond }}
 */
export function microFoncier(loyersAnnuels, tmi = FISCAL.TMI, ps = FISCAL.PS) {
  const revenuImposable = loyersAnnuels * (1 - FISCAL.abattementMicroFoncier);
  const impotIR = revenuImposable * tmi;
  const impotPS = revenuImposable * ps;
  return {
    revenuImposable,
    impotIR,
    impotPS,
    impotTotal: impotIR + impotPS,
    depassePlafond: loyersAnnuels > FISCAL.plafondMicroFoncier
  };
}
```

---

## 9. Module `scoring.js` — squelette Lot 1

```javascript
// src/core/scoring.js
import {
  PONDERATIONS_FAMILLES,
  PONDERATIONS_F1,
  PONDERATIONS_F2,
  SEUILS_SCORING,
  SCORE_DPE,
  scoreQualitatif,
  MARCHE_NANCY
} from './constants.js';

/** Interpolation linéaire entre paliers. */
function scoreLineaire(valeur, seuils) { /* ... */ }

/** Score prix au m² vs marché Nancy. */
function scorePrixM2(prixM2Bien, prixM2Marche = MARCHE_NANCY.prixMoyenM2) {
  // Plus le prix est inférieur au marché, meilleur le score. Échelle proposée :
  // -20% marché → 10, marché → 6, +20% marché → 2, +30% → 0
  const ratio = prixM2Bien / prixM2Marche;
  if (ratio <= 0.80) return 10;
  if (ratio >= 1.30) return 0;
  if (ratio <= 1.00) return 10 - (ratio - 0.80) / 0.20 * 4;   // 10 → 6
  return 6 - (ratio - 1.00) / 0.30 * 6;                       // 6 → 0
}

/**
 * Score Lot 1 partiel : F1 + F2 normalisés à 100 %.
 * @returns {{ global, parFamille: { F1, F2 }, parCritere: {...} }}
 */
export function scoreLot1(bien, indicateursFinanciers) { /* ... */ }
```

---

## 10. Module `storage.js` — squelette

```javascript
// src/persistence/storage.js
import { STORAGE_KEY, VERSION, FISCAL } from '../core/constants.js';

const initialState = () => ({ version: VERSION, constantesFiscales: { ...FISCAL }, biens: [] });

export function load() { /* lit localStorage ou retourne initialState */ }
export function save(state) { /* écrit localStorage */ }
export function listBiens() { /* ... */ }
export function getBien(id) { /* ... */ }
export function upsertBien(bien) { /* generate uuid si nouveau */ }
export function deleteBien(id) { /* ... */ }
```

---

## 11. Critère d'acceptation Lot 1

Le Lot 1 est **DONE** quand le **cas de test #1** du cahier des charges donne les résultats suivants après saisie complète :

### Saisie
| Champ | Valeur |
|---|---|
| Type / régime | LD nue / micro-foncier |
| Prix acquisition | 90 000 € |
| Frais notaire | 7 200 € |
| Apport | 10 000 € |
| Durée crédit | 20 ans |
| Taux nominal | 3.26 % |
| Taux assurance | 0.20 % |
| Loyer mensuel HC | 500 € |
| Vacance | 0.5 mois/an |
| Charges copro annuelles | 1 000 € |
| Taxe foncière | 700 € |
| TMI | 30 % |

### Résultats attendus (tolérance ±1 €)
| Indicateur | Attendu |
|---|---|
| Capital emprunté | 87 200 € |
| Mensualité crédit (hors assu) | ~497 € |
| Mensualité assurance | ~14.5 € |
| Mensualité totale | ~511.5 € |
| Loyer annuel net vacance | 5 750 € |
| Rendement brut | ~5.92 % |
| Revenu imposable micro-foncier | 4 025 € |
| Impôt + PS annuel | ~1 900 € |
| Cash-flow mensuel net | ~-310 € |
| Score partiel global | dans [3, 5] (orange) |

### Tests fonctionnels
- [ ] Saisie complète → calcul → résultat affiché en moins de 200 ms.
- [ ] Le bien est sauvegardé en localStorage.
- [ ] Refresh de la page → le bien est restitué intact dans la Liste.
- [ ] Suppression → confirmation requise → suppression effective.
- [ ] Édition d'un bien existant pré-remplit le formulaire.
- [ ] Le score global est numériquement égal à : `(F1×0.615 + F2×0.385)`.

---

## 12. Definition of Done

- [ ] `npm run build` réussit sans warning bloquant.
- [ ] `npm run dev` démarre l'app en local.
- [ ] Le déploiement GitHub Pages réussit sur push `main`.
- [ ] Le cas de test #1 passe (cf. section 11).
- [ ] L'app est utilisable sur mobile (viewport 375 px sans scroll horizontal).
- [ ] Le code est commenté en français sur les zones non triviales (calcul fiscal, scoring).
- [ ] Le `README.md` documente : install, dev, build, déploiement.
- [ ] Aucune lib externe en plus de Vite, Tailwind, Chart.js.
- [ ] Aucune référence à `localStorage` en dehors de `persistence/storage.js`.

---

## 13. Recommandations de mise en œuvre

- **Ordre de codage suggéré** : `constants.js` (livré) → `finance.js` → `fiscalite.js` → `storage.js` → `utils/format.js` → `ui/form.js` → `ui/results.js` → `ui/list.js` → `main.js` (router + bootstrap).
- **Pas de framework de validation** : valider à la main dans `validators.js` (10-20 lignes suffisent).
- **Pas de gestion d'état globale** : le store est `localStorage` + un objet en mémoire rechargé à la navigation.
- **Pas de WebComponents** : trop tôt pour le Lot 1, à reconsidérer en Lot 5 si réutilisation observée.
- **Tailwind purgé** : configurer `content: ['./index.html', './src/**/*.js']` pour limiter la taille du CSS.

---

**Lot 1 prêt à être démarré.**

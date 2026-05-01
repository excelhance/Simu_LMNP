# CAHIER DES CHARGES — Calculateur de notation d'appartements locatifs

**Version** : 1.0
**Date** : Mai 2026
**Destinataire** : Claude Code (brief de développement direct)
**Hébergement cible** : GitHub Pages
**Utilisateur unique** : investisseur particulier (Nancy)

---

## 1. Vision et objectifs

### Problème résolu
Évaluer rapidement et de façon auditable la qualité d'une opportunité d'investissement locatif sur le marché de Nancy, en tenant compte du **type de location** (nue, meublée, courte durée, moyenne durée, colocation) et du **régime fiscal** (micro-foncier, réel foncier, micro-BIC, réel LMNP). L'outil doit permettre de **comparer plusieurs biens** entre eux sur des critères homogènes, et d'aider la prise de décision par un score sur 10 dont la construction est **transparente et paramétrable**.

### Utilisateur cible
Investisseur particulier unique (TNS, gérant EURL, TMI 30 %, profil prudent-équilibré, objectif retraite anticipée à 50 ans), évaluant des biens 30-60 m² entre 80 et 120 k€ tout compris à Nancy et alentours.

### Indicateurs de succès
- Saisie complète d'un bien en moins de 5 minutes.
- Score sur 10 calculé en temps réel, avec détail par famille de critères et par critère individuel.
- Comparaison côte à côte d'au moins 5 biens sauvegardés.
- Aucune donnée perdue entre deux sessions (localStorage + export JSON).
- Code maintenable sans dépendance critique sur 5 ans.

---

## 2. Périmètre fonctionnel (MoSCoW)

### Must have (V1)
- Sélection du type de location parmi 5 : **LD nue, LD meublée, LCD (courte durée type Airbnb), LMD (bail mobilité), colocation**.
- Sélection du régime fiscal (5 régimes : micro-foncier, réel foncier, micro-BIC LMNP classique, micro-BIC meublé tourisme non classé, réel LMNP).
- Saisie complète : bien, financement (crédit), hypothèses locatives, paramètres fiscaux.
- Calculs financiers : mensualité crédit (amortissement constant), rendement brut, rendement net (avant et après fiscalité), cash-flow mensuel net après impôt, TRI sur 10 ans.
- Calcul fiscal par régime sélectionné, avec amortissement composantes pour le réel LMNP.
- Score global sur 10 + scores par famille de critères, avec pondération par défaut **par type de location**.
- Pondération éditable par l'utilisateur (panneau "paramètres avancés").
- Alertes automatiques : DPE F/G, cash-flow négatif, plafond micro-BIC dépassé, ratio d'endettement excessif (>35 %).
- Persistance localStorage + export/import JSON.
- Comparaison multi-biens (tableau côte à côte sur au moins 5 biens).
- Panneau "constantes fiscales" éditable (TMI, prélèvements sociaux, abattements, plafonds).

### Should have (V1 si temps)
- Graphique d'amortissement du crédit (Chart.js).
- Graphique cash-flow projeté sur 10 ans.
- Impression / export PDF via CSS print.
- Mode mobile responsive.

### Could have (V1 si simple)
- Pré-remplissage de valeurs par défaut "Nancy 2026" (prix moyen au m², loyers moyens par m², ADR Airbnb par typologie).
- Duplicate d'un bien existant pour tester des variantes.

### Won't have (V1)
- SCI à l'IR et SCI à l'IS (reporté en V2).
- Authentification, multi-utilisateur.
- Backend, base de données serveur.
- Synchronisation cloud.
- API externes en runtime (DVF, INSEE).
- Tests E2E exhaustifs.
- CI/CD complexe (un simple workflow GitHub Actions de build/déploiement suffit).

---

## 3. Méthode de scoring

### 3.1 Familles de critères

Le score global est construit à partir de **4 familles** :

| Code | Famille | Description |
|---|---|---|
| F1 | Financier | Rendements, cash-flow, TRI, effort d'épargne |
| F2 | Caractéristiques du bien | Surface, prix au m², état, DPE, charges copro, travaux |
| F3 | Marché et localisation | Tension locative, demande spécifique au type de location |
| F4 | Risque | Vacance, réglementaire, copropriété, encadrement, fiscalité |

### 3.2 Matrice critère × type de location

Chaque critère est noté sur 10 (`subScore`), puis pondéré au sein de sa famille, puis la famille est pondérée dans le score global. La méthode de calcul du sous-score est précisée en section 3.4.

| Code | Critère | Famille | LD nue | LD meublée | LCD | LMD | Coloc |
|---|---|---|:-:|:-:|:-:|:-:|:-:|
| C01 | Rendement brut | F1 | ✓ | ✓ | ✓ | ✓ | ✓ |
| C02 | Rendement net après charges | F1 | ✓ | ✓ | ✓ | ✓ | ✓ |
| C03 | Rendement net après fiscalité | F1 | ✓ | ✓ | ✓ | ✓ | ✓ |
| C04 | Cash-flow mensuel net | F1 | ✓ | ✓ | ✓ | ✓ | ✓ |
| C05 | TRI 10 ans | F1 | ✓ | ✓ | ✓ | ✓ | ✓ |
| C06 | Effort d'épargne mensuel | F1 | ✓ | ✓ | ✓ | ✓ | ✓ |
| C07 | Prix au m² vs marché local | F2 | ✓ | ✓ | ✓ | ✓ | ✓ |
| C08 | État général du bien | F2 | ✓ | ✓ | ✓ | ✓ | ✓ |
| C09 | DPE | F2 | ✓ | ✓ | ✓ | ✓ | ✓ |
| C10 | Charges de copropriété (€/m²/an) | F2 | ✓ | ✓ | ✓ | ✓ | ✓ |
| C11 | Travaux à prévoir (€) | F2 | ✓ | ✓ | ✓ | ✓ | ✓ |
| C12 | Surface adaptée à l'usage | F2 | ✓ | ✓ | ✓ | ✓ | ✓ |
| C13 | Tension locative locale | F3 | ✓ | ✓ | – | ✓ | ✓ |
| C14 | Profil locataire cible (proximité commodités/transports) | F3 | ✓ | ✓ | – | ✓ | ✓ |
| C15 | ADR moyen quartier | F3 | – | – | ✓ | – | – |
| C16 | Taux d'occupation prévisionnel | F3 | – | – | ✓ | – | – |
| C17 | Saisonnalité / concurrence Airbnb | F3 | – | – | ✓ | – | – |
| C18 | Proximité campus / écoles | F3 | – | – | – | – | ✓ |
| C19 | Proximité gares / hôpitaux / entreprises | F3 | – | – | – | ✓ | – |
| C20 | Risque de vacance | F4 | ✓ | ✓ | ✓ | ✓ | ✓ |
| C21 | Risque réglementaire local | F4 | – | – | ✓ | – | – |
| C22 | État de la copropriété | F4 | ✓ | ✓ | ✓ | ✓ | ✓ |
| C23 | Encadrement des loyers (zone tendue) | F4 | ✓ | ✓ | – | – | ✓ |
| C24 | Risque évolution fiscale meublé | F4 | – | ✓ | ✓ | ✓ | ✓ |

Légende : ✓ = applicable / – = non applicable.

### 3.3 Pondérations par défaut

#### Pondération inter-familles (par type de location)

| Famille | LD nue | LD meublée | LCD | LMD | Coloc |
|---|:-:|:-:|:-:|:-:|:-:|
| F1 Financier | 40 % | 40 % | 35 % | 35 % | 35 % |
| F2 Bien | 25 % | 25 % | 20 % | 25 % | 20 % |
| F3 Marché | 20 % | 20 % | 25 % | 25 % | 30 % |
| F4 Risque | 15 % | 15 % | 20 % | 15 % | 15 % |

> **Justification** :
> - **LD nue / meublée** : modèle stable, le rendement et l'état du bien priment, le risque réglementaire est faible.
> - **LCD** : poids accru sur le marché (ADR/TO sont structurants) et le risque (loi Le Meur, durcissement local possible à Nancy).
> - **LMD** : profil hybride, marché un peu plus pondéré car la cible (mobiles professionnels, étudiants stagiaires) est volatile.
> - **Colocation** : le marché (proximité campus, demande étudiante) est le facteur n°1 après la rentabilité.
>
> **DÉCISION REQUISE** : valider ou ajuster ces pondérations inter-familles.

#### Pondérations intra-famille (% de la famille)

**F1 Financier** (identique à tous les types) :

| Critère | Poids |
|---|:-:|
| C01 Rendement brut | 10 % |
| C02 Rendement net après charges | 20 % |
| C03 Rendement net après fiscalité | 25 % |
| C04 Cash-flow mensuel net | 25 % |
| C05 TRI 10 ans | 15 % |
| C06 Effort d'épargne mensuel | 5 % |

> Le **cash-flow** et le **rendement net après fiscalité** sont les plus pondérés : ce sont les indicateurs les plus directement actionnables pour un investisseur en TMI 30 %.

**F2 Bien** (identique à tous les types) :

| Critère | Poids |
|---|:-:|
| C07 Prix au m² vs marché local | 25 % |
| C08 État général | 20 % |
| C09 DPE | 20 % |
| C10 Charges copro | 15 % |
| C11 Travaux à prévoir | 10 % |
| C12 Surface adaptée à l'usage | 10 % |

**F3 Marché** (variable selon type) :

| Critère | LD nue | LD meublée | LCD | LMD | Coloc |
|---|:-:|:-:|:-:|:-:|:-:|
| C13 Tension locative | 60 % | 60 % | – | 40 % | 40 % |
| C14 Proximité commodités | 40 % | 40 % | – | 30 % | 25 % |
| C15 ADR moyen | – | – | 40 % | – | – |
| C16 Taux d'occupation | – | – | 40 % | – | – |
| C17 Saisonnalité / concurrence | – | – | 20 % | – | – |
| C18 Proximité campus | – | – | – | – | 35 % |
| C19 Proximité gares/hôpitaux | – | – | – | 30 % | – |

**F4 Risque** (variable selon type) :

| Critère | LD nue | LD meublée | LCD | LMD | Coloc |
|---|:-:|:-:|:-:|:-:|:-:|
| C20 Risque vacance | 40 % | 35 % | 25 % | 35 % | 35 % |
| C21 Risque réglementaire local | – | – | 35 % | – | – |
| C22 État copropriété | 30 % | 25 % | 15 % | 25 % | 25 % |
| C23 Encadrement loyers | 30 % | 20 % | – | – | 20 % |
| C24 Risque évolution fiscale meublé | – | 20 % | 25 % | 40 % | 20 % |

> **DÉCISION REQUISE** : valider les pondérations intra-familles avant développement, ou laisser Claude Code livrer ces valeurs en dur dans `constants.js` modifiables ensuite.

### 3.4 Méthode de calcul des sous-scores (0-10)

Trois mécaniques de notation selon le type de critère :

#### A. Critères financiers à seuils (linéaire par paliers)

Pour chaque critère financier, on définit des seuils. Score linéaire interpolé entre les seuils.

```javascript
// Exemple : Rendement brut (C01)
seuilsRendementBrut = [
  { valeur: 0,    score: 0  },
  { valeur: 4,    score: 3  },   // < 4 % = à fuir
  { valeur: 6,    score: 6  },   // 6 % = correct
  { valeur: 8,    score: 9  },   // 8 % = très bon
  { valeur: 12,   score: 10 }    // ≥ 12 % = top
];

function scoreLineaire(valeur, seuils) {
  if (valeur <= seuils[0].valeur) return seuils[0].score;
  if (valeur >= seuils[seuils.length-1].valeur) return seuils[seuils.length-1].score;
  for (let i = 0; i < seuils.length - 1; i++) {
    if (valeur >= seuils[i].valeur && valeur <= seuils[i+1].valeur) {
      const ratio = (valeur - seuils[i].valeur) / (seuils[i+1].valeur - seuils[i].valeur);
      return seuils[i].score + ratio * (seuils[i+1].score - seuils[i].score);
    }
  }
}
```

**Seuils par critère financier** (proposition par défaut) :

| Critère | 0 | 3 | 6 | 9 | 10 |
|---|:-:|:-:|:-:|:-:|:-:|
| C01 Rendement brut (%) | 0 | 4 | 6 | 8 | 12 |
| C02 Rendement net charges (%) | 0 | 2 | 4 | 6 | 9 |
| C03 Rendement net-net (%) | -2 | 1 | 3 | 5 | 8 |
| C04 Cash-flow mensuel (€) | -300 | -100 | 0 | 100 | 300 |
| C05 TRI 10 ans (%) | 0 | 3 | 6 | 9 | 12 |
| C06 Effort épargne mens. (€) | 300 | 150 | 50 | 0 | -∞ (cash-flow positif) |

> Note : pour C06, plus l'effort d'épargne est faible (ou négatif = cash-flow positif), meilleur le score. Échelle inversée.

#### B. Critères qualitatifs (saisie utilisateur 1-5 ou catégoriel)

État du bien, état copro, tension locative, etc. Saisie sur une échelle 1-5 par l'utilisateur, convertie en score /10 :

```
Score = (saisie - 1) × 2.5  →  1→0 / 2→2.5 / 3→5 / 4→7.5 / 5→10
```

#### C. Critères catégoriels (DPE, zone tendue, etc.)

Mapping direct défini en dur :

```javascript
// C09 DPE
const scoreDPE = { 'A': 10, 'B': 9, 'C': 7.5, 'D': 6, 'E': 4, 'F': 1, 'G': 0 };

// C21 Risque réglementaire local LCD
const scoreReglementaireLCD = {
  'aucune_restriction': 10,    // commune sans encadrement
  'declaration_simple': 8,     // simple déclaration mairie
  'changement_usage': 5,       // autorisation requise
  'quotas_actifs': 3,          // quotas par quartier en place
  'interdiction_partielle': 1  // interdiction sur tout ou partie de la commune
};
```

### 3.5 Formule du score global

```
ScoreFamille_F = Σ (subScore_critère × poidsIntra_critère) / Σ poidsIntra_critère

ScoreGlobal = Σ (ScoreFamille_F × poidsInterFamille_F)
```

Toutes les pondérations sont normalisées (somme = 100 %) avant calcul.

### 3.6 Grille de lecture

| Score global | Interprétation | Couleur UI |
|---|---|---|
| 0-3 | À fuir | Rouge |
| 3-5 | À creuser, points bloquants | Orange |
| 5-7 | Correct, négociable | Jaune |
| 7-8.5 | Bonne opportunité | Vert clair |
| 8.5-10 | Très bonne opportunité | Vert foncé |

---

## 4. Spécifications fonctionnelles

### 4.1 Architecture des écrans

L'application est une **single-page app** structurée en 4 vues principales, accessibles via un menu latéral ou onglets :

1. **Liste des biens** (écran d'accueil) — tableau récapitulatif des biens sauvegardés.
2. **Saisie / édition d'un bien** — formulaire multi-section.
3. **Restitution d'un bien** — affichage du score, détail des calculs, alertes.
4. **Comparaison multi-biens** — tableau côte à côte.

Plus 2 panneaux secondaires :
- **Constantes fiscales** (modal ou panneau déroulant).
- **Pondérations avancées** (modal ou panneau déroulant).

### 4.2 Écran "Liste des biens"

- Tableau : nom du bien, type de location, régime fiscal, prix d'achat, score global (avec couleur), date de création.
- Actions par ligne : Voir / Éditer / Dupliquer / Supprimer.
- Bouton "+ Nouveau bien".
- Boutons globaux : Comparer (sélection multiple via cases à cocher) / Importer JSON / Exporter tout JSON.

### 4.3 Écran "Saisie / édition"

Formulaire structuré en sections accordéon (toutes ouvertes par défaut) :

#### Section A — Identification
- Nom du bien (texte libre)
- Adresse / quartier (texte libre)
- Type de location (`select` parmi 5 valeurs)
- Régime fiscal (`select` filtré selon le type de location, voir 4.6)

#### Section B — Caractéristiques du bien
- Surface (m², `number`)
- Nombre de pièces / chambres
- Étage, ascenseur (oui/non), extérieur (balcon/terrasse, oui/non)
- DPE (`select` A à G)
- État général (échelle 1-5)
- Travaux à prévoir (€)
- Charges de copropriété annuelles (€)
- État de la copropriété (échelle 1-5)

#### Section C — Données financières
- Prix d'acquisition net vendeur (€)
- Frais de notaire (€) [valeur par défaut : 8 % du prix pour ancien]
- Apport personnel (€)
- Mobilier / aménagement (€) [si type meublé/LCD/LMD/coloc]
- Capital emprunté (€) [auto-calculé : prix + frais + travaux + mobilier - apport]
- Durée du crédit (années)
- Taux nominal du crédit (%) [valeur par défaut : 3.26 %]
- Taux d'assurance emprunteur (% capital initial) [valeur par défaut : 0.20 %]
- Mensualité crédit (€) [auto-calculée]

#### Section D — Hypothèses locatives (champs conditionnels)

**Si LD nue ou LD meublée** :
- Loyer mensuel hors charges (€)
- Charges récupérables mensuelles (€)
- Vacance locative annuelle (mois) [défaut : 0.5]

**Si LCD** :
- ADR moyen (€/nuit)
- Taux d'occupation prévisionnel (%) [plage attendue : 40-75 %]
- Frais de conciergerie (% du CA) [défaut : 22 %]
- Frais de ménage par séjour (€) [refacturés ou non]
- Consommables / linge mensuel (€)
- Meublé classé Atout France ? (oui/non)

**Si LMD (bail mobilité)** :
- Loyer mensuel forfaitaire (€) [charges incluses]
- Taux d'occupation prévisionnel (%) [plage attendue : 70-90 %]
- Charges (eau, énergie, internet) mensuelles (€)

**Si colocation** :
- Nombre de chambres louées
- Loyer par chambre (€/mois)
- Charges totales mensuelles (€)
- Vacance moyenne par chambre (mois/an) [défaut : 1]

#### Section E — Charges récurrentes
- Taxe foncière annuelle (€)
- Assurance PNO annuelle (€)
- Frais de gestion locative (% des loyers, si applicable)
- Provision entretien (% du loyer ou montant fixe)
- Honoraires comptables annuels (€) [si réel BIC]

#### Section F — Paramètres fiscaux
- TMI (%) [valeur par défaut : 30 %]
- Prélèvements sociaux (%) [valeur par défaut : 17.2 %, lecture seule sauf via panneau Constantes]
- Choix d'amortissement (réel LMNP) :
  - Quote-part bâti (%) [défaut : 85 %]
  - Durée amortissement bâti (années) [défaut : 30]
  - Durée amortissement mobilier (années) [défaut : 7]
  - Durée amortissement travaux (années) [défaut : 10]

### 4.4 Écran "Restitution"

Affichage en 4 blocs :

#### Bloc 1 — Score global
- Cercle ou barre de progression avec score sur 10 + couleur selon grille (3.6).
- Interprétation textuelle ("Bonne opportunité, à creuser").
- Score par famille (4 mini-jauges).

#### Bloc 2 — Indicateurs financiers clés
- Rendement brut, rendement net, rendement net-net (3 chiffres mis en avant).
- Cash-flow mensuel net (en gros, vert si ≥ 0, rouge si < 0).
- TRI 10 ans.
- Mensualité crédit (capital + intérêts + assurance).
- Effort d'épargne mensuel.

#### Bloc 3 — Détail des calculs
- Tableau d'amortissement du crédit (résumé : capital restant à 5/10/15/20 ans).
- Calcul fiscal détaillé selon le régime sélectionné (revenu imposable, impôt + PS dus, base amortissable s'il y a lieu).
- Décomposition du cash-flow : loyers nets de vacance – charges – mensualité – impôt.
- Tableau année par année sur 10 ans (cash-flow, capital remboursé, valeur nette).

#### Bloc 4 — Alertes et drapeaux
Liste à puces visuellement distincte (bordure rouge/orange) :
- 🔴 DPE F ou G → interdiction de location LD progressive (calendrier connu)
- 🔴 Cash-flow mensuel < -200 €
- 🟠 Plafond micro-BIC dépassé (recettes prévisionnelles > seuil régime sélectionné)
- 🟠 Taux d'effort >35 % (mensualité / revenus)
- 🟠 Charges copro > 35 €/m²/an (copro lourde)
- 🟠 LCD non classée à Nancy avec recettes > 12 k€ → bascule réel quasi inévitable
- 🟠 Réel LMNP : amortissements > recettes (déficit BIC reportable mais ressuscité à la revente sur la PV)

#### Bloc 5 — Détail du scoring
Tableau dépliable montrant pour chaque critère :
- Valeur saisie
- Sous-score /10
- Pondération intra-famille
- Contribution au score de famille
- Lien "Modifier la pondération" (ouvre le panneau Pondérations).

### 4.5 Écran "Comparaison"

- Sélection multiple de biens depuis la Liste.
- Affichage en colonnes côte à côte (scrollable horizontalement sur mobile) :
  - Photo / nom / type / régime
  - Score global + couleur
  - Scores par famille
  - Indicateurs financiers clés (RB, RN, CF, TRI)
  - Alertes principales (icônes condensées)
- Surlignage automatique de la meilleure valeur de chaque ligne.
- Bouton "Exporter cette comparaison en PDF/JSON".

### 4.6 Logique conditionnelle UI

#### Filtrage régimes fiscaux par type de location

| Type de location | Régimes proposés |
|---|---|
| LD nue | micro-foncier, réel foncier |
| LD meublée | micro-BIC LMNP (50 % abattement, plafond 77 700 €), réel LMNP |
| LCD | micro-BIC meublé tourisme classé (50 %, plafond 77 700 €), micro-BIC meublé tourisme non classé (30 %, plafond 15 000 €), réel LMNP |
| LMD | micro-BIC LMNP (50 %), réel LMNP |
| Colocation (meublée) | micro-BIC LMNP (50 %), réel LMNP |
| Colocation (nue) | micro-foncier, réel foncier |

#### Champs conditionnels
- ADR / TO : visibles uniquement si LCD.
- Mobilier : visible si LD meublée / LCD / LMD / Coloc (meublée).
- Amortissement : visible si réel LMNP sélectionné.
- Honoraires comptables : par défaut 800 €/an si réel BIC, 0 sinon.

### 4.7 Validation et erreurs de saisie

- Champs numériques : bornes min/max contextuelles (ex. taux crédit entre 0 et 10 %, surface entre 5 et 500 m²).
- Messages d'erreur inline sous le champ, en rouge.
- Bouton "Calculer" inactif si champs obligatoires manquants.
- Avertissements (orange, non bloquants) pour valeurs aberrantes (ex. ADR < 30 €/nuit, TO > 90 %).

---

## 5. Spécifications techniques

### 5.1 Stack proposé

**Choix retenu : Vanilla JS + ES Modules + Vite + TailwindCSS + Chart.js**

#### Justification
- **Vanilla JS modulaire** : pas de framework lourd à maintenir sur 5 ans. Pas de risque de migration majeure (React 19→20, Vue 3→4). Pour un outil personnel mono-utilisateur, la complexité d'état d'un framework n'est pas justifiée.
- **Vite** : build outil moderne, génère des assets statiques 100 % compatibles GitHub Pages. Hot reload en dev. Configuration minimale.
- **TailwindCSS** : styles cohérents et rapides, pas de CSS custom à maintenir.
- **Chart.js** : graphiques amortissement et cash-flow. Léger, sans dépendances lourdes.
- Pas de jQuery, pas de Bootstrap, pas de framework UI.

#### Alternatives évaluées
- **React/Vue/Svelte** : sur-dimensionné pour un mono-utilisateur, et chaque mise à jour majeure obligerait une refonte.
- **Alpine.js** : option viable si réactivité simple, mais Vanilla JS suffit avec une pattern observer manuelle.
- **Pas de build (CDN)** : possible mais perte de Tailwind purgé et des optimisations Vite.

> **DÉCISION REQUISE** : valider ce choix de stack, ou imposer une alternative (Alpine.js, Svelte, Vue 3 SFC).

### 5.2 Architecture des fichiers

```
/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── README.md
├── CAHIER_DES_CHARGES.md
├── /src
│   ├── main.js                      # Point d'entrée
│   ├── style.css                    # Tailwind + custom minimal
│   ├── /core
│   │   ├── constants.js             # Constantes fiscales, seuils, pondérations défaut
│   │   ├── finance.js               # Mensualité, rendements, TRI, amortissement crédit
│   │   ├── fiscalite.js             # Calcul fiscal par régime
│   │   ├── scoring.js               # Calcul des sous-scores et score global
│   │   └── alertes.js               # Génération des alertes
│   ├── /ui
│   │   ├── form.js                  # Saisie / édition
│   │   ├── results.js               # Restitution
│   │   ├── comparison.js            # Comparaison multi-biens
│   │   ├── list.js                  # Liste des biens
│   │   ├── settings.js              # Panneaux constantes & pondérations
│   │   └── charts.js                # Wrappers Chart.js
│   ├── /persistence
│   │   ├── storage.js               # localStorage (CRUD biens)
│   │   └── exporter.js              # Export/import JSON, export CSV
│   └── /utils
│       ├── format.js                # Formatage € / % / dates
│       ├── validators.js            # Validation formulaires
│       └── router.js                # Routing minimal (hash-based)
└── /public
    └── favicon.svg
```

### 5.3 Format de stockage localStorage

**Clé principale** : `calculateur-locatif-v1`

```json
{
  "version": "1.0",
  "constantesFiscales": {
    "TMI": 0.30,
    "PS": 0.172,
    "abattementMicroFoncier": 0.30,
    "abattementMicroBIC_LMNP": 0.50,
    "abattementMicroBIC_TourismeClasse": 0.50,
    "abattementMicroBIC_TourismeNonClasse": 0.30,
    "plafondMicroFoncier": 15000,
    "plafondMicroBIC_LMNP": 77700,
    "plafondMicroBIC_TourismeClasse": 77700,
    "plafondMicroBIC_TourismeNonClasse": 15000,
    "plafondDeficitFoncierImputable": 10700,
    "amortBatiQuotePart": 0.85,
    "amortBatiDuree": 30,
    "amortMobilierDuree": 7,
    "amortTravauxDuree": 10,
    "ponderationsParType": { /* objet selon section 3.3 */ },
    "seuilsScoring": { /* objet selon section 3.4 */ }
  },
  "biens": [
    {
      "id": "uuid-v4",
      "nom": "T2 Faubourg Trois Maisons",
      "dateCreation": "2026-05-01T10:00:00Z",
      "dateModification": "2026-05-01T10:00:00Z",
      "typeLocation": "LCD",
      "regimeFiscal": "reel_lmnp",
      "bien": {
        "adresse": "Nancy 54000",
        "surface": 40,
        "nbPieces": 2,
        "nbChambres": 1,
        "etage": 2,
        "ascenseur": true,
        "exterieur": false,
        "DPE": "D",
        "etatGeneral": 4,
        "travauxAprevoir": 5000,
        "chargesCoproAnnuelles": 1200,
        "etatCopro": 4
      },
      "financement": {
        "prixAcquisition": 95000,
        "fraisNotaire": 7600,
        "apport": 10000,
        "mobilier": 5000,
        "capitalEmprunte": 102600,
        "dureeAnnees": 20,
        "tauxNominal": 0.0326,
        "tauxAssurance": 0.0020,
        "mensualiteCalculee": 600.42
      },
      "hypothesesLocatives": {
        "ADR": 70,
        "tauxOccupation": 0.65,
        "fraisConciergerie": 0.22,
        "consommablesMensuels": 30,
        "meubleClasse": false
      },
      "chargesRecurrentes": {
        "taxeFonciere": 800,
        "assurancePNO": 180,
        "fraisGestion": 0,
        "provisionEntretien": 500,
        "honorairesComptables": 800
      },
      "fiscalite": {
        "TMI": 0.30,
        "PS": 0.172,
        "amortBatiQuotePart": 0.85,
        "amortBatiDuree": 30,
        "amortMobilierDuree": 7,
        "amortTravauxDuree": 10
      },
      "ponderationsCustom": null,
      "indicateurs": {
        "rendementBrut": 7.20,
        "rendementNet": 4.80,
        "rendementNetNet": 4.20,
        "cashflowMensuelNet": -45,
        "tri10ans": 6.8,
        "effortEpargneMensuel": 45
      },
      "score": {
        "global": 6.7,
        "parFamille": { "F1": 6.2, "F2": 7.5, "F3": 7.0, "F4": 6.0 },
        "parCritere": { "C01": 7.5, "C02": 6.0, /* ... */ }
      },
      "alertes": [
        { "niveau": "orange", "message": "LCD non classée : recettes prévisionnelles 16,6 k€ > plafond 15 k€ micro-BIC" }
      ]
    }
  ]
}
```

### 5.4 Bibliothèques externes

| Lib | Usage | Mode d'inclusion |
|---|---|---|
| Chart.js | Graphiques amortissement / cash-flow | npm + import |
| TailwindCSS | Styling | npm + PostCSS |
| (aucune autre) | – | – |

Pas de moment.js, pas de lodash, pas d'utilitaire externe : tout est codé en JS standard.

### 5.5 Compatibilité navigateurs

- Cibles : Chrome / Firefox / Safari / Edge dernières 2 versions, mobile et desktop.
- Pas de polyfills IE11.
- Test mobile en priorité iPhone (Safari) et Android Chrome.

### 5.6 Déploiement GitHub Pages

- Branche `main` pour le code source.
- Workflow GitHub Actions `.github/workflows/deploy.yml` :
  - Trigger : push sur `main`.
  - Étapes : `npm ci` → `npm run build` → upload artifact `dist/` → deploy via `actions/deploy-pages@v4`.
- Configuration GitHub Pages : source = GitHub Actions.
- Pas de domaine custom V1.

---

## 6. Spécifications UX/UI

### 6.1 Principes de design
- **Sobre et fonctionnel** : palette neutre (gris/blanc) + 1 couleur d'accent + couleurs sémantiques (rouge/orange/vert) pour les alertes et scores.
- **Densité d'information maîtrisée** : pas de scroll infini, sections accordéon, panneaux contextuels.
- **Mobile-friendly** : breakpoint principal à 768 px. Formulaire sur 1 colonne en mobile, 2 colonnes desktop.
- **Pas de surcharge graphique** : icônes uniquement quand utiles (alertes, actions).

### 6.2 Parcours utilisateur principal

```
Liste vide
   ↓
[+ Nouveau bien]
   ↓
Saisie : choix type location → choix régime fiscal → caractéristiques → financement → hypothèses → fiscal
   ↓
[Calculer]
   ↓
Restitution (score + indicateurs + alertes + détail) — sauvegarde auto en localStorage
   ↓
Retour à la liste OU [Nouveau bien] OU [Comparer]
```

### 6.3 Validation et erreurs

- Validation **temps réel** dès qu'un champ perd le focus (`blur`).
- Messages d'erreur inline rouges sous le champ.
- Avertissements jaunes pour valeurs aberrantes (non bloquants).
- Bouton "Calculer" désactivé tant qu'au moins 1 erreur bloquante.

### 6.4 Accessibilité minimale

- Labels HTML associés à tous les champs (`<label for>`).
- Contrastes WCAG AA minimum.
- Navigation clavier complète (Tab + Enter).
- `aria-label` sur les boutons-icônes.

---

## 7. Méthodologie de calcul détaillée

### 7.1 Constantes fiscales V1 (paramétrables)

```javascript
export const CONSTANTES_DEFAUT = {
  TMI: 0.30,
  PS: 0.172,
  abattementMicroFoncier: 0.30,
  abattementMicroBIC_LMNP: 0.50,           // LD meublée et meublé tourisme classé
  abattementMicroBIC_TourismeClasse: 0.50,
  abattementMicroBIC_TourismeNonClasse: 0.30, // depuis 2025, loi Le Meur
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
```

### 7.2 Mensualité de crédit (amortissement constant)

```
M = C × (t_m) / (1 - (1 + t_m)^(-n))
```

Avec :
- `M` = mensualité (€)
- `C` = capital emprunté (€)
- `t_m` = taux mensuel = taux annuel / 12
- `n` = nombre de mensualités = durée années × 12

**Mensualité totale** = M (capital + intérêts) + assurance mensuelle

```
Assurance mensuelle = (C × tauxAssuranceAnnuel) / 12
```

### 7.3 Tableau d'amortissement (mois par mois)

À l'itération `k` (k = 1 à n) :
- `Intérêts_k = Capital_restant_(k-1) × t_m`
- `Capital_remboursé_k = M - Intérêts_k`
- `Capital_restant_k = Capital_restant_(k-1) - Capital_remboursé_k`

### 7.4 Rendements

#### Coût total d'acquisition
```
CTA = prixAcquisition + fraisNotaire + travaux + mobilier
```

#### Rendement brut annuel
```
RB = (loyerAnnuelHC × 100) / CTA
```

Où `loyerAnnuelHC` dépend du type de location :
- LD nue / meublée : `loyerMensuelHC × 12 × (1 - vacanceMensuelle/12)`
- LCD : `ADR × 365 × tauxOccupation`
- LMD : `loyerMensuel × 12 × tauxOccupation`
- Coloc : `nbChambres × loyerChambre × 12 × (1 - vacanceMoyenne/12)`

#### Rendement net (avant fiscalité)
```
RN = ((loyerAnnuel - chargesRécurrentesAnnuelles - fraisExploitation) × 100) / CTA
```

Avec `fraisExploitation` :
- LCD : `loyerAnnuel × fraisConciergerie + consommablesAnnuels`
- Autres : 0 ou frais de gestion locative si applicable.

#### Rendement net-net (après fiscalité)
```
RNN = ((revenuNetAvantFiscalité - impôtAnnuel) × 100) / CTA
```

### 7.5 Cash-flow mensuel net

```
CFM = (loyerMensuelEffectif - chargesMensuelles - fraisExploitationMensuels - mensualitéCrédit - impôtMensuel)
```

Où `impôtMensuel = impôtAnnuel / 12`.

### 7.6 TRI sur 10 ans

Construire le vecteur de flux de trésorerie :
- **Flux 0** = -(apport + frais notaire non couverts par apport + travaux + mobilier non empruntés)
- **Flux 1 à 9** = cash-flow annuel net
- **Flux 10** = cash-flow année 10 + valeur nette de revente

Valeur nette de revente :
```
ValeurRevente = prixAcquisition × (1 + revalorisationAnnuelle)^10
CapitalRestantDû_année10 = (à lire dans le tableau d'amortissement)
PlusValueBrute = ValeurRevente - prixAcquisition
ImpôtPlusValue = calcul selon régime (voir 7.8)
ValeurNetteRevente = ValeurRevente - CapitalRestantDû - ImpôtPlusValue
```

Résoudre `Σ Flux_k / (1+TRI)^k = 0` par bisection (intervalle initial -50 % / +50 %, tolérance 0.01 %).

### 7.7 Fiscalité par régime

#### A. Micro-foncier (LD nue, plafond 15 000 €)
```
revenuImposable = loyersAnnuels × (1 - 0.30)
impôt = revenuImposable × (TMI + PS)
```

#### B. Réel foncier (LD nue)
```
chargesDéductibles = chargesRécurrentes + intérêtsAnnuelsCrédit + travauxDéductibles + assurancePNO + taxeFoncière
revenuFoncierBrut = loyersAnnuels - chargesDéductibles

SI revenuFoncierBrut ≥ 0 :
    impôt = revenuFoncierBrut × (TMI + PS)
SI revenuFoncierBrut < 0 :
    déficit = -revenuFoncierBrut
    déficitImputableRevenuGlobal = MIN(déficit hors intérêts, 10 700)
    déficitReportable = déficit - déficitImputableRevenuGlobal
    économieFiscale = déficitImputableRevenuGlobal × TMI
    impôt = -économieFiscale  // négatif = gain
```

> Note : la part du déficit liée aux intérêts d'emprunt n'est imputable que sur les revenus fonciers futurs (10 ans).

#### C. Micro-BIC LMNP / meublé tourisme classé (50 %, plafond 77 700 €)
```
revenuImposable = loyersAnnuels × (1 - 0.50)
impôt = revenuImposable × (TMI + PS)
```

#### D. Micro-BIC meublé tourisme non classé (30 %, plafond 15 000 €)
```
revenuImposable = loyersAnnuels × (1 - 0.30)
impôt = revenuImposable × (TMI + PS)

SI loyersAnnuels > 15 000 :
    ALERTE : bascule réel obligatoire
```

#### E. Réel LMNP (avec amortissement)

```javascript
// Bases d'amortissement
baseBati = (prixAcquisition + fraisNotaire) × amortBatiQuotePart;
baseMobilier = mobilier;
baseTravaux = travaux;

amortAnnuelBati = baseBati / amortBatiDuree;
amortAnnuelMobilier = baseMobilier / amortMobilierDuree;
amortAnnuelTravaux = baseTravaux / amortTravauxDuree;

amortAnnuelTotal = amortAnnuelBati + amortAnnuelMobilier + amortAnnuelTravaux;

// Charges déductibles
chargesDeductibles = chargesRécurrentes + intérêtsAnnuels + assurancePNO 
                   + taxeFoncière + honorairesComptables + fraisExploitation;

// Résultat fiscal
résultatAvantAmort = loyersAnnuels - chargesDeductibles;

// Plafonnement amortissement (l'amortissement ne peut pas créer de déficit)
amortDéductible = MIN(amortAnnuelTotal, MAX(résultatAvantAmort, 0));
amortReporté = amortAnnuelTotal - amortDéductible;  // reportable sans limite

résultatFiscal = MAX(résultatAvantAmort - amortDéductible, résultatAvantAmort);
// Si résultatAvantAmort < 0, déficit BIC reportable 10 ans (sur BIC futurs uniquement)

SI résultatFiscal ≥ 0 :
    impôt = résultatFiscal × (TMI + PS)
SI résultatFiscal < 0 :
    impôt = 0  // déficit reportable, pas d'imputation revenu global
```

**Rappel important (loi de finances 2025)** : à la revente, les amortissements pratiqués sont **réintégrés dans la plus-value imposable** (LMNP non professionnel). Cet effet doit être intégré au calcul du TRI 10 ans (cf. 7.8).

### 7.8 Plus-value à la revente (10 ans)

#### A. Régime des plus-values immobilières des particuliers (applicable à toutes les locations sauf SCI à l'IS)

```
plusValueBrute = prixRevente - (prixAcquisition + fraisNotaire + travaux)

// LMNP réel : réintégration amortissements (depuis 2025)
SI régime = "reel_lmnp" :
    plusValueBrute += amortBatiCumulé_année10

// Abattements pour durée de détention (10 ans)
abattementIR_10ans = 6 × 6%   // 36 %
abattementPS_10ans = 6 × 1.65% // 9.9 %

plusValueImposableIR = plusValueBrute × (1 - abattementIR_10ans)
plusValueImposablePS = plusValueBrute × (1 - abattementPS_10ans)

impôtPV = plusValueImposableIR × 0.19 + plusValueImposablePS × 0.172
```

> Note : la surtaxe sur PV > 50 k€ n'est pas modélisée en V1 (seuils rarement atteints sur petits T2).

### 7.9 Hypothèses par défaut documentées

| Hypothèse | Valeur défaut | Justification |
|---|---|---|
| Inflation loyers annuelle | 1.5 % | IRL moyen 2020-2025 |
| Revalorisation bien annuelle | 1.0 % | Marché Nancy stable, hypothèse prudente |
| Frais de notaire | 8 % | Ancien |
| Vacance LD | 0.5 mois/an | Standard zone tendue |
| Vacance coloc / chambre | 1 mois/an | Rotation étudiante |
| Conciergerie LCD | 22 % CA | Médiane Nancy |
| TO LCD | 65 % | Hypothèse moyenne T2 Nancy |
| Honoraires comptables LMNP réel | 800 €/an | Cabinets en ligne |
| Amortissement bâti | 85 % × 30 ans | Standard cabinets LMNP |
| Amortissement mobilier | 100 % × 7 ans | Idem |
| Amortissement travaux | 100 % × 10 ans | Idem |

---

## 8. Roadmap de développement

### Lot 1 — Fondations + LD nue micro-foncier (MVP)
**Livrable** : application qui calcule un score sur un seul type de location avec un seul régime fiscal.

- Setup repo, Vite, Tailwind, structure de fichiers.
- `core/finance.js` : mensualité, rendement brut, rendement net, cash-flow.
- `core/fiscalite.js` : micro-foncier uniquement.
- `core/scoring.js` : familles F1+F2 uniquement, pondérations en dur.
- UI : 1 formulaire, 1 écran de résultat.
- `persistence/storage.js` : sauvegarde minimale.
- Test : 1 cas (cas de validation #1).

### Lot 2 — Scoring complet + alertes
- `core/scoring.js` : familles F3+F4, méthode complète.
- `core/alertes.js` : DPE, cash-flow négatif, plafonds.
- UI : affichage scores par famille, détail des sous-scores, alertes.
- Panneau pondérations modifiable.

### Lot 3 — Tous types de location + tous régimes
- LD meublée, LCD, LMD, colocation : champs conditionnels.
- Micro-BIC LMNP, micro-BIC tourisme classé/non classé, réel LMNP avec amortissement, réel foncier.
- TRI 10 ans complet avec PV à la revente (réintégration amortissements LMNP).
- Tests : cas de validation #2 à #5.

### Lot 4 — Comparaison + export/import
- Écran "Liste des biens" avec tableau récapitulatif.
- Écran "Comparaison" multi-biens.
- Export/import JSON.

### Lot 5 — Polish
- Graphiques Chart.js (amortissement, cash-flow projeté).
- Mobile responsive complet.
- Panneau "Constantes fiscales" éditable.
- CSS print pour impression.
- Pré-remplissage valeurs Nancy par défaut.
- Workflow GitHub Actions de déploiement.

---

## 9. Critères de validation

### 9.1 Cas de test chiffrés

#### Cas 1 — T2 LD nue micro-foncier (cas simple)
**Données** :
- Prix 90 000 €, frais notaire 7 200 €, apport 10 000 €, pas de travaux.
- Crédit 87 200 € sur 20 ans à 3.26 %, assurance 0.20 %.
- Loyer 500 €/mois HC, vacance 0.5 mois/an, charges copro 1 000 €/an, taxe foncière 700 €.
- TMI 30 %.

**Résultats attendus** :
- Mensualité crédit : ~497 €/mois (capital+intérêts) + ~14.5 €/mois assurance ≈ **511 €/mois**
- Loyer annuel net vacance : 500 × 11.5 = **5 750 €**
- Rendement brut : 5 750 / 97 200 = **5.92 %**
- Revenu imposable micro-foncier : 5 750 × 0.70 = **4 025 €**
- Impôt + PS : 4 025 × (0.30 + 0.172) = **1 900 €/an**, soit ~158 €/mois
- Cash-flow mensuel : 500 - (1 000 + 700)/12 - 511 - 158 ≈ **-310 €/mois** (effort d'épargne)

#### Cas 2 — T2 LD meublée micro-BIC LMNP (cas favorable)
**Données** : mêmes que cas 1 + mobilier 4 000 €, loyer 580 €/mois HC.
- Régime micro-BIC LMNP (50 % abattement).

**Résultats attendus** :
- Loyer annuel net : 580 × 11.5 = **6 670 €**
- Rendement brut : 6 670 / 101 200 ≈ **6.59 %**
- Revenu imposable : 6 670 × 0.50 = **3 335 €**
- Impôt + PS : 3 335 × 0.472 ≈ **1 574 €/an**, soit 131 €/mois
- Cash-flow ≈ **-243 €/mois**

#### Cas 3 — T3 LCD réel LMNP classé (cas LCD optimisé)
**Données** :
- Prix 130 000 €, frais notaire 10 400 €, mobilier 8 000 €, travaux 5 000 €, apport 15 000 €.
- Crédit 138 400 € sur 20 ans à 3.26 %.
- ADR 90 €/nuit, TO 65 %, conciergerie 22 %, consommables 50 €/mois.
- Charges copro 1 800 €/an, taxe foncière 1 100 €, PNO 250 €, comptable 800 €.
- Meublé classé Atout France.

**Résultats attendus** :
- Loyer annuel : 90 × 365 × 0.65 = **21 353 €**
- > Plafond micro-BIC tourisme classé non, mais > plafond non classé → utilité du classement
- CA net conciergerie/consommables : 21 353 × 0.78 - 600 = **16 056 €**
- Mensualité crédit : ~789 € + assurance ~23 € = **812 €/mois**
- Intérêts année 1 : ~4 480 €
- Amortissement annuel : (130 000 + 10 400) × 0.85 / 30 + 8 000/7 + 5 000/10 = **5 121 €**
- Charges déductibles : 4 480 + 1 800 + 1 100 + 250 + 800 + 4 700 (conciergerie) + 600 = **13 730 €**
- Résultat avant amort : 21 353 - 13 730 = **7 623 €**
- Amort déductible : MIN(5 121, 7 623) = **5 121 €**
- Résultat fiscal : 7 623 - 5 121 = **2 502 €**
- Impôt + PS : 2 502 × 0.472 = **1 181 €/an** (soit 98 €/mois)
- Cash-flow mensuel : (21 353 - 13 730 - 4 480 retiré car compté dans charges)/12 - 812 - 98... à recalculer proprement par l'outil.

> Test fonctionnel : vérifier que la bascule micro→réel et l'amortissement sont correctement gérés, et que l'alerte "plafond non classé" s'affiche si l'utilisateur tente le micro-BIC non classé sur ce bien.

#### Cas 4 — T4 colocation 3 chambres réel LMNP
**Données** :
- Prix 145 000 €, frais notaire 11 600 €, mobilier 6 000 €, travaux 8 000 €, apport 15 000 €.
- Crédit 155 600 € sur 25 ans à 3.40 %.
- 3 chambres × 380 €/mois, vacance 1 mois/chambre/an, charges 200 €/mois.
- Réel LMNP.

**Résultats attendus** :
- Loyer annuel : 3 × 380 × 11 = **12 540 €**
- Vérifier RB ~7.4 %, calcul amortissement, déficit BIC année 1 plausible (charges + amort > recettes les premières années).

#### Cas 5 — T2 LCD non classé (test alerte plafond)
**Données** : même que cas 3 mais meublé non classé, micro-BIC tourisme non classé sélectionné.

**Résultat attendu** :
- 🟠 Alerte affichée : "Recettes prévisionnelles 21 353 € > plafond 15 000 € micro-BIC tourisme non classé. Bascule au réel obligatoire."
- Le calcul fiscal au régime sélectionné est fait à titre indicatif mais l'alerte est bloquante visuellement.

### 9.2 Validation fonctionnelle Must-have

| Fonctionnalité | Méthode de vérification |
|---|---|
| Mensualité crédit | Comparer avec calculatrice externe (Meilleurtaux, Pretto). Tolérance ±0.5 €. |
| Rendements | Recalcul manuel sur cas 1. |
| Fiscalité par régime | Recalcul manuel sur 5 cas. |
| Score global | Somme pondérée des sous-scores doit retomber sur le score affiché. |
| Alertes | Forcer chaque condition (DPE F, cash-flow négatif, plafond dépassé) et vérifier déclenchement. |
| Persistance | Sauvegarder un bien, recharger la page, vérifier qu'il est restitué intact. |
| Import/export JSON | Export d'un bien → reset localStorage → import du JSON → bien identique. |
| Comparaison | Sélectionner 3 biens, vérifier affichage côte à côte cohérent. |
| Mobile | Tester sur viewport 375 × 812 (iPhone SE), aucun débordement horizontal. |

---

## 10. Limites assumées et évolutions futures

### 10.1 Hors scope V1
- **SCI à l'IR et à l'IS** : exclues V1, à intégrer en V2 si projet effectif d'acquisition via SCI. Implique calcul d'IS, fiscalité dividendes en sortie, amortissement comptable distinct du LMNP.
- **Plus-values professionnelles LMP** : non modélisé (seuil 23 000 € + 50 % revenus globaux rarement atteint).
- **CSG déductible** : non intégrée.
- **IFI** : non intégré (seuil 1.3 M€ patrimoine immobilier).
- **Surtaxe PV > 50 k€** : non modélisée.
- **Encadrement loyers Nancy** : à intégrer si la commune entre dans le dispositif (pas le cas en mai 2026 mais à surveiller).
- **Pas d'API externe en runtime** : DVF, INSEE, prix m², ADR Airbnb sont saisis manuellement.

### 10.2 Pistes V2
- **Module SCI à l'IR / IS** complet.
- **Connexion API DVF** (data.economie.gouv.fr) pour pré-remplir le prix au m² du quartier.
- **Connexion API INSEE** pour tension locative et données démographiques.
- **Comparaison multi-régimes** sur un même bien (afficher côte à côte micro-BIC vs réel LMNP).
- **Simulation d'évolution fiscale** (scénario "que se passe-t-il si l'abattement micro-BIC LMNP passe à 30 % ?").
- **Scraping ADR Airbnb** (via service tiers, AirDNA ou autre).
- **Module sortie** : optimisation du moment de revente selon courbe d'amortissement et fiscalité.
- **Synchronisation cloud** (Firebase, Supabase) si besoin multi-device.
- **Mode multi-utilisateur** si partage avec courtier/comptable souhaité.

### 10.3 Veille réglementaire à anticiper
- **Loi de finances annuelle** : abattements et plafonds peuvent évoluer.
- **Loi Le Meur** (en vigueur depuis 2025) : durcissement potentiel local des règles LCD à Nancy (à surveiller annuellement).
- **DPE** : calendrier d'interdiction des passoires (G en 2025, F en 2028, E en 2034) — déjà intégré aux alertes.
- **Réintégration amortissements LMNP** : actée en 2025, mais les modalités précises peuvent encore évoluer en doctrine fiscale.

Le panneau "Constantes fiscales" doit être conçu pour absorber ces évolutions sans modification du code.

---

## ANNEXE A — Décisions requises avant développement

| # | Décision | Recommandation |
|---|---|---|
| D1 | Pondérations inter-familles par type de location (section 3.3) | Valider la proposition ou ajuster |
| D2 | Pondérations intra-familles (section 3.3) | Valider la proposition ou ajuster |
| D3 | Seuils de scoring financier (section 3.4) | Valider la proposition |
| D4 | Choix de stack (Vanilla JS + Vite vs alternative) | Valider Vanilla JS + Vite + Tailwind + Chart.js |
| D5 | Pré-remplissage Nancy par défaut activé en V1 ? | À confirmer |
| D6 | Niveau d'export : JSON seul ou JSON + CSV + PDF ? | JSON V1, CSV+PDF V1.1 |

## ANNEXE B — Glossaire

- **ADR** : Average Daily Rate (prix moyen par nuit en LCD).
- **TO** : Taux d'occupation.
- **CTA** : Coût total d'acquisition.
- **CFM** : Cash-flow mensuel.
- **TRI** : Taux de rendement interne.
- **TMI** : Tranche marginale d'imposition.
- **PS** : Prélèvements sociaux (17.2 %).
- **LMNP** : Loueur Meublé Non Professionnel.
- **LMP** : Loueur Meublé Professionnel.
- **PNO** : Propriétaire Non Occupant.
- **DPE** : Diagnostic de Performance Énergétique.
- **IRL** : Indice de Référence des Loyers.

---

**Fin du cahier des charges V1.**

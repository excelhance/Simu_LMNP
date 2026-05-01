# Simu_LMNP

Calculateur locatif personnel — Lot 1 (LD nue / micro-foncier).

> Stack : Vite + TailwindCSS + Chart.js (chart.js installé pour les Lots ultérieurs).

## Périmètre Lot 1

- Saisie d'un bien locatif (LD nue / micro-foncier).
- Calculs : mensualité de crédit, rendements brut/net/net-net, cash-flow mensuel.
- Fiscalité micro-foncier (abattement 30 % + IR au TMI + PS 17.2 %).
- Scoring partiel **F1 (financier) + F2 (bien)** normalisé sur 100 %.
- Persistance localStorage.
- Trois écrans : liste, saisie, restitution.

Voir `BRIEF_CLAUDE_CODE.md` pour le périmètre détaillé et `CAHIER_DES_CHARGES.md` pour l'app cible (Lots 2-5).

## Installation

```bash
npm install
```

Node ≥ 20 requis.

## Développement

```bash
npm run dev
```

Serveur Vite local : http://localhost:5173/Simu_LMNP/

## Build

```bash
npm run build
```

Sortie : `dist/`.

## Déploiement GitHub Pages

Le workflow `.github/workflows/deploy.yml` se déclenche à chaque push sur `main` :
checkout → setup-node@v4 → `npm ci` → `npm run build` → upload-pages-artifact → deploy-pages.

Le `base` est configuré sur `/Simu_LMNP/` dans `vite.config.js`.

## Cas de test #1

- Prix 90 000 €, FN 7 200 €, apport 10 000 €.
- Crédit 87 200 € sur 20 ans à 3.26 % (assurance 0.20 %).
- Loyer 500 €/mois HC, vacance 0.5 mois, charges copro 1 000 €, taxe foncière 700 €, TMI 30 %.

Résultats attendus :

| Indicateur | Attendu |
|---|---|
| Capital emprunté | 87 200 € |
| Mensualité crédit | ~495 €/mois |
| Mensualité totale | ~510 €/mois |
| Loyer annuel net vacance | 5 750 € |
| Rendement brut | ~5.92 % |
| Revenu imposable | 4 025 € |
| Impôt + PS | ~1 900 €/an |
| Cash-flow mensuel | ~-310 € |
| Score partiel | dans [3, 5] (orange) |

# Baromètre Alimentaire · Bénin — Frontend (Next.js)

Interface web de l'outil d'aide à la décision (OS4), **séparée du backend**. Consomme l'API
FastAPI du dossier `../app`. Design éditorial terracotta, animations Framer Motion, composants
shadcn/ui + Magic UI, cartographie Leaflet.

## Stack
- **Next.js 16** (App Router) · **React 19** · **TypeScript** · **Tailwind CSS v4**
- **shadcn/ui** (Base UI) + **Magic UI** / **Aceternity** (MagicCard, NumberTicker, ShimmerButton…)
- **Framer Motion** (`motion`) · **Recharts** (SHAP) · **react-leaflet** (carte) · **next-themes** (clair/sombre)
- Polices : **Fraunces** (titres) · **Geist** (UI) · **Geist Mono** (chiffres)

## Pages
| Route | Rôle | Objectif |
|---|---|---|
| `/` | Accueil : hero, KPIs animés, modules (bento) | — |
| `/prediction` | Formulaire des **déterminants OS1** → risque + jauge + SHAP | OS4 + OS1 |
| `/lot` | Prédiction CSV par lot + ciblage + export | OS4 |
| `/carte` | Cartographie communale interactive (Leaflet) | OS3 |
| `/ciblage` | Simulation « what-if » + arbitrage du ciblage | OS1/OS4 |
| `/a-propos` | Performances + table des déterminants | OS1/OS2 |

## Lancer en local (2 terminaux)

**1) Backend** (API + modèle) — depuis la racine du projet :
```bash
python app/run.py            # http://127.0.0.1:8000
```

**2) Frontend** — depuis `webapp/` :
```bash
npm install                  # une seule fois
npm run dev                  # http://localhost:3000  (développement)
# ou, en production :
npm run build && npm start
```

Ouvrir **http://localhost:3000**.

## Configuration
L'URL du backend est lue depuis `NEXT_PUBLIC_API_URL` (fichier `.env.local`, défaut
`http://127.0.0.1:8000`). Le backend autorise déjà le CORS.

## Intégration
Tout passe par le client typé `src/lib/api.ts` (endpoints `/api/metadata`, `/api/form-schema`,
`/api/predict`, `/api/predict/batch`, `/api/communes`, `/api/determinants`, `/api/template`).
Le formulaire de prédiction est **généré dynamiquement** depuis `/api/form-schema`, dont les
champs sont les déterminants significatifs de l'OS1 (odds ratios affichés).

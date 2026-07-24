# Baromètre Alimentaire — API (backend)

**API REST (FastAPI)** de la solution d'aide à la décision *Baromètre Alimentaire* : elle
encapsule un modèle prédictif calibré (**XGBoost**) pour prédire le risque d'insécurité
alimentaire des ménages au Bénin, cartographier le risque communal et alimenter le module de
rapports destiné aux acteurs humanitaires (PAM, FAO, ONG) et aux institutions.

> Le frontend de production est l'application **Next.js** du dossier `../webapp`.
> Le frontend HTML/JS de ce dossier (`frontend/`) reste disponible comme interface légère.

Conçu par **Pinel Baudelaire DAHOUI** — Data Scientist · Économètre · Statisticien
· tpineldahoui@gmail.com

---

## Architecture

```
app/
├── backend/                API REST Python (FastAPI)
│   ├── main.py             endpoints + service du frontend statique
│   └── predictor.py        chargement du modèle, features, prédiction, SHAP, carte
├── frontend/               interface web (aucun build requis)
│   ├── index.html          structure (SPA)
│   ├── styles.css          mise en forme
│   └── app.js              logique (fetch API, Leaflet, Chart.js)
├── model/                  artefacts du modèle encapsulé (générés)
├── export_model.py         (ré)génère les artefacts depuis outputs/
├── run.py                  lanceur
└── requirements.txt
```

Le **frontend** (navigateur) appelle le **backend** (API REST) qui sert les prédictions du
modèle. Séparation front/back classique ; Leaflet et Chart.js sont chargés par CDN.

## Fonctionnalités

| Module | Description | Objectif |
|---|---|---|
| **Prédiction individuelle** | Formulaire dont les champs sont les **déterminants significatifs de l'OS1** (odds ratios affichés) → probabilité calibrée, classe de risque et **explication SHAP** du ménage | OS4 + OS1 |
| **Prédiction par lot** | Upload d'un CSV de ménages → scores, statistiques, seuil de ciblage, export | OS4 |
| **Cartographie** | Carte communale interactive (Leaflet) du risque prédit + communes prioritaires | OS3 |
| **Ciblage & simulation** | Simulation « what-if » d'une intervention + arbitrage du ciblage communal | OS1/OS4 |
| **À propos** | Performances du modèle et table des déterminants (OS1) | OS1/OS2 |

## Installation et lancement

Prérequis : Python 3.11 (le même environnement que le pipeline convient déjà).

```bash
# 1. (optionnel) installer les dépendances
pip install -r app/requirements.txt

# 2. (une seule fois, ou après ré-exécution du pipeline) encapsuler le modèle
python app/export_model.py

# 3. lancer l'application
python app/run.py
```

Puis ouvrir **http://127.0.0.1:8000** dans un navigateur.

> Alternative : `uvicorn app.backend.main:app --reload` (depuis la racine du projet).

## API REST

| Méthode | Endpoint | Rôle |
|---|---|---|
| GET  | `/api/metadata` | performances, prévalence, seuils de risque |
| GET  | `/api/form-schema` | champs du formulaire (déterminants OS1 + odds ratios) |
| POST | `/api/predict` | prédiction d'un ménage `{fields:{…}}` → proba, classe, SHAP |
| POST | `/api/predict/batch` | fichier CSV → scores + résumé + CSV enrichi |
| GET  | `/api/template` | gabarit CSV pour la prédiction par lot |
| GET  | `/api/communes` | GeoJSON communal enrichi du risque + communes prioritaires |
| GET  | `/api/determinants` | déterminants significatifs (odds ratios, OS1) |

## Modèle servi

- **Algorithme** : XGBoost (hyperparamètres du chapitre 5), recalibré par régression isotonique.
- **Données** : enquête AGVSAN Bénin 2017 (14 952 ménages).
- **Performance hors échantillon** : AUROC ≈ 0,79 · Rappel ≈ 68 % · Brier (calibré) ≈ 0,077.

## Limites

- Fondé sur des données de 2017 ; une actualisation est recommandée.
- Outil d'**aide à la décision** : les prédictions appuient sans le remplacer le jugement de terrain.
- Les champs non saisis prennent la valeur médiane de l'échantillon.

# Pipeline — Risque d'Insécurité Alimentaire des Ménages au Bénin

Implémentation Python de la méthodologie du mémoire *« Analyse et Modélisation du Risque
d'Insécurité Alimentaire des Ménages au Bénin »* (DAHOUI Pinel Baudelaire T., CIPMA/UNESCO).

## Contenu

| Fichier | Rôle |
|---------|------|
| `Pipeline_Insecurite_Alimentaire_Benin.ipynb` | **Notebook principal** (exécutable de bout en bout) |
| `Pipeline_Insecurite_Alimentaire_Benin.py` | Source jupytext (format `# %%`, synchronisé avec le `.ipynb`) |
| `AGVSA_BENIN_2017_MENAGE_RawData.dta` | Données brutes AGVSAN 2017 (14 952 ménages × 1406 variables) |
| `metadonnees_variables.xlsx` | Dictionnaire des variables |
| `benin_communes_ADM2.geojson` | Fond de carte des 77 communes (geoBoundaries ADM2) |
| `outputs/` | Tous les résultats produits (tables CSV, figures PNG, carte HTML) |

## Environnement

Python 3.11. Installer les dépendances :

```bash
pip install pandas pyreadstat scipy statsmodels scikit-learn xgboost shap \
            imbalanced-learn matplotlib seaborn geopandas libpysal esda \
            mapclassify folium openpyxl jupytext
```

## Exécution

```bash
# Ouvrir dans Jupyter
jupyter lab Pipeline_Insecurite_Alimentaire_Benin.ipynb

# ou exécuter en script
python Pipeline_Insecurite_Alimentaire_Benin.py
```

> **Mode d'exécution** : par défaut le notebook exécute la configuration du mémoire
> (K=10 plis, grilles d'hyperparamètres complètes via random search — §4.5.5).
> Poser la variable d'environnement `FAST_MODE=1` pour un test rapide (K=5, grilles réduites).

## Étapes du pipeline (mappées aux objectifs du mémoire)

1. Chargement AGVSAN 2017 (encodage latin1 + correction du mojibake des labels)
2. **Variable dépendante `Y`** : `Round_INDICE_SECAL` ∈ {3,4} → insécurité (réf. CARI/PAM) ;
   définitions alternatives {4} et {2,3,4} pour la sensibilité
3. **Variables indépendantes** : 5 capitaux SLF + **SCA reconstruit depuis les 18 items bruts**
   et concordance (Kappa) avec la classification officielle (§4.2.3-4.2.4)
4. Nettoyage & **manquants informatifs** (agriculture/chocs/cheptel recodés, pas imputés)
5. Tests pré-estimation (χ², Mann-Whitney, VIF, **Box-Tidwell**, correction FDR)
6. Partition stratifiée 70/30 + gestion du déséquilibre (~10 % de Y=1)
7. **OS1** — Régression Logistique Elastic-Net **pondérée par les poids d'enquête** ;
   Odds Ratios avec **erreurs-types robustes en grappes** (pseudo-vraisemblance pondérée)
8-9. **OS2** — Random Forest (`sample_weight`) & XGBoost (poids × `scale_pos_weight`)
   + comparaison **class weighting vs SMOTE** (§4.5.2)
10-11. Validation **par grappes** (`GroupKFold`, K=10) + comparaison (AUROC+IC, DeLong,
   Recall, F1, Brier) + **sensibilité des 3 définitions de Y**
12. Calibration (Hosmer-Lemeshow + recalibration isotonique)
13. **Interprétabilité SHAP**
14. **OS3/OS4** — Cartographie communale (agrégation pondérée, indice de Moran, choroplèthe)

## Principaux résultats (FAST_MODE, indicatifs)

- Prévalence Y=1 (réf.) : **10 %** ; forte disparité Nord/Sud
- AUROC test : **Random Forest ≈ 0,80**, **XGBoost ≈ 0,79**, **Logit ≈ 0,77**
- **Test de DeLong** : RF & XGBoost significativement > Logit → **H₂ confirmée**
- **Indice de Moran I ≈ 0,51 (p ≈ 0,001)** → autocorrélation spatiale positive → **H₃ confirmée**
- Poches de vulnérabilité concentrées au Nord (Boukoumbé, Toucountouna, Matéri, Tanguiéta…)

## Notes méthodologiques

- **Fichier `.dta`** : encodé UTF-8 mais des labels tronqués (80 car.) cassent le décodage ;
  lecture en `latin1` + `fix_moji()` pour l'affichage. Le recodage se fait par codes numériques.
- **Manquants informatifs** : les modules agricoles et chocs ne sont posés qu'à des
  sous-échantillons — recodés selon leur sens (0 / « Aucun »), pas imputés naïvement.
- **rCSI, HFIAS, SCA** : réservés à la validation croisée de `Y`, exclus des prédicteurs.
- Les chiffres 25,69 %/74,70 % cités dans le mémoire ne correspondent pas à la prévalence
  brute CARI (≈10 %) — **à clarifier** (répartition des ménages insécures par milieu ?).

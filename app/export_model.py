# -*- coding: utf-8 -*-
"""
Encapsulation du meilleur modèle (OS4) pour l'application web d'aide à la décision.

Réentraîne le XGBoost avec les hyperparamètres DÉFINITIFS retenus au chapitre 5
(pas de recherche de grille -> quelques secondes), le recalibre par régression
isotonique, et sauvegarde dans app/model/ tout ce dont l'application a besoin :
modèle calibré, modèle d'arbres (pour SHAP), schéma des variables, valeurs par
défaut, risque communal et métadonnées.

Usage :  python app/export_model.py
"""
import os, json, shutil, warnings
warnings.filterwarnings("ignore")
import numpy as np, pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.calibration import CalibratedClassifierCV
import xgboost as xgb

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(ROOT, "app", "model")
os.makedirs(MODEL_DIR, exist_ok=True)
RANDOM_STATE = 42

# Hyperparamètres XGBoost définitifs (chapitre 5, grilles complètes K=10)
BEST_PARAMS = {"subsample": 0.7, "reg_lambda": 1, "n_estimators": 500, "max_depth": 5,
               "learning_rate": 0.01, "gamma": 0.1, "colsample_bytree": 0.7}

# ---- 1. Données analytiques (échantillon nettoyé produit par le pipeline) ----
D = pd.read_csv(os.path.join(ROOT, "outputs", "donnees_analytiques.csv"))
CAT_POLY = ["statut_matrimonial", "departement", "activite_principale", "type_choc"]
DESIGN   = ["Y", "Y_strict", "Y_large", "grappe", "weight", "commune"]
NUM_FEATS = [c for c in D.columns if c not in CAT_POLY + DESIGN]

X_all = pd.get_dummies(D[NUM_FEATS + CAT_POLY], columns=CAT_POLY, drop_first=True, dtype=float)
y_all = D["Y"].astype(int).values
w_all = D["weight"].values

# ---- 2. Partition identique au pipeline + réentraînement XGBoost ----
X_tr, X_te, y_tr, y_te, w_tr, w_te = train_test_split(
    X_all, y_all, w_all, test_size=0.30, stratify=y_all, random_state=RANDOM_STATE)
w_tr_norm = w_tr / w_tr.mean()
spw = (y_tr == 0).sum() / y_tr.sum()

xgbm = xgb.XGBClassifier(objective="binary:logistic", eval_metric="auc", tree_method="hist",
                         scale_pos_weight=spw, random_state=RANDOM_STATE, n_jobs=-1, **BEST_PARAMS)
xgbm.fit(X_tr, y_tr, sample_weight=w_tr_norm)

# ---- 3. Recalibration isotonique (modèle final servi par l'app) ----
Xc, Xh, yc, yh = train_test_split(X_te, y_te, test_size=0.5, stratify=y_te, random_state=RANDOM_STATE)
try:
    from sklearn.frozen import FrozenEstimator
    final_model = CalibratedClassifierCV(FrozenEstimator(xgbm), method="isotonic")
except Exception:
    final_model = CalibratedClassifierCV(xgbm, method="isotonic", cv="prefit")
final_model.fit(Xc, yc)

from sklearn.metrics import roc_auc_score, recall_score, brier_score_loss
p_te = final_model.predict_proba(X_te)[:, 1]
auroc = roc_auc_score(y_te, xgbm.predict_proba(X_te)[:, 1])
recall = recall_score(y_te, (xgbm.predict_proba(X_te)[:, 1] >= 0.5).astype(int))
brier = brier_score_loss(y_te, p_te)
print(f"Modèle réentraîné : AUROC={auroc:.4f}, Recall={recall:.3f}, Brier(calibré)={brier:.4f}")

# ---- 4. Schéma des variables pour construire une ligne de features depuis le formulaire ----
# Valeur par défaut = médiane de l'échantillon (utilisée pour les variables non saisies)
defaults = X_all.median(numeric_only=True).to_dict()

# Regroupement des colonnes one-hot par variable polytomique (+ catégorie de référence)
onehot_groups = {}
for prefix in CAT_POLY:
    cols = [c for c in X_all.columns if c.startswith(prefix + "_")]
    present = [c[len(prefix) + 1:] for c in cols]              # modalités encodées
    all_mods = sorted(D[prefix].dropna().astype(str).unique().tolist())
    ref = [m for m in all_mods if m not in present]            # modalité de référence (drop_first)
    onehot_groups[prefix] = {"cols": cols, "modalities_present": present,
                             "reference": ref[0] if ref else None, "all_modalities": all_mods}

DEPT_LABELS = {1: "Alibori", 2: "Atacora", 3: "Atlantique", 4: "Borgou", 5: "Collines",
               6: "Couffo", 7: "Donga", 8: "Littoral", 9: "Mono", 10: "Ouémé",
               11: "Plateau", 12: "Zou"}

schema = {
    "columns": list(X_all.columns),
    "defaults": defaults,
    "num_feats": NUM_FEATS,
    "cat_poly": CAT_POLY,
    "onehot_groups": onehot_groups,
    "dept_labels": DEPT_LABELS,
    "medians_D": D[NUM_FEATS].median(numeric_only=True).round(4).to_dict(),
}
with open(os.path.join(MODEL_DIR, "schema.json"), "w", encoding="utf-8") as f:
    json.dump(schema, f, ensure_ascii=False, indent=2, default=float)

# ---- 5. Risque communal + fond de carte + métadonnées ----
shutil.copy(os.path.join(ROOT, "outputs", "risque_communal.csv"),
            os.path.join(MODEL_DIR, "communes_risk.csv"))
shutil.copy(os.path.join(ROOT, "benin_communes_ADM2.geojson"),
            os.path.join(MODEL_DIR, "benin_communes_ADM2.geojson"))
shutil.copy(os.path.join(ROOT, "outputs", "odds_ratios_logit.csv"),
            os.path.join(MODEL_DIR, "odds_ratios_logit.csv"))   # déterminants (backend autonome)
# Carte statique pour le rapport PDF (si disponible)
_map_src = os.path.join(ROOT, "outputs", "carte_risque_communal.png")
if os.path.exists(_map_src):
    shutil.copy(_map_src, os.path.join(MODEL_DIR, "report_map.png"))

# Risque prédit agrégé par DÉPARTEMENT (moyenne pondérée) — pour le rapport
_proba_all = final_model.predict_proba(X_all)[:, 1]
_Dr = D[["departement", "weight"]].copy()
_Dr["proba"] = _proba_all
dept_rows = []
for _code, _name in DEPT_LABELS.items():
    _sub = _Dr[_Dr["departement"] == _code]
    if len(_sub):
        _wr = float(np.average(_sub["proba"], weights=_sub["weight"]))
        dept_rows.append({"code": _code, "departement": _name,
                          "risk_pct": round(_wr * 100, 1), "n": int(len(_sub))})
dept_rows.sort(key=lambda r: -r["risk_pct"])
with open(os.path.join(MODEL_DIR, "department_risk.json"), "w", encoding="utf-8") as f:
    json.dump(dept_rows, f, ensure_ascii=False, indent=2)

# Importances SHAP moyennes (pour l'ordre d'affichage) — TreeExplainer sur un échantillon
import shap
expl = shap.TreeExplainer(xgbm)
sv = expl.shap_values(X_te.sample(min(800, len(X_te)), random_state=RANDOM_STATE))
imp = pd.Series(np.abs(sv).mean(axis=0), index=X_all.columns).sort_values(ascending=False)

metadata = {
    "best_params": BEST_PARAMS,
    "auroc": round(float(auroc), 4), "recall": round(float(recall), 3),
    "brier_calibre": round(float(brier), 4),
    "prevalence_pct": round(float(y_all.mean() * 100), 2),
    "n_analytique": int(len(D)),
    # Seuils de Jenks utilisés pour la carte (classes de risque)
    "risk_bands": [0.08, 0.14, 0.23],
    "top_features": imp.head(15).index.tolist(),
    "scale_pos_weight": round(float(spw), 2),
}
with open(os.path.join(MODEL_DIR, "metadata.json"), "w", encoding="utf-8") as f:
    json.dump(metadata, f, ensure_ascii=False, indent=2)

# ---- 6. Schéma du FORMULAIRE fondé sur les DÉTERMINANTS significatifs (OS1) ----
# Les champs de saisie sont exactement les déterminants ressortis significatifs (p<0,05)
# de la régression logistique (odds ratios, chapitre 5). L'odds ratio est joint à chaque
# champ pour un affichage pédagogique (« ce facteur multiplie/divise la cote de risque »).
ors = pd.read_csv(os.path.join(ROOT, "outputs", "odds_ratios_logit.csv"), index_col=0)
def OR(key):
    if key in ors.index:
        return {"or": round(float(ors.loc[key, "OR"]), 3), "p": round(float(ors.loc[key, "p_value"]), 4)}
    return {}

STATUTS = {"1": "Marié(e) monogame", "2": "Marié(e) polygame", "3": "Célibataire",
           "4": "Divorcé(e)", "5": "Veuf(ve)", "6": "Union libre"}
ACTIVITES = {"Agriculture": "Agriculture", "Elevage_peche": "Élevage / pêche",
             "Commerce": "Commerce", "Salarie_travail": "Salarié / travail",
             "Transferts_aides": "Transferts / aides", "Autre": "Autre"}

form_groups = [
 {"capital": "Capital humain", "icon": "👥", "fields": [
   {"key": "taille_menage", "feature": "taille_menage", "label": "Taille du ménage",
    "type": "number", "min": 1, "max": 40, "default": 6, **OR("taille_menage")},
   {"key": "instruction_cm", "feature": "instruction_cm", "label": "Niveau d'instruction du chef",
    "type": "select", "options": [[0, "Aucun / informel"], [1, "Primaire"], [2, "Secondaire et +"]],
    "default": 0, **OR("instruction_cm")},
   {"key": "taux_scolarisation", "feature": "taux_scolarisation", "label": "Taux de scolarisation des enfants",
    "type": "slider", "min": 0, "max": 1, "step": 0.1, "default": 1, **OR("taux_scolarisation")},
   {"key": "statut_matrimonial", "cat": "statut_matrimonial", "label": "Statut matrimonial du chef",
    "type": "select_cat", "options": [[k, v] for k, v in STATUTS.items()], "default": "1",
    "or_note": "Union libre : OR 0,33", **OR("statut_matrimonial_6")}]},
 {"capital": "Capital physique", "icon": "🏠", "fields": [
   {"key": "departement", "cat": "departement", "label": "Département",
    "type": "select_cat", "options": [[str(k), v] for k, v in DEPT_LABELS.items()], "default": "3",
    "or_note": "Atacora ×2,3 ; Mono/Donga/Littoral protecteurs"},
   {"key": "electricite", "feature": "electricite", "label": "Accès à l'électricité",
    "type": "binary", "default": 1, **OR("electricite")},
   {"key": "indice_logement", "feature": "indice_logement", "label": "Qualité du logement (0–3)",
    "type": "slider", "min": 0, "max": 3, "step": 1, "default": 3, **OR("indice_logement")},
   {"key": "toilette_amelioree", "feature": "toilette_amelioree", "label": "Toilettes améliorées",
    "type": "binary", "default": 0, **OR("toilette_amelioree")}]},
 {"capital": "Capital financier", "icon": "💰", "fields": [
   {"key": "log_depenses_alim", "feature": "log_depenses_alim", "label": "Dépenses alimentaires / mois",
    "type": "number", "min": 0, "max": 3000000, "default": 20000, "unit": "FCFA",
    "transform": "log1p", **OR("log_depenses_alim")},
   {"key": "log_revenu", "feature": "log_revenu", "label": "Revenu mensuel du ménage",
    "type": "number", "min": 0, "max": 6000000, "default": 15000, "unit": "FCFA",
    "transform": "log1p", **OR("log_revenu")},
   {"key": "diversification_revenus", "feature": "diversification_revenus", "label": "Nombre de sources de revenu",
    "type": "slider", "min": 0, "max": 3, "step": 1, "default": 2, **OR("diversification_revenus")},
   {"key": "activite_principale", "cat": "activite_principale", "label": "Activité principale",
    "type": "select_cat", "options": [[k, v] for k, v in ACTIVITES.items()], "default": "Agriculture",
    "or_note": "Commerce : OR 0,63", **OR("activite_principale_Commerce")}]},
 {"capital": "Capital naturel", "icon": "🌱", "fields": [
   {"key": "pratique_agriculture", "feature": "pratique_agriculture", "label": "Pratique l'agriculture",
    "type": "binary", "default": 1, **OR("pratique_agriculture")},
   {"key": "superficie_emblavee", "feature": "superficie_emblavee", "label": "Superficie cultivée (classe 0–6)",
    "type": "slider", "min": 0, "max": 6, "step": 1, "default": 0, **OR("superficie_emblavee")},
   {"key": "tlu", "feature": "tlu", "label": "Cheptel — TLU (0 = aucun)",
    "type": "number", "min": 0, "max": 100, "default": 0, "step": 0.1, **OR("tlu")},
   {"key": "securite_fonciere", "feature": "securite_fonciere", "label": "Sécurité foncière",
    "type": "binary", "default": 0, **OR("securite_fonciere")}]},
 {"capital": "Capital social / chocs", "icon": "🤝", "fields": [
   {"key": "vente_actifs_productifs", "feature": "vente_actifs_productifs", "label": "Vente d'actifs productifs",
    "type": "binary", "default": 0, **OR("vente_actifs_productifs")},
   {"key": "assistance_recue", "feature": "assistance_recue", "label": "Assistance alimentaire reçue",
    "type": "binary", "default": 0, **OR("assistance_recue")},
   {"key": "capacite_relevement", "feature": "capacite_relevement", "label": "Capacité de relèvement (1–4)",
    "type": "slider", "min": 1, "max": 4, "step": 1, "default": 4, **OR("capacite_relevement")}]},
]
with open(os.path.join(MODEL_DIR, "form_fields.json"), "w", encoding="utf-8") as f:
    json.dump(form_groups, f, ensure_ascii=False, indent=2, default=float)
n_fields = sum(len(g["fields"]) for g in form_groups)
print(f"Schéma de formulaire (déterminants OS1) : {n_fields} champs répartis en {len(form_groups)} capitaux.")

joblib.dump(final_model, os.path.join(MODEL_DIR, "model_calibrated.joblib"))
joblib.dump(xgbm, os.path.join(MODEL_DIR, "model_xgb.joblib"))

print("Artefacts sauvegardés dans app/model/ :")
for f in sorted(os.listdir(MODEL_DIR)):
    print("  -", f, f"({os.path.getsize(os.path.join(MODEL_DIR, f)) // 1024} Ko)")
print("\nRéférences one-hot :", {k: v["reference"] for k, v in onehot_groups.items()})

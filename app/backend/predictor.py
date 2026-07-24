# -*- coding: utf-8 -*-
"""
Cœur métier de l'API : chargement du modèle encapsulé, construction de la ligne de
features à partir des déterminants (OS1) saisis, prédiction calibrée et explication SHAP.
"""
import os, json, functools
import numpy as np, pandas as pd
import joblib

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "model")

SCHEMA = json.load(open(os.path.join(MODEL_DIR, "schema.json"), encoding="utf-8"))
META   = json.load(open(os.path.join(MODEL_DIR, "metadata.json"), encoding="utf-8"))
FORM   = json.load(open(os.path.join(MODEL_DIR, "form_fields.json"), encoding="utf-8"))
MODEL  = joblib.load(os.path.join(MODEL_DIR, "model_calibrated.joblib"))
XGBM   = joblib.load(os.path.join(MODEL_DIR, "model_xgb.joblib"))

COLS  = SCHEMA["columns"]
BANDS = META["risk_bands"]
DEPT  = {int(k): v for k, v in SCHEMA["dept_labels"].items()}

# Index {clé de champ -> spec} pour interpréter les saisies du formulaire
FIELD_SPEC = {f["key"]: f for g in FORM for f in g["fields"]}

ACTIVITES = {"Agriculture": "Agriculture", "Elevage_peche": "Élevage / pêche", "Commerce": "Commerce",
             "Salarie_travail": "Salarié / travail", "Transferts_aides": "Transferts / aides", "Autre": "Autre"}
CHOCS = {"Aucun": "Aucun", "Climatique": "Climatique", "Sanitaire": "Sanitaire",
         "Economique": "Économique", "Autre": "Autre"}
STATUTS = {"1": "Marié(e) monogame", "2": "Marié(e) polygame", "3": "Célibataire",
           "4": "Divorcé(e)", "5": "Veuf(ve)", "6": "Union libre"}
FEATURE_LABELS = {
    "log_depenses_alim": "Dépenses alimentaires", "electricite": "Accès à l'électricité",
    "log_revenu": "Revenu mensuel", "tlu": "Cheptel (TLU)",
    "vente_actifs_productifs": "Vente d'actifs productifs", "indice_logement": "Qualité du logement",
    "instruction_cm": "Instruction du chef", "taille_menage": "Taille du ménage",
    "toilette_amelioree": "Toilettes améliorées", "superficie_emblavee": "Superficie cultivée",
    "age_cm": "Âge du chef", "ratio_dependance": "Ratio de dépendance", "eau_amelioree": "Eau améliorée",
    "securite_fonciere": "Sécurité foncière", "diversification_revenus": "Diversification des revenus",
    "credit": "Accès au crédit", "assistance_recue": "Assistance reçue",
    "pratique_agriculture": "Pratique agricole", "capacite_relevement": "Capacité de relèvement",
    "choc_subi": "Choc subi", "mois_couverture_stocks": "Mois de couverture", "sexe_cm": "Chef homme",
    "rural": "Milieu rural", "taux_scolarisation": "Scolarisation des enfants",
    "nb_contributeurs": "Nb contributeurs", "temps_eau": "Temps d'accès à l'eau",
    "cultures_irriguees": "Cultures irriguées", "semences_ameliorees": "Semences améliorées",
    "femmes_proprietaires": "Femmes propriétaires", "proprietaire_animaux": "Possède animaux",
    "a_transfert": "Reçoit transferts", "log_transfert_migrants": "Transferts migrants",
    "contribution_principale": "Contribution principale",
}

def nice_label(col):
    for pref, mp in [("departement", None), ("activite_principale", ACTIVITES),
                     ("type_choc", CHOCS), ("statut_matrimonial", STATUTS)]:
        if col.startswith(pref + "_"):
            key = col[len(pref) + 1:]
            if pref == "departement":
                return f"Département : {DEPT.get(int(key), key)}"
            return f"{pref.split('_')[0].capitalize()} : {mp.get(key, key)}"
    return FEATURE_LABELS.get(col, col)

def risk_class(p):
    if p < BANDS[0]:  return "Faible", "#2e7d32"
    if p < BANDS[1]:  return "Modéré", "#f9a825"
    if p < BANDS[2]:  return "Élevé", "#ef6c00"
    return "Très élevé", "#b71c1c"

def build_row(fields: dict) -> pd.DataFrame:
    """Construit une ligne de features complète à partir des déterminants saisis."""
    row = {c: SCHEMA["defaults"][c] for c in COLS}
    for key, val in fields.items():
        spec = FIELD_SPEC.get(key)
        if spec is None or val is None or val == "":
            continue
        if spec.get("type") == "select_cat":
            prefix = spec["cat"]
            for c in SCHEMA["onehot_groups"][prefix]["cols"]:
                row[c] = 0.0
            col = f"{prefix}_{val}"
            if col in row:
                row[col] = 1.0
        else:
            feat = spec.get("feature")
            v = float(val)
            if spec.get("transform") == "log1p":
                v = float(np.log1p(max(v, 0)))
            if feat in row:
                row[feat] = v
    return pd.DataFrame([row])[COLS]

@functools.lru_cache(maxsize=1)
def _explainer():
    import shap
    return shap.TreeExplainer(XGBM)

def explain(row: pd.DataFrame, k: int = 10):
    sv = _explainer().shap_values(row)
    sv = sv[0] if isinstance(sv, list) else np.asarray(sv)
    if sv.ndim == 2:
        sv = sv[0]
    s = pd.Series(sv, index=COLS)
    s = s.reindex(s.abs().sort_values(ascending=False).index).head(k)
    return [{"label": nice_label(i), "feature": i, "value": round(float(v), 4)}
            for i, v in s.items()]

def predict(fields: dict):
    row = build_row(fields)
    p = float(MODEL.predict_proba(row)[:, 1][0])
    cls, color = risk_class(p)
    return {"proba": round(p, 4), "proba_pct": round(p * 100, 1),
            "classe": cls, "couleur": color, "contributions": explain(row)}

def align_batch(df: pd.DataFrame) -> pd.DataFrame:
    """Aligne un CSV quelconque sur les colonnes du modèle (one-hot des catégorielles brutes
    présentes, défauts médians pour les colonnes absentes)."""
    df = df.copy()
    cat_present = [c for c in SCHEMA["cat_poly"] if c in df.columns]
    if cat_present:
        for c in cat_present:
            df[c] = df[c].astype(str).str.replace(r"\.0$", "", regex=True)
        df = pd.get_dummies(df, columns=cat_present, dtype=float)
    X = pd.DataFrame(index=df.index)
    for c in COLS:
        X[c] = pd.to_numeric(df[c], errors="coerce") if c in df.columns else SCHEMA["defaults"][c]
    return X.fillna(pd.Series(SCHEMA["defaults"]))

def template_csv():
    """Gabarit CSV au format des variables du modèle (déterminants + valeurs médianes)."""
    row = {c: SCHEMA["medians_D"].get(c, 0) for c in SCHEMA["num_feats"]}
    for prefix in SCHEMA["cat_poly"]:
        row[prefix] = SCHEMA["onehot_groups"][prefix]["reference"]
    return pd.DataFrame([row, row]).to_csv(index=False)

def predict_batch(df: pd.DataFrame):
    proba = MODEL.predict_proba(align_batch(df))[:, 1]
    classes = [risk_class(p)[0] for p in proba]
    return proba, classes

# ---- Cartographie : GeoJSON communal enrichi du risque prédit ----
import unicodedata, re
def _norm(s):
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()
_OV = {"akpro misserete": "akpo misserete", "boukoumbe": "boukombe", "cobly": "kobli",
       "dogbo tota": "dogbo", "pehonko": "pehunco", "zangnanado": "zagnanado"}

@functools.lru_cache(maxsize=1)
def communes_geojson():
    com = pd.read_csv(os.path.join(MODEL_DIR, "communes_risk.csv"))
    com["key"] = com["nom_commune"].map(lambda s: _OV.get(_norm(s), _norm(s)))
    risk = dict(zip(com["key"], com["proba_moy"]))
    name = dict(zip(com["key"], com["nom_commune"]))
    gj = json.load(open(os.path.join(MODEL_DIR, "benin_communes_ADM2.geojson"), encoding="utf-8"))
    for ft in gj["features"]:
        k = _norm(ft["properties"].get("shapeName", ""))
        r = risk.get(k)
        ft["properties"]["risk"] = round(float(r), 4) if r is not None else None
        ft["properties"]["nom"] = name.get(k, ft["properties"].get("shapeName"))
    top = (com.sort_values("proba_moy", ascending=False)
              .assign(risk_pct=lambda d: (d.proba_moy * 100).round(1))
              [["nom_commune", "risk_pct", "n"]].to_dict("records"))
    return {"geojson": gj, "top": top, "bands": BANDS}

def determinants():
    o = pd.read_csv(os.path.join(MODEL_DIR, "odds_ratios_logit.csv"), index_col=0)
    sig = o[o.p_value < 0.05].copy()
    return [{"label": nice_label(v), "feature": v, "or": round(float(r.OR), 3),
             "ic": [round(float(r["IC_2.5pct"]), 3), round(float(r["IC_97.5pct"]), 3)],
             "p": round(float(r.p_value), 4), "sens": "aggravant" if r.OR > 1 else "protecteur"}
            for v, r in sig.iterrows()]

@functools.lru_cache(maxsize=1)
def department_risk():
    p = os.path.join(MODEL_DIR, "department_risk.json")
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else []

def _classe(r):
    return ("Très élevé" if r > BANDS[2] else "Élevé" if r > BANDS[1]
            else "Modéré" if r > BANDS[0] else "Faible")

def report():
    """Charge consolidée pour le rapport d'analyse destiné aux décideurs."""
    com = pd.read_csv(os.path.join(MODEL_DIR, "communes_risk.csv"))
    com["classe"] = com["proba_moy"].map(_classe)
    dist = {c: int((com["classe"] == c).sum()) for c in ["Très élevé", "Élevé", "Modéré", "Faible"]}
    n_prio = dist["Très élevé"] + dist["Élevé"]
    top = (com.sort_values("proba_moy", ascending=False)
              .assign(risk_pct=lambda d: (d.proba_moy * 100).round(1))
              [["nom_commune", "risk_pct", "n"]].head(15).to_dict("records"))
    dets = determinants()
    return {
        "meta": META,
        "n_communes": int(len(com)),
        "commune_distribution": dist,
        "n_communes_prioritaires": int(n_prio),
        "departments": department_risk(),
        "top_communes": top,
        "aggravants": [d for d in dets if d["sens"] == "aggravant"],
        "protecteurs": [d for d in dets if d["sens"] == "protecteur"],
        "bands": BANDS,
    }

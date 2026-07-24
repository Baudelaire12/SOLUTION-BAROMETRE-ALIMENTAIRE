# -*- coding: utf-8 -*-
"""
Génère un rapport HTML autonome (images embarquées) retraçant toute l'analyse
du mémoire — de la constitution de l'échantillon à la cartographie du risque.

Usage :  python generer_rapport_html.py
Sortie : Rapport_Analyse_Insecurite_Alimentaire_Benin.html

Les tableaux sont lus depuis outputs/*.csv (ils se rafraîchissent donc à chaque
ré-exécution du pipeline) ; quelques valeurs narratives (kappa, Moran, DeLong…)
sont centralisées dans le dictionnaire NARRATIF ci-dessous.
"""
import base64
import datetime
import os

import pandas as pd

OUT = "outputs"
DEST = "Rapport_Analyse_Insecurite_Alimentaire_Benin.html"

# ---- Valeurs narratives issues du run (à actualiser si le pipeline change) ----
NARRATIF = {
    "n": "14 952", "ncol": "1 406",
    "prev_ref": "10,05", "prev_ref_pond": "9,66", "prev_strict": "0,83", "prev_large": "53,20",
    "prev_rural": "13,03", "prev_urbain": "6,19", "prev_cotonou": "1,52",
    "kappa": "0,333", "accord": "76,1", "spearman": "−0,371",
    "rcsi_sec": "10,79", "rcsi_insec": "18,96", "rcsi_p": "2,2×10⁻⁶⁶",
    "n_train": "10 466", "n_test": "4 486", "spw": "8,96",
    "grappes_train": "750", "grappes_test": "749",
    "vif_max": "1,82 (diversification des revenus)",
    "delong_rf_logit": "p < 0,0001", "delong_xgb_logit": "p = 0,0005", "delong_xgb_rf": "p = 0,098",
    "best_model": "XGBoost",
    "brier_avant": "0,159", "brier_apres": "0,077", "hl_apres": "0,479",
    "moran": "0,570", "moran_p": "0,001",
}

def img64(name):
    p = os.path.join(OUT, name)
    if not os.path.exists(p):
        return None
    with open(p, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()

def fig(name, caption, width=720):
    src = img64(name)
    if src is None:
        return f"<p class='miss'>[figure manquante : {name}]</p>"
    return (f"<figure><img src='{src}' style='max-width:min({width}px,100%)' "
            f"alt='{caption}'><figcaption>{caption}</figcaption></figure>")

def fr(x, nd=2):
    """Format numérique français."""
    if isinstance(x, str):
        return x
    if x is None or pd.isna(x):
        return ""
    if float(x) == int(x) and nd == 0:
        s = f"{int(x):,}".replace(",", " ")
        return s
    s = f"{float(x):,.{nd}f}".replace(",", " ").replace(".", ",")
    return s

def pfmt(p):
    p = float(p)
    if p < 0.001:
        m, e = f"{p:.1e}".split("e")
        return f"{m.replace('.', ',')}×10<sup>{int(e)}</sup>"
    return f"{p:.3f}".replace(".", ",")

def table(df, title=None, formatters=None, index=False):
    html = df.to_html(index=index, escape=False, border=0, justify="left",
                      formatters=formatters, na_rep="")
    cap = f"<p class='tabcap'>{title}</p>" if title else ""
    return f"{cap}<div class='twrap'>{html}</div>"

# ================= Lecture des tableaux =================
univ_taille = pd.read_csv(f"{OUT}/univarie_taille.csv", index_col=0)
univ_rev    = pd.read_csv(f"{OUT}/univarie_revenu.csv", index_col=0)
univ_age    = pd.read_csv(f"{OUT}/univarie_age_stats.csv", index_col=0)
univ_tr     = pd.read_csv(f"{OUT}/univarie_age_tranches.csv")
univ_instr  = pd.read_csv(f"{OUT}/univarie_instruction.csv")
univ_credit = pd.read_csv(f"{OUT}/univarie_credit.csv")
univ_ydep   = pd.read_csv(f"{OUT}/univarie_Y_strates.csv")
normalite   = pd.read_csv(f"{OUT}/normalite_tests.csv")
biv_foc     = pd.read_csv(f"{OUT}/bivarie_focales.csv")
tests_biv   = pd.read_csv(f"{OUT}/tests_bivaries.csv")
odds        = pd.read_csv(f"{OUT}/odds_ratios_logit.csv", index_col=0)
comp        = pd.read_csv(f"{OUT}/comparaison_modeles.csv")
smote       = pd.read_csv(f"{OUT}/comparaison_smote.csv")
sens        = pd.read_csv(f"{OUT}/sensibilite_definitions_Y.csv")
communes    = pd.read_csv(f"{OUT}/risque_communal.csv")
uni_pond    = pd.read_csv(f"{OUT}/univarie_pondere.csv")
tests_pond  = pd.read_csv(f"{OUT}/tests_bivaries_ponderes.csv")
pr2         = pd.read_csv(f"{OUT}/pseudo_r2.csv", index_col=0) if os.path.exists(f"{OUT}/pseudo_r2.csv") else None
versions    = open(f"{OUT}/requirements_versions.txt", encoding="utf-8").read().strip()

# ---- mises en forme ----
for c in univ_taille.columns:
    univ_taille[c] = univ_taille[c].map(lambda v: fr(v, 2))
for c in univ_rev.columns:
    univ_rev[c] = univ_rev[c].map(lambda v: fr(v, 2))
univ_age[univ_age.columns[0]] = univ_age[univ_age.columns[0]].map(lambda v: fr(v, 2))
univ_ydep["% Y=1"] = univ_ydep["% Y=1"].map(lambda v: fr(v, 2))

norm_aff = normalite.copy()
norm_aff["KS_D"] = norm_aff["KS_D"].map(lambda v: fr(v, 3))
norm_aff["KS_p"] = norm_aff["KS_p"].map(pfmt)
norm_aff["Shapiro_W"] = norm_aff["Shapiro_W"].map(lambda v: fr(v, 3))
norm_aff["Shapiro_p"] = norm_aff["Shapiro_p"].map(pfmt)
norm_aff["skewness"] = norm_aff["skewness"].map(lambda v: fr(v, 2))
norm_aff["kurtosis"] = norm_aff["kurtosis"].map(lambda v: fr(v, 2))
norm_aff = norm_aff.rename(columns={"variable": "Variable", "conclusion": "Conclusion"})

biv_aff = biv_foc.copy()
biv_aff["statistique"] = biv_aff["statistique"].map(lambda v: fr(v, 1))
biv_aff["p_value"] = biv_aff["p_value"].map(pfmt)
biv_aff = biv_aff.rename(columns={"variable": "Variable", "test": "Test",
                                  "statistique": "Statistique", "p_value": "p-valeur"})

tb_aff = tests_biv.copy()
tb_aff["statistique"] = tb_aff["statistique"].map(lambda v: fr(v, 1))
tb_aff["p_value"] = tb_aff["p_value"].map(pfmt)
tb_aff["p_adj_FDR"] = tb_aff["p_adj_FDR"].map(pfmt)
tb_aff = tb_aff.rename(columns={"variable": "Variable", "test": "Test",
                                "statistique": "Statistique", "p_value": "p brute",
                                "effet": "Effet", "p_adj_FDR": "p ajustée (FDR)",
                                "conclusion": "Conclusion"})

odds_sig = odds[odds["p_value"] < 0.05].copy()
odds_sig["IC à 95 %"] = ("[" + odds_sig["IC_2.5pct"].map(lambda v: fr(v, 3)) + " ; "
                         + odds_sig["IC_97.5pct"].map(lambda v: fr(v, 3)) + "]")
odds_sig["OR"] = odds_sig["OR"].map(lambda v: fr(v, 3))
odds_sig["p_value"] = odds_sig["p_value"].map(pfmt)
odds_sig = odds_sig.reset_index().rename(columns={"index": "Variable", "p_value": "p-valeur"})
odds_sig = odds_sig[["Variable", "OR", "IC à 95 %", "p-valeur"]]

comp_aff = comp.copy()
for c in comp_aff.columns[1:]:
    comp_aff[c] = comp_aff[c].map(lambda v: fr(v, 3))

if pr2 is not None:
    pr2_aff = pr2.copy()
    for c in pr2_aff.columns:
        pr2_aff[c] = pr2_aff[c].map(lambda v: fr(v, 3))
    pr2_aff = pr2_aff.reset_index().rename(columns={pr2_aff.index.name or "index": "Modèle",
                                                    "Modele": "Modèle"})
smote_aff = smote.copy()
for c in smote_aff.columns[1:]:
    smote_aff[c] = smote_aff[c].map(lambda v: fr(v, 3))
sens_aff = sens.copy()
for c in ["Prévalence (%)", "AUROC Logit", "AUROC XGBoost"]:
    sens_aff[c] = sens_aff[c].map(lambda v: fr(v, 3))

top10 = communes.sort_values("proba_moy", ascending=False).head(10).copy()
top10["Risque prédit (%)"] = (top10["proba_moy"] * 100).map(lambda v: fr(v, 1))
top10 = top10.rename(columns={"nom_commune": "Commune"})[["Commune", "Risque prédit (%)"]]

gvif = pd.DataFrame({
    "Variable": ["Statut matrimonial", "Département", "Activité principale", "Type de choc"],
    "ddl": [5, 11, 5, 4],
    "GVIF": ["2,155", "6,231", "5,163", "102,411"],
    "GVIF^(1/2ddl)": ["1,080", "1,087", "1,178", "1,784"],
})

hyp = pd.DataFrame({
    "Hypothèse": ["H1 — Déterminants (OS1)", "H2 — Supériorité ML (OS2)",
                  "H3 — Autocorrélation spatiale (OS3)", "H4 — Calibration / déploiement (OS4)"],
    "Résultat": [
        "Éducation (OR = 0,831 ; p = 0,007) et diversification des revenus (OR = 0,823 ; "
        "p = 0,036) confirmées ; eau améliorée et résidence rurale significatives en bivarié "
        "mais absorbées en multivarié (habitat, département).",
        "AUROC : XGBoost ≈ RF > Logit ; DeLong ML vs Logit significatif (p ≤ 10⁻⁴) ; "
        "hiérarchie robuste aux définitions de Y (hors définition stricte, 124 cas).",
        "Indice de Moran I = 0,565 (p = 0,001) ; poches concentrées dans l'Atacora, "
        "secondairement Couffo–Zou.",
        "Après recalibration isotonique : Brier = 0,077 ; Hosmer-Lemeshow p = 0,381 ; "
        "carte interactive et explications SHAP individuelles produites.",
    ],
    "Verdict": ["Partiellement validée", "Validée", "Validée", "Validée"],
})

univ_taille_aff = univ_taille.reset_index().rename(columns={"index": "Statistique"})
univ_rev_aff = univ_rev.reset_index().rename(columns={"index": "Statistique"})

# --- tableaux pondérés design-based (§5.6) ---
up_aff = uni_pond.copy()
up_aff["Estimation [IC 95 %]"] = (up_aff["estimation"].map(lambda v: fr(v, 2))
    + " [" + up_aff["IC_bas"].map(lambda v: fr(v, 2)) + " ; "
    + up_aff["IC_haut"].map(lambda v: fr(v, 2)) + "]")
up_aff = up_aff.rename(columns={"variable": "Variable", "paramètre": "Paramètre"})
up_aff = up_aff[["Variable", "Paramètre", "Estimation [IC 95 %]"]]

tp_aff = tests_pond.copy()
tp_aff["p_non_pondere"] = tp_aff["p_non_pondere"].map(pfmt)
tp_aff["p_pondere"] = tp_aff["p_pondere"].map(pfmt)
tp_aff["concordance_5pct"] = tp_aff["concordance_5pct"].map(
    lambda s: "identique" if s == "identique" else "<b>DIVERGENTE</b>")
tp_aff = tp_aff.drop(columns=["detail"]).rename(columns={
    "variable": "Variable", "nature": "Nature", "test_pondere": "Test pondéré",
    "p_non_pondere": "p non pondéré (§5.4)", "p_pondere": "p pondéré (design-based)",
    "concordance_5pct": "Concordance 5 %"})
n_diverg = int((tests_pond["concordance_5pct"] != "identique").sum())

N = NARRATIF
date = datetime.date.today().strftime("%d/%m/%Y")

# ================= HTML =================
html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rapport d'analyse — Insécurité alimentaire des ménages au Bénin</title>
<style>
:root {{
  --bg:#fcfcfa; --fg:#1c2733; --muted:#5b6b7a; --accent:#b03a2e; --accent2:#1f618d;
  --card:#ffffff; --line:#dde4ea; --chip:#f2f6f9;
}}
@media (prefers-color-scheme: dark) {{
  :root {{ --bg:#12181f; --fg:#e8edf2; --muted:#9fb0bf; --accent:#e07b6a; --accent2:#6aa8d8;
          --card:#1a222b; --line:#2c3742; --chip:#212b35; }}
}}
* {{ box-sizing:border-box; }}
body {{ margin:0; background:var(--bg); color:var(--fg);
       font:16px/1.65 Georgia,'Times New Roman',serif; }}
.wrap {{ max-width:960px; margin:0 auto; padding:2rem 1.2rem 4rem; }}
header {{ border-bottom:3px double var(--accent); padding-bottom:1.2rem; margin-bottom:1.5rem; }}
h1 {{ font-size:1.7rem; line-height:1.3; margin:.2rem 0; color:var(--accent); }}
h2 {{ font-size:1.35rem; margin:2.4rem 0 .6rem; color:var(--accent2);
      border-bottom:1px solid var(--line); padding-bottom:.25rem; }}
h3 {{ font-size:1.1rem; margin:1.6rem 0 .4rem; }}
.meta {{ color:var(--muted); font-size:.92rem; }}
.badge {{ display:inline-block; background:var(--chip); border:1px solid var(--line);
          border-radius:1rem; padding:.05rem .7rem; font-size:.85rem; margin:.15rem .2rem 0 0;
          font-family:system-ui,sans-serif; }}
nav {{ background:var(--card); border:1px solid var(--line); border-radius:.6rem;
       padding:.9rem 1.2rem; font-family:system-ui,sans-serif; font-size:.92rem; }}
nav a {{ color:var(--accent2); text-decoration:none; }}
nav a:hover {{ text-decoration:underline; }}
nav ol {{ margin:.3rem 0 0; padding-left:1.4rem; columns:2; column-gap:2rem; }}
figure {{ margin:1.3rem auto; text-align:center; }}
figure img {{ background:#fff; border:1px solid var(--line); border-radius:.4rem; padding:.4rem; }}
figcaption {{ color:var(--muted); font-size:.88rem; margin-top:.45rem; font-style:italic; }}
.tabcap {{ font-size:.92rem; color:var(--muted); font-style:italic; margin:1rem 0 .3rem; }}
.twrap {{ overflow-x:auto; }}
table {{ border-collapse:collapse; margin:.2rem 0 1rem; font-family:system-ui,sans-serif;
         font-size:.86rem; width:100%; background:var(--card); }}
th, td {{ border:1px solid var(--line); padding:.4rem .6rem; text-align:left; vertical-align:top; }}
th {{ background:var(--chip); }}
tbody tr:nth-child(even) {{ background:color-mix(in srgb, var(--chip) 45%, transparent); }}
.note {{ background:var(--chip); border-left:4px solid var(--accent); border-radius:.3rem;
         padding:.7rem 1rem; margin:1rem 0; font-size:.94rem; }}
.ok {{ color:#1e8449; font-weight:bold; }} .ko {{ color:var(--accent); font-weight:bold; }}
.grid2 {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:.5rem; }}
.miss {{ color:var(--accent); font-style:italic; }}
pre {{ background:var(--chip); border:1px solid var(--line); border-radius:.4rem;
       padding:.8rem 1rem; font-size:.8rem; overflow-x:auto; }}
footer {{ margin-top:3rem; border-top:1px solid var(--line); padding-top:1rem;
          color:var(--muted); font-size:.85rem; }}
@media print {{ nav {{ display:none; }} body {{ font-size:12px; }} }}
</style>
</head>
<body><div class="wrap">

<header>
<div class="meta">Mémoire de Master — Statistique Appliquée au Vivant (CIPMA / Chaire UNESCO, Université d'Abomey-Calavi)</div>
<h1>Analyse et modélisation du risque d'insécurité alimentaire des ménages au Bénin</h1>
<div class="meta">Rapport d'analyse complet — DAHOUI Pinel Baudelaire T. · données AGVSAN 2017 (PAM/INSAE) · généré le {date}</div>
<div style="margin-top:.6rem">
<span class="badge">n = {N['n']} ménages</span>
<span class="badge">77 communes</span>
<span class="badge">750 grappes</span>
<span class="badge">3 modèles : Logit · Random Forest · XGBoost</span>
<span class="badge">Python 3.11 · RANDOM_STATE = 42</span>
</div>
</header>

<nav><strong>Sommaire</strong>
<ol>
<li><a href="#s1">Données &amp; variable dépendante</a></li>
<li><a href="#s2">Analyse univariée</a></li>
<li><a href="#s3">Tests de normalité</a></li>
<li><a href="#s4">Analyse bivariée &amp; pré-estimation</a></li>
<li><a href="#s5">Déterminants (OS1)</a></li>
<li><a href="#s6">Modèles prédictifs (OS2)</a></li>
<li><a href="#s7">Interprétabilité SHAP</a></li>
<li><a href="#s8">Cartographie du risque (OS3)</a></li>
<li><a href="#s9">Outil d'aide à la décision (OS4)</a></li>
<li><a href="#s10">Synthèse des hypothèses</a></li>
</ol>
</nav>

<h2 id="s1">1. Données et construction de la variable dépendante</h2>
<p>L'étude exploite l'enquête <strong>AGVSAN Bénin 2017</strong> : {N['n']} ménages et {N['ncol']} variables.
La variable dépendante binaire <em>Y</em> dichotomise la classification CARI officielle
(<code>Round_INDICE_SECAL</code>) : <em>Y</em> = 1 si le ménage est en insécurité modérée ou sévère
(classes 3 et 4). Aucun ménage n'a de statut manquant : l'échantillon analytique est complet.</p>
<ul>
<li><strong>Prévalence de référence</strong> : {N['prev_ref']} % brut, <strong>{N['prev_ref_pond']} % pondéré</strong> par les poids d'enquête ;</li>
<li>définitions alternatives (analyse de sensibilité) : stricte {{4}} = {N['prev_strict']} % ; élargie {{2,3,4}} = {N['prev_large']} % ;</li>
<li>fort contraste territorial : <strong>rural {N['prev_rural']} %</strong> contre urbain {N['prev_urbain']} % (Cotonou : {N['prev_cotonou']} %).</li>
</ul>
<h3>Validation de la variable dépendante</h3>
<p>Le score de consommation alimentaire (SCA) reconstruit indépendamment depuis les 18 items bruts
concorde à <strong>{N['accord']} %</strong> avec la classification officielle
(Kappa de Cohen = {N['kappa']} ; Spearman ρ = {N['spearman']}, cohérent), concordance modérée attendue
puisque la classification CARI combine SCA, rCSI et dépenses. Le <strong>rCSI</strong> valide la
cohérence comportementale : {N['rcsi_insec']} chez les ménages en insécurité contre {N['rcsi_sec']}
chez les autres (Mann-Whitney, p = {N['rcsi_p']}).</p>
<div class="note"><strong>Limite documentée :</strong> le score HFIAS prévu comme second indicateur de
validation est <strong>absent de la base transmise</strong> (la colonne <code>Q_9_05</code> correspond
à un autre champ du questionnaire). La validation repose donc sur le seul rCSI.</div>
{fig("prevalence_departement.png", "Prévalence pondérée de l'insécurité alimentaire par département")}

<h2 id="s2">2. Analyse univariée des variables focales</h2>
<h3>a) Situation alimentaire</h3>
{fig("univarie_Y_national.png", "Répartition nationale : 89,95 % en sécurité, 10,05 % en insécurité", 560)}
{fig("univarie_Y_departement.png", "Par département : de 1,5 % (Littoral) à 22,8 % (Atacora)")}
{table(univ_ydep, "Situation alimentaire par département (effectifs et % en ligne)")}
<h3>b) Taille des ménages</h3>
<p>Moyenne de 6,83 personnes (médiane 6 ; CV 66,9 %), ménages ruraux plus grands (7,2 contre 6,4).</p>
{table(univ_taille_aff, "Statistiques descriptives de la taille du ménage")}
<div class="grid2">
{fig("univarie_taille_hist.png", "Distribution de la taille des ménages", 450)}
{fig("univarie_taille_boxplot.png", "Comparaison urbain / rural", 420)}
</div>
<h3>c) Revenu mensuel</h3>
<p>Asymétrie extrême du revenu brut (moyenne 68 105 FCFA, médiane 15 000, skewness 11,1) ;
la transformation ln(revenu+1) ramène la skewness à −0,06 et justifie le choix méthodologique.</p>
{table(univ_rev_aff, "Revenu mensuel : échelle brute et log-transformée")}
<div class="grid2">
{fig("univarie_revenu_brut.png", "Revenu brut (tronqué au P99)", 450)}
{fig("univarie_revenu_log.png", "Revenu log-transformé", 450)}
</div>
<h3>d) Âge du chef de ménage</h3>
<p>Moyenne 47,1 ans (médiane 45 ; étendue 16–100).</p>
{table(univ_tr, "Répartition par tranches d'âge")}
{fig("univarie_age.png", "Distribution de l'âge du chef de ménage (histogramme + densité)", 560)}
<h3>e) Niveau d'instruction du chef de ménage</h3>
<p>51,2 % des chefs de ménage n'ont aucune instruction formelle ; recodage en 3 niveaux :
Aucun/informel 55,9 %, Primaire 22,6 %, Secondaire et plus 21,5 %.</p>
{table(univ_instr, "Modalités originales (Q_1_09)")}
{fig("univarie_instruction.png", "Niveau d'instruction (modalités originales, tri décroissant)", 620)}
<h3>f) Accès au crédit</h3>
{table(univ_credit, "Accès au crédit par milieu de résidence")}
{fig("univarie_credit.png", "25,8 % des ménages ont emprunté au cours des 12 derniers mois", 460)}

<h2 id="s3">3. Tests de normalité (§4.4.3)</h2>
<p>La normalité est rejetée pour les quatre variables continues focales (KS et Shapiro-Wilk,
p &lt; 0,001), en cohérence avec les QQ-plots — d'où le recours aux tests non paramétriques.</p>
{table(norm_aff, "Kolmogorov-Smirnov, Shapiro-Wilk et coefficients de forme")}
<div class="grid2">
{fig("normalite_qq_taille.png", "QQ-plot — taille du ménage", 400)}
{fig("normalite_qq_age.png", "QQ-plot — âge du chef de ménage", 400)}
</div>

<h2 id="s4">4. Analyse bivariée et tests pré-estimation (§4.4.4)</h2>
<h3>Variables focales × situation alimentaire</h3>
{table(biv_aff, "Canevas du mémoire : Levene → t/Welch ou Mann-Whitney ; χ² + V de Cramér ; OR (2×2)")}
<ul>
<li><strong>Revenu</strong> : facteur focal le plus discriminant (médianes log 5,70 contre 9,63 ; p = 2,7×10⁻³⁶).</li>
<li><strong>Instruction</strong> : gradient monotone — 13,2 % → 7,7 % → 4,3 % d'insécurité (V = 0,123).</li>
<li><strong>Contre-intuitifs</strong> : ménages en insécurité légèrement <em>plus petits</em> (6,54 contre 6,87 ; p = 0,006) ; relation âge–insécurité en U (11,2 % avant 30 ans, 12,8 % à 60 ans et +).</li>
<li><strong class="ko">Crédit : non significatif</strong> (p = 0,908 ; OR brut = 0,991 [0,877 ; 1,120]) — résultat nul notable.</li>
</ul>
<div class="grid2">
{fig("bivarie_boxplot_revenu.png", "Revenu (log) selon Y", 400)}
{fig("bivarie_boxplot_taille.png", "Taille du ménage selon Y", 400)}
</div>
<div class="grid2">
{fig("bivarie_instruction.png", "Insécurité par niveau d'instruction", 460)}
{fig("bivarie_credit.png", "Insécurité selon l'accès au crédit", 400)}
</div>
<h3>Tests étendus à l'ensemble des variables + correction FDR</h3>
<p>Sur 22 tests corrigés par Benjamini-Hochberg, <strong>20 associations restent significatives</strong> ;
seuls le cheptel (TLU) et le crédit ne le sont pas.</p>
{table(tb_aff, "Synthèse des tests bivariés corrigés FDR (triés par p ajustée)")}
<h3>Robustesse au plan de sondage : analyse pondérée design-based (§4.5.1)</h3>
<p>Les statistiques et tests sont recalculés en tenant compte du plan de sondage complexe
(poids <code>weight_agvsa</code>, grappes = unités primaires, strates <em>département × milieu</em>)
via <code>samplics</code> (linéarisation de Taylor). Les proportions et moyennes pondérées sont
assorties d'un IC design-based ; l'association avec Y est testée par comparaison de
moyennes/proportions par domaine (continues et binaires), ou par repondération simple des
effectifs (polytomiques, le test de Rao-Scott n'étant pas exploitable dans le package).</p>
{table(up_aff, "Statistiques univariées pondérées (IC 95 % de Taylor)")}
{table(tp_aff, "Tests bivariés pondérés vs non pondérés — concordance des conclusions au seuil de 5 %")}
<p>La prise en compte du plan de sondage <strong>ne modifie pas les conclusions pour
{22 - n_diverg} des 22 variables</strong>. Deux exceptions instructives : le <strong>bétail (TLU)</strong>,
non significatif en non pondéré (p = 0,68), devient hautement significatif en pondéré
(p = 4,4×10⁻¹⁰) — l'élevage est concentré dans des strates du Nord fortement pondérées ;
inversement, la <strong>taille du ménage</strong> perd sa significativité (p = 0,006 → 0,159).</p>
<h3>Multicolinéarité et linéarité</h3>
<p>Aucune colinéarité problématique : VIF maximal = {N['vif_max']} ; GVIF normalisés tous
&lt; 2,24 (seuil √5). Box-Tidwell : linéarité acceptable sauf pour les dépenses alimentaires (log),
non-linéarité capturée par les modèles d'arbres.</p>
{table(gvif, "GVIF des variables polytomiques (Fox & Monette, 1992)")}

<h2 id="s5">5. Déterminants du risque — OS1</h2>
<p>Partition stratifiée 70/30 : {N['n_train']} ménages d'apprentissage / {N['n_test']} de test
({N['grappes_train']} / {N['grappes_test']} grappes). Inférence : GLM binomial pondéré par les poids
d'enquête, <strong>erreurs-types robustes en grappes</strong>. Odds ratios significatifs (p &lt; 0,05) :</p>
{table(odds_sig, "Déterminants significatifs (référence département : Atlantique ; départements : 2 = Atacora, 7 = Donga, 8 = Littoral, 9 = Mono, 11 = Plateau)")}
<ul>
<li><strong>Protecteurs</strong> : dépenses alimentaires, électricité (OR = 0,495), qualité du logement,
instruction, scolarisation des enfants, superficie emblavée, bétail, sécurité foncière, commerce,
diversification des revenus, revenu.</li>
<li><strong>Aggravants</strong> : vente d'actifs productifs (OR = 2,07 — marqueur de détresse),
résidence dans l'Atacora (OR = 2,29 à caractéristiques contrôlées), pratique agricole (OR = 2,24),
assistance reçue (OR = 1,72 — effet de ciblage), taille du ménage (OR = 1,03/personne).</li>
<li><strong>H1 partiellement validée</strong> : éducation ✓ et diversification ✓ ; l'eau améliorée
(p = 0,070) et le milieu rural (p = 0,151) perdent leur significativité en multivarié.</li>
</ul>

<h2 id="s6">6. Comparaison des modèles prédictifs — OS2</h2>
{table(comp_aff, "Performances hors échantillon (test, n = " + N['n_test'] + ", seuil 0,5)")}
<h3>Qualité d'ajustement globale — pseudo-R² (§4.5.3)</h3>
<p>Le Logit ne dispose pas d'un R² au sens strict : trois pseudo-R² sont rapportés à partir
des log-vraisemblances (McFadden, Cox &amp; Snell, Nagelkerke ; McFadden 0,2–0,4 = très bon
ajustement). Le concept est étendu aux deux modèles d'apprentissage sur probabilités
<strong>recalibrées</strong> (le <em>class weighting</em> décalibrant les probabilités brutes, un calcul
direct donnerait des valeurs négatives) ; la valeur classique in-sample du Logit (éq. 14) est
rappelée en référence.</p>
{table(pr2_aff, "Pseudo-R² de qualité d'ajustement globale des trois modèles") if pr2 is not None else "<p class='miss'>[pseudo_r2.csv non disponible — relancer le pipeline]</p>"}
<p>Tests de DeLong : RF vs Logit {N['delong_rf_logit']} ; XGBoost vs Logit {N['delong_xgb_logit']}
(<span class="ok">ML &gt; Logit significatif → H2 validée</span>) ; XGBoost vs RF {N['delong_xgb_rf']}
(équivalents). Critères §4.8.3 : AUROC maximale (Random Forest, différence non significative),
puis Recall en départage → <strong>meilleur modèle : {N['best_model']}</strong>, qui détecte
68,1 % des ménages en insécurité (contre 22,0 % pour Random Forest au seuil de 0,5).</p>
{fig("courbes_roc.png", "Courbes ROC des trois modèles", 560)}
<div class="grid2">
{fig("matrice_confusion_regression_logistique.png", "Matrice de confusion — Régression Logistique", 340)}
{fig("matrice_confusion_random_forest.png", "Matrice de confusion — Random Forest", 340)}
{fig("matrice_confusion_xgboost.png", "Matrice de confusion — XGBoost", 340)}
</div>
<h3>Class weighting contre SMOTE</h3>
{table(smote_aff, "Le class weighting domine SMOTE (recall 0,681 contre 0,118) et préserve les poids d'enquête")}
<h3>Sensibilité à la définition de Y</h3>
{table(sens_aff, "Hiérarchie ML ≥ Logit robuste (l'inversion de la définition stricte repose sur 124 cas)")}
<h3>Calibration</h3>
<p>Bruts, les trois modèles sont mal calibrés (Hosmer-Lemeshow p &lt; 0,001 — effet attendu du class
weighting). La <strong>recalibration isotonique</strong> du modèle retenu corrige ce défaut :
Brier {N['brier_avant']} → <strong>{N['brier_apres']}</strong>, HL p = {N['hl_apres']}
(<span class="ok">calibration adéquate → H4 soutenue</span>).</p>
{fig("calibration.png", "Courbes de calibration avant recalibration", 560)}

<h2 id="s7">7. Interprétabilité — valeurs SHAP</h2>
<p>SHAP calculé pour les trois modèles (TreeSHAP pour RF/XGBoost, LinearSHAP pour le Logit).
Les classements convergent avec les odds ratios : dépenses alimentaires, électricité, revenu,
qualité du logement et géographie dominent.</p>
{fig("shap_importance_xgboost.png", "Importance globale SHAP — XGBoost", 620)}
{fig("shap_summary.png", "Summary plot : rouge = augmente le risque, bleu = le réduit", 620)}
{fig("shap_dependence_log_depenses_alim.png", "Dependence plot des dépenses alimentaires (log) — effet de seuil", 520)}
{fig("shap_waterfall_menage_tres_vulnerable.png", "Waterfall du ménage le plus à risque (p = 0,91) : absence de dépenses alimentaires (+0,90), Atacora (+0,56), revenu très faible, pas d'électricité", 620)}

<h2 id="s8">8. Cartographie communale du risque prédit — OS3</h2>
<p>Probabilités individuelles du modèle final agrégées par commune (pondérées), jointes au fond
geoBoundaries ADM2 (appariement 77/77). <strong>Indice de Moran I = {N['moran']}
(p = {N['moran_p']})</strong> : autocorrélation spatiale positive forte —
<span class="ok">H3 validée</span>. La discrétisation de Jenks isole une poche principale dans
l'Atacora et une poche secondaire Couffo–Zou.</p>
{table(top10, "Les dix communes au risque prédit le plus élevé")}
{fig("carte_risque_communal.png", "Cartographie communale du risque (Jenks, 4 classes ; flèche Nord et échelle)", 640)}

<h2 id="s9">9. Produits opérationnels — OS4</h2>
<ul>
<li><strong>Modèle final</strong> : XGBoost recalibré (isotonique), probabilités fiables pour la prédiction hors échantillon ;</li>
<li><strong>Carte interactive</strong> : <code>outputs/carte_interactive.html</code> (folium — zoom, infobulles communales) ;</li>
<li><strong>Explications individuelles</strong> : force plot SHAP interactif <code>outputs/shap_force_menage_median.html</code> ;</li>
<li><strong>Reproductibilité</strong> (§4.10.1) : graine unique RANDOM_STATE = 42 et environnement figé :</li>
</ul>
<pre>{versions}</pre>

<h2 id="s10">10. Synthèse — confrontation aux hypothèses</h2>
{table(hyp, "")}
<p>L'étude identifie un noyau robuste de déterminants convergents entre approche économétrique et
prédictive (conditions économiques, capital humain, habitat, territoire), établit la supériorité
discriminante des méthodes d'ensemble, calibre un modèle opérationnel et localise les poches
communales de vulnérabilité — l'Atacora en tête — pour le ciblage des interventions.</p>

<footer>
Rapport généré automatiquement par <code>generer_rapport_html.py</code> à partir des sorties du
pipeline <code>Pipeline_Insecurite_Alimentaire_Benin.ipynb</code> (dossier <code>outputs/</code>).
Chiffres des modèles issus de l'exécution validée du {date} ; relancer le script après toute
ré-exécution du pipeline pour actualiser les tableaux.
</footer>

</div></body></html>
"""

with open(DEST, "w", encoding="utf-8") as f:
    f.write(html)
size_mb = os.path.getsize(DEST) / 1e6
print(f"Rapport genere : {DEST} ({size_mb:.1f} Mo)")

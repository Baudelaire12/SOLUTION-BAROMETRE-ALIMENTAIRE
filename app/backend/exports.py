# -*- coding: utf-8 -*-
"""Exports pour les systèmes d'information géographique : Excel, GeoJSON, Shapefile."""
import io, os, json, tempfile, zipfile
import pandas as pd
import geopandas as gpd
from . import predictor as P


def _communes_df(seuil: float = 0.0) -> pd.DataFrame:
    com = pd.read_csv(os.path.join(P.MODEL_DIR, "communes_risk.csv"))
    com["risque_pct"] = (com["proba_moy"] * 100).round(1)
    com["classe"] = com["proba_moy"].map(P._classe)
    com = com[com["risque_pct"] >= seuil].sort_values("proba_moy", ascending=False)
    return com[["commune", "nom_commune", "risque_pct", "classe", "n"]].rename(
        columns={"commune": "code", "nom_commune": "commune", "n": "menages_enquetes"})


def xlsx_bytes(seuil: float = 0.0) -> bytes:
    df = _communes_df(seuil)
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as w:
        df.to_excel(w, index=False, sheet_name="Ciblage communal")
    return buf.getvalue()


def geojson_bytes(seuil: float = 0.0) -> bytes:
    gj = P.communes_geojson()["geojson"]
    feats = [f for f in gj["features"] if (f["properties"].get("risk") or 0) * 100 >= seuil]
    return json.dumps({"type": "FeatureCollection", "features": feats}, ensure_ascii=False).encode("utf-8")


def shp_zip_bytes(seuil: float = 0.0) -> bytes:
    gj = P.communes_geojson()["geojson"]
    g = gpd.GeoDataFrame.from_features(gj["features"])
    if g.crs is None:
        g = g.set_crs(4326)
    keep = [c for c in ["nom", "risk"] if c in g.columns] + ["geometry"]
    g = g[keep].rename(columns={"nom": "commune", "risk": "risque"})
    if "risque" in g.columns:
        g = g[g["risque"].fillna(0) * 100 >= seuil]
    tmp = tempfile.mkdtemp()
    g.to_file(os.path.join(tmp, "communes_risque.shp"), encoding="utf-8")
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for fn in os.listdir(tmp):
            z.write(os.path.join(tmp, fn), fn)
    return buf.getvalue()

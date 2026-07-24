# -*- coding: utf-8 -*-
"""
API REST (FastAPI) de l'outil d'aide à la décision — OS4.
Sert le modèle encapsulé et le frontend statique.

Lancement :  uvicorn app.backend.main:app --reload   (depuis la racine du projet)
        ou :  python app/run.py
"""
import io, os, json, time, warnings
warnings.filterwarnings("ignore")
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, Header, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from . import predictor as P
from . import auth as A
from . import db
from . import exports as EX

# ---- Limitation de débit (anti brute-force), en mémoire ----
_HITS: dict[str, list[float]] = {}
def rate_limit(request: Request, bucket: str, limit: int = 12, window: int = 300):
    key = f"{bucket}:{request.client.host if request.client else 'x'}"
    now = time.time()
    hits = [t for t in _HITS.get(key, []) if now - t < window]
    hits.append(now)
    _HITS[key] = hits
    if len(hits) > limit:
        raise HTTPException(status_code=429, detail="Trop de tentatives. Réessayez dans quelques minutes.")

# ---- Utilisateur courant (à partir du jeton Bearer) ----
def require_user(authorization: str = Header(default="")) -> dict:
    token = authorization.removeprefix("Bearer ").strip()
    email = A.email_from_token(token) if token else None
    u = db.get_user(email) if email else None
    if not u:
        raise HTTPException(status_code=401, detail="Session invalide")
    return u

app = FastAPI(title="Risque alimentaire Bénin — API d'aide à la décision", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

FRONTEND = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")


class PredictBody(BaseModel):
    fields: dict


class RegisterBody(BaseModel):
    name: str
    org: str = ""
    email: str
    password: str


class LoginBody(BaseModel):
    email: str
    password: str


class ChangePwBody(BaseModel):
    current: str
    new: str


@app.post("/api/auth/register")
def auth_register(body: RegisterBody, request: Request):
    rate_limit(request, "register", limit=8)
    try:
        return A.register(body.name, body.org, body.email, body.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/auth/login")
def auth_login(body: LoginBody, request: Request):
    rate_limit(request, "login", limit=12)
    try:
        return A.login(body.email, body.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/auth/me")
def auth_me(user: dict = Depends(require_user)):
    return {"user": A._public(user)}


@app.post("/api/auth/change-password")
def auth_change_pw(body: ChangePwBody, user: dict = Depends(require_user)):
    try:
        A.change_password(user["email"], body.current, body.new)
        return {"ok": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------- Historique des analyses ----------------
class AnalysisBody(BaseModel):
    type: str
    title: str
    payload: dict = {}
    shared: bool = False


@app.post("/api/analyses")
def analyses_create(body: AnalysisBody, user: dict = Depends(require_user)):
    aid = db.add_analysis(user["id"], user.get("org") or "", body.type, body.title,
                          json.dumps(body.payload, ensure_ascii=False), body.shared)
    return {"id": aid}


@app.get("/api/analyses")
def analyses_list(user: dict = Depends(require_user)):
    rows = db.list_analyses(user["id"], user.get("org") or "")
    return [{"id": r["id"], "type": r["type"], "title": r["title"], "shared": bool(r["shared"]),
             "own": r["user_id"] == user["id"],
             "created_at": r["created_at"].isoformat() if hasattr(r["created_at"], "isoformat") else str(r["created_at"])}
            for r in rows]


@app.get("/api/analyses/{analysis_id}")
def analyses_get(analysis_id: int, user: dict = Depends(require_user)):
    a = db.get_analysis(analysis_id, user["id"], user.get("org") or "")
    if not a:
        raise HTTPException(status_code=404, detail="Analyse introuvable")
    return {"id": a["id"], "type": a["type"], "title": a["title"], "payload": json.loads(a["payload"] or "{}")}


@app.delete("/api/analyses/{analysis_id}")
def analyses_delete(analysis_id: int, user: dict = Depends(require_user)):
    if not db.delete_analysis(analysis_id, user["id"]):
        raise HTTPException(status_code=404, detail="Analyse introuvable ou non autorisée")
    return {"ok": True}


# ---------------- Exports SIG ----------------
def _dispo(name: str):
    return {"Content-Disposition": f'attachment; filename="{name}"'}


@app.get("/api/export/communes.xlsx")
def export_xlsx(seuil: float = 0.0):
    data = EX.xlsx_bytes(seuil)
    return StreamingResponse(io.BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=_dispo("ciblage_communal.xlsx"))


@app.get("/api/export/communes.geojson")
def export_geojson(seuil: float = 0.0):
    return StreamingResponse(io.BytesIO(EX.geojson_bytes(seuil)),
        media_type="application/geo+json", headers=_dispo("communes_risque.geojson"))


@app.get("/api/export/communes.shp.zip")
def export_shp(seuil: float = 0.0):
    return StreamingResponse(io.BytesIO(EX.shp_zip_bytes(seuil)),
        media_type="application/zip", headers=_dispo("communes_risque_shapefile.zip"))


@app.get("/api/metadata")
def metadata():
    return {**P.META, "dept_labels": P.DEPT}


@app.get("/api/form-schema")
def form_schema():
    return P.FORM


@app.post("/api/predict")
def predict(body: PredictBody):
    try:
        return P.predict(body.fields)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/predict/batch")
async def predict_batch(file: UploadFile = File(...)):
    try:
        df = pd.read_csv(io.BytesIO(await file.read()))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV illisible : {e}")
    proba, classes = P.predict_batch(df)
    out = df.copy()
    out["proba_insecurite"] = proba.round(4)
    out["classe_risque"] = classes
    out = out.sort_values("proba_insecurite", ascending=False)
    summary = {
        "n": int(len(out)), "risque_moyen": round(float(proba.mean()) * 100, 1),
        "tres_eleve": int((out.classe_risque == "Très élevé").sum()),
        "eleve": int((out.classe_risque == "Élevé").sum()),
        "modere": int((out.classe_risque == "Modéré").sum()),
        "faible": int((out.classe_risque == "Faible").sum()),
    }
    return {"summary": summary, "rows": out.head(500).to_dict("records"),
            "csv": out.to_csv(index=False)}


@app.get("/api/template")
def template():
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(P.template_csv(), media_type="text/csv")


@app.get("/api/communes")
def communes():
    return P.communes_geojson()


@app.get("/api/determinants")
def determinants():
    return P.determinants()


@app.get("/api/report")
def report():
    import datetime
    r = P.report()
    r["generated_at"] = datetime.date.today().isoformat()
    return r


@app.get("/api/report/map.png")
def report_map():
    p = os.path.join(P.MODEL_DIR, "report_map.png")
    if os.path.exists(p):
        return FileResponse(p, media_type="image/png")
    raise HTTPException(status_code=404, detail="Carte indisponible")


# ---- Frontend statique (monté en dernier pour ne pas masquer /api) ----
if os.path.isdir(FRONTEND):
    @app.get("/")
    def index():
        return FileResponse(os.path.join(FRONTEND, "index.html"))
    app.mount("/", StaticFiles(directory=FRONTEND), name="frontend")

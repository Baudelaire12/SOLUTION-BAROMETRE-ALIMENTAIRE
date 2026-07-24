# ---- Backend : API FastAPI (Baromètre Alimentaire) ----
FROM python:3.11-slim

# Dépendances système pour geopandas / pyogrio (GDAL) et psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    gdal-bin libgdal-dev gcc g++ \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /srv

COPY app/requirements.txt ./app/requirements.txt
RUN pip install --no-cache-dir -r app/requirements.txt

# Code + artefacts du modèle (le dossier app/model est autonome)
COPY app ./app

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

# DATABASE_URL et AUTH_SECRET sont fournis par l'environnement (docker-compose)
CMD ["uvicorn", "app.backend.main:app", "--host", "0.0.0.0", "--port", "8000"]

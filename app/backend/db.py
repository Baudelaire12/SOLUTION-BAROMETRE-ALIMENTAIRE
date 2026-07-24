# -*- coding: utf-8 -*-
"""
Couche de persistance portable (SQLAlchemy Core).
- Par défaut : SQLite local (`app/data.db`).
- En production : PostgreSQL via la variable d'environnement `DATABASE_URL`
  (ex. postgresql+psycopg2://user:pass@db:5432/barometre).
Tables : users (avec rôle) et analyses (historique, partage par organisation).
"""
import os, datetime
from sqlalchemy import (create_engine, MetaData, Table, Column, Integer, String, Text,
                        Boolean, DateTime, select, insert, update, delete, func, or_)

APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{os.path.join(APP_DIR, 'data.db')}")

engine = create_engine(DATABASE_URL, future=True, pool_pre_ping=True)
metadata = MetaData()

users = Table(
    "users", metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(200), nullable=False),
    Column("org", String(200), default=""),
    Column("email", String(200), unique=True, nullable=False),
    Column("pw_hash", String(300), nullable=False),
    Column("role", String(20), default="analyst"),           # admin | analyst | viewer
    Column("created_at", DateTime, default=datetime.datetime.utcnow),
)

analyses = Table(
    "analyses", metadata,
    Column("id", Integer, primary_key=True),
    Column("user_id", Integer, nullable=False),
    Column("org", String(200), default=""),
    Column("type", String(40)),                              # prediction | batch | report
    Column("title", String(300)),
    Column("payload", Text),                                 # JSON sérialisé
    Column("shared", Boolean, default=False),
    Column("created_at", DateTime, default=datetime.datetime.utcnow),
)


def init_db():
    metadata.create_all(engine)


# ---------------- Users ----------------
def count_users() -> int:
    with engine.connect() as c:
        return c.execute(select(func.count()).select_from(users)).scalar_one()


def get_user(email: str) -> dict | None:
    with engine.connect() as c:
        row = c.execute(select(users).where(users.c.email == email)).mappings().first()
    return dict(row) if row else None


def create_user(name: str, org: str, email: str, pw_hash: str, role: str) -> None:
    with engine.begin() as c:
        c.execute(insert(users).values(name=name, org=org, email=email, pw_hash=pw_hash, role=role))


def update_password(email: str, pw_hash: str) -> None:
    with engine.begin() as c:
        c.execute(update(users).where(users.c.email == email).values(pw_hash=pw_hash))


# ---------------- Analyses ----------------
def add_analysis(user_id: int, org: str, type_: str, title: str, payload: str, shared: bool) -> int:
    with engine.begin() as c:
        r = c.execute(insert(analyses).values(
            user_id=user_id, org=org, type=type_, title=title, payload=payload, shared=shared))
        return int(r.inserted_primary_key[0])


def list_analyses(user_id: int, org: str) -> list[dict]:
    with engine.connect() as c:
        rows = c.execute(
            select(analyses.c.id, analyses.c.type, analyses.c.title, analyses.c.shared,
                   analyses.c.user_id, analyses.c.created_at)
            .where(or_(analyses.c.user_id == user_id,
                       (analyses.c.shared == True) & (analyses.c.org == org)))  # noqa: E712
            .order_by(analyses.c.created_at.desc())
        ).mappings().all()
    return [dict(r) for r in rows]


def get_analysis(analysis_id: int, user_id: int, org: str) -> dict | None:
    with engine.connect() as c:
        row = c.execute(select(analyses).where(analyses.c.id == analysis_id)).mappings().first()
    if not row:
        return None
    if row["user_id"] != user_id and not (row["shared"] and row["org"] == org):
        return None
    return dict(row)


def delete_analysis(analysis_id: int, user_id: int) -> bool:
    with engine.begin() as c:
        r = c.execute(delete(analyses).where(
            (analyses.c.id == analysis_id) & (analyses.c.user_id == user_id)))
    return r.rowcount > 0

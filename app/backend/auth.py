# -*- coding: utf-8 -*-
"""
Authentification serveur : comptes en base (via db.py), mots de passe hachés
(PBKDF2-HMAC-SHA256 + sel), sessions par jeton signé (itsdangerous), rôles.
"""
import os, hashlib, secrets, hmac
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from . import db

APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECRET_PATH = os.path.join(APP_DIR, ".auth_secret")
TOKEN_MAX_AGE = 7 * 24 * 3600
PBKDF2_ROUNDS = 200_000


def _secret() -> str:
    if os.environ.get("AUTH_SECRET"):
        return os.environ["AUTH_SECRET"]
    if not os.path.exists(SECRET_PATH):
        with open(SECRET_PATH, "w") as f:
            f.write(secrets.token_hex(32))
    return open(SECRET_PATH).read().strip()


_serializer = URLSafeTimedSerializer(_secret(), salt="ba-auth")
db.init_db()


def _hash_pw(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), PBKDF2_ROUNDS)
    return f"{salt}${dk.hex()}"


def _verify_pw(password: str, stored: str) -> bool:
    try:
        salt, _ = stored.split("$", 1)
    except ValueError:
        return False
    return hmac.compare_digest(_hash_pw(password, salt), stored)


def _public(u: dict) -> dict:
    return {"name": u["name"], "org": u.get("org") or "", "email": u["email"], "role": u.get("role", "analyst")}


def register(name: str, org: str, email: str, password: str) -> dict:
    name, email = name.strip(), email.strip().lower()
    if not name or "@" not in email or len(password) < 6:
        raise ValueError("Renseignez un nom, un e-mail valide et un mot de passe (6 caractères min.).")
    if db.get_user(email):
        raise ValueError("Un compte existe déjà avec cet e-mail.")
    role = "admin" if db.count_users() == 0 else "analyst"     # le 1er compte est administrateur
    db.create_user(name, org.strip(), email, _hash_pw(password), role)
    u = {"name": name, "org": org.strip(), "email": email, "role": role}
    return {"token": make_token(email), "user": u}


def login(email: str, password: str) -> dict:
    email = email.strip().lower()
    u = db.get_user(email)
    if not u or not _verify_pw(password, u["pw_hash"]):
        raise ValueError("E-mail ou mot de passe incorrect.")
    return {"token": make_token(email), "user": _public(u)}


def change_password(email: str, current: str, new: str) -> None:
    u = db.get_user(email)
    if not u or not _verify_pw(current, u["pw_hash"]):
        raise ValueError("Mot de passe actuel incorrect.")
    if len(new) < 6:
        raise ValueError("Le nouveau mot de passe doit comporter au moins 6 caractères.")
    db.update_password(email, _hash_pw(new))


def make_token(email: str) -> str:
    return _serializer.dumps(email)


def email_from_token(token: str) -> str | None:
    try:
        return _serializer.loads(token, max_age=TOKEN_MAX_AGE)
    except (BadSignature, SignatureExpired):
        return None


def user_from_token(token: str) -> dict | None:
    email = email_from_token(token)
    if not email:
        return None
    u = db.get_user(email)
    return _public(u) if u else None

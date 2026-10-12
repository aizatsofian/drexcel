"""Hash password pbkdf2 + session cookie (stdlib sahaja)."""
import hashlib
import hmac
import secrets
import time
from http import cookies

from config import SESSION_TTL

_sessions = {}  # token -> expiry epoch


def hash_password(password, iterations=100000):
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2${iterations}${salt.hex()}${dk.hex()}"


def verify_password(password, stored):
    try:
        algo, it, salt_hex, hash_hex = stored.split("$")
        assert algo == "pbkdf2"
        dk = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(it)
        )
        return hmac.compare_digest(dk.hex(), hash_hex)
    except Exception:
        return False


def create_session():
    token = secrets.token_hex(32)
    _sessions[token] = time.time() + SESSION_TTL
    return token


def drop_session(token):
    _sessions.pop(token, None)


def check_session(handler):
    cookie = handler.headers.get("Cookie", "")
    c = cookies.SimpleCookie()
    try:
        c.load(cookie)
    except Exception:
        return False
    if "session" not in c:
        return False
    token = c["session"].value
    exp = _sessions.get(token)
    if not exp:
        return False
    if exp < time.time():
        _sessions.pop(token, None)
        return False
    return True


def get_session_token(handler):
    cookie = handler.headers.get("Cookie", "")
    c = cookies.SimpleCookie()
    try:
        c.load(cookie)
    except Exception:
        return None
    return c["session"].value if "session" in c else None

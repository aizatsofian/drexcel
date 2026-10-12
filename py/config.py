"""Konfigurasi laluan projek. Root projek = parent folder py/."""
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE = os.path.join(BASE_DIR, "sys", "data.json")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
PORT = int(os.environ.get("PORT", "8000"))

SESSION_TTL = 12 * 3600
ALLOWED_UPLOAD_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024

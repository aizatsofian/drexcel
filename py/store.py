"""Muat/simpan data.json dengan lock + atomic replace (selamat serentak)."""
import json
import threading

from config import DATA_FILE

_lock = threading.Lock()


def load_data():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_data_atomic(data):
    """Tulis fail temp kemudian os.replace (atomic). Dipanggil dalam lock."""
    import os

    tmp = DATA_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, DATA_FILE)


def update_data(fn):
    """Jalankan fn(data) di dalam lock dan simpan atomic. Return apa-apa dari fn."""
    with _lock:
        data = load_data()
        result = fn(data)
        save_data_atomic(data)
        return result

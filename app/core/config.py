from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]  # raíz del repo (ajustado a tu estructura)
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "app.db"

DATABASE_URL = f"sqlite:///{DB_PATH.as_posix()}"

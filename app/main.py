from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.db import get_db

app = FastAPI(title="Gestion de Ventas", version="0.1.0")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/db-check")
def db_check(db: Session = Depends(get_db)):
    db.execute(text("CREATE TABLE IF NOT EXISTS _db_probe (id INTEGER PRIMARY KEY)"))
    db.commit()
    return {"database": "ok"}

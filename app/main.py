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

from fastapi import FastAPI

from app.core.init_db import init_db
from app.routers.products import router as products_router
from app.routers.settings import router as settings_router
from app.routers.sales import router as sales_router
from app.routers.cash import router as cash_router


app = FastAPI(title="Gestion de Ventas", version="0.1.0")
app.include_router(products_router)
app.include_router(settings_router)
app.include_router(sales_router)



@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(cash_router)
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware

from app.core.db import get_db
from app.core.init_db import init_db

from app.routers.products import router as products_router
from app.routers.settings import router as settings_router
from app.routers.sales import router as sales_router
from app.routers.cash import router as cash_router
from app.routers.dashboard import router as dashboard_router
from app.routers.reports import router as reports_router

app = FastAPI(title="Gestion de Ventas", version="0.1.0")

# Routers
app.include_router(products_router)
app.include_router(settings_router)
app.include_router(sales_router)
app.include_router(cash_router)
app.include_router(dashboard_router)
app.include_router(reports_router)

# CORS (dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/db-check")
def db_check(db: Session = Depends(get_db)):
    db.execute(text("CREATE TABLE IF NOT EXISTS _db_probe (id INTEGER PRIMARY KEY)"))
    db.commit()
    return {"database": "ok"}

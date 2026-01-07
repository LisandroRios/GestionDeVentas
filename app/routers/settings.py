from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.settings import Settings
from app.schemas.settings import SettingsOut, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])

SETTINGS_ID = 1


def get_or_create_settings(db: Session) -> Settings:
    s = db.query(Settings).filter(Settings.id == SETTINGS_ID).first()
    if s:
        return s

    s = Settings(id=SETTINGS_ID, store_name=None, cash_discount_enabled=False, cash_discount_percent=0)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.get("/", response_model=SettingsOut)
def read_settings(db: Session = Depends(get_db)):
    return get_or_create_settings(db)


@router.put("/", response_model=SettingsOut)
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    s = get_or_create_settings(db)

    if payload.store_name is not None:
        s.store_name = payload.store_name.strip() if payload.store_name else None

    if payload.cash_discount_enabled is not None:
        s.cash_discount_enabled = payload.cash_discount_enabled

    if payload.cash_discount_percent is not None:
        s.cash_discount_percent = payload.cash_discount_percent

    db.commit()
    db.refresh(s)
    return s

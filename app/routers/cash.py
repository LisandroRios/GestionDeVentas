from decimal import Decimal
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.cash import CashSession
from app.models.sale import Sale
from app.schemas.cash import CashOpenIn, CashCloseIn, CashSessionOut

router = APIRouter(prefix="/cash", tags=["cash"])


def _get_current_open_session(db: Session) -> CashSession | None:
    return (
        db.query(CashSession)
        .filter(CashSession.closed_at.is_(None))
        .order_by(CashSession.id.desc())
        .first()
    )


@router.get("/current", response_model=CashSessionOut)
def get_current_cash(db: Session = Depends(get_db)):
    session = _get_current_open_session(db)
    if not session:
        raise HTTPException(status_code=404, detail="No open cash session")
    return session


@router.post("/open", response_model=CashSessionOut)
def open_cash(payload: CashOpenIn, db: Session = Depends(get_db)):
    existing = _get_current_open_session(db)
    if existing:
        raise HTTPException(status_code=400, detail="Cash session already open")

    session = CashSession(
        opened_at=datetime.utcnow(),
        opened_by=payload.opened_by.strip() if payload.opened_by else None,
        opening_amount=Decimal(str(payload.opening_amount)).quantize(Decimal("0.01")),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.post("/close", response_model=CashSessionOut)
def close_cash(payload: CashCloseIn, db: Session = Depends(get_db)):
    session = _get_current_open_session(db)
    if not session:
        raise HTTPException(status_code=400, detail="No open cash session to close")

    # Total esperado = suma de totals de ventas desde que se abrió la caja
    total_sales = (
        db.query(Sale)
        .filter(Sale.created_at >= session.opened_at)
        .all()
    )
    sales_sum = sum([Decimal(str(s.total)) for s in total_sales], Decimal("0.00"))

    expected = (Decimal(str(session.opening_amount)) + sales_sum).quantize(Decimal("0.01"))
    closing = Decimal(str(payload.closing_amount)).quantize(Decimal("0.01"))
    difference = (closing - expected).quantize(Decimal("0.01"))

    session.closed_at = datetime.utcnow()
    session.closed_by = payload.closed_by.strip() if payload.closed_by else None
    session.closing_amount = closing
    session.expected_amount = expected
    session.difference_amount = difference

    db.commit()
    db.refresh(session)
    return session

from datetime import date, datetime, time
from typing import Optional

@router.get("/history", response_model=list[CashSessionOut])
def cash_history(
    db: Session = Depends(get_db),
    day: Optional[date] = None,     # ejemplo: 2026-01-13
    only_closed: bool = True,
):
    q = db.query(CashSession)

    if only_closed:
        q = q.filter(CashSession.closed_at.isnot(None))

    if day:
        start = datetime.combine(day, time.min)
        end = datetime.combine(day, time.max)
        q = q.filter(CashSession.opened_at >= start, CashSession.opened_at <= end)

    return q.order_by(CashSession.id.desc()).all()

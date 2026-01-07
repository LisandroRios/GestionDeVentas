from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from app.core.db import get_db
from app.models.product import ProductVariant
from app.models.sale import Sale, SaleItem
from app.models.settings import Settings
from app.schemas.sale import SaleCreate, SaleOut
from datetime import date, datetime, time

router = APIRouter(prefix="/sales", tags=["sales"])

SETTINGS_ID = 1


def _get_settings(db: Session) -> Settings:
    s = db.query(Settings).filter(Settings.id == SETTINGS_ID).first()
    if not s:
        # por si nunca llamaron /settings antes
        s = Settings(id=SETTINGS_ID, store_name=None, cash_discount_enabled=False, cash_discount_percent=0)
        db.add(s)
        db.commit()
        db.refresh(s)
    return s


@router.post("/", response_model=SaleOut)
def create_sale(payload: SaleCreate, db: Session = Depends(get_db)):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Sale must contain at least 1 item")

    settings = _get_settings(db)

    # --- 1) Traer variantes y validar cantidades/stock ---
    variant_ids = [i.variant_id for i in payload.items]

    variants = (
        db.query(ProductVariant)
        .filter(ProductVariant.id.in_(variant_ids))
        .all()
    )
    variant_map = {v.id: v for v in variants}

    missing = [vid for vid in variant_ids if vid not in variant_map]
    if missing:
        raise HTTPException(status_code=404, detail=f"Variant not found: {missing}")

    # Validación stock suficiente
    for it in payload.items:
        v = variant_map[it.variant_id]
        if it.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be > 0")
        if v.stock < it.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for variant_id={v.id}. Available={v.stock}, requested={it.quantity}",
            )

    # --- 2) Calcular totales ---
    subtotal = Decimal("0.00")
    items_to_create: List[SaleItem] = []

    for it in payload.items:
        v = variant_map[it.variant_id]
        unit_price = Decimal(str(v.price))  # v.price es Numeric
        line_total = unit_price * Decimal(it.quantity)

        subtotal += line_total

        items_to_create.append(
            SaleItem(
                variant_id=v.id,
                quantity=it.quantity,
                unit_price_at_sale=unit_price,
                line_total=line_total,
            )
        )

    discount_percent = None
    total = subtotal

    if payload.payment_method == "CASH" and settings.cash_discount_enabled:
        dp = Decimal(str(settings.cash_discount_percent))
        discount_percent = dp
        total = subtotal * (Decimal("1.00") - (dp / Decimal("100.00")))

    # Normalizar a 2 decimales
    subtotal = subtotal.quantize(Decimal("0.01"))
    total = total.quantize(Decimal("0.01"))

    # --- 3) Transacción: guardar venta + items + descontar stock ---
    try:
        sale = Sale(
            payment_method=payload.payment_method,
            discount_percent=discount_percent,
            subtotal=subtotal,
            total=total,
        )
        db.add(sale)
        db.flush()  # obtiene sale.id sin commit

        for si in items_to_create:
            si.sale_id = sale.id
            db.add(si)

        # descontar stock
        for it in payload.items:
            v = variant_map[it.variant_id]
            v.stock = v.stock - it.quantity

        db.commit()

        # recargar con items para respuesta
        sale = (
            db.query(Sale)
            .options(selectinload(Sale.items))
            .filter(Sale.id == sale.id)
            .first()
        )
        return sale

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Could not create sale: {str(e)}")

@router.get("/", response_model=list[SaleOut])
def list_sales(
    db: Session = Depends(get_db),
    day: date | None = None,              # ejemplo: 2026-01-07
    payment_method: str | None = None,    # CASH/TRANSFER/CARD_MP
):
    q = db.query(Sale).options(selectinload(Sale.items))

    if day:
        start = datetime.combine(day, time.min)
        end = datetime.combine(day, time.max)
        q = q.filter(Sale.created_at >= start, Sale.created_at <= end)

    if payment_method:
        q = q.filter(Sale.payment_method == payment_method)

    return q.order_by(Sale.id.desc()).all()


@router.get("/{sale_id}", response_model=SaleOut)
def get_sale(sale_id: int, db: Session = Depends(get_db)):
    sale = (
        db.query(Sale)
        .options(selectinload(Sale.items))
        .filter(Sale.id == sale_id)
        .first()
    )
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return sale

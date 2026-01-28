from decimal import Decimal
from typing import List, Optional
from datetime import date, datetime, time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from app.core.db import get_db
from app.models.product import ProductVariant
from app.models.sale import Sale, SaleItem
from app.models.settings import Settings
from app.schemas.sale import SaleCreate, SaleOut
from app.models.cash import CashSession

from sqlalchemy import func
from app.models.stock_movement import StockMovement



router = APIRouter(prefix="/sales", tags=["sales"])

SETTINGS_ID = 1


# -------------------------
# Helpers
# -------------------------
def _get_settings(db: Session) -> Settings:
    settings = db.query(Settings).filter(Settings.id == SETTINGS_ID).first()
    if not settings:
        settings = Settings(
            id=SETTINGS_ID,
            store_name=None,
            cash_discount_enabled=False,
            cash_discount_percent=0,
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

def _has_open_cash(db: Session) -> bool:
    return (
        db.query(CashSession)
        .filter(CashSession.closed_at.is_(None))
        .first()
        is not None
    )

# -------------------------
# Crear venta
# -------------------------
@router.post("/", response_model=SaleOut)
def create_sale(payload: SaleCreate, db: Session = Depends(get_db)):
    if not _has_open_cash(db):
        raise HTTPException(
            status_code=400,
            detail="Cannot register sale: no open cash session",
        )

    if not payload.items:
        raise HTTPException(status_code=400, detail="Sale must contain at least 1 item")

    settings = _get_settings(db)

    # ✅ 0) Consolidar items por variant_id (por si viene repetida la misma variante)
    qty_by_variant: dict[int, int] = {}
    for it in payload.items:
        if it.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be > 0")
        qty_by_variant[it.variant_id] = qty_by_variant.get(it.variant_id, 0) + it.quantity

    variant_ids = list(qty_by_variant.keys())

    # ✅ 1) Traer variantes con LOCK (evita condiciones de carrera de stock)
    variants = (
        db.query(ProductVariant)
        .filter(ProductVariant.id.in_(variant_ids))
        .with_for_update()
        .all()
    )
    variant_map = {v.id: v for v in variants}

    missing = [vid for vid in variant_ids if vid not in variant_map]
    if missing:
        raise HTTPException(status_code=404, detail=f"Variant not found: {missing}")

    # ✅ 2) Validar stock contra la cantidad consolidada
    for vid, qty in qty_by_variant.items():
        variant = variant_map[vid]
        if variant.stock < qty:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Insufficient stock for variant_id={variant.id}. "
                    f"Available={variant.stock}, requested={qty}"
                ),
            )

    # ✅ 3) Calcular totales usando los items originales (o usando qty_by_variant)
    # Recomiendo generar SaleItems usando qty_by_variant para que quede limpio:
    subtotal = Decimal("0.00")
    sale_items: List[SaleItem] = []

    for vid, qty in qty_by_variant.items():
        variant = variant_map[vid]
        unit_price = Decimal(str(variant.price))
        line_total = unit_price * Decimal(qty)

        subtotal += line_total
        sale_items.append(
            SaleItem(
                variant_id=variant.id,
                quantity=qty,
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

    subtotal = subtotal.quantize(Decimal("0.01"))
    total = total.quantize(Decimal("0.01"))

    try:
        sale = Sale(
            payment_method=payload.payment_method,
            discount_percent=discount_percent,
            subtotal=subtotal,
            total=total,
        )
        db.add(sale)
        db.flush()  # sale.id

        for si in sale_items:
            si.sale_id = sale.id
            db.add(si)

        # ✅ 4) Descontar stock (consolidado) + doble check anti-negativo
        for vid, qty in qty_by_variant.items():
            variant = variant_map[vid]
            next_stock = variant.stock - qty
            if next_stock < 0:
                # esto no debería pasar por validación + lock, pero es “cinturón y tiradores”
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock would become negative for variant_id={vid}",
                )
            variant.stock = next_stock

        db.add(StockMovement(
    variant_id=variant.id,
    delta=-qty,
    before_stock=int(variant.stock),
    after_stock=int(next_stock),
    reason=f"sale:{sale.id}",
    actor=getattr(payload, "actor", None),
))

        db.commit()

        sale = (
            db.query(Sale)
            .options(selectinload(Sale.items))
            .filter(Sale.id == sale.id)
            .first()
        )
        return sale

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Could not create sale: {str(e)}")


# -------------------------
# Listar ventas
# -------------------------
@router.get("/", response_model=list[SaleOut])
def list_sales(
    db: Session = Depends(get_db),
    day: Optional[date] = None,
    payment_method: Optional[str] = None,
):
    query = db.query(Sale).options(selectinload(Sale.items))

    if day:
        start = datetime.combine(day, time.min)
        end = datetime.combine(day, time.max)
        query = query.filter(
            Sale.created_at >= start,
            Sale.created_at <= end,
        )

    if payment_method:
        query = query.filter(Sale.payment_method == payment_method)

    return query.order_by(Sale.id.desc()).all()


# -------------------------
# Obtener venta por ID
# -------------------------
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

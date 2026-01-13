from datetime import date, datetime, time
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.db import get_db
from app.models.sale import Sale, SaleItem
from app.models.product import Product, ProductVariant
from app.schemas.dashboard import DashboardTodayOut, PaymentBreakdown, TopProductItem

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/today", response_model=DashboardTodayOut)
def dashboard_today(db: Session = Depends(get_db)):
    today = date.today()
    start = datetime.combine(today, time.min)
    end = datetime.combine(today, time.max)

    # Ventas del día
    sales_q = db.query(Sale).filter(Sale.created_at >= start, Sale.created_at <= end)

    total_sales = sales_q.count()
    gross_total = sales_q.with_entities(func.coalesce(func.sum(Sale.total), 0)).scalar()

    # Por medio de pago
    breakdown_rows = (
        db.query(
            Sale.payment_method,
            func.count(Sale.id),
            func.coalesce(func.sum(Sale.total), 0),
        )
        .filter(Sale.created_at >= start, Sale.created_at <= end)
        .group_by(Sale.payment_method)
        .all()
    )

    breakdown = [
        PaymentBreakdown(
            payment_method=pm,
            count_sales=int(cnt),
            total=float(total),
        )
        for (pm, cnt, total) in breakdown_rows
    ]

    # Top items del día (por cantidad)
    top_rows = (
        db.query(
            SaleItem.variant_id,
            func.sum(SaleItem.quantity).label("qty"),
            func.coalesce(func.sum(SaleItem.line_total), 0).label("rev"),
            ProductVariant.variant_name,
            Product.id.label("product_id"),
            Product.name.label("product_name"),
        )
        .join(Sale, Sale.id == SaleItem.sale_id)
        .join(ProductVariant, ProductVariant.id == SaleItem.variant_id)
        .join(Product, Product.id == ProductVariant.product_id)
        .filter(Sale.created_at >= start, Sale.created_at <= end)
        .group_by(
            SaleItem.variant_id,
            ProductVariant.variant_name,
            Product.id,
            Product.name,
        )
        .order_by(func.sum(SaleItem.quantity).desc())
        .limit(10)
        .all()
    )

    top_items = [
        TopProductItem(
            variant_id=int(variant_id),
            variant_name=variant_name,
            product_id=int(product_id),
            product_name=product_name,
            quantity_sold=int(qty),
            revenue=float(rev),
        )
        for (variant_id, qty, rev, variant_name, product_id, product_name) in top_rows
    ]

    return DashboardTodayOut(
        day=str(today),
        total_sales=int(total_sales),
        gross_total=float(gross_total),
        breakdown=breakdown,
        top_items=top_items,
    )

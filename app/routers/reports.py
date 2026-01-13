from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.product import Product, ProductVariant
from app.schemas.reports import LowStockItem

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/low-stock", response_model=list[LowStockItem])
def low_stock(db: Session = Depends(get_db)):
    rows = (
        db.query(
            ProductVariant.id,
            ProductVariant.variant_name,
            Product.id,
            Product.name,
            ProductVariant.stock,
            ProductVariant.stock_min,
        )
        .join(Product, Product.id == ProductVariant.product_id)
        .filter(ProductVariant.stock_min.isnot(None))
        .filter(ProductVariant.stock <= ProductVariant.stock_min)
        .order_by(ProductVariant.stock.asc())
        .all()
    )

    return [
        LowStockItem(
            variant_id=vid,
            variant_name=vname,
            product_id=pid,
            product_name=pname,
            stock=stock,
            stock_min=stock_min,
        )
        for (vid, vname, pid, pname, stock, stock_min) in rows
    ]

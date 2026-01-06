from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.product import Product, ProductVariant
from app.schemas.product import (
    ProductCreate, ProductOut,
    ProductVariantCreate, ProductVariantOut
)
from typing import Optional
from sqlalchemy.orm import selectinload
from app.schemas.product import ProductUpdate, ProductVariantUpdate


router = APIRouter(prefix="/products", tags=["products"])


@router.post("/", response_model=ProductOut)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    #verificación de existencia de algun producto. si existe, no se añade.
    existing = ( db.query(Product).filter(Product.name == payload.name).first())

    if existing:
        raise HTTPException(
        status_code=400,
        detail="Product with this name already exists"
    )
    
    product = Product(
        name=payload.name.strip(),
        category=payload.category.strip() if payload.category else None,
        active=payload.active,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/", response_model=list[ProductOut])
def list_products(
    db: Session = Depends(get_db),
    search: Optional[str] = None,
    category: Optional[str] = None,
    active: Optional[bool] = None,
):
    q = db.query(Product).options(selectinload(Product.variants))

    if search:
        s = search.strip()
        q = q.filter(Product.name.ilike(f"%{s}%"))

    if category:
        c = category.strip()
        q = q.filter(Product.category == c)

    if active is not None:
        q = q.filter(Product.active == active)

    return q.order_by(Product.id.desc()).all()



@router.post("/{product_id}/variants", response_model=ProductVariantOut)
def create_variant(product_id: int, payload: ProductVariantCreate, db: Session = Depends(get_db)):
    #verifica que no haya dos variantes iguales del mismo producto
    existing = (
    db.query(ProductVariant)
    .filter(
        ProductVariant.product_id == product_id,
        ProductVariant.variant_name == payload.variant_name
    )
    .first()
    )

    if existing:
        raise HTTPException(
        status_code=400,
        detail="Variant already exists for this product"
    )


    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    variant = ProductVariant(
        product_id=product_id,
        variant_name=payload.variant_name.strip(),
        sku=payload.sku,
        price=payload.price,
        stock=payload.stock,
        stock_min=payload.stock_min,
    )
    db.add(variant)
    db.commit()
    db.refresh(variant)
    return variant


@router.get("/{product_id}/variants", response_model=list[ProductVariantOut])
def list_variants(product_id: int, db: Session = Depends(get_db)):
    # opcional: validar que exista el producto
    return (
        db.query(ProductVariant)
        .filter(ProductVariant.product_id == product_id)
        .order_by(ProductVariant.id.desc())
        .all()
    )

@router.patch("/{product_id}", response_model=ProductOut)
def update_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(Product).options(selectinload(Product.variants)).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if payload.name is not None:
        new_name = payload.name.strip()
        if not new_name:
            raise HTTPException(status_code=400, detail="Invalid name")
        # (opcional) evitar duplicado por nombre en update:
        dup = db.query(Product).filter(Product.name == new_name, Product.id != product_id).first()
        if dup:
            raise HTTPException(status_code=400, detail="Product with this name already exists")
        product.name = new_name

    if payload.category is not None:
        product.category = payload.category.strip() if payload.category else None

    if payload.active is not None:
        product.active = payload.active

    db.commit()
    db.refresh(product)
    return product


@router.patch("/variants/{variant_id}", response_model=ProductVariantOut)
def update_variant(variant_id: int, payload: ProductVariantUpdate, db: Session = Depends(get_db)):
    variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    if payload.variant_name is not None:
        new_vname = payload.variant_name.strip()
        if not new_vname:
            raise HTTPException(status_code=400, detail="Invalid variant_name")
        dup = (
            db.query(ProductVariant)
            .filter(
                ProductVariant.product_id == variant.product_id,
                ProductVariant.variant_name == new_vname,
                ProductVariant.id != variant_id,
            )
            .first()
        )
        if dup:
            raise HTTPException(status_code=400, detail="Variant already exists for this product")
        variant.variant_name = new_vname

    if payload.sku is not None:
        variant.sku = payload.sku.strip() if payload.sku else None

    if payload.price is not None:
        variant.price = payload.price

    if payload.stock is not None:
        variant.stock = payload.stock

    if payload.stock_min is not None:
        variant.stock_min = payload.stock_min

    db.commit()
    db.refresh(variant)
    return variant

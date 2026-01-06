from sqlalchemy import Boolean, Column, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship

from app.core.db import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    category = Column(String(120), nullable=True)  # texto libre en V1
    active = Column(Boolean, default=True, nullable=False)

    variants = relationship(
        "ProductVariant",
        back_populates="product",
        cascade="all, delete-orphan",
    )


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(Integer, primary_key=True, index=True)

    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)

    variant_name = Column(String(120), nullable=False)  # ej: "Talle XL", "15x10"
    sku = Column(String(60), nullable=True, unique=False)

    price = Column(Numeric(10, 2), nullable=False)  # ej: 12345.67
    stock = Column(Integer, default=0, nullable=False)
    stock_min = Column(Integer, nullable=True)

    product = relationship("Product", back_populates="variants")

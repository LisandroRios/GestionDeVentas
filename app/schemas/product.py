from pydantic import BaseModel, Field
from typing import Optional, List


# ---------- Variants ----------
class ProductVariantBase(BaseModel):
    variant_name: str = Field(..., min_length=1, max_length=120)
    sku: Optional[str] = Field(default=None, max_length=60)
    price: float = Field(..., gt=0)
    stock: int = Field(default=0, ge=0)
    stock_min: Optional[int] = Field(default=None, ge=0)


class ProductVariantCreate(ProductVariantBase):
    pass


class ProductVariantOut(ProductVariantBase):
    id: int
    product_id: int

    class Config:
        from_attributes = True


# ---------- Products ----------
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    category: Optional[str] = Field(default=None, max_length=120)
    active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductOut(ProductBase):
    id: int
    variants: List[ProductVariantOut] = []

    class Config:
        from_attributes = True

# -------- Validations ----------

from typing import Optional
from pydantic import BaseModel, Field

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    category: Optional[str] = Field(default=None, max_length=120)
    active: Optional[bool] = None

class ProductVariantUpdate(BaseModel):
    variant_name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    sku: Optional[str] = Field(default=None, max_length=60)
    price: Optional[float] = Field(default=None, gt=0)
    stock: Optional[int] = Field(default=None, ge=0)
    stock_min: Optional[int] = Field(default=None, ge=0)

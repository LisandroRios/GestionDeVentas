from typing import List, Literal
from pydantic import BaseModel, Field
from datetime import datetime

# --------- Input ---------

class SaleItemCreate(BaseModel):
    variant_id: int
    quantity: int = Field(..., gt=0)


class SaleCreate(BaseModel):
    payment_method: Literal["CASH", "TRANSFER", "CARD_MP"]
    items: List[SaleItemCreate]


# --------- Output ---------

class SaleItemOut(BaseModel):
    id: int
    variant_id: int
    quantity: int
    unit_price_at_sale: float
    line_total: float

    class Config:
        from_attributes = True


class SaleOut(BaseModel):
    id: int
    created_at: datetime
    payment_method: str
    discount_percent: float | None
    subtotal: float
    total: float
    items: List[SaleItemOut]

    class Config:
        from_attributes = True

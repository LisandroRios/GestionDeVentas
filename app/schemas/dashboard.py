from pydantic import BaseModel
from typing import List


class PaymentBreakdown(BaseModel):
    payment_method: str
    total: float
    count_sales: int


class TopProductItem(BaseModel):
    variant_id: int
    variant_name: str
    product_id: int
    product_name: str
    quantity_sold: int
    revenue: float


class DashboardTodayOut(BaseModel):
    day: str  # YYYY-MM-DD
    total_sales: int
    gross_total: float
    breakdown: List[PaymentBreakdown]
    top_items: List[TopProductItem]

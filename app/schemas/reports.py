from pydantic import BaseModel


class LowStockItem(BaseModel):
    variant_id: int
    variant_name: str
    product_id: int
    product_name: str
    stock: int
    stock_min: int

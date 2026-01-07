from pydantic import BaseModel, Field
from typing import Optional


class SettingsOut(BaseModel):
    id: int
    store_name: Optional[str] = None
    cash_discount_enabled: bool
    cash_discount_percent: float

    class Config:
        from_attributes = True


class SettingsUpdate(BaseModel):
    store_name: Optional[str] = Field(default=None, max_length=120)
    cash_discount_enabled: Optional[bool] = None
    cash_discount_percent: Optional[float] = Field(default=None, ge=0, le=100)

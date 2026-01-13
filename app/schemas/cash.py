from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class CashOpenIn(BaseModel):
    opening_amount: float = Field(default=0, ge=0)
    opened_by: Optional[str] = Field(default=None, max_length=80)


class CashCloseIn(BaseModel):
    closing_amount: float = Field(..., ge=0)
    closed_by: Optional[str] = Field(default=None, max_length=80)


class CashSessionOut(BaseModel):
    id: int

    opened_at: datetime
    opened_by: Optional[str]
    opening_amount: float

    closed_at: Optional[datetime]
    closed_by: Optional[str]
    closing_amount: Optional[float]

    expected_amount: Optional[float]
    difference_amount: Optional[float]

    class Config:
        from_attributes = True

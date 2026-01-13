from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, Numeric, String
from sqlalchemy.orm import relationship

from app.core.db import Base


class CashSession(Base):
    __tablename__ = "cash_sessions"

    id = Column(Integer, primary_key=True, index=True)

    opened_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    opened_by = Column(String(80), nullable=True)
    opening_amount = Column(Numeric(10, 2), default=0, nullable=False)

    closed_at = Column(DateTime, nullable=True)
    closed_by = Column(String(80), nullable=True)
    closing_amount = Column(Numeric(10, 2), nullable=True)

    # snapshot al cerrar (para no recalcular y que quede auditado)
    expected_amount = Column(Numeric(10, 2), nullable=True)
    difference_amount = Column(Numeric(10, 2), nullable=True)

from sqlalchemy import Boolean, Column, Integer, Numeric, String

from app.core.db import Base


class Settings(Base):
    __tablename__ = "settings"

    # Vamos a tener 1 sola fila (id=1) por local
    id = Column(Integer, primary_key=True)

    store_name = Column(String(120), nullable=True)

    cash_discount_enabled = Column(Boolean, default=False, nullable=False)
    cash_discount_percent = Column(Numeric(5, 2), default=0, nullable=False)

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.db import Base

class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)

    variant_id = Column(Integer, ForeignKey("product_variants.id"), nullable=False, index=True)

    # +10, -2, etc
    delta = Column(Integer, nullable=False)

    # stock antes y después (sirve para auditar)
    before_stock = Column(Integer, nullable=False)
    after_stock = Column(Integer, nullable=False)

    reason = Column(String(200), nullable=True)
    actor = Column(String(120), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    variant = relationship("ProductVariant")

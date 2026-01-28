from app.core.db import Base, engine

# Importar modelos para que SQLAlchemy los registre
from app.models.product import Product, ProductVariant  # noqa: F401
from app.models.sale import Sale, SaleItem  # noqa: F401
from app.models.settings import Settings # noqa: F401
from app.models.cash import CashSession  # noqa: F401
from app.models.stock_movement import StockMovement  # noqa: F401


def init_db() -> None:
    Base.metadata.create_all(bind=engine)

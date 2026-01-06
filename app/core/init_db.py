from app.core.db import Base, engine

# Importar modelos para que SQLAlchemy los registre
from app.models.product import Product, ProductVariant  # noqa: F401


def init_db() -> None:
    Base.metadata.create_all(bind=engine)

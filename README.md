## GestionDeVentas
Proyecto de sistema y aplicación de gestión de ventas en los puestos de artesanías en Purmamarca, Jujuy.


# Formato de los archivos

GESTIONDEVENTAS/
  README.md
  pyproject.toml          # cuando inicialicen Poetry (o requirements.txt si van simple)
  .gitignore
  .env.example
  docker/                 # opcional (más adelante)
  docs/
    roadmap.md
    data_model.md
  app/
    main.py
    core/
      config.py
      db.py
    models/
    schemas/
    routers/
    services/
  tests/
  scripts/
    dev_run.sh
    dev_run.bat

# 📦 Gestión de Ventas – Comercios Turísticos

## 🧠 Visión general

Este proyecto consiste en el desarrollo de un **sistema de gestión de ventas y stock** orientado a **comercios turísticos pequeños y medianos**, como los que se encuentran en zonas turísticas (por ejemplo, Purmamarca).

El objetivo principal es **simplificar y automatizar la gestión diaria del local**, reemplazando métodos manuales (cuadernos, planillas, etc.) por una solución digital, clara y confiable.

### Características clave

- ✅ **Funciona offline** (en PC o notebook del local)
- ⚡ **Uso rápido y práctico**, pensado para el día a día
- 📱 Preparado para una futura adaptación a **celular / web**
- 🧱 Base técnica sólida y escalable

### Funcionalidades objetivo

- Control de stock  
- Registro de ventas  
- Control de caja diaria  
- Reportes simples y claros  

> En esta etapa inicial, el foco está puesto en construir una **base técnica robusta**, que permita agregar funcionalidades de forma ordenada en futuras iteraciones.

---

## 🏗️ Estructura del proyecto

```text
GestionDeVentas/
│
├── app/
│   ├── main.py          # Punto de entrada de la aplicación FastAPI
│   │
│   ├── core/
│   │   ├── config.py    # Configuración global (paths, DB, settings)
│   │   └── db.py        # Conexión a SQLite, Session y Base SQLAlchemy
│   │
│   ├── models/          # Modelos SQLAlchemy (a implementar)
│   ├── schemas/         # Esquemas Pydantic (a implementar)
│   ├── routers/         # Endpoints agrupados por módulo
│   └── services/        # Lógica de negocio
│
├── data/
│   ├── app.db           # Base de datos SQLite local
│   └── backups/         # Backups de la base de datos
│
├── scripts/
│   ├── dev_run.bat      # Script para levantar el proyecto (Windows)
│   └── dev_run.sh       # Script para levantar el proyecto (Linux / Mac)
│
├── tests/               # Tests automatizados (futuro)
├── docs/                # Documentación técnica (modelo, roadmap)
│
├── requirements.txt     # Dependencias del proyecto
├── .gitignore
└── README.md
```
## 🔧 Qué hace cada componente importante

### `app/main.py`
Archivo principal de la aplicación.

Responsabilidades:
- Crea la instancia de la aplicación **FastAPI**
- Registra los endpoints base (`/health`, `/db-check`)
- Define el punto de entrada del backend

A futuro:
- Incluye los **routers** del sistema (productos, ventas, caja, etc.)
- Centraliza la configuración inicial de la API

---

### `app/core/config.py`
Archivo de configuración global del proyecto.

Responsabilidades:
- Define la **ruta base del proyecto**
- Configura la carpeta `data/`
- Establece la **ubicación de la base de datos**
- Centraliza valores de configuración reutilizables

> Mantener esta configuración separada facilita la escalabilidad y el mantenimiento del sistema.

---

### `app/core/db.py`
Módulo encargado de la base de datos.

Responsabilidades:
- Crea el **engine de SQLAlchemy**
- Define:
  - `SessionLocal` (sesiones de base de datos)
  - `Base` (clase base para los modelos)
  - `get_db()` (inyección de dependencias en FastAPI)
- Garantiza que la base de datos exista y sea accesible

Este archivo actúa como el **núcleo de acceso a datos** del sistema.

---

### `scripts/`
Scripts de automatización del proyecto.

Responsabilidades:
- Automatizan el **setup del entorno**
- Permiten levantar el proyecto con un solo comando
- Reducen errores humanos
- Facilitan la colaboración en equipo

> Este tipo de scripts es muy valorado en entornos profesionales y equipos de desarrollo reales.

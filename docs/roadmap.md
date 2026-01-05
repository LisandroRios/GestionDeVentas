## 🧭 Roadmap de desarrollo (Sprints)

El proyecto se desarrolla de forma incremental, dividido en **sprints**, cada uno con objetivos claros y alcanzables.

---

### 🚧 Sprint 0 – Base técnica

**Objetivo:**  
Dejar el proyecto listo para desarrollar funcionalidades reales, con una base sólida y profesional.

**Alcance:**
- Creación del repositorio y estructura inicial
- Configuración del entorno virtual (`.venv`)
- Instalación y gestión de dependencias
- Backend con FastAPI funcionando
- Conexión a base de datos SQLite local
- Scripts para levantar el proyecto fácilmente
- Endpoints de verificación:
  - `/health`
  - `/db-check`

**Resultado:**  
Proyecto levantable en un solo comando, con backend y base de datos listos para crecer.

---

### 📦 Sprint 1 – Productos y variantes

**Objetivo:**  
Implementar el primer módulo funcional del sistema.

**Alcance:**
- Modelos:
  - Producto
  - Variante de producto
- Creación de tablas reales en la base de datos
- Relación producto ↔ variantes
- CRUD básico de productos y variantes
- Validaciones de datos (precio, stock, etc.)

**Resultado:**  
Capacidad de registrar y gestionar el stock del local.

---

### 🛒 Sprint 2 – Ventas

**Objetivo:**  
Registrar ventas reales y actualizar stock automáticamente.

**Alcance:**
- Modelo de Venta
- Modelo de Detalle de Venta
- Registro de ventas con múltiples productos
- Descuento automático por pago en efectivo (% configurable)
- Almacenamiento del precio al momento de la venta
- Descuento de stock al concretar la venta
- Validación de stock disponible

**Resultado:**  
Sistema capaz de registrar ventas reales de forma confiable.

---

### 💰 Sprint 3 – Caja diaria

**Objetivo:**  
Brindar control sobre la recaudación diaria del local.

**Alcance:**
- Apertura de caja
- Cierre de caja
- Cálculo de recaudación esperada
- Comparación con recaudación real
- Registro de diferencias

**Resultado:**  
Control claro y diario del dinero del local.

---

### 📊 Sprint 4 – Dashboard y reportes

**Objetivo:**  
Visualizar información clave de forma rápida y clara.

**Alcance:**
- Dashboard del día
- Total vendido
- Ventas por medio de pago
- Productos más vendidos
- Alertas de stock bajo

**Resultado:**  
El dueño puede entender el estado del negocio en pocos segundos.

---

### 🌐 Sprint 5 – Interfaz de usuario (MVP usable)

**Objetivo:**  
Permitir el uso del sistema sin herramientas técnicas.

**Alcance:**
- Interfaz web simple y clara
- Flujo rápido de carga de ventas
- Gestión visual de productos y stock
- Diseño responsive (usable en celular)

**Resultado:**  
Sistema usable por personas no técnicas.

---

### 📱 Sprint 6 – Experiencia móvil / PWA (opcional)

**Objetivo:**  
Mejorar la experiencia en dispositivos móviles.

**Alcance:**
- Conversión a PWA
- Instalación en celular
- Uso offline parcial
- Optimización de rendimiento

**Resultado:**  
El sistema se puede usar como una app sin pasar por stores.

---

### 🚀 Sprint 7 – Pulido y portfolio

**Objetivo:**  
Dejar el proyecto listo para ser presentado profesionalmente.

**Alcance:**
- Documentación completa
- Capturas / demo
- Limpieza de código
- Tests básicos
- README final orientado a portfolio

**Resultado:**  
Proyecto sólido y presentable para entrevistas y primeras oportunidades laborales.

---

# Venta Fácil

Aplicación web de registro de ventas por menú diseñada para pequeños negocios gastronómicos de atención en mesón o con pocas mesas. Reemplaza el cuaderno tradicional para agilizar el registro en hora punta, automatizar el cuadre de caja por medio de pago y facilitar la entrega de información al contador.

> Proyecto desarrollado para la asignatura **Proyecto Integrado (TIHV43)** — Demo funcional en entorno local (`localhost`).

---

## Alcance del proyecto

### Incluye
- **Acceso por rol:** Vendedor y Administrador (el administrador hereda las funciones de vendedor para poder atender y gestionar desde la misma cuenta).
- **Seguridad y control de acceso:**
  - Bloqueo temporal tras 5 intentos fallidos de inicio de sesión o PIN.
  - Secciones sensibles del administrador (Revisión de anulaciones, Menú y Equipo) protegidas con PIN de 4 dígitos.
  - Aislamiento de datos por negocio y bitácora de auditoría.
- **Registro de ventas en 3 toques:** Selección de producto(s), medio de pago (`Efectivo`, `Transferencia`, `Débito`, `Crédito`) y confirmación, con soporte de reintento sin duplicados (`id_cliente`).
- **Anulación en dos pasos:** El vendedor marca una venta propia como *Por anular* (con motivo opcional) y solo el administrador puede confirmarla (*Anulada*) o rechazarla (*Vigente*).
- **Gestión de menú y equipo:** Creación, edición y activación/desactivación de productos; alta y baja lógica de vendedores conservando su historial.
- **Resumen e historial:** Indicadores del día/semana/mes/rango, totales por medio de pago, ranking de productos más vendidos, filtros de historial y exportación a **Excel (`.xlsx`)**.

### Fuera de alcance
- Control de inventario y stock de insumos.
- Cálculo de costos y márgenes.
- Emisión de boletas electrónicas o integración con el SII.
- Integración con máquinas POS o cobros en línea.
- Recepción de pedidos por WhatsApp.

---

## Tecnologías implementadas

### Frontend
- **Angular** (componentes standalone, señales y guards de ruta)
- **TypeScript**
- **Bootstrap 5** y **Bootstrap Icons**

### Backend
- **Python 3.12**
- **Django** y **Django REST Framework** (API REST con autenticación por token Bearer)
- **django-cors-headers** (comunicación local `localhost:4200` ↔ `localhost:8000`)
- **openpyxl** (generación de archivos `.xlsx` con sanitización contra inyección de fórmulas)
- **SQLite** (base de datos local para la demostración; el diseño relacional de 7 tablas está preparado para PostgreSQL en producción)

### Entorno aislado
- Entorno virtual Python (`venv/`) con **Node.js** y **npm** aislados mediante `nodeenv`.

---

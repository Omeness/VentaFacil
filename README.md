# Venta Fácil

Aplicación web de registro de ventas por menú diseñada para pequeños negocios gastronómicos de atención en mesón o con pocas mesas. Reemplaza el cuaderno tradicional para agilizar el registro en hora punta, automatizar el cuadre de caja por medio de pago y facilitar la entrega de información al contador.

> Proyecto desarrollado para la asignatura **Proyecto Integrado (TIHV43)** — Demostración funcional en entorno local (`localhost`).

---

## Alcance del proyecto

### Funcionalidades incluidas
- **Control de acceso por rol:** Perfiles de Vendedor y Administrador. El perfil de Administrador hereda las capacidades del Vendedor, permitiendo registrar ventas y gestionar el negocio desde una única cuenta.
- **Seguridad y control de acceso:**
  - Bloqueo temporal tras cinco intentos fallidos de inicio de sesión o de verificación de PIN.
  - Protección mediante PIN de 4 dígitos para secciones sensibles del Administrador (Revisión de anulaciones, Menú y Equipo).
  - Aislamiento de datos por negocio y registro de bitácora de auditoría.
- **Registro de ventas en tres pasos:** Selección de productos, elección del medio de pago (`Efectivo`, `Transferencia`, `Débito`, `Crédito`) y confirmación, con soporte de reintento idempotente (`id_cliente`) para evitar duplicados.
- **Anulación en dos etapas:** El vendedor solicita la anulación de una venta propia (*Por anular*, con motivo opcional) y únicamente el Administrador puede confirmarla (*Anulada*) o rechazarla (*Vigente*).
- **Gestión de menú y equipo:** Creación, edición y activación/desactivación de productos; alta y baja lógica de vendedores preservando el historial de transacciones.
- **Resumen e historial:** Indicadores por período (día, semana, mes o rango personalizado), totales desglosados por medio de pago, clasificación de productos más vendidos, filtros de búsqueda y exportación a **Excel (`.xlsx`)**.

### Exclusiones (fuera de alcance)
- Control de inventario y existencia de insumos.
- Cálculo de costos y márgenes de rentabilidad.
- Emisión de boletas electrónicas o integración con el Servicio de Impuestos Internos (SII).
- Integración directa con terminales POS o pasarelas de pago en línea.
- Recepción de pedidos mediante WhatsApp.

---

## Tecnologías implementadas

### Frontend
- **Angular** (componentes *standalone*, señales y guardias de ruta)
- **TypeScript**
- **Bootstrap 5** y **Bootstrap Icons**

### Backend
- **Python 3.12**
- **Django** y **Django REST Framework** (API REST con autenticación mediante token *Bearer*)
- **django-cors-headers** (habilitación de comunicación local entre `localhost:4200` y `localhost:8000`)
- **openpyxl** (generación de archivos `.xlsx` con sanitización contra inyección de fórmulas)
- **SQLite** (motor de base de datos local para la demostración; el modelo relacional de 7 tablas está diseñado para operar sobre PostgreSQL en entorno productivo)

### Entorno aislado
- Entorno virtual de Python (`venv/`) con **Node.js** y **npm** aislados mediante `nodeenv`.

---

## Instrucciones de ejecución de la demostración

### Requisitos previos
- **Python 3.12** o superior.
- **Node.js (v20 o superior) y npm** (en sistemas Linux es posible aislarlos dentro del entorno virtual mediante `nodeenv`).

### 1. Configuración inicial

Clonar el repositorio y acceder al directorio raíz del proyecto:
```bash
git clone <URL_DEL_REPOSITORIO>
cd VentaFacil
```

#### Sistemas Linux

**Intérprete `bash` / `zsh`:**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cd backend
python manage.py migrate
python manage.py cargar_demo

cd ../frontend
npm install
```

**Intérprete `fish`:**
```fish
python3 -m venv venv
source venv/bin/activate.fish
pip install -r requirements.txt

cd backend
python manage.py migrate
python manage.py cargar_demo

cd ../frontend
npm install
```

#### Sistemas Windows

**PowerShell:**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

cd backend
python manage.py migrate
python manage.py cargar_demo

cd ..\frontend
npm install
```
*Nota: En caso de que PowerShell restrinja la ejecución de scripts, se debe habilitar previamente mediante el comando `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.*

**Símbolo del sistema (CMD):**
```cmd
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt

cd backend
python manage.py migrate
python manage.py cargar_demo

cd ..\frontend
npm install
```

### 2. Ejecución en entorno local

Se requieren **dos terminales** ubicadas en el directorio raíz del proyecto:

#### Terminal 1 — Servidor Backend (`http://localhost:8000`)

- **Linux (`bash`/`zsh`):** `source venv/bin/activate && cd backend && python manage.py runserver`
- **Linux (`fish`):** `source venv/bin/activate.fish; and cd backend; and python manage.py runserver`
- **Windows (PowerShell):** `.\venv\Scripts\Activate.ps1; cd backend; python manage.py runserver`
- **Windows (CMD):** `venv\Scripts\activate.bat && cd backend && python manage.py runserver`

#### Terminal 2 — Servidor Frontend (`http://localhost:4200`)

- **Linux (`bash`/`zsh`):** `source venv/bin/activate && cd frontend && npm start`
- **Linux (`fish`):** `source venv/bin/activate.fish; and cd frontend; and npm start`
- **Windows (PowerShell/CMD):** `cd frontend && npm start`

Una vez iniciados ambos servicios, acceder a la aplicación mediante un navegador web en la dirección **`http://localhost:4200`**.

### Credenciales de demostración (*El Buen Sabor*)
- **Administradora:** `maria.perez` / `admin123` · **PIN:** `1234`
- **Vendedores:** `juan.soto` / `venta123` · `camila.rojas` / `venta123`

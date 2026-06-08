![Build](https://img.shields.io/badge/build-passing-brightgreen?logo=github)
![Version](https://img.shields.io/badge/version-1.0.1-blue?logo=react)
![Node](https://img.shields.io/badge/node-18%2B-339933?logo=nodedotjs)
![React](https://img.shields.io/badge/react-19-61DAFB?logo=react)
![PostgreSQL](https://img.shields.io/badge/postgresql-18%2B-4169E1?logo=postgresql)
![License](https://img.shields.io/badge/license-MIT-yellow?logo=opensourceinitiative)

# AppTurnos 🍔

> Sistema de gestión integral para restaurant con mesas y pedidos a domicilio.

AppTurnos nació para resolver el caos de los pedidos a domicilio de un restaurant de acera: registro de llamadas, asignación de repartidores, seguimiento de pedidos en tiempo real, control de mesas, caja con corte diario, catálogo de productos, inventario y reportes de ventas.

Diseñado para que cualquier persona con una computadora pueda operarlo — sin conocimientos técnicos.

---

## ✨ Funcionalidades

### 🔐 Autenticación y roles
- Login con **usuario + PIN de 4 dígitos** con teclado numérico táctil.
- Roles: **admin (cajero)** y **waiter (mesero)**.
- Tokens JWT con expiración de 12 horas.
- Logout con confirmación modal.
- Creación de meseros desde la interfaz (Personal → Meseros).

### 📊 Dashboard
- **Admin**: ventas del día, comparativa % vs ayer, ticket promedio, gastos del día.
- **Mesero**: mis mesas asignadas, cuentas abiertas, total en juego, listas para cobrar.
- 6 tarjetas de operación en tiempo real (sin asignar, preparación, en camino, mesas activas, por cobrar, stock bajo).
- Auto-refresca cada 30 segundos.

### 🛵 Pedidos a domicilio (módulo crítico)
- **Tablero Kanban** con 4 columnas: Pendientes → En preparación → En camino → Entregados.
- **Búsqueda predictiva de clientes** por nombre o teléfono con dropdown.
- **Multi-repartidor**: un repartidor puede llevar varios pedidos simultáneamente. Cada uno muestra sus órdenes activas.
- **Historial de entregas** por repartidor.
- Cierre con 2 modalidades:
  - **Cobrar al entregar** (efectivo contra entrega).
  - **Pre-cobrar transferencia** (paga antes, sigue en camino).
- Cancelación con motivo obligatorio.
- Notas de entrega especiales.
- **Propina**: 0%, 10%, 15% o 20% sobre el total.
- **Dividir cuenta**: elige entre cuántas personas dividir y ve el monto por persona.

### 🪑 Mesas
- Tablero visual con colores: verde (libre), rosa (pendiente), azul (preparando), ámbar (lista para cobrar).
- Cada mesa ocupada muestra: total, productos, tiempo transcurrido.
- Apertura de cuenta al agregar el primer producto.
- Botón directo "Ir a cobrar".
- **Historial de pedidos por mesa**.

### 💰 Caja / Cobro
- Pedidos pendientes agrupados por antigüedad.
- Filtros: todos / solo mesas / solo domicilios.
- Métodos de pago: efectivo, tarjeta, transferencia, mixto.
- Corte de caja diario (1 por día, bloquea si hay pendientes, inmutable).
- Vista de histórico de cortes.

### 👥 Clientes
- Búsqueda por nombre o teléfono con debounce.
- Historial de últimos 10 pedidos.
- Edición rápida de datos y dirección.

### 📋 Menú (catálogo)
- CRUD completo de categorías y productos.
- Marcar productos como no disponibles.
- Vista agrupada por categoría.

### 📦 Inventario / Stock
- Control de existencias por producto.
- Stock mínimo con alerta visual.
- **Auto-deducción**: al cerrar un pedido, el stock se descuenta automáticamente.
- Movimientos de entrada, salida y ajuste con historial.
- Tarjeta de "Stock bajo" en el Dashboard.

### 👨‍🍳 Personal
- Gestión de **repartidores** (nombre, teléfono, órdenes activas).
- Gestión de **mesas** (número, etiqueta, capacidad, activa).
- Gestión de **meseros** (creación con usuario y PIN).
- **Asignación de mesas** a meseros (una mesa solo a un mesero a la vez).

### 📈 Reportes
- **Resumen de ventas** con comparativa vs período anterior.
- **Top 10 productos** por cantidad o por ganancia.
- **Ventas por categoría**.
- **Horarios pico** (gráfico de 24 horas).
- **Clientes más frecuentes**.
- **Productos nunca vendidos**.
- **Reporte diario completo**: ventas, propinas, gastos, neto, top productos, categorías — en formato imprimible / PDF.

### 🎨 UI/UX
- **Modo claro / oscuro** con toggle en el Header (persiste en localStorage, detecta preferencia del SO).
- **Tokyo Night** en modo oscuro: fondo `#1A1B26`, superficie `#24283B`, acento verde lima vibrante `#9ECE6A`.
- Tema claro: paleta crema (`paper-*`) con acento oliva (`brand-*`).
- Diseño responsive optimizado para laptop y tablet.
- Componentes con Tailwind CSS y lucide-react.

---

## 🖥️ Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Frontend** | React | 19 |
| **Build tool** | Vite | 6 |
| **Estilos** | Tailwind CSS | 3 |
| **Router** | React Router | 7 |
| **Estado** | Zustand | 5 |
| **HTTP** | Axios | 1.17 |
| **Iconos** | lucide-react | 0.460 |
| **Backend** | Node.js + Express | 4.21 |
| **Base de datos** | PostgreSQL | 18+ |
| **Driver BD** | `pg` (node-postgres) | 8.13 |
| **Auth** | jsonwebtoken + bcryptjs | — |

---

## 📁 Estructura del proyecto

```
AppTurnos/
├── scripts/
│   ├── start-detached.ps1        # Arranque en 2ndo plano (Vite + API independientes)
│   └── stop-server.ps1           # Detiene ambos procesos por PID + puerto
│
├── server/                       # API Node + Express + PostgreSQL
│   ├── .env.example              # Plantilla de variables de entorno
│   ├── db.js                     # Conexión PG + auto-creación BD + migraciones + seed
│   ├── schema.sql                # Schema completo (8+ tablas + índices)
│   ├── index.js                  # Punto de entrada del servidor
│   ├── middleware/
│   │   └── auth.js               # JWT middleware + role guard
│   └── routes/
│       ├── auth.js               # /login /me /users
│       ├── categories.js
│       ├── products.js
│       ├── tables.js
│       ├── customers.js
│       ├── delivery.js           # Repartidores + historial de entregas
│       ├── inventory.js          # Stock, movimientos, ajustes
│       ├── orders.js             # Lógica principal de pedidos (18 endpoints)
│       ├── assignments.js        # Asignación mesas ↔ meseros
│       ├── dashboard.js          # KPIs en tiempo real
│       ├── cashClosings.js       # Corte de caja diario
│       ├── expenses.js           # Gastos operativos
│       └── reports.js            # 8 endpoints de reportes (incl. daily-complete)
│
├── src/                          # Frontend React
│   ├── App.jsx                   # Router principal
│   ├── main.jsx                  # Entry point
│   ├── index.css                 # Tailwind + componentes + Tokyo Night dark mode
│   ├── lib/
│   │   ├── api.js                # Axios con interceptors, retry, eventos network
│   │   ├── date.js               # Helpers de fecha (todayLocalISO, dateOnlyUTC)
│   │   └── format.js             # money, formatTime, statusLabels, etc.
│   ├── store/                    # Zustand stores
│   │   ├── auth.js
│   │   ├── theme.js              # Persistente en localStorage
│   │   ├── products.js
│   │   ├── orders.js
│   │   └── resources.js
│   ├── components/
│   │   ├── Layout.jsx            # Layout principal + ServerStatus
│   │   ├── Sidebar.jsx           # Menú lateral con dark mode
│   │   ├── Header.jsx            # Header de página + ThemeToggle
│   │   ├── ThemeToggle.jsx       # Botón ☀/🌙
│   │   ├── ServerStatus.jsx      # Banner rojo cuando el server cae
│   │   ├── LogoutConfirm.jsx     # Modal de confirmación de cierre
│   │   └── BarChart.jsx          # Gráfico de barras sin dependencias
│   └── pages/
│       ├── Login.jsx             # Login con teclado numérico
│       ├── Dashboard.jsx         # Admin + Waiter dashboard
│       ├── orders/
│       │   └── Delivery.jsx      # Kanban + crear pedido + historial
│       ├── tables/
│       │   └── TablesPage.jsx    # Tablero de mesas + historial
│       ├── cashier/
│       │   ├── Cashier.jsx       # Cobro con propina y dividir cuenta
│       │   ├── CashClosing.jsx   # Corte de caja diario
│       │   └── ClosingHistory.jsx
│       ├── customers/
│       │   └── Customers.jsx     # Búsqueda + historial (últimos 10)
│       └── admin/
│           ├── Menu.jsx          # CRUD productos
│           ├── Staff.jsx         # Repartidores, meseros, mesas, asignaciones
│           ├── Inventory.jsx     # Control de stock y movimientos
│           ├── DailyReport.jsx   # Reporte diario imprimible/PDF
│           ├── Expenses.jsx      # Gastos operativos
│           └── Reports.jsx       # Reportes avanzados
│
├── .gitignore
├── package.json
├── tailwind.config.js            # Tokio Night + brandDark palette
├── postcss.config.js
├── vite.config.js                # Vite + proxy /api + usePolling
├── LICENSE                       # MIT
└── README.md
```

---

## 🗄️ Modelo de base de datos

| Tabla | Descripción |
|-------|-------------|
| `users` | Usuarios (admin/mesero) con username + PIN hasheado + rol |
| `waiter_tables` | Asignación mesas ↔ meseros |
| `categories` | Categorías del menú |
| `products` | Productos con precio, categoría, stock, min_stock |
| `stock_movements` | Movimientos de inventario (entrada/salida/ajuste) |
| `tables` | Mesas físicas del restaurant |
| `customers` | Clientes de domicilio |
| `delivery_persons` | Repartidores |
| `orders` | Pedidos (type, status, payment_status, total, tip) |
| `order_items` | Items de cada pedido con snapshot de precio |
| `cash_closings` | Cortes de caja diarios |
| `expenses` | Gastos operativos |

### Estados de pedido
`pending → preparing → on_the_way → delivered` (domicilios)  
`pending → preparing → ready_to_pay → delivered` (mesas)

### Estados de pago
`pending → paid`

---

## 🚀 Instalación y ejecución

### Prerrequisitos
- **Node.js** 18+ y **npm**
- **PostgreSQL** 14+ corriendo localmente

### 1. Clonar e instalar
```bash
git clone https://github.com/FernandezIvan323/AppTurnos.git
cd AppTurnos
npm install
```

### 2. Configurar entorno
Crear `server/.env` a partir del ejemplo y editar con tus credenciales:
```bash
cp server/.env.example server/.env
```

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=TU_PASSWORD
DB_NAME=appturnos
PORT=3001
JWT_SECRET=cambia-esto-en-produccion
```

### 3. Ejecutar

| Modo | Comando | Descripción |
|------|---------|-------------|
| **Desarrollo** | `npm run dev` | Frontend + backend en una terminal |
| **Uso diario** | `npm run dev:detached` | En segundo plano, sobrevive al cierre |
| **Detener** | `npm run dev:stop` | Mata ambos procesos |
| **Solo frontend** | `npm run dev:web` | Vite en :5180 |
| **Solo backend** | `npm run dev:api` | API en :3001 |
| **Build prod** | `npm run build` | Compila a `dist/` |
| **Preview** | `npm run preview` | Sirve la build |

### 4. Primer arranque
- La BD se crea automáticamente si no existe.
- Migraciones idempotentes al arrancar.
- Seed: 5 categorías, 14 productos, 9 mesas, 3 repartidores, 3 usuarios.

### 5. Acceder
Abre `http://localhost:5180`

| Usuario | PIN | Rol |
|---------|-----|-----|
| `admin` | `1234` | Cajero / Administrador |
| `ivan` | `0000` | Mesero |
| `maria` | `0000` | Mesera |

---

## 📊 Workflow

```
LLAMADA ENTRANTE (teléfono)
        │
        ▼
┌─────────────────────┐
│  Registrar pedido   │  Delivery → Nuevo pedido
│  a domicilio        │  Buscar cliente o crear
└─────────┬───────────┘  Agregar productos
          │
          ▼
┌─────────────────────┐
│    Pendiente        │  Cocina ve el pedido
│  (no hay cocinero)  │  Mesero/Admin: "En preparación"
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  En preparación     │  Se cocina
│                     │  Admin: asignar repartidor
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│    En camino        │  Repartidor en la calle
│                     │  ┌─ Pre-cobrar (transfer)
│                     │  └─ Cobrar al entregar
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│    Entregado ✅     │  Ciclo cerrado
│  (stock deducido)   │
└─────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MESAS (en el restaurant)

┌─────────────────────┐
│   Mesa libre 🟢     │  Mesero toca → agrega producto
└─────────┬───────────┘  → Se abre cuenta automáticamente
          │
          ▼
┌─────────────────────┐
│  Pendiente / Prep.  │  Mesero: "Lista para cobrar"
│                     │  Cocina prepara
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Lista para cobrar  │  Cajero: "Ir a cobrar"
│        🟠           │  → Elige método de pago
└─────────┬───────────┘  → Propina (0/10/15/20%)
          │               → Dividir cuenta (opcional)
          ▼               → Confirmar
┌─────────────────────┐
│    Pagado ✅        │  Stock deducido automáticamente
└─────────────────────┘
```

---

## 🔌 API Endpoints

### Autenticación
| Método | Ruta | Rol |
|--------|------|-----|
| POST | `/api/auth/login` | — |
| GET | `/api/auth/me` | * |
| GET | `/api/auth/users` | admin |
| POST | `/api/auth/users` | admin |

### Catálogo
| Método | Ruta |
|--------|------|
| GET/POST/PUT/DELETE | `/api/categories` |
| GET/POST/PUT/DELETE | `/api/products` |

### Mesas
| Método | Ruta |
|--------|------|
| GET | `/api/tables` |
| POST/PUT/DELETE | `/api/tables` (admin) |

### Clientes
| Método | Ruta |
|--------|------|
| GET | `/api/customers?q=` |
| GET | `/api/customers/:id` |
| POST/PUT | `/api/customers` |

### Repartidores
| Método | Ruta |
|--------|------|
| GET/POST/PUT/DELETE | `/api/delivery` |
| GET | `/api/delivery/history?delivery_person_id=` |

### Pedidos (18 endpoints)
| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/api/orders` | Lista con filtros |
| GET | `/api/orders/:id` | Detalle + items |
| POST | `/api/orders` | Crear |
| POST | `/:id/items` | Agregar producto |
| DELETE | `/:id/items/:itemId` | Quitar producto |
| POST | `/:id/assign-delivery` | Asignar repartidor |
| POST | `/:id/status` | Cambiar estado |
| POST | `/:id/close` | Cobrar y cerrar |
| POST | `/:id/prepay` | Pre-cobrar transferencia |
| POST | `/:id/reopen` | Reabrir |
| GET | `/table-history/:table_id` | Historial de mesa |

### Dashboard
| Método | Ruta |
|--------|------|
| GET | `/api/dashboard/summary` |

### Inventario
| Método | Ruta |
|--------|------|
| GET | `/api/inventory` |
| PUT | `/api/inventory/:id` |
| POST | `/api/inventory/movement` |
| GET | `/api/inventory/movements` |

### Reportes (admin)
| Método | Ruta |
|--------|------|
| GET | `/api/reports/sales` |
| GET | `/api/reports/top-products` |
| GET | `/api/reports/by-category` |
| GET | `/api/reports/peak-hours` |
| GET | `/api/reports/top-customers` |
| GET | `/api/reports/never-sold` |
| GET | `/api/reports/daily-complete` |

### Otros
| Método | Ruta |
|--------|------|
| GET/POST/PUT/DELETE | `/api/assignments` |
| GET/POST | `/api/cash-closings` |
| GET/POST/PUT/DELETE | `/api/expenses` |
| GET | `/api/health` |

---

## 🧰 Scripts

```bash
npm run dev            # Frontend + backend (terminal visible)
npm run dev:detached   # En segundo plano (sobrevive cierre)
npm run dev:stop       # Detiene procesos en 2ndo plano
npm run dev:web        # Solo Vite
npm run dev:api        # Solo API
npm run build          # Compila a dist/
npm run preview        # Sirve build de producción
```

---

## 🔒 Seguridad

- `server/.env` contiene credenciales — **nunca subir a git** (`.gitignore` lo bloquea).
- En producción: cambiar `JWT_SECRET`, contraseñas del seed, y usar HTTPS (nginx/Caddy).
- El sistema usa `bcryptjs` para hashear PINs.

---

## 📋 Changelog

### v1.0.1 (2026-06-08)
- Tokyo Night dark mode (colores vibrantes #1A1B26 / #9ECE6A)
- Auto-deducción de inventario al cerrar pedidos
- Propina fija (0/10/15/20%)
- Dividir cuenta equitativamente
- Reporte diario completo imprimible/PDF
- Multi-repartidor (órdenes activas simultáneas)
- Historial de entregas por repartidor
- Historial de pedidos por mesa
- Creación de meseros desde Personal
- Control de stock con movimientos
- Login rediseñado (teclado numérico, backspace, sin auto-submit)
- Logout con confirmación modal
- Banner de servidor caído con reintento

### v1.0.0 (2026-05)
- Lanzamiento inicial
- Gestión de pedidos a domicilio (Kanban)
- Gestión de mesas con tablero visual
- Caja y cobro con métodos de pago
- Corte de caja diario
- CRUD de menú (categorías + productos)
- Gestión de repartidores y meseros
- Asignación de mesas
- Dashboard con KPIs en tiempo real
- Reportes (ventas, top productos, categorías, horarios pico)
- Gastos operativos
- Autenticación con roles (admin/mesero)
- Modo claro/oscuro
- Arranque detachado (sobrevive cierre de terminal)

---

## 📄 Licencia

MIT © 2026 Ivan Fernandez

---

**Hecho con ❤️ para que nunca más se pierda un pedido.**

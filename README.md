# Control de Gastos de Servicios

Aplicacion web (PWA) para registro, control, seguimiento y analisis de gastos en servicios (luz, agua, telefono, internet, seguros, creditos, tarjetas de credito, etc).

## Caracteristicas

- Registro de pagos con servicio, medio de pago, fechas, importe, moneda, categoria y notas
- Deteccion de pagos duplicados antes de registrar
- Historial con filtros, busqueda, sorting y paginacion
- Graficos de analisis separados por moneda (ARS/USD)
- Gestion de servicios y medios de pago (CRUD)
- Exportar/Importar JSON (merge o reemplazo) y CSV completo
- Service Worker para funcionamiento offline (PWA)
- Tema oscuro/claro
- Responsive (funciona en celular)
- Accesibilidad (focus trap en modals)
- Chart.js con lazy loading (carga solo al abrir tab Analisis)

## Autenticacion y Sync

### Sin sesion (local)
- Los datos se guardan en IndexedDB del navegador
- Funciona offline
- Datos solo en ese dispositivo/navegador

### Con sesion (nube)
- Login con email y contraseña (minimo 8 caracteres, mayuscula, minuscula, numero)
- Datos sincronizados en Firestore (Firebase)
- Acceso desde cualquier dispositivo
- Backup automatico en la nube

### Registrar cuenta
1. Click en "Iniciar Sesion"
2. Click en "Crear cuenta nueva"
3. Ingresar email y contraseña
4. Listo - datos sincronizados

### Olvide mi contrasena
1. Click en "Iniciar Sesion"
2. Click en "Olvide mi contrasena"
3. Revisar email y seguir enlace
4. Crear nueva contrasena

## Uso local

Abrir `docs/index.html` en cualquier navegador moderno. Los datos se guardan en IndexedDB del navegador.

## Uso online (GitHub Pages)

Acceder desde cualquier dispositivo via URL. Al iniciar sesion, los datos se sincronizan automaticamente entre dispositivos via Firebase Firestore.

## Estructura

```
docs/
├── index.html            # Entrada principal
├── manifest.json         # PWA manifest
├── sw.js                 # Service Worker
├── css/styles.css        # Estilos
├── js/
│   ├── firebase-config.js  # Config Firebase (credenciales)
│   ├── db.js               # Persistencia local (IndexedDB)
│   ├── db-firestore.js     # Persistencia nube (Firestore)
│   ├── auth.js             # Autenticacion (email/pass)
│   ├── services.js         # Logica de negocio
│   ├── charts.js           # Graficos Chart.js (lazy load)
│   ├── ui-core.js          # UIManager base (events, tabs, toast, modals, theme)
│   ├── ui-payments.js      # CRUD pagos, historial, swipe
│   ├── ui-entities.js      # CRUD servicios y medios
│   ├── ui-data.js          # Export/Import JSON, CSV, stats
│   ├── ui-charts.js        # Graficos y analisis
│   └── app.js              # Inicializacion + auth flow
└── lib/
    └── chart.js            # Chart.js v4.4.0 (copia local fallback)
```

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                   App (PWA - Vanilla JS)                    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  UI Layer     │  │  Services    │  │  Charts      │     │
│  │  ui-*.js      │  │  services.js │  │  charts.js   │     │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘     │
│         │                 │                                 │
│  ┌──────▼─────────────────▼───────┐                        │
│  │      Persistence Layer         │                        │
│  │  ┌─────────────┐ ┌───────────┐ │                        │
│  │  │  db.js      │ │db-firestore│ │  Misma interfaz      │
│  │  │ (IndexedDB) │ │ (Firestore)│ │                        │
│  │  └─────────────┘ └───────────┘ │                        │
│  └──────────────┬─────────────────┘                        │
│                 │                                           │
│  ┌──────────────▼─────────────────┐                        │
│  │      Auth Layer (auth.js)      │                        │
│  │     Email/Password login       │                        │
│  └──────────────┬─────────────────┘                        │
└─────────────────┼───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│         Firebase Services           │
│  ┌────────────┐  ┌──────────────┐  │
│  │ Firestore  │  │    Auth      │  │
│  │  (sync)    │  │  (login)     │  │
│  └────────────┘  └──────────────┘  │
└─────────────────────────────────────┘
```

## Tecnologias

- **Frontend:** HTML, CSS, JavaScript vanilla (sin frameworks)
- **Graficos:** Chart.js v4.4.0
- **Persistencia:** IndexedDB (local) + Firebase Firestore (nube)
- **Auth:** Firebase Authentication (Email/Password)
- **PWA:** Service Worker + Manifest
- **Hosting:** GitHub Pages

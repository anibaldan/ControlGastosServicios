# Control de Gastos de Servicios

Aplicacion web para registro, control, seguimiento y analisis de gastos en servicios (luz, agua, telefono, internet, seguros, creditos, tarjetas de credito, etc).

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

## Uso local

Abrir `docs/index.html` en cualquier navegador moderno. Los datos se guardan en IndexedDB del navegador.

## Uso online (GitHub Pages)

Una vez desplegado, acceder desde cualquier dispositivo via URL. Los datos siguen siendo locales por dispositivo/navegador (requiere exportar/importar para sincronizar).

## Estructura

```
docs/
├── index.html          # Entrada principal
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker
├── css/styles.css      # Estilos
├── js/
│   ├── db.js           # Capa de persistencia (IndexedDB)
│   ├── services.js     # Logica de negocio
│   ├── charts.js       # Graficos Chart.js (lazy load)
│   ├── ui-core.js      # UIManager base (events, tabs, toast, modals, theme)
│   ├── ui-payments.js  # CRUD pagos, historial, swipe
│   ├── ui-entities.js  # CRUD servicios y medios
│   ├── ui-data.js      # Export/Import JSON, CSV, stats
│   ├── ui-charts.js    # Graficos y analisis
│   └── app.js          # Inicializacion
└── lib/
    └── chart.js        # Chart.js v4.4.0 (copia local fallback)
```

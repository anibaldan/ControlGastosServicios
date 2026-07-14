# Control de Gastos de Servicios

Aplicacion web para registro, control, seguimiento y analisis de gastos en servicios (luz, agua, telefono, internet, seguros, creditos, tarjetas de credito, etc).

## Caracteristicas

- Registro de pagos con servicio, medio de pago, fechas, importe, moneda, categoria y notas
- Historial con filtros, busqueda, sorting y paginacion
- Graficos de analisis separados por moneda (ARS/USD)
- Gestion de servicios y medios de pago (CRUD)
- Exportar/Importar JSON (merge o reemplazo) y CSV
- Tema oscuro/claro
- Responsive (funciona en celular)
- Chart.js local como fallback offline

## Uso local

Abrir `docs/index.html` en cualquier navegador moderno. Los datos se guardan en IndexedDB del navegador.

## Uso online (GitHub Pages)

Una vez desplegado, acceder desde cualquier dispositivo via URL. Los datos siguen siendo locales por dispositivo/navegador (requiere exportar/importar para sincronizar).

## Estructura

```
docs/
├── index.html          # Entrada principal
├── css/styles.css      # Estilos
├── js/
│   ├── db.js           # Capa de persistencia (IndexedDB)
│   ├── services.js     # Logica de negocio
│   ├── charts.js       # Graficos Chart.js
│   ├── ui.js           # Interfaz de usuario
│   └── app.js          # Inicializacion
└── lib/
    ├── chart.js        # Chart.js v4.4.0 (copia local)
    └── chart-loader.js # Loader con fallback CDN→local
```

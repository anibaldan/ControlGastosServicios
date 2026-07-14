# 📊 Control de Gastos de Servicios - Aplicación Web

Una aplicación web moderna y profesional para reemplazar completamente tu Excel de control de gastos de servicios. Desarrollada con HTML5, JavaScript vanilla y CSS3, con almacenamiento local en IndexDB.

## ✨ Características Principales

### Registro de Pagos
- ✅ Formulario intuitivo para registrar pagos
- ✅ Selección de servicio (con opciones predefinidas editables)
- ✅ Selección de medio de pago (con opciones predefinidas editables)
- ✅ Calendario para fecha de pago
- ✅ Calendario para fecha de vencimiento
- ✅ Importe a pagar
- ✅ Selección de moneda (Pesos ARS / Dólares USD)
- ✅ Notas opcionales

### Historial y Control
- ✅ Tabla de historial con todos los pagos
- ✅ Filtros por servicio, año y mes
- ✅ Edición de registros existentes
- ✅ Eliminación de registros
- ✅ Resumen de totales por moneda
- ✅ Resumen de hoy en la página principal

### Análisis y Gráficos
- ✅ Gráfico de gastos por servicio (Doughnut)
- ✅ Gráfico de gastos por medio de pago (Bar)
- ✅ Evolución mensual de gastos (Line)
- ✅ Distribución por moneda (Pie)
- ✅ Filtros por año y mes
- ✅ Estadísticas de totales y promedios

### Gestión de Datos
- ✅ Servicios personalizables (agregar/editar/eliminar)
- ✅ Medios de pago personalizables (agregar/editar/eliminar)
- ✅ Exportar datos a JSON (copia de seguridad)
- ✅ Importar datos desde JSON
- ✅ Exportar a CSV para uso en otros programas
- ✅ Limpiar todo (con confirmación)
- ✅ Estadísticas de base de datos

### Extras
- ✅ Tema oscuro/claro (guardado en preferencias)
- ✅ Interfaz responsive (funciona en móviles)
- ✅ Almacenamiento local con IndexDB
- ✅ Sincronización entre pestañas
- ✅ Validaciones robustas
- ✅ Interfaz moderna y profesional

## 🚀 Cómo Usar

### Instalación
1. Descarga la carpeta `webapp`
2. Abre el archivo `index.html` en tu navegador (Chrome, Firefox, Edge recomendados)
3. ¡Listo! La aplicación no requiere servidor

### Uso Inicial
1. **Primeros Pasos:**
   - La aplicación viene con servicios y medios de pago predefinidos
   - Puedes agregar, editar o eliminar servicios en la pestaña "⚙️ Servicios"
   - Puedes agregar, editar o eliminar medios de pago en la pestaña "💳 Medios de Pago"

2. **Registrar un Pago:**
   - Ve a la pestaña "📝 Nuevo Registro"
   - Selecciona el servicio
   - Selecciona el medio de pago
   - Ingresa las fechas (pago y vencimiento)
   - Ingresa el importe
   - Selecciona la moneda
   - (Opcional) Agrega notas
   - Haz clic en "💾 Registrar Pago"

3. **Ver Historial:**
   - Ve a la pestaña "📋 Historial"
   - Usa los filtros para encontrar registros específicos
   - Haz clic en "✏️ Editar" para modificar un pago
   - Haz clic en "🗑️ Eliminar" para eliminar un pago

4. **Analizar Datos:**
   - Ve a la pestaña "📈 Análisis"
   - Usa los filtros para ver datos de períodos específicos
   - Analiza los gráficos para entender tus gastos

5. **Hacer Copias de Seguridad:**
   - Ve a la pestaña "💾 Datos"
   - Haz clic en "📥 Descargar como JSON" para hacer backup
   - Guarda el archivo en un lugar seguro

6. **Restaurar Datos:**
   - Ve a la pestaña "💾 Datos"
   - Haz clic en "📤 Cargar JSON"
   - Selecciona un archivo JSON guardado
   - Los datos se importarán automáticamente

## 📝 Servicios Predefinidos

- Secheep (Electricidad)
- SAMEEP (Agua)
- Flow (Internet y TV)
- Celular Claro
- Celular Personal
- Seguro Auto
- Seguro Vida
- Tarjeta de Crédito
- Alquiler
- Expensas

Puedes agregar más servicios en la pestaña "⚙️ Servicios"

## 💳 Medios de Pago Predefinidos

- Tarjeta de Crédito
- Tarjeta de Débito
- Billetera A
- Billetera B
- Efectivo
- Transferencia

Puedes agregar más medios en la pestaña "💳 Medios de Pago"

## 📱 Compatibilidad

- ✅ Chrome/Chromium (Recomendado)
- ✅ Firefox
- ✅ Edge
- ✅ Safari
- ✅ Navegadores móviles modernos (Android/iOS)

## 🔒 Seguridad y Privacidad

- ✅ Todos los datos se almacenan localmente en tu navegador
- ✅ NO se envían datos a servidores externos
- ✅ Tus datos son completamente privados y seguros
- ✅ Puedes exportar/importar cuando desees

## 📊 Estructura de Datos

### Formato de Importación JSON

Si deseas importar datos manualmente, utiliza esta estructura:

```json
{
  "data": {
    "servicios": [
      {
        "nombre": "Secheep",
        "descripcion": "Servicio de electricidad"
      }
    ],
    "medios": [
      {
        "nombre": "Tarjeta de Crédito",
        "tipo": "credito"
      }
    ],
    "payments": [
      {
        "servicio": "Secheep",
        "medio": "Tarjeta de Crédito",
        "fechaPago": "2024-01-15",
        "fechaVencimiento": "2024-01-31",
        "importe": 150.50,
        "moneda": "ARS",
        "notas": "Pago realizado"
      }
    ]
  }
}
```

## 🔧 Características Técnicas

### Arquitectura
- **MVC Pattern**: Separación clara de responsabilidades
- **IndexDB**: Base de datos local para persistencia
- **Módulos**: Código modular y mantenible

### Módulos Principales
- `db.js`: Gestión de IndexDB
- `services.js`: Lógica de negocio
- `charts.js`: Gráficos con Chart.js
- `ui.js`: Interfaz de usuario
- `app.js`: Inicialización

## 🚨 Troubleshooting

### La aplicación no carga
- Verifica que estés usando un navegador moderno
- Limpia el caché del navegador
- Intenta abrirla en modo incógnito

### Los datos no se guardan
- Verifica que IndexDB esté habilitado en tu navegador
- Intenta abrir la app en modo incógnito
- Prueba con otro navegador

### Los gráficos no aparecen
- Verifica conexión a internet (necesaria para Chart.js)
- Recarga la página
- Prueba con otro navegador

## 💡 Tips y Trucos

1. **Exporta regularmente**: Haz copias de seguridad frecuentes en JSON
2. **Usa el móvil también**: Exporta desde PC e importa en el móvil
3. **Sincroniza**: Exporta del móvil e importa en la PC
4. **Analiza tendencias**: Usa los gráficos para entender tus gastos
5. **Personaliza**: Agrega tus propios servicios y medios de pago

## 📋 Historial de Cambios

### v1.0 (Inicial)
- ✅ Registro de pagos
- ✅ Historial con filtros
- ✅ Gráficos de análisis
- ✅ Gestión de servicios y medios
- ✅ Backup/Importación JSON
- ✅ Tema oscuro/claro
- ✅ Responsive design

## 📞 Soporte

Si encuentras problemas o tienes sugerencias:
1. Consulta la sección Troubleshooting
2. Verifica la consola del navegador (F12) para ver errores
3. Intenta limpiar el almacenamiento y comenzar de cero

## 📄 Licencia

Esta aplicación es de uso personal y gratuito.

---

**¡Disfruta controlando tus gastos de servicios de forma fácil y eficiente!** 📊✨

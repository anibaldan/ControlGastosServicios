/**
 * Loader para Chart.js
 * Intenta cargar desde CDN, si falla usa copia local en lib/chart.js
 */

if (typeof Chart === 'undefined') {
    const cdnScript = document.createElement('script');
    cdnScript.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    cdnScript.onload = function() {
        console.log('Chart.js cargado desde CDN');
    };
    cdnScript.onerror = function() {
        console.warn('CDN no disponible, cargando copia local...');
        const localScript = document.createElement('script');
        localScript.src = 'lib/chart.js';
        localScript.onload = function() {
            console.log('Chart.js cargado desde copia local');
        };
        localScript.onerror = function() {
            console.error('Error al cargar Chart.js desde CDN y copia local');
        };
        document.head.appendChild(localScript);
    };
    document.head.appendChild(cdnScript);
}

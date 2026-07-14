/**
 * app.js - Inicializacion de la aplicacion
 */

let uiManager = null;

async function initializeApp() {
    try {
        await db.init();
        await paymentService.initializeDefaults();
        uiManager = new UIManager(paymentService, chartManager, db);
        await uiManager.reloadSelectOptions();
        await uiManager.updateResumenHoy();
    } catch (error) {
        console.error('Error iniciando aplicacion:', error);
        document.body.innerHTML = `<div style="padding:20px;color:red;"><h1>Error al inicializar la aplicacion</h1><p>${error.message}</p></div>`;
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);

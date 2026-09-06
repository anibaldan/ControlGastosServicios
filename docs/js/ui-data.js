/**
 * ui-data.js - Export/Import JSON, CSV, estadísticas, clear all
 */

UIManager.prototype.handleExportJson = async function() {
    try {
        this.showLoading();
        const data = await this.db.exportAllData();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `control-gastos-${new Date().getTime()}.json`;
        link.click();
        URL.revokeObjectURL(url);
        this.showToast('Datos exportados correctamente', 'success');
    } catch (error) {
        this.showToast('Error: ' + error.message, 'error');
    } finally {
        this.hideLoading();
    }
};

/* ===================== IMPORT JSON ===================== */

UIManager.prototype.handleImportJsonClick = function() {
    document.getElementById('importJsonInput').click();
};

UIManager.prototype.handleImportJson = async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        this.showLoading();
        const text = await file.text();
        const data = JSON.parse(text);

        const validation = this.db.validateImportSchema(data);
        if (!validation.valid) {
            this.showToast('Archivo invalido: ' + validation.errors.slice(0, 3).join('; '), 'error');
            return;
        }

        const stats = data.data;
        const serviciosCount = stats.servicios?.length || 0;
        const mediosCount = stats.medios?.length || 0;
        const pagosCount = stats.payments?.length || 0;

        this.pendingImportData = data;
        document.getElementById('importModeInfo').textContent =
            `El archivo contiene: ${serviciosCount} servicios, ${mediosCount} medios, ${pagosCount} pagos.\n\nComo desea importar?`;
        document.getElementById('importModeModal').style.display = 'block';
    } catch (error) {
        this.showToast('Error al leer el archivo: ' + error.message, 'error');
    } finally {
        this.hideLoading();
        document.getElementById('importJsonInput').value = '';
    }
};

UIManager.prototype.executeImport = async function(mode) {
    this.closeAllModals();
    if (!this.pendingImportData) return;

    try {
        this.showLoading();
        let result;
        if (mode === 'merge') {
            result = await this.db.importDataMerge(this.pendingImportData);
        } else {
            result = await this.db.importDataReplace(this.pendingImportData);
        }

        const msg = result.stats.skippedServicios !== undefined
            ? `Importado: ${result.stats.pagos} pagos, ${result.stats.servicios} servicios nuevos (${result.stats.skippedServicios} duplicados omitidos), ${result.stats.medios} medios nuevos (${result.stats.skippedMedios} duplicados omitidos)`
            : `Importado: ${result.stats.pagos} pagos, ${result.stats.servicios} servicios, ${result.stats.medios} medios`;

        this.showToast(msg, 'success');
        this.reloadSelectOptions();
    } catch (error) {
        this.showToast('Error en la importacion: ' + error.message, 'error');
    } finally {
        this.pendingImportData = null;
        this.hideLoading();
    }
};

/* ===================== EXPORT CSV ===================== */

UIManager.prototype.handleExportCsv = async function() {
    try {
        this.showLoading();
        const payments = await this.db.getAllPayments();
        const servicios = await this.db.getAllServicios();
        const medios = await this.db.getAllMedios();

        if (payments.length === 0 && servicios.length === 0 && medios.length === 0) {
            this.showToast('No hay datos para exportar', 'error');
            return;
        }

        const csvEscape = (cell) => {
            const str = String(cell);
            if (str.includes('"') || str.includes(',') || str.includes('\n')) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            return '"' + str + '"';
        };

        let csv = '\uFEFF';

        if (payments.length > 0) {
            const paymentHeaders = ['Servicio', 'Fecha Pago', 'Fecha Vencimiento', 'Importe', 'Moneda', 'Medio de Pago', 'Categoria', 'Notas'];
            csv += paymentHeaders.join(',') + '\n';
            payments.forEach(p => {
                csv += [
                    p.servicio, p.fechaPago, p.fechaVencimiento,
                    p.importe, p.moneda, p.medio, p.categoria || '', p.notas || ''
                ].map(csvEscape).join(',') + '\n';
            });
        }

        if (servicios.length > 0) {
            csv += '\nServicios\n';
            csv += 'Nombre,Descripcion\n';
            servicios.forEach(s => {
                csv += [s.nombre, s.descripcion || ''].map(csvEscape).join(',') + '\n';
            });
        }

        if (medios.length > 0) {
            csv += '\nMedios de Pago\n';
            csv += 'Nombre,Tipo\n';
            medios.forEach(m => {
                csv += [m.nombre, m.tipo || ''].map(csvEscape).join(',') + '\n';
            });
        }

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `control-gastos-${new Date().getTime()}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        this.showToast('Datos exportados a CSV correctamente', 'success');
    } catch (error) {
        this.showToast('Error: ' + error.message, 'error');
    } finally {
        this.hideLoading();
    }
};

/* ===================== STATS ===================== */

UIManager.prototype.showStats = async function() {
    try {
        const stats = await this.db.getStats();
        const statsInfo = document.getElementById('statsInfo');

        statsInfo.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Total de Pagos:</span>
                    <span class="stat-value">${stats.totalPagos}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total de Servicios:</span>
                    <span class="stat-value">${stats.totalServicios}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total de Medios:</span>
                    <span class="stat-value">${stats.totalMedios}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total ARS:</span>
                    <span class="stat-value">$${stats.totalARS}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total USD:</span>
                    <span class="stat-value">U$S ${stats.totalUSD}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Ultimo Registro:</span>
                    <span class="stat-value">${stats.ultimaPago ? this.formatDate(stats.ultimaPago) : 'N/A'}</span>
                </div>
            </div>
        `;
    } catch (error) {
        this.showToast('Error: ' + error.message, 'error');
    }
};

UIManager.prototype.refreshStats = function() {
    this.showStats();
};

/* ===================== CLEAR ALL ===================== */

UIManager.prototype.handleClearAll = function() {
    this.showConfirm('ADVERTENCIA: Esto eliminara TODOS los datos. Esta accion no se puede deshacer. Desea continuar?', async () => {
        try {
            this.showLoading();
            await this.db.clearAllData();
            this.showToast('Todos los datos han sido eliminados', 'success');
            document.getElementById('paymentForm').reset();
            await this.reloadSelectOptions();
            await this.updateResumenHoy();
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    });
};

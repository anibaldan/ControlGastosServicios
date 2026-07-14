/**
 * UIManager - Gestion de interfaz de usuario
 * Toasts, paginacion, busqueda, sorting, swipe, categorias, overdue
 */

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

class UIManager {
    constructor(paymentService, chartManager, db) {
        this.service = paymentService;
        this.chartManager = chartManager;
        this.db = db;
        this.currentEditId = null;
        this.isDarkMode = localStorage.getItem('darkMode') === 'true';

        this.allPayments = [];
        this.filteredPayments = [];
        this.currentPage = 1;
        this.pageSize = 50;
        this.sortField = 'fechaPago';
        this.sortDirection = 'desc';
        this.searchDebounceTimer = null;

        this.confirmCallback = null;
        this.pendingImportData = null;

        this.setupEventListeners();
        this.applyTheme();
    }

    /* ===================== EVENT LISTENERS ===================== */

    setupEventListeners() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        const form = document.getElementById('paymentForm');
        if (form) form.addEventListener('submit', (e) => this.handleAddPayment(e));

        document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());

        document.getElementById('filterServicio')?.addEventListener('change', () => this.refreshHistorial());
        document.getElementById('filterAño')?.addEventListener('change', () => this.refreshHistorial());
        document.getElementById('filterMes')?.addEventListener('change', () => this.refreshHistorial());
        document.getElementById('clearFiltersBtn')?.addEventListener('click', () => this.clearFilters());

        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            clearTimeout(this.searchDebounceTimer);
            this.searchDebounceTimer = setTimeout(() => this.refreshHistorial(), 300);
        });

        document.querySelectorAll('.sortable').forEach(th => {
            th.addEventListener('click', () => this.handleSort(th.dataset.sort));
        });

        document.getElementById('prevPageBtn')?.addEventListener('click', () => {
            if (this.currentPage > 1) { this.currentPage--; this.renderHistorialPage(); }
        });
        document.getElementById('nextPageBtn')?.addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredPayments.length / this.pageSize);
            if (this.currentPage < totalPages) { this.currentPage++; this.renderHistorialPage(); }
        });

        document.getElementById('updateChartsBtn')?.addEventListener('click', () => this.updateCharts());
        document.getElementById('chartFilterAño')?.addEventListener('change', () => this.updateCharts());
        document.getElementById('chartFilterMes')?.addEventListener('change', () => this.updateCharts());

        document.getElementById('agregarServicioBtn')?.addEventListener('click', () => this.handleAddServicio());
        document.getElementById('agregarMedioBtn')?.addEventListener('click', () => this.handleAddMedio());

        document.getElementById('exportJsonBtn')?.addEventListener('click', () => this.handleExportJson());
        document.getElementById('importJsonBtn')?.addEventListener('click', () => this.handleImportJsonClick());
        document.getElementById('importJsonInput')?.addEventListener('change', (e) => this.handleImportJson(e));
        document.getElementById('exportCsvBtn')?.addEventListener('click', () => this.handleExportCsv());
        document.getElementById('estadisticasBtn')?.addEventListener('click', () => this.showStats());
        document.getElementById('limpiarTodoBtn')?.addEventListener('click', () => this.handleClearAll());
        document.getElementById('importExcelBtn')?.addEventListener('click', () => this.showExcelImportGuide());

        document.getElementById('editForm')?.addEventListener('submit', (e) => this.handleUpdatePayment(e));
        document.getElementById('editServicioForm')?.addEventListener('submit', (e) => this.handleUpdateServicio(e));
        document.getElementById('editMedioForm')?.addEventListener('submit', (e) => this.handleUpdateMedio(e));

        document.querySelectorAll('.close-modal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.dataset.close;
                const modal = document.getElementById(modalId);
                if (modal) modal.style.display = 'none';
            });
        });

        document.querySelectorAll('.modal-cancel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                if (modal) modal.style.display = 'none';
            });
        });

        document.getElementById('confirmYesBtn')?.addEventListener('click', () => this.confirmAction());
        document.getElementById('confirmNoBtn')?.addEventListener('click', () => this.closeAllModals());

        document.getElementById('importMergeBtn')?.addEventListener('click', () => this.executeImport('merge'));
        document.getElementById('importReplaceBtn')?.addEventListener('click', () => this.executeImport('replace'));
        document.getElementById('importCancelBtn')?.addEventListener('click', () => this.closeAllModals());

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeAllModals();
        });
    }

    /* ===================== TABS ===================== */

    switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

        const tab = document.getElementById(tabName);
        if (tab) {
            tab.classList.add('active');
            document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
        }

        if (tabName === 'historial') this.initHistorial();
        else if (tabName === 'graficos') this.initCharts();
        else if (tabName === 'servicios') this.refreshServicios();
        else if (tabName === 'medios') this.refreshMedios();
        else if (tabName === 'datos') this.refreshStats();
    }

    /* ===================== TOAST ===================== */

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        toast.addEventListener('click', () => this._removeToast(toast));

        setTimeout(() => this._removeToast(toast), 4000);
    }

    _removeToast(toast) {
        if (toast.classList.contains('removing')) return;
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }

    /* ===================== LOADING ===================== */

    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    /* ===================== CONFIRM (async-safe) ===================== */

    showConfirm(message, callback) {
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmModal').style.display = 'block';
        this.confirmCallback = callback;
    }

    async confirmAction() {
        this.closeAllModals();
        if (this.confirmCallback) {
            const cb = this.confirmCallback;
            this.confirmCallback = null;
            try {
                await cb();
            } catch (err) {
                this.showToast('Error: ' + err.message, 'error');
            }
        }
    }

    /* ===================== MODALS ===================== */

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        this.confirmCallback = null;
    }

    /* ===================== PAGO ===================== */

    async handleAddPayment(e) {
        e.preventDefault();
        try {
            const paymentData = {
                servicio: document.getElementById('servicioSelect').value,
                medio: document.getElementById('medioSelect').value,
                fechaPago: document.getElementById('fechaPago').value,
                fechaVencimiento: document.getElementById('fechaVencimiento').value,
                importe: parseFloat(document.getElementById('importe').value),
                moneda: document.getElementById('moneda').value,
                notas: document.getElementById('notas').value,
                categoria: document.getElementById('categoria').value
            };

            await this.service.registrarPago(paymentData);
            this.showToast('Pago registrado correctamente', 'success');
            e.target.reset();
            this.updateResumenHoy();
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        }
    }

    async updateResumenHoy() {
        const resumen = await this.service.getResumenHoy();
        document.getElementById('todayPaymentsCount').textContent = resumen.count;
        document.getElementById('todayTotalARS').textContent = `$${resumen.totalARS}`;
        document.getElementById('todayTotalUSD').textContent = `U$S ${resumen.totalUSD}`;
    }

    /* ===================== HISTORIAL ===================== */

    async initHistorial() {
        this.showLoading();
        try {
            const servicios = await this.db.getAllServicios();
            const years = await this.service.getAvailableYears();

            const servicioFilter = document.getElementById('filterServicio');
            servicioFilter.innerHTML = '<option value="">Todos los servicios</option>';
            servicios.forEach(s => {
                const option = document.createElement('option');
                option.value = s.nombre;
                option.textContent = escapeHtml(s.nombre);
                servicioFilter.appendChild(option);
            });

            const yearFilter = document.getElementById('filterAño');
            yearFilter.innerHTML = '<option value="">Todos los años</option>';
            years.forEach(y => {
                const option = document.createElement('option');
                option.value = y;
                option.textContent = y;
                yearFilter.appendChild(option);
            });

            await this.refreshHistorial();
        } finally {
            this.hideLoading();
        }
    }

    async refreshHistorial() {
        const filters = {
            servicio: document.getElementById('filterServicio').value,
            year: document.getElementById('filterAño').value,
            month: document.getElementById('filterMes').value,
            search: document.getElementById('searchInput')?.value || ''
        };

        this.filteredPayments = await this.service.getPaymentFiltered(filters);
        this.currentPage = 1;

        this._applySort();
        this._updateHistorialStats();
        this.renderHistorialPage();
    }

    _applySort() {
        this.filteredPayments.sort((a, b) => {
            let va, vb;
            if (this.sortField === 'importe') {
                va = parseFloat(a.importe) || 0;
                vb = parseFloat(b.importe) || 0;
            } else if (this.sortField === 'fechaPago' || this.sortField === 'fechaVencimiento') {
                va = a[this.sortField] || '';
                vb = b[this.sortField] || '';
            } else {
                va = (a[this.sortField] || '').toLowerCase();
                vb = (b[this.sortField] || '').toLowerCase();
            }

            if (va < vb) return this.sortDirection === 'asc' ? -1 : 1;
            if (va > vb) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    handleSort(field) {
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = (field === 'importe') ? 'desc' : 'asc';
        }

        document.querySelectorAll('.sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });
        const th = document.querySelector(`[data-sort="${field}"]`);
        if (th) th.classList.add(this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');

        this._applySort();
        this.renderHistorialPage();
    }

    _updateHistorialStats() {
        const totales = this.service.calcularTotales(this.filteredPayments);
        document.getElementById('registrosCount').textContent = totales.totalRegistros;
        document.getElementById('totalARS').textContent = `$${totales.totalARS}`;
        document.getElementById('totalUSD').textContent = `U$S ${totales.totalUSD}`;
    }

    renderHistorialPage() {
        const tbody = document.getElementById('historialBody');
        const emptyMsg = document.getElementById('emptyMessage');
        const paginationControls = document.getElementById('paginationControls');

        if (this.filteredPayments.length === 0) {
            tbody.innerHTML = '';
            emptyMsg.style.display = 'block';
            paginationControls.style.display = 'none';
            return;
        }

        emptyMsg.style.display = 'none';
        const totalPages = Math.ceil(this.filteredPayments.length / this.pageSize);
        if (this.currentPage > totalPages) this.currentPage = totalPages;
        const start = (this.currentPage - 1) * this.pageSize;
        const pageItems = this.filteredPayments.slice(start, start + this.pageSize);

        const today = new Date();
        const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

        tbody.innerHTML = pageItems.map(p => {
            const isOverdue = p.fechaVencimiento && p.fechaVencimiento < todayStr;
            const rowClass = isOverdue ? 'overdue' : '';
            const catBadge = p.categoria
                ? `<span class="badge badge-warning">${escapeHtml(p.categoria)}</span>`
                : '<span style="color:var(--text-secondary)">-</span>';

            return `<tr class="${rowClass}" data-id="${p.id}">
                <td>${escapeHtml(p.servicio)}</td>
                <td>${this.formatDate(p.fechaPago)}</td>
                <td>${this.formatDate(p.fechaVencimiento)}</td>
                <td>${parseFloat(p.importe).toFixed(2)}</td>
                <td><span class="badge badge-${p.moneda === 'ARS' ? 'primary' : 'success'}">${escapeHtml(p.moneda)}</span></td>
                <td>${escapeHtml(p.medio)}</td>
                <td>${catBadge}</td>
                <td>${escapeHtml(p.notas) || '-'}</td>
                <td class="actions">
                    <button class="btn-small btn-edit" data-id="${p.id}">Editar</button>
                    <button class="btn-small btn-delete" data-id="${p.id}">Eliminar</button>
                </td>
            </tr>`;
        }).join('');

        tbody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => this.openEditModal(parseInt(btn.dataset.id)));
        });

        tbody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => this.confirmDelete(parseInt(btn.dataset.id)));
        });

        this._setupRowSwipe(tbody);

        if (totalPages > 1) {
            paginationControls.style.display = 'flex';
            document.getElementById('pageInfo').textContent = `Pagina ${this.currentPage} de ${totalPages} (${this.filteredPayments.length} registros)`;
            document.getElementById('prevPageBtn').disabled = this.currentPage <= 1;
            document.getElementById('nextPageBtn').disabled = this.currentPage >= totalPages;
        } else {
            paginationControls.style.display = 'none';
        }
    }

    /* ===================== SWIPE ===================== */

    _setupRowSwipe(tbody) {
        let startX = 0;
        let currentRow = null;

        tbody.addEventListener('touchstart', (e) => {
            const tr = e.target.closest('tr');
            if (!tr) return;
            startX = e.touches[0].clientX;
            currentRow = tr;
            tbody.querySelectorAll('tr.swiped').forEach(r => {
                if (r !== tr) r.classList.remove('swiped');
            });
        }, { passive: true });

        tbody.addEventListener('touchend', (e) => {
            if (!currentRow) return;
            const endX = e.changedTouches[0].clientX;
            const diff = startX - endX;

            if (diff > 60) {
                currentRow.classList.add('swiped');
            } else if (diff < -30) {
                currentRow.classList.remove('swiped');
            }
            currentRow = null;
        }, { passive: true });
    }

    /* ===================== EDITAR PAGO ===================== */

    async openEditModal(id) {
        this.currentEditId = id;
        const payment = await this.db.getPaymentById(id);
        if (!payment) {
            this.showToast('Pago no encontrado', 'error');
            return;
        }

        await this.reloadSelectOptions();

        document.getElementById('editServicio').value = payment.servicio;
        document.getElementById('editMedio').value = payment.medio;
        document.getElementById('editFechaPago').value = payment.fechaPago;
        document.getElementById('editFechaVencimiento').value = payment.fechaVencimiento;
        document.getElementById('editImporte').value = payment.importe;
        document.getElementById('editMoneda').value = payment.moneda;
        document.getElementById('editCategoria').value = payment.categoria || '';
        document.getElementById('editNotas').value = payment.notas || '';

        document.getElementById('editModal').style.display = 'block';
    }

    async handleUpdatePayment(e) {
        e.preventDefault();
        try {
            const updatedData = {
                servicio: document.getElementById('editServicio').value,
                medio: document.getElementById('editMedio').value,
                fechaPago: document.getElementById('editFechaPago').value,
                fechaVencimiento: document.getElementById('editFechaVencimiento').value,
                importe: parseFloat(document.getElementById('editImporte').value),
                moneda: document.getElementById('editMoneda').value,
                categoria: document.getElementById('editCategoria').value,
                notas: document.getElementById('editNotas').value
            };

            await this.db.updatePayment(this.currentEditId, updatedData);
            this.showToast('Pago actualizado correctamente', 'success');
            this.closeAllModals();
            this.refreshHistorial();
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        }
    }

    confirmDelete(id) {
        this.showConfirm('Esta seguro de que desea eliminar este pago?', async () => {
            try {
                await this.db.deletePayment(id);
                this.showToast('Pago eliminado correctamente', 'success');
                this.refreshHistorial();
            } catch (error) {
                this.showToast('Error: ' + error.message, 'error');
            }
        });
    }

    clearFilters() {
        document.getElementById('filterServicio').value = '';
        document.getElementById('filterAño').value = '';
        document.getElementById('filterMes').value = '';
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        this.refreshHistorial();
    }

    /* ===================== GRAFICOS ===================== */

    async initCharts() {
        const years = await this.service.getAvailableYears();
        const yearFilter = document.getElementById('chartFilterAño');
        yearFilter.innerHTML = '<option value="">Todos los años</option>';
        years.forEach(y => {
            const option = document.createElement('option');
            option.value = y;
            option.textContent = y;
            yearFilter.appendChild(option);
        });
        this.updateCharts();
    }

    async updateCharts() {
        const filters = {
            year: document.getElementById('chartFilterAño').value,
            month: document.getElementById('chartFilterMes').value
        };

        const chartData = await this.service.getChartData(filters);

        if (chartData.totalPayments === 0) {
            this.showToast('No hay datos para mostrar con los filtros seleccionados', 'info');
            return;
        }

        document.getElementById('chartTotalARS').textContent = `$${chartData.totalARS.toFixed(2)}`;
        document.getElementById('chartTotalUSD').textContent = `U$S ${chartData.totalUSD.toFixed(2)}`;

        const totalMixed = chartData.totalARS + chartData.totalUSD;
        const avgMixed = chartData.totalPayments > 0 ? (totalMixed / chartData.totalPayments) : 0;
        document.getElementById('chartPromedioPago').textContent = `$${avgMixed.toFixed(2)}`;
        document.getElementById('chartCantidadPagos').textContent = chartData.totalPayments;

        this.chartManager.updateAllCharts(chartData);
    }

    /* ===================== SERVICIOS ===================== */

    async handleAddServicio() {
        const nombre = document.getElementById('nuevoServicio').value;
        const descripcion = document.getElementById('servicioDescripcion').value;

        if (!nombre.trim()) {
            this.showToast('El nombre del servicio es obligatorio', 'error');
            return;
        }

        try {
            await this.service.agregarServicio(nombre, descripcion);
            this.showToast('Servicio agregado correctamente', 'success');
            document.getElementById('nuevoServicio').value = '';
            document.getElementById('servicioDescripcion').value = '';
            this.refreshServicios();
            this.reloadSelectOptions();
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        }
    }

    async refreshServicios() {
        const servicios = await this.db.getAllServicios();
        const container = document.getElementById('serviciosList');

        if (servicios.length === 0) {
            container.innerHTML = '<p class="empty-message">No hay servicios registrados</p>';
            return;
        }

        container.innerHTML = servicios.map(s => `
            <div class="list-item" data-id="${s.id}">
                <div class="list-item-content">
                    <h4>${escapeHtml(s.nombre)}</h4>
                    <p>${escapeHtml(s.descripcion) || 'Sin descripcion'}</p>
                </div>
                <div class="list-item-actions">
                    <button class="btn-small btn-info edit-servicio-btn" data-id="${s.id}">Editar</button>
                    <button class="btn-small btn-danger delete-servicio-btn" data-id="${s.id}">Eliminar</button>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.edit-servicio-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleEditServicio(parseInt(btn.dataset.id)));
        });

        container.querySelectorAll('.delete-servicio-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleDeleteServicio(parseInt(btn.dataset.id)));
        });
    }

    async handleEditServicio(id) {
        this.currentEditId = id;
        const servicio = await this.db.getServicioById(id);
        if (!servicio) {
            this.showToast('Servicio no encontrado', 'error');
            return;
        }
        document.getElementById('editServicioNombre').value = servicio.nombre;
        document.getElementById('editServicioDescripcion').value = servicio.descripcion || '';
        document.getElementById('editServicioModal').style.display = 'block';
    }

    async handleUpdateServicio(e) {
        e.preventDefault();
        try {
            const nombre = document.getElementById('editServicioNombre').value;
            const descripcion = document.getElementById('editServicioDescripcion').value;
            await this.service.actualizarServicio(this.currentEditId, nombre, descripcion);
            this.showToast('Servicio actualizado correctamente', 'success');
            this.closeAllModals();
            this.refreshServicios();
            this.reloadSelectOptions();
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        }
    }

    handleDeleteServicio(id) {
        this.showConfirm('Esta seguro de que desea eliminar este servicio?', async () => {
            try {
                await this.service.eliminarServicio(id);
                this.showToast('Servicio eliminado correctamente', 'success');
                this.refreshServicios();
                this.reloadSelectOptions();
            } catch (error) {
                this.showToast('Error: ' + error.message, 'error');
            }
        });
    }

    /* ===================== MEDIOS ===================== */

    async handleAddMedio() {
        const nombre = document.getElementById('nuevoMedio').value;
        const tipo = document.getElementById('medioTipo').value;

        if (!nombre.trim() || !tipo) {
            this.showToast('Todos los campos son obligatorios', 'error');
            return;
        }

        try {
            await this.service.agregarMedio(nombre, tipo);
            this.showToast('Medio de pago agregado correctamente', 'success');
            document.getElementById('nuevoMedio').value = '';
            document.getElementById('medioTipo').value = '';
            this.refreshMedios();
            this.reloadSelectOptions();
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        }
    }

    async refreshMedios() {
        const medios = await this.db.getAllMedios();
        const container = document.getElementById('mediosList');

        if (medios.length === 0) {
            container.innerHTML = '<p class="empty-message">No hay medios de pago registrados</p>';
            return;
        }

        const tipoLabels = {
            'credito': 'Tarjeta de Credito', 'debito': 'Tarjeta de Debito',
            'billetera': 'Billetera Virtual', 'efectivo': 'Efectivo',
            'transferencia': 'Transferencia', 'otro': 'Otro'
        };

        container.innerHTML = medios.map(m => `
            <div class="list-item" data-id="${m.id}">
                <div class="list-item-content">
                    <h4>${escapeHtml(m.nombre)}</h4>
                    <p>Tipo: ${tipoLabels[m.tipo] || escapeHtml(m.tipo)}</p>
                </div>
                <div class="list-item-actions">
                    <button class="btn-small btn-info edit-medio-btn" data-id="${m.id}">Editar</button>
                    <button class="btn-small btn-danger delete-medio-btn" data-id="${m.id}">Eliminar</button>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.edit-medio-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleEditMedio(parseInt(btn.dataset.id)));
        });

        container.querySelectorAll('.delete-medio-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleDeleteMedio(parseInt(btn.dataset.id)));
        });
    }

    async handleEditMedio(id) {
        this.currentEditId = id;
        const medio = await this.db.getMedioById(id);
        if (!medio) {
            this.showToast('Medio de pago no encontrado', 'error');
            return;
        }
        document.getElementById('editMedioNombre').value = medio.nombre;
        document.getElementById('editMedioTipo').value = medio.tipo;
        document.getElementById('editMedioModal').style.display = 'block';
    }

    async handleUpdateMedio(e) {
        e.preventDefault();
        try {
            const nombre = document.getElementById('editMedioNombre').value;
            const tipo = document.getElementById('editMedioTipo').value;
            await this.service.actualizarMedio(this.currentEditId, nombre, tipo);
            this.showToast('Medio de pago actualizado correctamente', 'success');
            this.closeAllModals();
            this.refreshMedios();
            this.reloadSelectOptions();
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        }
    }

    handleDeleteMedio(id) {
        this.showConfirm('Esta seguro de que desea eliminar este medio de pago?', async () => {
            try {
                await this.service.eliminarMedio(id);
                this.showToast('Medio de pago eliminado correctamente', 'success');
                this.refreshMedios();
                this.reloadSelectOptions();
            } catch (error) {
                this.showToast('Error: ' + error.message, 'error');
            }
        });
    }

    /* ===================== SELECT RELOAD ===================== */

    async reloadSelectOptions() {
        const servicios = await this.db.getAllServicios();
        const medios = await this.db.getAllMedios();

        ['servicioSelect', 'editServicio'].forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;
            const currentValue = select.value;
            select.innerHTML = '<option value="">Seleccionar servicio...</option>';
            servicios.forEach(s => {
                const option = document.createElement('option');
                option.value = s.nombre;
                option.textContent = escapeHtml(s.nombre);
                select.appendChild(option);
            });
            select.value = currentValue;
        });

        ['medioSelect', 'editMedio'].forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;
            const currentValue = select.value;
            select.innerHTML = '<option value="">Seleccionar medio...</option>';
            medios.forEach(m => {
                const option = document.createElement('option');
                option.value = m.nombre;
                option.textContent = escapeHtml(m.nombre);
                select.appendChild(option);
            });
            select.value = currentValue;
        });

        this._loadCategoriaOptions();
    }

    _loadCategoriaOptions() {
        const categorias = this.service.CATEGORIAS_PREDEFINIDAS;
        ['categoriaList', 'categoriaListEdit'].forEach(id => {
            const datalist = document.getElementById(id);
            if (!datalist) return;
            datalist.innerHTML = '';
            categorias.forEach(c => {
                const option = document.createElement('option');
                option.value = c;
                datalist.appendChild(option);
            });
        });
    }

    /* ===================== EXPORT JSON ===================== */

    async handleExportJson() {
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
    }

    /* ===================== IMPORT JSON ===================== */

    handleImportJsonClick() {
        document.getElementById('importJsonInput').click();
    }

    async handleImportJson(e) {
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
    }

    async executeImport(mode) {
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
    }

    /* ===================== EXPORT CSV ===================== */

    async handleExportCsv() {
        try {
            this.showLoading();
            const payments = await this.db.getAllPayments();

            if (payments.length === 0) {
                this.showToast('No hay datos para exportar', 'error');
                return;
            }

            const headers = ['Servicio', 'Fecha Pago', 'Fecha Vencimiento', 'Importe', 'Moneda', 'Medio de Pago', 'Categoria', 'Notas'];
            const rows = payments.map(p => [
                p.servicio, p.fechaPago, p.fechaVencimiento,
                p.importe, p.moneda, p.medio, p.categoria || '', p.notas || ''
            ]);

            const csvEscape = (cell) => {
                const str = String(cell);
                if (str.includes('"') || str.includes(',') || str.includes('\n')) {
                    return '"' + str.replace(/"/g, '""') + '"';
                }
                return '"' + str + '"';
            };

            let csv = '\uFEFF' + headers.join(',') + '\n';
            rows.forEach(row => {
                csv += row.map(csvEscape).join(',') + '\n';
            });

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
    }

    /* ===================== STATS ===================== */

    async showStats() {
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
    }

    async refreshStats() {
        this.showStats();
    }

    /* ===================== CLEAR ALL ===================== */

    handleClearAll() {
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
    }

    /* ===================== EXCEL GUIDE ===================== */

    showExcelImportGuide() {
        this.showToast('Guia: Exporta datos a JSON, modificalo, y re-importalo desde la pestaña Datos', 'info');
    }

    /* ===================== FORMAT ===================== */

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }

    /* ===================== THEME ===================== */

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem('darkMode', this.isDarkMode);
        this.applyTheme();
    }

    applyTheme() {
        const html = document.documentElement;
        const btn = document.getElementById('themeToggle');
        if (this.isDarkMode) {
            html.setAttribute('data-theme', 'dark');
            btn.textContent = 'Tema Claro';
        } else {
            html.setAttribute('data-theme', 'light');
            btn.textContent = 'Tema Oscuro';
        }
    }
}

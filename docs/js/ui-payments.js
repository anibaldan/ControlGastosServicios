/**
 * ui-payments.js - CRUD de pagos, historial, swipe, editar
 */

UIManager.prototype.handleAddPayment = async function(e) {
    e.preventDefault();
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

    try {
        const result = await this.service.registrarPago(paymentData);

        if (result.isDuplicate) {
            const dup = result.existingPayment;
            this.showConfirm(
                `Posible pago duplicado detectado:\n\nServicio: ${dup.servicio}\nFecha: ${dup.fechaPago}\nImporte: $${dup.importe}\n\nDesea registrar el pago de todas formas?`,
                async () => {
                    try {
                        await this.service.registrarPago(paymentData, true);
                        this.showToast('Pago registrado correctamente', 'success');
                        e.target.reset();
                        this.updateResumenHoy();
                    } catch (err) {
                        this.showToast('Error: ' + err.message, 'error');
                    }
                }
            );
            return;
        }

        this.showToast('Pago registrado correctamente', 'success');
        e.target.reset();
        this.updateResumenHoy();
    } catch (error) {
        this.showToast('Error: ' + error.message, 'error');
    }
};

UIManager.prototype.updateResumenHoy = async function() {
    const resumen = await this.service.getResumenHoy();
    document.getElementById('todayPaymentsCount').textContent = resumen.count;
    document.getElementById('todayTotalARS').textContent = `$${resumen.totalARS}`;
    document.getElementById('todayTotalUSD').textContent = `U$S ${resumen.totalUSD}`;
};

/* ===================== HISTORIAL ===================== */

UIManager.prototype.initHistorial = async function() {
    this.showLoading();
    try {
        const servicios = (await this.db.getAllServicios()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
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
};

UIManager.prototype.refreshHistorial = async function() {
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
};

UIManager.prototype._applySort = function() {
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
};

UIManager.prototype.handleSort = function(field) {
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
};

UIManager.prototype._updateHistorialStats = function() {
    const totales = this.service.calcularTotales(this.filteredPayments);
    document.getElementById('registrosCount').textContent = totales.totalRegistros;
    document.getElementById('totalARS').textContent = `$${totales.totalARS}`;
    document.getElementById('totalUSD').textContent = `U$S ${totales.totalUSD}`;
};

UIManager.prototype.renderHistorialPage = function() {
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
};

/* ===================== SWIPE ===================== */

UIManager.prototype._setupRowSwipe = function(tbody) {
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
};

/* ===================== EDITAR PAGO ===================== */

UIManager.prototype.openEditModal = async function(id) {
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
};

UIManager.prototype.handleUpdatePayment = async function(e) {
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
};

UIManager.prototype.confirmDelete = function(id) {
    this.showConfirm('Esta seguro de que desea eliminar este pago?', async () => {
        try {
            await this.db.deletePayment(id);
            this.showToast('Pago eliminado correctamente', 'success');
            this.refreshHistorial();
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        }
    });
};

UIManager.prototype.clearFilters = function() {
    document.getElementById('filterServicio').value = '';
    document.getElementById('filterAño').value = '';
    document.getElementById('filterMes').value = '';
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    this.refreshHistorial();
};

/**
 * ui-entities.js - CRUD de servicios, medios de pago, select reload
 */

UIManager.prototype.handleAddServicio = async function() {
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
};

UIManager.prototype.refreshServicios = async function() {
    const servicios = (await this.db.getAllServicios()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
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
};

UIManager.prototype.handleEditServicio = async function(id) {
    this.currentEditId = id;
    const servicio = await this.db.getServicioById(id);
    if (!servicio) {
        this.showToast('Servicio no encontrado', 'error');
        return;
    }
    document.getElementById('editServicioNombre').value = servicio.nombre;
    document.getElementById('editServicioDescripcion').value = servicio.descripcion || '';
    document.getElementById('editServicioModal').style.display = 'block';
};

UIManager.prototype.handleUpdateServicio = async function(e) {
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
};

UIManager.prototype.handleDeleteServicio = function(id) {
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
};

/* ===================== MEDIOS ===================== */

UIManager.prototype.handleAddMedio = async function() {
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
};

UIManager.prototype.refreshMedios = async function() {
    const medios = (await this.db.getAllMedios()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
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
};

UIManager.prototype.handleEditMedio = async function(id) {
    this.currentEditId = id;
    const medio = await this.db.getMedioById(id);
    if (!medio) {
        this.showToast('Medio de pago no encontrado', 'error');
        return;
    }
    document.getElementById('editMedioNombre').value = medio.nombre;
    document.getElementById('editMedioTipo').value = medio.tipo;
    document.getElementById('editMedioModal').style.display = 'block';
};

UIManager.prototype.handleUpdateMedio = async function(e) {
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
};

UIManager.prototype.handleDeleteMedio = function(id) {
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
};

/* ===================== SELECT RELOAD ===================== */

UIManager.prototype.reloadSelectOptions = async function() {
    const servicios = (await this.db.getAllServicios()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    const medios = (await this.db.getAllMedios()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

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
};

UIManager.prototype._loadCategoriaOptions = function() {
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
};

/**
 * DatabaseManager - Gestión de IndexedDB para Control de Gastos
 * Patrón Singleton, schema versionado, migraciones automáticas
 */

class DatabaseManager {
    constructor() {
        if (DatabaseManager._instance) {
            return DatabaseManager._instance;
        }
        this.dbName = 'ControlGastosDB';
        this.version = 2;
        this.db = null;
        this.objectStores = {
            payments: 'payments',
            servicios: 'servicios',
            medios: 'medios'
        };
        DatabaseManager._instance = this;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('Error al abrir IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;

                if (oldVersion < 1) {
                    const paymentStore = db.createObjectStore(this.objectStores.payments, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    paymentStore.createIndex('servicioIndex', 'servicio', { unique: false });
                    paymentStore.createIndex('medioIndex', 'medio', { unique: false });
                    paymentStore.createIndex('fechaPagoIndex', 'fechaPago', { unique: false });
                    paymentStore.createIndex('fechaVencIndex', 'fechaVencimiento', { unique: false });
                    paymentStore.createIndex('monedaIndex', 'moneda', { unique: false });

                    const serviciosStore = db.createObjectStore(this.objectStores.servicios, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    serviciosStore.createIndex('nombreIndex', 'nombre', { unique: true });

                    const mediosStore = db.createObjectStore(this.objectStores.medios, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    mediosStore.createIndex('nombreIndex', 'nombre', { unique: true });
                }

                if (oldVersion < 2) {
                    if (db.objectStoreNames.contains(this.objectStores.payments)) {
                        const tx = event.target.transaction;
                        const paymentStore = tx.objectStore(this.objectStores.payments);
                        if (!paymentStore.indexNames.contains('categoriaIndex')) {
                            paymentStore.createIndex('categoriaIndex', 'categoria', { unique: false });
                        }
                    }
                }
            };
        });
    }

    _ensureDb() {
        if (!this.db) throw new Error('Base de datos no inicializada. Llame a init() primero.');
    }

    _transaction(storeName, mode) {
        this._ensureDb();
        return this.db.transaction([storeName], mode);
    }

    addPayment(paymentData) {
        this._ensureDb();
        return new Promise((resolve, reject) => {
            const transaction = this._transaction(this.objectStores.payments, 'readwrite');
            const store = transaction.objectStore(this.objectStores.payments);
            paymentData.createdAt = new Date().toISOString();
            paymentData.updatedAt = new Date().toISOString();
            const request = store.add(paymentData);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    getAllPayments() {
        this._ensureDb();
        return new Promise((resolve, reject) => {
            const transaction = this._transaction(this.objectStores.payments, 'readonly');
            const store = transaction.objectStore(this.objectStores.payments);
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    getPaymentById(id) {
        this._ensureDb();
        return new Promise((resolve, reject) => {
            const transaction = this._transaction(this.objectStores.payments, 'readonly');
            const store = transaction.objectStore(this.objectStores.payments);
            const request = store.get(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    updatePayment(id, updatedData) {
        this._ensureDb();
        return new Promise((resolve, reject) => {
            const transaction = this._transaction(this.objectStores.payments, 'readwrite');
            const store = transaction.objectStore(this.objectStores.payments);
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const payment = getRequest.result;
                if (!payment) {
                    reject(new Error('Pago no encontrado'));
                    return;
                }
                const updated = { ...payment, ...updatedData, id: payment.id };
                updated.updatedAt = new Date().toISOString();
                const updateRequest = store.put(updated);
                updateRequest.onerror = () => reject(updateRequest.error);
                updateRequest.onsuccess = () => resolve(updated);
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    deletePayment(id) {
        this._ensureDb();
        return new Promise((resolve, reject) => {
            const transaction = this._transaction(this.objectStores.payments, 'readwrite');
            const store = transaction.objectStore(this.objectStores.payments);
            const request = store.delete(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(true);
        });
    }

    async getPaymentsByServicioNombre(nombre) {
        this._ensureDb();
        return new Promise((resolve, reject) => {
            const transaction = this._transaction(this.objectStores.payments, 'readonly');
            const store = transaction.objectStore(this.objectStores.payments);
            const index = store.index('servicioIndex');
            const request = index.getAll(nombre);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async getPaymentsByMedioNombre(nombre) {
        this._ensureDb();
        return new Promise((resolve, reject) => {
            const transaction = this._transaction(this.objectStores.payments, 'readonly');
            const store = transaction.objectStore(this.objectStores.payments);
            const index = store.index('medioIndex');
            const request = index.getAll(nombre);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    addServicio(servicioData) {
        this._ensureDb();
        return new Promise((resolve, reject) => {
            const transaction = this._transaction(this.objectStores.servicios, 'readwrite');
            const store = transaction.objectStore(this.objectStores.servicios);
            const request = store.add(servicioData);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    getAllServicios() {
        this._ensureDb();
        return new Promise((resolve, reject) => {
            const transaction = this._transaction(this.objectStores.servicios, 'readonly');
            const store = transaction.objectStore(this.objectStores.servicios);
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    getServicioById(id) {
        this._ensureDb();
        return new Promise((resolve, reject) => {
            const transaction = this._transaction(this.objectStores.servicios, 'readonly');
            const store = transaction.objectStore(this.objectStores.servicios);
            const request = store.get(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    deleteServicio(id) {
        this._ensureDb();
        return new Promise((resolve, reject) => {
            const transaction = this._transaction(this.objectStores.servicios, 'readwrite');
            const store = transaction.objectStore(this.objectStores.servicios);
            const request = store.delete(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(true);
        });
    }

    updateServicio(id, updatedData) {
        this._ensureDb();
        return new Promise((resolve, reject) => {
            const transaction = this._transaction(this.objectStores.servicios, 'readwrite');
            const store = transaction.objectStore(this.objectStores.servicios);
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const servicio = getRequest.result;
                if (!servicio) {
                    reject(new Error('Servicio no encontrado'));
                    return;
                }
                const updated = { ...servicio, ...updatedData, id: servicio.id };
                const putRequest = store.put(updated);
                putRequest.onerror = () => reject(putRequest.error);
                putRequest.onsuccess = () => resolve(true);
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    addMedio(medioData) {
        this._ensureDb();
        return new Promise((resolve, reject) => {
            const transaction = this._transaction(this.objectStores.medios, 'readwrite');
            const store = transaction.objectStore(this.objectStores.medios);
            const request = store.add(medioData);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    getAllMedios() {
        this._ensureDb();
        return new Promise((resolve, reject) => {
            const transaction = this._transaction(this.objectStores.medios, 'readonly');
            const store = transaction.objectStore(this.objectStores.medios);
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    getMedioById(id) {
        this._ensureDb();
        return new Promise((resolve, reject) => {
            const transaction = this._transaction(this.objectStores.medios, 'readonly');
            const store = transaction.objectStore(this.objectStores.medios);
            const request = store.get(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    deleteMedio(id) {
        this._ensureDb();
        return new Promise((resolve, reject) => {
            const transaction = this._transaction(this.objectStores.medios, 'readwrite');
            const store = transaction.objectStore(this.objectStores.medios);
            const request = store.delete(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(true);
        });
    }

    updateMedio(id, updatedData) {
        this._ensureDb();
        return new Promise((resolve, reject) => {
            const transaction = this._transaction(this.objectStores.medios, 'readwrite');
            const store = transaction.objectStore(this.objectStores.medios);
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const medio = getRequest.result;
                if (!medio) {
                    reject(new Error('Medio de pago no encontrado'));
                    return;
                }
                const updated = { ...medio, ...updatedData, id: medio.id };
                const putRequest = store.put(updated);
                putRequest.onerror = () => reject(putRequest.error);
                putRequest.onsuccess = () => resolve(true);
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    clearAllData() {
        this._ensureDb();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(
                [this.objectStores.payments, this.objectStores.servicios, this.objectStores.medios],
                'readwrite'
            );
            transaction.objectStore(this.objectStores.payments).clear();
            transaction.objectStore(this.objectStores.servicios).clear();
            transaction.objectStore(this.objectStores.medios).clear();
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async exportAllData() {
        const payments = await this.getAllPayments();
        const servicios = await this.getAllServicios();
        const medios = await this.getAllMedios();
        return {
            exportDate: new Date().toISOString(),
            version: this.version,
            data: { payments, servicios, medios }
        };
    }

    validateImportSchema(jsonData) {
        const errors = [];
        if (!jsonData || typeof jsonData !== 'object') {
            errors.push('El archivo no contiene un objeto JSON válido');
            return { valid: false, errors };
        }
        if (!jsonData.data || typeof jsonData.data !== 'object') {
            errors.push('Estructura inválida: falta el objeto "data"');
            return { valid: false, errors };
        }
        const { data } = jsonData;
        if (data.servicios && !Array.isArray(data.servicios)) {
            errors.push('"data.servicios" debe ser un array');
        }
        if (data.medios && !Array.isArray(data.medios)) {
            errors.push('"data.medios" debe ser un array');
        }
        if (data.payments && !Array.isArray(data.payments)) {
            errors.push('"data.payments" debe ser un array');
        }
        if (data.servicios) {
            data.servicios.forEach((s, i) => {
                if (!s.nombre || typeof s.nombre !== 'string') {
                    errors.push(`Servicio en posición ${i}: falta "nombre" o no es string`);
                }
            });
        }
        if (data.medios) {
            data.medios.forEach((m, i) => {
                if (!m.nombre || typeof m.nombre !== 'string') {
                    errors.push(`Medio en posición ${i}: falta "nombre" o no es string`);
                }
                if (m.tipo && !['credito', 'debito', 'billetera', 'efectivo', 'transferencia', 'otro'].includes(m.tipo)) {
                    errors.push(`Medio "${m.nombre}": tipo "${m.tipo}" no es válido`);
                }
            });
        }
        if (data.payments) {
            data.payments.forEach((p, i) => {
                if (!p.servicio) errors.push(`Pago en posición ${i}: falta "servicio"`);
                if (!p.medio) errors.push(`Pago en posición ${i}: falta "medio"`);
                if (p.importe === undefined || p.importe === null) errors.push(`Pago en posición ${i}: falta "importe"`);
                if (p.fechaPago && !/^\d{4}-\d{2}-\d{2}$/.test(p.fechaPago)) {
                    errors.push(`Pago en posición ${i}: fechaPago formato inválido (use YYYY-MM-DD)`);
                }
                if (p.fechaVencimiento && !/^\d{4}-\d{2}-\d{2}$/.test(p.fechaVencimiento)) {
                    errors.push(`Pago en posición ${i}: fechaVencimiento formato inválido (use YYYY-MM-DD)`);
                }
            });
        }
        return { valid: errors.length === 0, errors };
    }

    async importDataReplace(jsonData) {
        const { data } = jsonData;
        await this.clearAllData();
        return await this._importDataItems(data);
    }

    async importDataMerge(jsonData) {
        const { data } = jsonData;
        const stats = { servicios: 0, medios: 0, pagos: 0, skippedServicios: 0, skippedMedios: 0 };

        if (data.servicios && Array.isArray(data.servicios)) {
            const existing = await this.getAllServicios();
            const existingNames = new Set(existing.map(s => s.nombre.toLowerCase()));
            for (const servicio of data.servicios) {
                if (existingNames.has(servicio.nombre.toLowerCase())) {
                    stats.skippedServicios++;
                    continue;
                }
                await this.addServicio({
                    nombre: servicio.nombre,
                    descripcion: servicio.descripcion || ''
                });
                stats.servicios++;
            }
        }

        if (data.medios && Array.isArray(data.medios)) {
            const existing = await this.getAllMedios();
            const existingNames = new Set(existing.map(m => m.nombre.toLowerCase()));
            for (const medio of data.medios) {
                if (existingNames.has(medio.nombre.toLowerCase())) {
                    stats.skippedMedios++;
                    continue;
                }
                await this.addMedio({
                    nombre: medio.nombre,
                    tipo: medio.tipo || 'otro'
                });
                stats.medios++;
            }
        }

        if (data.payments && Array.isArray(data.payments)) {
            for (const payment of data.payments) {
                await this.addPayment({
                    servicio: payment.servicio,
                    medio: payment.medio,
                    fechaPago: payment.fechaPago,
                    fechaVencimiento: payment.fechaVencimiento,
                    importe: payment.importe,
                    moneda: payment.moneda,
                    notas: payment.notas || '',
                    categoria: payment.categoria || ''
                });
                stats.pagos++;
            }
        }

        return { success: true, stats };
    }

    async _importDataItems(data) {
        const stats = { servicios: 0, medios: 0, pagos: 0 };

        if (data.servicios && Array.isArray(data.servicios)) {
            for (const servicio of data.servicios) {
                await this.addServicio({
                    nombre: servicio.nombre,
                    descripcion: servicio.descripcion || ''
                });
                stats.servicios++;
            }
        }

        if (data.medios && Array.isArray(data.medios)) {
            for (const medio of data.medios) {
                await this.addMedio({
                    nombre: medio.nombre,
                    tipo: medio.tipo || 'otro'
                });
                stats.medios++;
            }
        }

        if (data.payments && Array.isArray(data.payments)) {
            for (const payment of data.payments) {
                await this.addPayment({
                    servicio: payment.servicio,
                    medio: payment.medio,
                    fechaPago: payment.fechaPago,
                    fechaVencimiento: payment.fechaVencimiento,
                    importe: payment.importe,
                    moneda: payment.moneda,
                    notas: payment.notas || '',
                    categoria: payment.categoria || ''
                });
                stats.pagos++;
            }
        }

        return { success: true, stats };
    }

    async getStats() {
        const payments = await this.getAllPayments();
        const servicios = await this.getAllServicios();
        const medios = await this.getAllMedios();

        const totalARS = payments
            .filter(p => p.moneda === 'ARS')
            .reduce((sum, p) => sum + parseFloat(p.importe) || 0, 0);

        const totalUSD = payments
            .filter(p => p.moneda === 'USD')
            .reduce((sum, p) => sum + parseFloat(p.importe) || 0, 0);

        let ultimaFecha = null;
        if (payments.length > 0) {
            payments.forEach(p => {
                if (p.fechaPago) {
                    const d = new Date(p.fechaPago + 'T00:00:00');
                    if (!ultimaFecha || d > ultimaFecha) {
                        ultimaFecha = d;
                    }
                }
            });
        }

        return {
            totalPagos: payments.length,
            totalServicios: servicios.length,
            totalMedios: medios.length,
            totalARS: totalARS.toFixed(2),
            totalUSD: totalUSD.toFixed(2),
            ultimaPago: ultimaFecha ? ultimaFecha.toISOString().slice(0, 10) : null
        };
    }
}

const db = new DatabaseManager();

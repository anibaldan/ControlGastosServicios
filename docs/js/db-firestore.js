/**
 * FirestoreManager - Adaptador Firestore para Control de Gastos
 * Misma interfaz que DatabaseManager (db.js) pero usando Firebase Firestore
 * Sintaxis compat (v8/compat) para uso sin bundler
 */

class FirestoreManager {
    constructor() {
        if (FirestoreManager._instance) {
            return FirestoreManager._instance;
        }
        this.db = null;
        this.auth = null;
        this.userId = null;
        this._unsubscribers = [];
        this._listeners = {};
        FirestoreManager._instance = this;
    }

    init(firebaseApp, firebaseAuth) {
        this.db = firebaseApp.firestore();
        this.auth = firebaseAuth;
    }

    setUser(userId) {
        this.userId = userId;
        this._unsubscribeAll();
    }

    _getUserCollection(collectionName) {
        if (!this.userId) throw new Error('Usuario no autenticado');
        return this.db.collection('users').doc(this.userId).collection(collectionName);
    }

    _getDocRef(collectionName, docId) {
        if (!this.userId) throw new Error('Usuario no autenticado');
        return this.db.collection('users').doc(this.userId).collection(collectionName).doc(docId);
    }

    _unsubscribeAll() {
        this._unsubscribers.forEach(unsub => unsub());
        this._unsubscribers = [];
        this._listeners = {};
    }

    // ===================== PAGOS =====================

    async addPayment(paymentData) {
        const docRef = await this._getUserCollection('pagos').add({
            servicio: paymentData.servicio,
            medio: paymentData.medio,
            fechaPago: paymentData.fechaPago,
            fechaVencimiento: paymentData.fechaVencimiento,
            importe: parseFloat(paymentData.importe),
            moneda: paymentData.moneda,
            notas: paymentData.notas || '',
            categoria: paymentData.categoria || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        return docRef.id;
    }

    async getAllPayments() {
        const snapshot = await this._getUserCollection('pagos').get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    async getPaymentById(id) {
        const docSnap = await this._getDocRef('pagos', id).get();
        if (!docSnap.exists) return null;
        return { id: docSnap.id, ...docSnap.data() };
    }

    async updatePayment(id, updatedData) {
        const docRef = this._getDocRef('pagos', id);
        const docSnap = await docRef.get();
        if (!docSnap.exists) throw new Error('Pago no encontrado');

        const payment = docSnap.data();
        const updated = {
            servicio: updatedData.servicio !== undefined ? updatedData.servicio : payment.servicio,
            medio: updatedData.medio !== undefined ? updatedData.medio : payment.medio,
            fechaPago: updatedData.fechaPago !== undefined ? updatedData.fechaPago : payment.fechaPago,
            fechaVencimiento: updatedData.fechaVencimiento !== undefined ? updatedData.fechaVencimiento : payment.fechaVencimiento,
            importe: updatedData.importe !== undefined ? parseFloat(updatedData.importe) : payment.importe,
            moneda: updatedData.moneda !== undefined ? updatedData.moneda : payment.moneda,
            notas: updatedData.notas !== undefined ? updatedData.notas : payment.notas,
            categoria: updatedData.categoria !== undefined ? updatedData.categoria : payment.categoria,
            updatedAt: new Date().toISOString()
        };

        await docRef.update(updated);
        return updated;
    }

    async deletePayment(id) {
        await this._getDocRef('pagos', id).delete();
        return true;
    }

    async findPotentialDuplicate(servicio, fechaPago, importe, excludeId = null) {
        const payments = await this.getAllPayments();
        return payments.find(p =>
            p.servicio === servicio &&
            p.fechaPago === fechaPago &&
            parseFloat(p.importe) === parseFloat(importe) &&
            p.id !== excludeId
        );
    }

    async getPaymentsByServicioNombre(nombre) {
        const snapshot = await this._getUserCollection('pagos')
            .where('servicio', '==', nombre)
            .get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    async getPaymentsByMedioNombre(nombre) {
        const snapshot = await this._getUserCollection('pagos')
            .where('medio', '==', nombre)
            .get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    // ===================== SERVICIOS =====================

    async addServicio(servicioData) {
        const docRef = await this._getUserCollection('servicios').add({
            nombre: servicioData.nombre,
            descripcion: servicioData.descripcion || ''
        });
        return docRef.id;
    }

    async getAllServicios() {
        const snapshot = await this._getUserCollection('servicios').get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    async getServicioById(id) {
        const docSnap = await this._getDocRef('servicios', id).get();
        if (!docSnap.exists) return null;
        return { id: docSnap.id, ...docSnap.data() };
    }

    async updateServicio(id, updatedData) {
        const docRef = this._getDocRef('servicios', id);
        const docSnap = await docRef.get();
        if (!docSnap.exists) throw new Error('Servicio no encontrado');

        await docRef.update({
            nombre: updatedData.nombre,
            descripcion: updatedData.descripcion || ''
        });
        return true;
    }

    async deleteServicio(id) {
        await this._getDocRef('servicios', id).delete();
        return true;
    }

    // ===================== MEDIOS =====================

    async addMedio(medioData) {
        const docRef = await this._getUserCollection('medios').add({
            nombre: medioData.nombre,
            tipo: medioData.tipo || 'otro'
        });
        return docRef.id;
    }

    async getAllMedios() {
        const snapshot = await this._getUserCollection('medios').get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    async getMedioById(id) {
        const docSnap = await this._getDocRef('medios', id).get();
        if (!docSnap.exists) return null;
        return { id: docSnap.id, ...docSnap.data() };
    }

    async updateMedio(id, updatedData) {
        const docRef = this._getDocRef('medios', id);
        const docSnap = await docRef.get();
        if (!docSnap.exists) throw new Error('Medio de pago no encontrado');

        await docRef.update({
            nombre: updatedData.nombre,
            tipo: updatedData.tipo || 'otro'
        });
        return true;
    }

    async deleteMedio(id) {
        await this._getDocRef('medios', id).delete();
        return true;
    }

    // ===================== UTILIDADES =====================

    async clearAllData() {
        const batch1 = this.db.batch();
        const serviciosSnap = await this._getUserCollection('servicios').get();
        serviciosSnap.docs.forEach(doc => batch1.delete(doc.ref));
        await batch1.commit();

        const batch2 = this.db.batch();
        const mediosSnap = await this._getUserCollection('medios').get();
        mediosSnap.docs.forEach(doc => batch2.delete(doc.ref));
        await batch2.commit();

        const batch3 = this.db.batch();
        const pagosSnap = await this._getUserCollection('pagos').get();
        pagosSnap.docs.forEach(doc => batch3.delete(doc.ref));
        await batch3.commit();

        return true;
    }

    async exportAllData() {
        const payments = await this.getAllPayments();
        const servicios = await this.getAllServicios();
        const medios = await this.getAllMedios();
        return {
            exportDate: new Date().toISOString(),
            version: 2,
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

        const existingServicios = await this.getAllServicios();
        const existingMedios = await this.getAllMedios();
        const existingServiciosNames = new Set(existingServicios.map(s => s.nombre.toLowerCase()));
        const existingMediosNames = new Set(existingMedios.map(m => m.nombre.toLowerCase()));

        if (data.servicios && Array.isArray(data.servicios)) {
            for (const servicio of data.servicios) {
                if (existingServiciosNames.has(servicio.nombre.toLowerCase())) {
                    stats.skippedServicios++;
                } else {
                    await this.addServicio({ nombre: servicio.nombre, descripcion: servicio.descripcion || '' });
                    stats.servicios++;
                }
            }
        }

        if (data.medios && Array.isArray(data.medios)) {
            for (const medio of data.medios) {
                if (existingMediosNames.has(medio.nombre.toLowerCase())) {
                    stats.skippedMedios++;
                } else {
                    await this.addMedio({ nombre: medio.nombre, tipo: medio.tipo || 'otro' });
                    stats.medios++;
                }
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

        const servicios = (data.servicios && Array.isArray(data.servicios)) ? data.servicios : [];
        const medios = (data.medios && Array.isArray(data.medios)) ? data.medios : [];
        const payments = (data.payments && Array.isArray(data.payments)) ? data.payments : [];

        for (const s of servicios) {
            await this.addServicio({ nombre: s.nombre, descripcion: s.descripcion || '' });
            stats.servicios++;
        }

        for (const m of medios) {
            await this.addMedio({ nombre: m.nombre, tipo: m.tipo || 'otro' });
            stats.medios++;
        }

        for (const p of payments) {
            await this.addPayment({
                servicio: p.servicio,
                medio: p.medio,
                fechaPago: p.fechaPago,
                fechaVencimiento: p.fechaVencimiento,
                importe: p.importe,
                moneda: p.moneda,
                notas: p.notas || '',
                categoria: p.categoria || ''
            });
            stats.pagos++;
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
                    const parts = p.fechaPago.split('-');
                    if (parts.length === 3) {
                        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                        if (!ultimaFecha || d > ultimaFecha) {
                            ultimaFecha = d;
                        }
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

const firestoreDb = new FirestoreManager();

/**
 * PaymentService - Lógica de negocio para gestión de pagos
 */

function parseLocalDate(dateString) {
    if (!dateString || typeof dateString !== 'string') return null;
    const parts = dateString.split('-');
    if (parts.length !== 3) return null;
    const [year, month, day] = parts.map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    return new Date(year, month - 1, day);
}

function formatDateYYYYMMDD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

class PaymentService {
    constructor(dbManager) {
        this.db = dbManager;
        this.DEFAULT_SERVICIOS = [
            { nombre: 'Secheep', descripcion: 'Servicio de electricidad' },
            { nombre: 'SAMEEP', descripcion: 'Servicio de agua' },
            { nombre: 'Flow', descripcion: 'Servicio de internet y TV' },
            { nombre: 'Celular Claro', descripcion: 'Línea celular Claro' },
            { nombre: 'Celular Personal', descripcion: 'Línea celular Personal' },
            { nombre: 'Seguro Auto', descripcion: 'Póliza de seguro automotriz' },
            { nombre: 'Seguro Vida', descripcion: 'Póliza de seguro de vida' },
            { nombre: 'Tarjeta de Crédito', descripcion: 'Pago de tarjeta de crédito' },
            { nombre: 'Alquiler', descripcion: 'Pago de alquiler' },
            { nombre: 'Expensas', descripcion: 'Gastos de condominio' }
        ];

        this.DEFAULT_MEDIOS = [
            { nombre: 'Tarjeta de Crédito', tipo: 'credito' },
            { nombre: 'Tarjeta de Débito', tipo: 'debito' },
            { nombre: 'Billetera A', tipo: 'billetera' },
            { nombre: 'Billetera B', tipo: 'billetera' },
            { nombre: 'Efectivo', tipo: 'efectivo' },
            { nombre: 'Transferencia', tipo: 'transferencia' }
        ];

        this.CATEGORIAS_PREDEFINIDAS = [
            'Luz', 'Agua', 'Internet', 'Teléfono', 'Cable/TV',
            'Seguro', 'Tarjeta de Crédito', 'Alquiler', 'Expensas',
            'Gas', 'Cbam', 'Streaming', 'Suscripción', 'Impuesto', 'Otro'
        ];
    }

    async initializeDefaults() {
        try {
            const servicios = await this.db.getAllServicios();
            const medios = await this.db.getAllMedios();

            if (servicios.length === 0) {
                for (const servicio of this.DEFAULT_SERVICIOS) {
                    await this.db.addServicio(servicio);
                }
            }

            if (medios.length === 0) {
                for (const medio of this.DEFAULT_MEDIOS) {
                    await this.db.addMedio(medio);
                }
            }
        } catch (error) {
            console.error('Error inicializando defaults:', error);
        }
    }

    async registrarPago(paymentData) {
        if (!paymentData.servicio || !paymentData.medio || paymentData.importe === undefined || paymentData.importe === null || paymentData.importe === '') {
            throw new Error('Faltan datos obligatorios (servicio, medio, importe)');
        }

        if (!paymentData.fechaPago || !/^\d{4}-\d{2}-\d{2}$/.test(paymentData.fechaPago)) {
            throw new Error('Fecha de pago inválida');
        }
        if (!paymentData.fechaVencimiento || !/^\d{4}-\d{2}-\d{2}$/.test(paymentData.fechaVencimiento)) {
            throw new Error('Fecha de vencimiento inválida');
        }

        const parsedImporte = parseFloat(paymentData.importe);
        if (isNaN(parsedImporte) || parsedImporte <= 0) {
            throw new Error('El importe debe ser un número mayor a 0');
        }

        const fechaPago = parseLocalDate(paymentData.fechaPago);
        const fechaVenc = parseLocalDate(paymentData.fechaVencimiento);

        if (!fechaPago || !fechaVenc) {
            throw new Error('No se pudieron parsear las fechas');
        }

        if (fechaPago > fechaVenc) {
            throw new Error('La fecha de pago no puede ser posterior a la fecha de vencimiento');
        }

        paymentData.importe = parsedImporte;
        paymentData.categoria = paymentData.categoria || '';
        return await this.db.addPayment(paymentData);
    }

    async getPaymentFiltered(filters = {}) {
        let payments = await this.db.getAllPayments();

        if (filters.servicio && filters.servicio !== '') {
            payments = payments.filter(p => p.servicio === filters.servicio);
        }

        if (filters.year && filters.year !== '') {
            payments = payments.filter(p => {
                const d = parseLocalDate(p.fechaPago);
                return d && d.getFullYear().toString() === filters.year;
            });
        }

        if (filters.month && filters.month !== '') {
            payments = payments.filter(p => {
                const d = parseLocalDate(p.fechaPago);
                return d && String(d.getMonth() + 1).padStart(2, '0') === filters.month;
            });
        }

        if (filters.search && filters.search.trim() !== '') {
            const term = filters.search.trim().toLowerCase();
            payments = payments.filter(p => {
                return (p.servicio && p.servicio.toLowerCase().includes(term)) ||
                       (p.medio && p.medio.toLowerCase().includes(term)) ||
                       (p.notas && p.notas.toLowerCase().includes(term)) ||
                       (p.categoria && p.categoria.toLowerCase().includes(term));
            });
        }

        payments.sort((a, b) => {
            const da = parseLocalDate(a.fechaPago);
            const db = parseLocalDate(b.fechaPago);
            if (!da) return 1;
            if (!db) return -1;
            return db - da;
        });

        return payments;
    }

    async getResumenHoy() {
        const payments = await this.db.getAllPayments();
        const hoy = formatDateYYYYMMDD(new Date());

        const pagosHoy = payments.filter(p => p.fechaPago === hoy);
        const totalARS = pagosHoy
            .filter(p => p.moneda === 'ARS')
            .reduce((sum, p) => sum + (parseFloat(p.importe) || 0), 0);
        const totalUSD = pagosHoy
            .filter(p => p.moneda === 'USD')
            .reduce((sum, p) => sum + (parseFloat(p.importe) || 0), 0);

        return {
            count: pagosHoy.length,
            totalARS: totalARS.toFixed(2),
            totalUSD: totalUSD.toFixed(2)
        };
    }

    calcularTotales(payments) {
        const totalARS = payments
            .filter(p => p.moneda === 'ARS')
            .reduce((sum, p) => sum + (parseFloat(p.importe) || 0), 0);

        const totalUSD = payments
            .filter(p => p.moneda === 'USD')
            .reduce((sum, p) => sum + (parseFloat(p.importe) || 0), 0);

        return {
            totalARS: totalARS.toFixed(2),
            totalUSD: totalUSD.toFixed(2),
            totalRegistros: payments.length
        };
    }

    async getAvailableYears() {
        const payments = await this.db.getAllPayments();
        const years = new Set();
        payments.forEach(p => {
            const d = parseLocalDate(p.fechaPago);
            if (d) years.add(d.getFullYear().toString());
        });
        return Array.from(years).sort().reverse();
    }

    async getChartData(filters = {}) {
        const payments = await this.getPaymentFiltered(filters);

        const byServicioARS = {};
        const byServicioUSD = {};
        payments.forEach(p => {
            const bucket = p.moneda === 'USD' ? byServicioUSD : byServicioARS;
            if (!bucket[p.servicio]) bucket[p.servicio] = 0;
            bucket[p.servicio] += parseFloat(p.importe) || 0;
        });

        const byMedioARS = {};
        const byMedioUSD = {};
        payments.forEach(p => {
            const bucket = p.moneda === 'USD' ? byMedioUSD : byMedioARS;
            if (!bucket[p.medio]) bucket[p.medio] = 0;
            bucket[p.medio] += parseFloat(p.importe) || 0;
        });

        const byMoneda = { ARS: 0, USD: 0 };
        payments.forEach(p => {
            if (byMoneda[p.moneda] !== undefined) {
                byMoneda[p.moneda] += parseFloat(p.importe) || 0;
            }
        });

        const monthlyData = this.getMonthlyEvolution(payments);

        const totalARS = payments.filter(p => p.moneda === 'ARS')
            .reduce((s, p) => s + (parseFloat(p.importe) || 0), 0);
        const totalUSD = payments.filter(p => p.moneda === 'USD')
            .reduce((s, p) => s + (parseFloat(p.importe) || 0), 0);

        const categorias = {};
        payments.forEach(p => {
            const cat = p.categoria || 'Sin categoría';
            if (!categorias[cat]) categorias[cat] = { ARS: 0, USD: 0 };
            if (p.moneda === 'USD') {
                categorias[cat].USD += parseFloat(p.importe) || 0;
            } else {
                categorias[cat].ARS += parseFloat(p.importe) || 0;
            }
        });

        return {
            byServicioARS,
            byServicioUSD,
            byMedioARS,
            byMedioUSD,
            byMoneda,
            monthlyData,
            categorias,
            totalPayments: payments.length,
            totalARS,
            totalUSD
        };
    }

    getMonthlyEvolution(payments) {
        const monthlyMap = {};
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        payments.forEach(p => {
            const date = parseLocalDate(p.fechaPago);
            if (!date) return;
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

            if (!monthlyMap[key]) {
                monthlyMap[key] = { label, ARS: 0, USD: 0 };
            }
            if (p.moneda === 'USD') {
                monthlyMap[key].USD += parseFloat(p.importe) || 0;
            } else {
                monthlyMap[key].ARS += parseFloat(p.importe) || 0;
            }
        });

        return Object.values(monthlyMap)
            .sort((a, b) => a.label.localeCompare(b.label, 'es'))
            .slice(-12);
    }

    async agregarServicio(nombre, descripcion = '') {
        if (!nombre || nombre.trim() === '') {
            throw new Error('El nombre del servicio es obligatorio');
        }
        return await this.db.addServicio({
            nombre: nombre.trim(),
            descripcion: descripcion.trim()
        });
    }

    async eliminarServicio(id) {
        const servicio = await this.db.getServicioById(id);
        if (!servicio) {
            throw new Error('Servicio no encontrado');
        }

        const payments = await this.db.getPaymentsByServicioNombre(servicio.nombre);
        if (payments.length > 0) {
            throw new Error(`No se puede eliminar "${servicio.nombre}": tiene ${payments.length} pago(s) asociado(s). Eliminá los pagos primero.`);
        }

        return await this.db.deleteServicio(id);
    }

    async actualizarServicio(id, nombre, descripcion = '') {
        if (!nombre || nombre.trim() === '') {
            throw new Error('El nombre del servicio es obligatorio');
        }
        return await this.db.updateServicio(id, {
            nombre: nombre.trim(),
            descripcion: descripcion.trim()
        });
    }

    async agregarMedio(nombre, tipo = 'otro') {
        if (!nombre || nombre.trim() === '') {
            throw new Error('El nombre del medio es obligatorio');
        }
        return await this.db.addMedio({
            nombre: nombre.trim(),
            tipo
        });
    }

    async eliminarMedio(id) {
        const medio = await this.db.getMedioById(id);
        if (!medio) {
            throw new Error('Medio de pago no encontrado');
        }

        const payments = await this.db.getPaymentsByMedioNombre(medio.nombre);
        if (payments.length > 0) {
            throw new Error(`No se puede eliminar "${medio.nombre}": tiene ${payments.length} pago(s) asociado(s). Eliminá los pagos primero.`);
        }

        return await this.db.deleteMedio(id);
    }

    async actualizarMedio(id, nombre, tipo = 'otro') {
        if (!nombre || nombre.trim() === '') {
            throw new Error('El nombre del medio es obligatorio');
        }
        return await this.db.updateMedio(id, {
            nombre: nombre.trim(),
            tipo
        });
    }

    async getResumenPeriodo(year = null, month = null) {
        const payments = await this.getPaymentFiltered({
            year: year || '',
            month: month || ''
        });
        const totales = this.calcularTotales(payments);
        return {
            period: `${month ? month + '/' : ''}${year || 'Todos'}`,
            totalARS: totales.totalARS,
            totalUSD: totales.totalUSD,
            paymentCount: payments.length,
            byServicio: this.groupByServicio(payments)
        };
    }

    groupByServicio(payments) {
        const grouped = {};
        payments.forEach(p => {
            if (!grouped[p.servicio]) {
                grouped[p.servicio] = { count: 0, totalARS: 0, totalUSD: 0 };
            }
            grouped[p.servicio].count++;
            if (p.moneda === 'ARS') {
                grouped[p.servicio].totalARS += parseFloat(p.importe) || 0;
            } else {
                grouped[p.servicio].totalUSD += parseFloat(p.importe) || 0;
            }
        });
        return grouped;
    }

    getOverduePayments(payments) {
        const today = formatDateYYYYMMDD(new Date());
        return payments.filter(p => p.fechaVencimiento && p.fechaVencimiento < today);
    }
}

const paymentService = new PaymentService(db);

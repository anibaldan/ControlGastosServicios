/**
 * ui-core.js - UIManager base: constructor, events, tabs, toast, loading, confirm, modals, theme, format
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
            if (e.key === 'Tab') this._trapFocusInModal(e);
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

    /* ===================== FOCUS TRAP ===================== */

    _trapFocusInModal(e) {
        const openModal = document.querySelector('.modal[style*="block"]');
        if (!openModal) return;
        const focusable = openModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    /* ===================== FORMAT ===================== */

    formatDate(dateString) {
        if (!dateString) return '-';
        const parts = dateString.split('-');
        if (parts.length !== 3) return dateString;
        const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
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

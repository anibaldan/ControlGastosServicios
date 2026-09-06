/**
 * ui-charts.js - Gráficos y análisis
 */

UIManager.prototype.initCharts = async function() {
    try {
        await this.chartManager.ensureLoaded();
    } catch (error) {
        this.showToast('Error: No se pudo cargar la librería de gráficos', 'error');
        return;
    }
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
};

UIManager.prototype.updateCharts = async function() {
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

    const countARS = chartData.paymentsByCurrency?.ARS || 0;
    const countUSD = chartData.paymentsByCurrency?.USD || 0;
    const avgARS = countARS > 0 ? chartData.totalARS / countARS : 0;
    const avgUSD = countUSD > 0 ? chartData.totalUSD / countUSD : 0;
    document.getElementById('chartPromedioARS').textContent = `$${avgARS.toFixed(2)}`;
    document.getElementById('chartPromedioUSD').textContent = `U$S ${avgUSD.toFixed(2)}`;
    document.getElementById('chartCantidadPagos').textContent = chartData.totalPayments;

    this.chartManager.updateAllCharts(chartData);
};

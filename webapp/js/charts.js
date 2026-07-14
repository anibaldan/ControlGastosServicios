/**
 * ChartManager - Gestión de gráficos con Chart.js
 * Gráficos separados por moneda (ARS/USD)
 */

class ChartManager {
    constructor() {
        this.charts = {};
        this.colors = {
            primary: '#3498db',
            success: '#2ecc71',
            warning: '#f39c12',
            danger: '#e74c3c',
            info: '#9b59b6',
            palette: [
                '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
                '#1abc9c', '#e67e22', '#34495e', '#95a5a6', '#d35400',
                '#8e44ad', '#16a085', '#c0392b', '#f1c40f', '#27ae60'
            ]
        };
    }

    getColorPalette(count) {
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(this.colors.palette[i % this.colors.palette.length]);
        }
        return colors;
    }

    darkenColor(color, amount = 20) {
        const usePound = color[0] === "#";
        const col = usePound ? color.slice(1) : color;
        const num = parseInt(col, 16);
        const r = Math.max(0, (num >> 16) - amount);
        const g = Math.max(0, (num >> 8 & 0x00FF) - amount);
        const b = Math.max(0, (num & 0x0000FF) - amount);
        return (usePound ? "#" : "") + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
    }

    hexToRgb(hex, alpha = 1) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    _destroyChart(canvasId) {
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
            delete this.charts[canvasId];
        }
    }

    _getCtx(canvasId) {
        const el = document.getElementById(canvasId);
        if (!el) return null;
        return el;
    }

    createServiciosChart(canvasId, data) {
        this._destroyChart(canvasId);
        const ctx = this._getCtx(canvasId);
        if (!ctx) return;

        const hasARS = Object.keys(data.byServicioARS).length > 0;
        const hasUSD = Object.keys(data.byServicioUSD).length > 0;

        if (!hasARS && !hasUSD) return;

        const labels = [];
        const valuesARS = [];
        const valuesUSD = [];

        const allServicios = new Set([...Object.keys(data.byServicioARS), ...Object.keys(data.byServicioUSD)]);
        allServicios.forEach(s => {
            labels.push(s);
            valuesARS.push(data.byServicioARS[s] || 0);
            valuesUSD.push(data.byServicioUSD[s] || 0);
        });

        const datasets = [];
        if (hasARS) {
            datasets.push({
                label: 'ARS',
                data: valuesARS,
                backgroundColor: this.getColorPalette(labels.length),
                borderColor: '#fff',
                borderWidth: 2
            });
        }
        if (hasUSD) {
            datasets.push({
                label: 'USD',
                data: valuesUSD,
                backgroundColor: this.getColorPalette(labels.length).map(c => this.hexToRgb(c, 0.5)),
                borderColor: this.getColorPalette(labels.length),
                borderWidth: 2,
                borderDash: [5, 5]
            });
        }

        this.charts[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 15 } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                const currency = context.dataset.label === 'USD' ? 'U$S ' : '$';
                                return `${context.label}: ${currency}${value.toFixed(2)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    createMediosChart(canvasId, data) {
        this._destroyChart(canvasId);
        const ctx = this._getCtx(canvasId);
        if (!ctx) return;

        const hasARS = Object.keys(data.byMedioARS).length > 0;
        const hasUSD = Object.keys(data.byMedioUSD).length > 0;

        if (!hasARS && !hasUSD) return;

        const labels = [];
        const valuesARS = [];
        const valuesUSD = [];

        const allMedios = new Set([...Object.keys(data.byMedioARS), ...Object.keys(data.byMedioUSD)]);
        allMedios.forEach(m => {
            labels.push(m);
            valuesARS.push(data.byMedioARS[m] || 0);
            valuesUSD.push(data.byMedioUSD[m] || 0);
        });

        const colors = this.getColorPalette(labels.length);

        const datasets = [];
        if (hasARS) {
            datasets.push({
                label: 'ARS',
                data: valuesARS,
                backgroundColor: colors,
                borderColor: colors.map(c => this.darkenColor(c)),
                borderWidth: 2
            });
        }
        if (hasUSD) {
            datasets.push({
                label: 'USD',
                data: valuesUSD,
                backgroundColor: colors.map(c => this.hexToRgb(c, 0.5)),
                borderColor: colors.map(c => this.darkenColor(c)),
                borderWidth: 2,
                borderDash: [5, 5]
            });
        }

        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: hasARS && hasUSD },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const currency = context.dataset.label === 'USD' ? 'U$S ' : '$';
                                return `${context.dataset.label}: ${currency}${context.parsed.x.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(0);
                            }
                        }
                    }
                }
            }
        });
    }

    createEvolutionChart(canvasId, data) {
        this._destroyChart(canvasId);
        const ctx = this._getCtx(canvasId);
        if (!ctx) return;

        const labels = data.monthlyData.map(d => d.label);
        const valuesARS = data.monthlyData.map(d => d.ARS);
        const valuesUSD = data.monthlyData.map(d => d.USD);

        const hasARS = valuesARS.some(v => v > 0);
        const hasUSD = valuesUSD.some(v => v > 0);

        const datasets = [];
        if (hasARS) {
            datasets.push({
                label: 'Gasto Mensual ARS',
                data: valuesARS,
                borderColor: this.colors.primary,
                backgroundColor: this.hexToRgb(this.colors.primary, 0.1),
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: this.colors.primary,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 7
            });
        }
        if (hasUSD) {
            datasets.push({
                label: 'Gasto Mensual USD',
                data: valuesUSD,
                borderColor: this.colors.success,
                backgroundColor: this.hexToRgb(this.colors.success, 0.1),
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: this.colors.success,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 7,
                borderDash: [5, 5]
            });
        }

        if (datasets.length === 0) return;

        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: hasARS && hasUSD, position: 'top' },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                const currency = context.dataset.label.includes('USD') ? 'U$S ' : '$';
                                return `${context.dataset.label}: ${currency}${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(0);
                            }
                        }
                    }
                }
            }
        });
    }

    createMonedaChart(canvasId, data) {
        this._destroyChart(canvasId);
        const ctx = this._getCtx(canvasId);
        if (!ctx) return;

        const labels = [];
        const values = [];
        const colors = [];

        if (data.byMoneda.ARS > 0) {
            labels.push('Pesos (ARS)');
            values.push(data.byMoneda.ARS);
            colors.push(this.colors.primary);
        }
        if (data.byMoneda.USD > 0) {
            labels.push('Dólares (USD)');
            values.push(data.byMoneda.USD);
            colors.push(this.colors.success);
        }

        if (values.length === 0) return;

        this.charts[canvasId] = new Chart(ctx, {
            type: 'pie',
            data: {
                labels,
                datasets: [{ data: values, backgroundColor: colors, borderColor: '#fff', borderWidth: 2 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed;
                                const total = values.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                const currency = context.label.includes('ARS') ? '$' : 'U$S ';
                                return `${context.label}: ${currency}${value.toFixed(2)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    updateAllCharts(chartData) {
        this.createServiciosChart('serviciosChart', chartData);
        this.createMediosChart('mediosChart', chartData);
        this.createEvolutionChart('evolutionChart', chartData);
        this.createMonedaChart('monedaChart', chartData);
    }

    clearAllCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
    }
}

const chartManager = new ChartManager();

// dashboard.js

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
});

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
let authToken = localStorage.getItem('authToken');

// Variables globales
let gastos = [];
let ingresos = [];
let presupuestos = JSON.parse(localStorage.getItem('presupuestos')) || {};

// Instancias de gráficos
let gastosCategoriaChartInstance = null;
let comparativaMensualChartInstance = null;
let proyeccionAhorrosChartInstance = null;
let flujoEfectivoChartInstance = null;

function checkAuth() {
    if (!authToken) {
        window.location.href = '/login';
        return;
    }
    loadUserData();
    cargarDatosCompletos();
}

function loadUserData() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    if (userData.nombre) {
        document.getElementById('user-name').textContent = userData.nombre;
    }
}

function logout() {
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = '/login';
    }
}

function showLoading(show) {
    document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
}

function makeAuthenticatedRequest(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        }
    };
    const mergedOptions = { ...defaultOptions, ...options, headers: { ...defaultOptions.headers, ...(options.headers || {}) } };
    return fetch(url, mergedOptions).then(response => {
        if (response.status === 401 || response.status === 403) {
            logout();
            throw new Error('No autorizado');
        }
        return response;
    });
}

function formatearNumero(num) {
    return '$' + num.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

async function cargarDatosCompletos() {
    showLoading(true);
    try {
        const [gastosResponse, ingresosResponse] = await Promise.all([
            makeAuthenticatedRequest(`${API_BASE}/api/gastos`),
            makeAuthenticatedRequest(`${API_BASE}/api/ingresos`)
        ]);

        if (gastosResponse.ok) gastos = await gastosResponse.json();
        if (ingresosResponse.ok) ingresos = await ingresosResponse.json();

        inicializarDashboard();

    } catch (error) {
        console.error('Error cargando datos del dashboard:', error);
        alert('Error al cargar los datos del dashboard');
    } finally {
        showLoading(false);
    }
}

function inicializarDashboard() {
    crearGraficoGastosPorCategoria();
    crearComparativaMensual();
    crearProyeccionAhorros();
    crearGraficoFlujoEfectivo();
    mostrarTopGastos();
    cargarAlertas();
}

function crearGraficoGastosPorCategoria() {
    const ctx = document.getElementById('gastosCategoriaChart');
    if (!ctx) return;
    if (gastosCategoriaChartInstance) gastosCategoriaChartInstance.destroy();

    const gastosPorCategoria = {};
    gastos.forEach(gasto => {
        const categoria = gasto.categoria || 'Sin categoría';
        gastosPorCategoria[categoria] = (gastosPorCategoria[categoria] || 0) + parseFloat(gasto.mensual);
    });
    const totalGastos = Object.values(gastosPorCategoria).reduce((a, b) => a + b, 0);

    gastosCategoriaChartInstance = new Chart(ctx, {
        type: 'doughnut', // Cambiado a dona
        data: {
            labels: Object.keys(gastosPorCategoria),
            datasets: [{
                data: Object.values(gastosPorCategoria),
                backgroundColor: ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0', '#607D8B', '#FFEB3B', '#00BCD4'],
            }]
        },
        options: {
            responsive: true,
            cutout: '60%', // Hace el efecto de dona
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed;
                            const percentage = ((value / totalGastos) * 100).toFixed(2);
                            return `${context.label}: ${formatearNumero(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function crearGraficoFlujoEfectivo() {
    const ctx = document.getElementById('flujoEfectivoChart');
    if (!ctx) return;
    if (flujoEfectivoChartInstance) flujoEfectivoChartInstance.destroy();

    // Simulación de datos históricos (idealmente vendrían del backend)
    const meses = ['Hace 2 Meses', 'Mes Anterior', 'Mes Actual'];
    const totalIngresosActual = ingresos.reduce((sum, i) => sum + i.mensual, 0);
    const totalGastosActual = gastos.reduce((sum, g) => sum + g.mensual, 0);

    const ingresosData = [totalIngresosActual * 0.85, totalIngresosActual * 0.95, totalIngresosActual];
    const gastosData = [totalGastosActual * 0.9, totalGastosActual * 1.1, totalGastosActual];
    const balanceData = ingresosData.map((ing, i) => ing - gastosData[i]);

    flujoEfectivoChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [
                { type: 'bar', label: 'Ingresos', data: ingresosData, backgroundColor: 'rgba(75, 192, 192, 0.6)' },
                { type: 'bar', label: 'Gastos', data: gastosData, backgroundColor: 'rgba(255, 99, 132, 0.6)' },
                { type: 'line', label: 'Balance', data: balanceData, borderColor: '#FFC107', tension: 0.1, fill: false }
            ]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
}

function mostrarTopGastos() {
    const container = document.getElementById('topGastosContainer');
    if (!container) return;

    const topGastos = [...gastos]
        .sort((a, b) => b.mensual - a.mensual)
        .slice(0, 5);

    if (topGastos.length === 0) {
        container.innerHTML = '<p>No hay gastos registrados este mes.</p>';
        return;
    }

    container.innerHTML = topGastos.map(gasto => `
        <div class="top-gasto-item">
            <span class="gasto-concepto">${gasto.concepto}</span>
            <span class="gasto-monto">${formatearNumero(gasto.mensual)}</span>
        </div>
    `).join('');
}

function crearComparativaMensual() {
    const ctx = document.getElementById('comparativaMensualChart');
    if (!ctx) return;
    if (comparativaMensualChartInstance) comparativaMensualChartInstance.destroy();

    const totalGastos = gastos.reduce((sum, g) => sum + g.mensual, 0);
    const totalIngresos = ingresos.reduce((sum, i) => sum + i.mensual, 0);

    comparativaMensualChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Mes Anterior', 'Mes Actual'],
            datasets: [
                { label: 'Gastos', data: [totalGastos * 0.8, totalGastos], backgroundColor: '#F44336' },
                { label: 'Ingresos', data: [totalIngresos * 0.9, totalIngresos], backgroundColor: '#4CAF50' }
            ]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } },
            plugins: {
                datalabels: {
                    anchor: 'end', align: 'top',
                    formatter: (value) => formatearNumero(value),
                    color: '#555'
                }
            }
        }
    });
}

function crearProyeccionAhorros() {
    const ctx = document.getElementById('proyeccionAhorrosChart');
    if (!ctx) return;
    if (proyeccionAhorrosChartInstance) proyeccionAhorrosChartInstance.destroy();

    const ahorroActual = ingresos.reduce((sum, i) => sum + i.mensual, 0) - gastos.reduce((sum, g) => sum + g.mensual, 0);
    const proyeccion = [ahorroActual, ahorroActual * 2, ahorroActual * 3, ahorroActual * 4, ahorroActual * 7];

    proyeccionAhorrosChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Actual', 'Próximo mes', '2 meses', '3 meses', '6 meses'],
            datasets: [{
                label: 'Proyección de ahorros',
                data: proyeccion,
                borderColor: '#2196F3',
                tension: 0.1,
                fill: 'start',
                pointBackgroundColor: '#2196F3',
                pointRadius: 5,
                backgroundColor: 'rgba(33, 150, 243, 0.1)'
            }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
}

function cargarAlertas() {
    const alertasContainer = document.getElementById('alertasContainer');
    if (!alertasContainer) return;

    alertasContainer.innerHTML = '';
    const alertasPresupuesto = verificarAlertasPresupuesto();
    const alertasGastos = verificarGastosInusuales();
    const todasAlertas = [...alertasPresupuesto, ...alertasGastos];

    if (todasAlertas.length === 0) {
        alertasContainer.innerHTML = '<p>No hay alertas en este momento. ¡Buen trabajo!</p>';
        return;
    }

    todasAlertas.forEach(alerta => {
        const div = document.createElement('div');
        let icon = 'ℹ️';
        if (alerta.tipo === 'critica') icon = '❗';
        if (alerta.tipo === 'advertencia') icon = '⚠️';

        div.className = `alerta-item ${alerta.tipo}`;
        div.innerHTML = `<span class="alerta-icon">${icon}</span> ${alerta.mensaje}`;
        alertasContainer.appendChild(div);
    });
}

function verificarAlertasPresupuesto() {
    const alertas = [];
    for (const [categoria, presupuesto] of Object.entries(presupuestos)) {
        const gastoCategoria = gastos
            .filter(g => g.categoria === categoria)
            .reduce((total, g) => total + parseFloat(g.mensual), 0);

        const porcentaje = (gastoCategoria / presupuesto) * 100;

        if (porcentaje >= 90) {
            alertas.push({
                tipo: 'critica',
                mensaje: `Has gastado el ${Math.round(porcentaje)}% de tu presupuesto de ${categoria}.`
            });
        } else if (porcentaje >= 75) {
            alertas.push({
                tipo: 'advertencia',
                mensaje: `Has gastado el ${Math.round(porcentaje)}% de tu presupuesto de ${categoria}.`
            });
        }
    }
    return alertas;
}

function verificarGastosInusuales() {
    const alertas = [];
    const totalGastos = gastos.reduce((sum, g) => sum + g.mensual, 0);
    const gastoPromedio = totalGastos / Math.max(gastos.length, 1);

    gastos.forEach(gasto => {
        if (gasto.mensual > gastoPromedio * 2 && gasto.mensual > 500) { // Gasto > 2x promedio y significativo
            alertas.push({
                tipo: 'info',
                mensaje: `Gasto inusual detectado: ${gasto.concepto} (${formatearNumero(gasto.mensual)})`
            });
        }
    });
    return alertas;
}

function irAHome() {
    window.location.href = 'index.html';
}
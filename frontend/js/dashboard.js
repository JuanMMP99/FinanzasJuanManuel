// dashboard.js

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
});

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
let authToken = localStorage.getItem('authToken');

// Variables globales
let gastos = [];
let ingresos = [];
let presupuestos = {};

// Instancias de gráficos
let gastosCategoriaChartInstance = null;
let comparativaMensualChartInstance = null;
let proyeccionAhorrosChartInstance = null;
let flujoEfectivoChartInstance = null;

// Paleta de colores unificada para los gráficos
const CHART_COLORS = {
    red: 'rgba(255, 99, 132, 0.8)',
    green: 'rgba(75, 192, 192, 0.8)',
    yellow: 'rgba(255, 206, 86, 0.8)',
    blue: 'rgba(54, 162, 235, 0.8)',
    purple: 'rgba(153, 102, 255, 0.8)',
    orange: 'rgba(255, 159, 64, 0.8)',
    grey: 'rgba(201, 203, 207, 0.8)',
    pink: 'rgba(255, 105, 180, 0.8)'
};

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
        const [gastosResponse, ingresosResponse, historicoResponse, presupuestosResponse] = await Promise.all([
            makeAuthenticatedRequest(`${API_BASE}/api/gastos`),
            makeAuthenticatedRequest(`${API_BASE}/api/ingresos`),
            makeAuthenticatedRequest(`${API_BASE}/api/dashboard/historico`),
            makeAuthenticatedRequest(`${API_BASE}/api/presupuestos`)
        ]);

        if (gastosResponse.ok) gastos = await gastosResponse.json();
        if (ingresosResponse.ok) ingresos = await ingresosResponse.json();
        if (presupuestosResponse.ok) presupuestos = await presupuestosResponse.json();
        const historico = historicoResponse.ok ? await historicoResponse.json() : {};

        inicializarDashboard(historico);

    } catch (error) {
        console.error('Error cargando datos del dashboard:', error);
        showToast('Error al cargar los datos del dashboard', 'error');
    } finally {
        showLoading(false);
    }
}

function inicializarDashboard(historico) {
    crearGraficoGastosPorCategoria();
    crearComparativaMensual(historico);
    crearProyeccionAhorros();
    crearGraficoFlujoEfectivo(historico);
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
                backgroundColor: Object.values(CHART_COLORS),
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

function crearGraficoFlujoEfectivo(historico) {
    const ctx = document.getElementById('flujoEfectivoChart');
    if (!ctx) return;
    if (flujoEfectivoChartInstance) flujoEfectivoChartInstance.destroy();

    const meses = Object.keys(historico).sort(); // Ordenar de más antiguo a más reciente
    const labels = meses.map(mes => {
        const [anio, mesNum] = mes.split('-');
        return new Date(anio, mesNum - 1).toLocaleString('es-MX', { month: 'long' });
    });

    const ingresosData = meses.map(mes => historico[mes].ingresos);
    const gastosData = meses.map(mes => historico[mes].gastos);
    const balanceData = ingresosData.map((ing, i) => ing - gastosData[i]);

    flujoEfectivoChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { type: 'bar', label: 'Ingresos', data: ingresosData, backgroundColor: CHART_COLORS.green },
                { type: 'bar', label: 'Gastos', data: gastosData, backgroundColor: CHART_COLORS.red },
                { type: 'line', label: 'Balance', data: balanceData, borderColor: CHART_COLORS.yellow, tension: 0.1, fill: false }
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

function crearComparativaMensual(historico) {
    const ctx = document.getElementById('comparativaMensualChart');
    if (!ctx) return;
    if (comparativaMensualChartInstance) comparativaMensualChartInstance.destroy();

    const meses = Object.keys(historico).sort();
    const mesActualKey = meses[meses.length - 1] || '';
    const mesAnteriorKey = meses[meses.length - 2] || '';

    const gastosData = [historico[mesAnteriorKey]?.gastos || 0, historico[mesActualKey]?.gastos || 0];
    const ingresosData = [historico[mesAnteriorKey]?.ingresos || 0, historico[mesActualKey]?.ingresos || 0];

    comparativaMensualChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Mes Anterior', 'Mes Actual'],
            datasets: [
                { label: 'Gastos', data: gastosData, backgroundColor: CHART_COLORS.red },
                { label: 'Ingresos', data: ingresosData, backgroundColor: CHART_COLORS.green }
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
                borderColor: CHART_COLORS.blue,
                tension: 0.1,
                fill: 'start',
                pointBackgroundColor: CHART_COLORS.blue,
                pointRadius: 5,
                backgroundColor: CHART_COLORS.blue.replace('0.8', '0.2') // Usamos el mismo color pero más transparente
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
    const todasAlertas = [...alertasPresupuesto];

    if (todasAlertas.length === 0) {
        alertasContainer.innerHTML = '<p>No hay alertas en este momento. ¡Buen trabajo!</p>';
        return;
    }

    todasAlertas.forEach(alerta => {
        const div = document.createElement('div');
        let icon = 'ℹ️';
        let tipoClase = 'info';
        if (alerta.tipo === 'critica') {
            icon = '❗';
            tipoClase = 'critica';
        }
        if (alerta.tipo === 'advertencia') {
            icon = '⚠️';
            tipoClase = 'advertencia';
        }

        div.className = `alerta-item ${tipoClase}`;
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

function irAHome() {
    window.location.href = 'index.html';
}
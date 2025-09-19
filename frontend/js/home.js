// app.js

// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', function() {
  checkAuth();
});

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
let authToken = localStorage.getItem('authToken');

// Variables globales
let gastos = [];
let ingresos = [];
let tipoPendiente = null;
let datosPendientes = null;
let presupuestos = JSON.parse(localStorage.getItem('presupuestos')) || {};
let metas = JSON.parse(localStorage.getItem('metas')) || [];

function checkAuth() {
  if (!authToken) {
    window.location.href = '/login';
    return;
  }

  // Verificar token con el servidor
  fetch(`${API_BASE}/api/auth/verify`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Token inválido');
    }
    return response.json();
  })
  .then(data => {
    // Token válido, cargar datos del usuario
    loadUserData();
    cargarDatos();
  })
  .catch(error => {
    console.error('Error de autenticación:', error);
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.href = '/login';
  });
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

function showLoading() {
  document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loading-overlay').style.display = 'none';
}

function makeAuthenticatedRequest(url, options = {}) {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    }
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {})
    }
  };

  return fetch(url, mergedOptions)
    .then(response => {
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = '/login';
        throw new Error('No autorizado');
      }
      return response;
    });
}

function formatearNumero(num) {
  return '$' + num.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

async function cargarDatos() {
  showLoading();
  try {
    await Promise.all([cargarGastos(), cargarIngresos()]);
    actualizarResumen();
    inicializarDashboard();
    cargarPresupuestos();
    cargarMetas();
    verificarRecordatorios();
  } catch (error) {
    console.error('Error cargando datos:', error);
    alert('Error al cargar los datos');
  } finally {
    hideLoading();
  }
}

async function cargarGastos() {
  try {
    const response = await makeAuthenticatedRequest(`${API_BASE}/api/gastos`);
    if (response.ok) {
      gastos = await response.json();
      mostrarGastos();
      return calcularTotalGastos();
    }
  } catch (error) {
    console.error('Error cargando gastos:', error);
    throw error;
  }
}

async function cargarIngresos() {
  try {
    const response = await makeAuthenticatedRequest(`${API_BASE}/api/ingresos`);
    if (response.ok) {
      ingresos = await response.json();
      mostrarIngresos();
      return calcularTotalIngresos();
    }
  } catch (error) {
    console.error('Error cargando ingresos:', error);
    throw error;
  }
}

function mostrarGastos() {
  const tbody = document.querySelector('#tabla-gastos tbody');
  tbody.innerHTML = '';
  
  gastos.forEach(g => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${g.concepto}</td>
      <td>
        <select class="categoria-select" data-id="${g.id}" onchange="actualizarCategoria('gasto', ${g.id}, this.value)">
          <option value="comida" ${g.categoria === 'comida' ? 'selected' : ''}>Comida</option>
          <option value="transporte" ${g.categoria === 'transporte' ? 'selected' : ''}>Transporte</option>
          <option value="vivienda" ${g.categoria === 'vivienda' ? 'selected' : ''}>Vivienda</option>
          <option value="servicios" ${g.categoria === 'servicios' ? 'selected' : ''}>Servicios</option>
          <option value="entretenimiento" ${g.categoria === 'entretenimiento' ? 'selected' : ''}>Entretenimiento</option>
          <option value="salud" ${g.categoria === 'salud' ? 'selected' : ''}>Salud</option>
          <option value="educacion" ${g.categoria === 'educacion' ? 'selected' : ''}>Educación</option>
          <option value="otros" ${g.categoria === 'otros' || !g.categoria ? 'selected' : ''}>Otros</option>
        </select>
      </td>
      <td class="amount">${formatearNumero(g.semanal)}</td>
      <td class="amount">${formatearNumero(g.mensual)}</td>
      <td class="table-actions">
        <button class="btn-edit" onclick="window.location.href='editar.html?tipo=gasto&id=${g.id}'">Editar</button>
        <button class="btn-delete" onclick="eliminarRegistro('gastos', ${g.id})">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function mostrarIngresos() {
  const tbody = document.querySelector('#tabla-ingresos tbody');
  tbody.innerHTML = '';
  
  ingresos.forEach(i => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i.concepto}</td>
      <td>
        <select class="categoria-select" data-id="${i.id}" onchange="actualizarCategoria('ingreso', ${i.id}, this.value)">
          <option value="salario" ${i.categoria === 'salario' ? 'selected' : ''}>Salario</option>
          <option value="freelance" ${i.categoria === 'freelance' ? 'selected' : ''}>Freelance</option>
          <option value="inversiones" ${i.categoria === 'inversiones' ? 'selected' : ''}>Inversiones</option>
          <option value="regalos" ${i.categoria === 'regalos' ? 'selected' : ''}>Regalos</option>
          <option value="otros" ${i.categoria === 'otros' || !i.categoria ? 'selected' : ''}>Otros</option>
        </select>
      </td>
      <td class="amount">${formatearNumero(i.semanal)}</td>
      <td class="amount">${formatearNumero(i.mensual)}</td>
      <td>
        <button class="btn-edit" onclick="window.location.href='editar.html?tipo=ingreso&id=${i.id}'">Editar</button>
        <button class="btn-delete" onclick="eliminarRegistro('ingresos', ${i.id})">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function calcularTotalGastos() {
  let totalSemanal = 0;
  let totalMensual = 0;
  
  gastos.forEach(g => {
    totalSemanal += parseFloat(g.semanal) || 0;
    totalMensual += parseFloat(g.mensual) || 0;
  });
  
  document.getElementById('total-gasto-semanal').textContent = formatearNumero(totalSemanal);
  document.getElementById('total-gasto-mensual').textContent = formatearNumero(totalMensual);
  return totalMensual;
}

function calcularTotalIngresos() {
  let totalSemanal = 0;
  let totalMensual = 0;
  
  ingresos.forEach(i => {
    totalSemanal += parseFloat(i.semanal) || 0;
    totalMensual += parseFloat(i.mensual) || 0;
  });
  
  document.getElementById('total-ingreso-semanal').textContent = formatearNumero(totalSemanal);
  document.getElementById('total-ingreso-mensual').textContent = formatearNumero(totalMensual);
  return totalMensual;
}

function actualizarResumen() {
  const totalGastos = calcularTotalGastos();
  const totalIngresos = calcularTotalIngresos();
  const ganancias = totalIngresos - totalGastos;

  document.getElementById('resumen-gastos').textContent = formatearNumero(totalGastos);
  document.getElementById('resumen-ingresos').textContent = formatearNumero(totalIngresos);
  const gananciasElem = document.getElementById('resumen-ganancias');
  gananciasElem.textContent = formatearNumero(ganancias);
  gananciasElem.style.color = ganancias >= 0 ? '#145a32' : '#c0392b';
}

async function eliminarRegistro(tabla, id) {
  if (!confirm('¿Seguro que deseas eliminar este registro?')) return;
  
  showLoading();
  try {
    const response = await makeAuthenticatedRequest(`${API_BASE}/api/${tabla}/${id}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      if (tabla === 'gastos') {
        gastos = gastos.filter(g => g.id !== id);
        mostrarGastos();
      } else {
        ingresos = ingresos.filter(i => i.id !== id);
        mostrarIngresos();
      }
      actualizarResumen();
      inicializarDashboard();
    } else {
      const error = await response.json();
      alert('Error al eliminar: ' + (error.error || 'Error desconocido'));
    }
  } catch (error) {
    console.error('Error eliminando registro:', error);
    alert('Error al eliminar el registro');
  } finally {
    hideLoading();
  }
}

function confirmarNuevo(tipo) {
  tipoPendiente = tipo;
  let concepto, categoria, semanal, mensual;
  
  if (tipo === 'gasto') {
    concepto = document.getElementById('nuevo-gasto-concepto').value.trim();
    categoria = document.getElementById('nuevo-gasto-categoria').value;
    semanal = parseFloat(document.getElementById('nuevo-gasto-semanal').value) || 0;
    mensual = parseFloat(document.getElementById('nuevo-gasto-mensual').value) || 0;
  } else {
    concepto = document.getElementById('nuevo-ingreso-concepto').value.trim();
    categoria = document.getElementById('nuevo-ingreso-categoria').value;
    semanal = parseFloat(document.getElementById('nuevo-ingreso-semanal').value) || 0;
    mensual = parseFloat(document.getElementById('nuevo-ingreso-mensual').value) || 0;
  }

  if (!concepto) {
    alert('Por favor, ingresa el concepto.');
    return;
  }
  
  if (semanal > 0 && mensual === 0) {
    mensual = semanal * 4;
  } else if (mensual > 0 && semanal === 0) {
    semanal = mensual / 4;
  } else if (semanal === 0 && mensual === 0) {
    alert('Por favor, ingresa al menos un valor.');
    return;
  }

  datosPendientes = { 
    concepto, 
    categoria,
    semanal: Math.round(semanal * 100) / 100, 
    mensual: Math.round(mensual * 100) / 100 
  };

  document.getElementById('modal-detalle').innerHTML = `
    <strong>Concepto:</strong> ${concepto}<br>
    <strong>Categoría:</strong> ${categoria || 'Sin categoría'}<br>
    <strong>Semanal:</strong> ${formatearNumero(datosPendientes.semanal)}<br>
    <strong>Mensual:</strong> ${formatearNumero(datosPendientes.mensual)}
  `;
  document.getElementById('modal-confirmacion').style.display = 'flex';
}

async function guardarRegistro() {
  if (!datosPendientes) return;
  
  showLoading();
  try {
    const response = await makeAuthenticatedRequest(`${API_BASE}/api/${tipoPendiente}s`, {
      method: 'POST',
      body: JSON.stringify(datosPendientes)
    });

    if (response.ok) {
      const nuevoRegistro = await response.json();
      
      if (tipoPendiente === 'gasto') {
        gastos.unshift(nuevoRegistro);
        mostrarGastos();
        document.getElementById('nuevo-gasto-concepto').value = '';
        document.getElementById('nuevo-gasto-categoria').value = '';
        document.getElementById('nuevo-gasto-semanal').value = '';
        document.getElementById('nuevo-gasto-mensual').value = '';
      } else {
        ingresos.unshift(nuevoRegistro);
        mostrarIngresos();
        document.getElementById('nuevo-ingreso-concepto').value = '';
        document.getElementById('nuevo-ingreso-categoria').value = '';
        document.getElementById('nuevo-ingreso-semanal').value = '';
        document.getElementById('nuevo-ingreso-mensual').value = '';
      }
      
      actualizarResumen();
      inicializarDashboard();
      cerrarModal();
    } else {
      const error = await response.json();
      alert('Error al guardar: ' + (error.error || 'Error desconocido'));
    }
  } catch (error) {
    console.error('Error guardando registro:', error);
    alert('Error al guardar el registro');
  } finally {
    hideLoading();
  }
}

function cerrarModal() {
  document.getElementById('modal-confirmacion').style.display = 'none';
  tipoPendiente = null;
  datosPendientes = null;
}

// Cerrar modal al hacer clic fuera de él
document.getElementById('modal-confirmacion').addEventListener('click', function(e) {
  if (e.target === this) {
    cerrarModal();
  }
});

function irADespensa() {
  window.location.href = '/despensa.html';
}

// Funciones para el dashboard mejorado
function inicializarDashboard() {
  crearGraficoGastosPorCategoria();
  crearComparativaMensual();
  crearProyeccionAhorros();
  cargarAlertas();
}

function crearGraficoGastosPorCategoria() {
  const ctx = document.getElementById('gastosCategoriaChart');
  if (!ctx) return;
  
  // Agrupar gastos por categoría
  const gastosPorCategoria = {};
  gastos.forEach(gasto => {
    const categoria = gasto.categoria || 'Sin categoría';
    if (!gastosPorCategoria[categoria]) {
      gastosPorCategoria[categoria] = 0;
    }
    gastosPorCategoria[categoria] += parseFloat(gasto.mensual);
  });
  
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(gastosPorCategoria),
      datasets: [{
        data: Object.values(gastosPorCategoria),
        backgroundColor: [
          '#4CAF50', '#2196F3', '#FF9800', '#F44336', 
          '#9C27B0', '#607D8B', '#FFEB3B', '#00BCD4'
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

function crearComparativaMensual() {
  const ctx = document.getElementById('comparativaMensualChart');
  if (!ctx) return;
  
  // Datos de ejemplo (deberías obtener datos reales de meses anteriores)
  const meses = ['Mes Anterior', 'Mes Actual'];
  const gastosData = [calcularTotalGastos() * 0.8, calcularTotalGastos()];
  const ingresosData = [calcularTotalIngresos() * 0.9, calcularTotalIngresos()];
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: meses,
      datasets: [
        {
          label: 'Gastos',
          data: gastosData,
          backgroundColor: '#F44336'
        },
        {
          label: 'Ingresos',
          data: ingresosData,
          backgroundColor: '#4CAF50'
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function crearProyeccionAhorros() {
  const ctx = document.getElementById('proyeccionAhorrosChart');
  if (!ctx) return;
  
  const meses = ['Actual', 'Próximo mes', '2 meses', '3 meses', '6 meses'];
  const ahorroActual = calcularTotalIngresos() - calcularTotalGastos();
  const proyeccion = [
    ahorroActual,
    ahorroActual * 2,
    ahorroActual * 3,
    ahorroActual * 4,
    ahorroActual * 7
  ];
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: meses,
      datasets: [{
        label: 'Proyección de ahorros',
        data: proyeccion,
        borderColor: '#2196F3',
        tension: 0.1,
        fill: true,
        backgroundColor: 'rgba(33, 150, 243, 0.1)'
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function cargarAlertas() {
  const alertasContainer = document.getElementById('alertasContainer');
  if (!alertasContainer) return;
  
  alertasContainer.innerHTML = '';
  
  // Alertas de presupuesto
  const alertasPresupuesto = verificarAlertasPresupuesto();
  
  // Alertas de gastos inusuales
  const alertasGastos = verificarGastosInusuales();
  
  // Combinar todas las alertas
  const todasAlertas = [...alertasPresupuesto, ...alertasGastos];
  
  if (todasAlertas.length === 0) {
    alertasContainer.innerHTML = '<p>No hay alertas en este momento.</p>';
    return;
  }
  
  todasAlertas.forEach(alerta => {
    const div = document.createElement('div');
    div.className = `alerta-item ${alerta.tipo}`;
    div.textContent = alerta.mensaje;
    alertasContainer.appendChild(div);
  });
}

function verificarAlertasPresupuesto() {
  const alertas = [];
  
  // Verificar cada categoría de presupuesto
  for (const [categoria, presupuesto] of Object.entries(presupuestos)) {
    const gastoCategoria = gastos
      .filter(g => g.categoria === categoria)
      .reduce((total, g) => total + parseFloat(g.mensual), 0);
    
    const porcentaje = (gastoCategoria / presupuesto) * 100;
    
    if (porcentaje >= 90) {
      alertas.push({
        tipo: 'critica',
        mensaje: `¡Cuidado! Has gastado el ${Math.round(porcentaje)}% de tu presupuesto de ${categoria}.`
      });
    } else if (porcentaje >= 75) {
      alertas.push({
        tipo: 'advertencia',
        mensaje: `Atención: Has gastado el ${Math.round(porcentaje)}% de tu presupuesto de ${categoria}.`
      });
    }
  }
  
  return alertas;
}

function verificarGastosInusuales() {
  const alertas = [];
  const gastoPromedio = calcularTotalGastos() / Math.max(gastos.length, 1);
  
  // Buscar gastos inusuales (50% más altos que el promedio)
  gastos.forEach(gasto => {
    const monto = parseFloat(gasto.mensual);
    if (monto > gastoPromedio * 1.5) {
      alertas.push({
        tipo: 'info',
        mensaje: `Gasto inusual detectado: ${gasto.concepto} (${formatearNumero(monto)})`
      });
    }
  });
  
  return alertas;
}

// Funciones para categorías
async function actualizarCategoria(tipo, id, categoria) {
  try {
    const response = await makeAuthenticatedRequest(`${API_BASE}/api/${tipo}s/${id}/categoria`, {
      method: 'PUT',
      body: JSON.stringify({ categoria })
    });
    
    if (response.ok) {
      // Actualizar localmente
      if (tipo === 'gasto') {
        const index = gastos.findIndex(g => g.id === id);
        if (index !== -1) gastos[index].categoria = categoria;
      } else {
        const index = ingresos.findIndex(i => i.id === id);
        if (index !== -1) ingresos[index].categoria = categoria;
      }
      
      // Actualizar dashboard
      inicializarDashboard();
      cargarPresupuestos();
    }
  } catch (error) {
    console.error('Error actualizando categoría:', error);
  }
}

// Funciones para presupuestos
function cargarPresupuestos() {
  const presupuestosContainer = document.getElementById('presupuestosContainer');
  if (!presupuestosContainer) return;
  
  presupuestosContainer.innerHTML = '';
  
  if (Object.keys(presupuestos).length === 0) {
    presupuestosContainer.innerHTML = '<p>No hay presupuestos configurados.</p>';
    return;
  }
  
  for (const [categoria, monto] of Object.entries(presupuestos)) {
    const gastoCategoria = gastos
      .filter(g => g.categoria === categoria)
      .reduce((total, g) => total + parseFloat(g.mensual), 0);
    
    const porcentaje = (gastoCategoria / monto) * 100;
    let claseProgreso = '';
    
    if (porcentaje >= 90) {
      claseProgreso = 'peligro';
    } else if (porcentaje >= 75) {
      claseProgreso = 'advertencia';
    }
    
    const div = document.createElement('div');
    div.className = 'presupuesto-item';
    div.innerHTML = `
      <div>
        <strong>${categoria}</strong>
        <div>${formatearNumero(gastoCategoria)} / ${formatearNumero(monto)}</div>
      </div>
      <div>${Math.round(porcentaje)}%</div>
      <div class="barra-progreso">
        <div class="progreso ${claseProgreso}" style="width: ${Math.min(porcentaje, 100)}%"></div>
      </div>
    `;
    
    presupuestosContainer.appendChild(div);
  }
}

function mostrarModalPresupuesto() {
  document.getElementById('modal-presupuesto').style.display = 'flex';
}

function cerrarModalPresupuesto() {
  document.getElementById('modal-presupuesto').style.display = 'none';
}

function guardarPresupuesto() {
  const categoria = document.getElementById('presupuesto-categoria').value;
  const monto = parseFloat(document.getElementById('presupuesto-monto').value);
  
  if (!categoria || isNaN(monto) || monto <= 0) {
    alert('Por favor, completa todos los campos correctamente.');
    return;
  }
  
  presupuestos[categoria] = monto;
  localStorage.setItem('presupuestos', JSON.stringify(presupuestos));
  
  cargarPresupuestos();
  cargarAlertas();
  cerrarModalPresupuesto();
}

// Funciones para metas
function cargarMetas() {
  const metasContainer = document.getElementById('metasContainer');
  if (!metasContainer) return;
  
  metasContainer.innerHTML = '';
  
  if (metas.length === 0) {
    metasContainer.innerHTML = '<p>No hay metas establecidas.</p>';
    return;
  }
  
  const ahorroActual = calcularTotalIngresos() - calcularTotalGastos();
  
  metas.forEach((meta, index) => {
    const porcentaje = (ahorroActual / meta.monto) * 100;
    const div = document.createElement('div');
    div.className = 'meta-item';
    div.innerHTML = `
      <div>
        <strong>${meta.nombre}</strong>
        <div>${formatearNumero(ahorroActual)} / ${formatearNumero(meta.monto)}</div>
      </div>
      <div>${Math.min(Math.round(porcentaje), 100)}%</div>
      <button class="btn-danger" onclick="eliminarMeta(${index})">Eliminar</button>
    `;
    
    metasContainer.appendChild(div);
  });
}

function mostrarModalMeta() {
  document.getElementById('modal-meta').style.display = 'flex';
}

function cerrarModalMeta() {
  document.getElementById('modal-meta').style.display = 'none';
}

function guardarMeta() {
  const nombre = document.getElementById('meta-nombre').value.trim();
  const monto = parseFloat(document.getElementById('meta-monto').value);
  const fecha = document.getElementById('meta-fecha').value;
  
  if (!nombre || isNaN(monto) || monto <= 0 || !fecha) {
    alert('Por favor, completa todos los campos correctamente.');
    return;
  }
  
  metas.push({
    nombre,
    monto,
    fecha
  });
  
  localStorage.setItem('metas', JSON.stringify(metas));
  
  cargarMetas();
  cerrarModalMeta();
}

function eliminarMeta(index) {
  if (confirm('¿Estás seguro de eliminar esta meta?')) {
    metas.splice(index, 1);
    localStorage.setItem('metas', JSON.stringify(metas));
    cargarMetas();
  }
}

// Funciones para recordatorios
function verificarRecordatorios() {
  // Verificar recordatorios de pago de servicios (ejemplo: día 10 de cada mes)
  const hoy = new Date();
  if (hoy.getDate() === 10) {
    mostrarNotificacion('Recordatorio: Hoy es día de pago de servicios.', 'info');
  }
  
  // Verificar metas próximas a vencer (menos de 7 días)
  metas.forEach(meta => {
    const fechaMeta = new Date(meta.fecha);
    const diffTime = fechaMeta - hoy;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7 && diffDays >= 0) {
      mostrarNotificacion(`Meta "${meta.nombre}" está próxima a vencer en ${diffDays} días.`, 'advertencia');
    }
  });
}

function mostrarNotificacion(mensaje, tipo) {
  // Crear notificación visual
  const notificacion = document.createElement('div');
  notificacion.className = `alerta-item ${tipo}`;
  notificacion.textContent = mensaje;
  notificacion.style.position = 'fixed';
  notificacion.style.top = '20px';
  notificacion.style.right = '20px';
  notificacion.style.zIndex = '10000';
  notificacion.style.maxWidth = '300px';
  
  document.body.appendChild(notificacion);
  
  // Eliminar después de 5 segundos
  setTimeout(() => {
    notificacion.remove();
  }, 5000);
}

// Cerrar modales al hacer clic fuera de ellos
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
  }
});
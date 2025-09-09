// app.js

// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', function() {
  checkAuth();
});

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
let authToken = localStorage.getItem('authToken');

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

// Variables globales
let gastos = [];
let ingresos = [];
let tipoPendiente = null;
let datosPendientes = null;

function formatearNumero(num) {
  return '$' + num.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

async function cargarDatos() {
  showLoading();
  try {
    await Promise.all([cargarGastos(), cargarIngresos()]);
    actualizarResumen();
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
      <td class="amount">${formatearNumero(g.semanal)}</td>
      <td class="amount">${formatearNumero(g.mensual)}</td>
      <td><button class="btn-delete" onclick="eliminarRegistro('gastos', ${g.id})">Eliminar</button></td>
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
      <td class="amount">${formatearNumero(i.semanal)}</td>
      <td class="amount">${formatearNumero(i.mensual)}</td>
      <td><button class="btn-delete" onclick="eliminarRegistro('ingresos', ${i.id})">Eliminar</button></td>
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
  let concepto, semanal, mensual;
  
  if (tipo === 'gasto') {
    concepto = document.getElementById('nuevo-gasto-concepto').value.trim();
    semanal = parseFloat(document.getElementById('nuevo-gasto-semanal').value) || 0;
    mensual = parseFloat(document.getElementById('nuevo-gasto-mensual').value) || 0;
  } else {
    concepto = document.getElementById('nuevo-ingreso-concepto').value.trim();
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
    semanal: Math.round(semanal * 100) / 100, 
    mensual: Math.round(mensual * 100) / 100 
  };

  document.getElementById('modal-detalle').innerHTML = `
    <strong>Concepto:</strong> ${concepto}<br>
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
        document.getElementById('nuevo-gasto-semanal').value = '';
        document.getElementById('nuevo-gasto-mensual').value = '';
      } else {
        ingresos.unshift(nuevoRegistro);
        mostrarIngresos();
        document.getElementById('nuevo-ingreso-concepto').value = '';
        document.getElementById('nuevo-ingreso-semanal').value = '';
        document.getElementById('nuevo-ingreso-mensual').value = '';
      }
      
      actualizarResumen();
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
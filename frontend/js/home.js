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
let presupuestos = {}; // Se cargará desde la API
let metas = []; // Se cargará desde la API

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
    // Cargamos todo en paralelo para mayor eficiencia
    await Promise.all([
      cargarGastos(), 
      cargarIngresos(), 
      cargarPresupuestosDesdeAPI(), 
      cargarMetasDesdeAPI()
    ]);
    actualizarResumen();
    verificarRecordatorios();
  } catch (error) {
    console.error('Error cargando datos:', error);
    showToast('Error al cargar los datos', 'error');
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

async function cargarPresupuestosDesdeAPI() {
  try {
    const response = await makeAuthenticatedRequest(`${API_BASE}/api/presupuestos`);
    if (response.ok) {
      presupuestos = await response.json();
      renderizarPresupuestos(); // Renombramos la función para evitar confusión
    }
  } catch (error) {
    console.error('Error cargando presupuestos:', error);
  }
}

async function cargarMetasDesdeAPI() {
  try {
    const response = await makeAuthenticatedRequest(`${API_BASE}/api/metas`);
    if (response.ok) {
      metas = await response.json();
      renderizarMetas(); // Renombramos la función para evitar confusión
    }
  } catch (error) {
    console.error('Error cargando metas:', error);
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
          <option value="despensa" ${g.categoria === 'despensa' ? 'selected' : ''}>Despensa</option>
          <option value="salud" ${g.categoria === 'salud' ? 'selected' : ''}>Salud</option>
          <option value="educacion" ${g.categoria === 'educacion' ? 'selected' : ''}>Educación</option>
          <option value="otros" ${g.categoria === 'otros' || !g.categoria ? 'selected' : ''}>Otros</option>
        </select>
      </td>
      <td class="amount">${formatearNumero(g.semanal)}</td>
      <td class="amount">${formatearNumero(g.mensual)}</td>
      <td class="table-actions">
        <button class="btn-icon" title="Editar" onclick="window.location.href='editar.html?tipo=gasto&id=${g.id}'">✏️</button>
        <button class="btn-icon" title="Eliminar" onclick="eliminarRegistro('gastos', ${g.id})">🗑️</button>
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
        <button class="btn-icon" title="Editar" onclick="window.location.href='editar.html?tipo=ingreso&id=${i.id}'">✏️</button>
        <button class="btn-icon" title="Eliminar" onclick="eliminarRegistro('ingresos', ${i.id})">🗑️</button>
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
  const confirmado = await showConfirm('Confirmar Eliminación', '¿Seguro que deseas eliminar este registro?');
  if (!confirmado) return;

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
      showToast('Registro eliminado correctamente', 'success');
    } else {
      const error = await response.json();
      showToast('Error al eliminar: ' + (error.error || 'Error desconocido'), 'error');
    }
  } catch (error) {
    console.error('Error eliminando registro:', error);
    showToast('Error al eliminar el registro', 'error');
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
    showToast('Por favor, ingresa el concepto.', 'info');
    return;
  }
  
  if (semanal > 0 && mensual === 0) {
    mensual = semanal * 4;
  } else if (mensual > 0 && semanal === 0) {
    semanal = mensual / 4;
  } else if (semanal === 0 && mensual === 0) {
    showToast('Por favor, ingresa al menos un valor.', 'info');
    return;
  }

  datosPendientes = { 
    concepto, 
    categoria,
    semanal: Math.round(semanal * 100) / 100,
    mensual: Math.round(mensual * 100) / 100,
    fecha_creacion: new Date().toISOString() // Añadimos la fecha de creación
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
      cerrarModal();
      showToast(`'${nuevoRegistro.concepto}' agregado exitosamente.`, 'success');
    } else {
      const error = await response.json();
      showToast('Error al guardar: ' + (error.error || 'Error desconocido'), 'error');
    }
  } catch (error) {
    console.error('Error guardando registro:', error);
    showToast('Error al guardar el registro', 'error');
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

function irADashboard() {
  window.location.href = '/dashboard.html';
}

async function logout() {
  const confirmado = await showConfirm('Cerrar Sesión', '¿Estás seguro que deseas cerrar sesión?');
  if (confirmado) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.href = '/login';
  }
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
      renderizarPresupuestos();
    }
  } catch (error) {
    console.error('Error actualizando categoría:', error);
  }
}

// Funciones para presupuestos
function renderizarPresupuestos() {
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

async function guardarPresupuesto() {
  const categoria = document.getElementById('presupuesto-categoria').value;
  const monto = parseFloat(document.getElementById('presupuesto-monto').value);
  
  if (!categoria || isNaN(monto) || monto <= 0) {
    showToast('Por favor, completa todos los campos correctamente.', 'info');
    return;
  }

  try {
    const response = await makeAuthenticatedRequest(`${API_BASE}/api/presupuestos`, {
      method: 'POST',
      body: JSON.stringify({ categoria, monto })
    });
    if (response.ok) {
      presupuestos[categoria] = monto; // Actualizar localmente
      renderizarPresupuestos();
      // cargarAlertas(); // Si tienes una función de alertas, llámala aquí
      showToast(`Presupuesto para '${categoria}' guardado.`, 'success');
      cerrarModalPresupuesto();
    }
  } catch (error) {
    console.error('Error guardando presupuesto:', error);
    showToast('No se pudo guardar el presupuesto.', 'error');
  }
}

// Funciones para metas
function renderizarMetas() {
  const metasContainer = document.getElementById('metasContainer');
  if (!metasContainer) return;
  
  metasContainer.innerHTML = '';
  
  if (metas.length === 0) {
    metasContainer.innerHTML = '<p>No hay metas establecidas.</p>';
    return;
  }
  
  const ahorroActual = calcularTotalIngresos() - calcularTotalGastos();

  metas.forEach(meta => {
    const porcentaje = (meta.monto_actual / meta.monto_objetivo) * 100;
    const div = document.createElement('div');
    div.className = 'meta-item';
    div.innerHTML = `
      <div>
        <strong>${meta.nombre}</strong>
        <div>${formatearNumero(meta.monto_actual)} / ${formatearNumero(meta.monto_objetivo)}</div>
        <div class="barra-progreso meta">
            <div class="progreso" style="width: ${Math.min(porcentaje, 100)}%"></div>
        </div>
      </div>
      <div class="meta-actions">
        <button class="btn-secondary" onclick="mostrarModalAsignar(${meta.id})">Asignar</button>
        <button class="btn-danger" onclick="eliminarMeta(${meta.id})">Eliminar</button>
      </div>
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

async function guardarMeta() {
  const nombre = document.getElementById('meta-nombre').value.trim();
  const monto_objetivo = parseFloat(document.getElementById('meta-monto').value);
  const fecha_objetivo = document.getElementById('meta-fecha').value;
  
  if (!nombre || isNaN(monto_objetivo) || monto_objetivo <= 0 || !fecha_objetivo) {
    showToast('Por favor, completa todos los campos correctamente.', 'info');
    return;
  }
  
  try {
    const response = await makeAuthenticatedRequest(`${API_BASE}/api/metas`, {
      method: 'POST',
      body: JSON.stringify({ nombre, monto_objetivo, fecha_objetivo })
    });
    if (response.ok) {
      const nuevaMeta = await response.json();
      metas.push(nuevaMeta); // Actualizar localmente
      renderizarMetas();
      showToast(`Meta '${nombre}' establecida.`, 'success');
      cerrarModalMeta();
    }
  } catch (error) {
    console.error('Error guardando meta:', error);
    showToast('No se pudo guardar la meta.', 'error');
  }
}

function mostrarModalAsignar(metaId) {
    const ahorroDisponible = calcularTotalIngresos() - calcularTotalGastos();
    document.getElementById('ahorro-disponible-meta').textContent = formatearNumero(ahorroDisponible);
    document.getElementById('asignar-meta-id').value = metaId;
    document.getElementById('asignar-monto').value = '';
    document.getElementById('modal-asignar-ahorro').style.display = 'flex';
}

async function guardarAsignacionAhorro() {
    const metaId = document.getElementById('asignar-meta-id').value;
    const monto = parseFloat(document.getElementById('asignar-monto').value);

    if (!metaId || isNaN(monto) || monto <= 0) {
        showToast('Por favor, ingresa un monto válido.', 'info');
        return;
    }

    try {
        const response = await makeAuthenticatedRequest(`${API_BASE}/api/metas/${metaId}/asignar`, {
            method: 'POST',
            body: JSON.stringify({ monto })
        });

        if (response.ok) {
            const metaIndex = metas.findIndex(m => m.id == metaId);
            if (metaIndex !== -1) {
                metas[metaIndex].monto_actual += monto;
            }
            renderizarMetas();
            showToast('Ahorro asignado a tu meta.', 'success');
            document.getElementById('modal-asignar-ahorro').style.display = 'none';
        }
    } catch (error) {
        console.error('Error asignando ahorro:', error);
        showToast('No se pudo asignar el ahorro.', 'error');
    }
}

async function eliminarMeta(id) {
  const confirmado = await showConfirm('Eliminar Meta', '¿Estás seguro de eliminar esta meta?');
  if (confirmado) {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/api/metas/${id}`, { method: 'DELETE' });
      if (response.ok) {
        metas = metas.filter(meta => meta.id !== id); // Actualizar localmente
        renderizarMetas();
        showToast('Meta eliminada.', 'success');
      }
    } catch (error) {
      console.error('Error eliminando meta:', error);
      showToast('No se pudo eliminar la meta.', 'error');
    }
  }
}

// Funciones para recordatorios
function verificarRecordatorios() {
  // Verificar recordatorios de pago de servicios (ejemplo: día 10 de cada mes)
  const hoy = new Date();
  if (hoy.getDate() === 10) {
    showToast('Recordatorio: Hoy es día de pago de servicios.', 'info');
  }
  
  // Verificar metas próximas a vencer (menos de 7 días)
  metas.forEach(meta => {
    const fechaMeta = new Date(meta.fecha_objetivo);
    const diffTime = fechaMeta - hoy;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7 && diffDays >= 0) {
      showToast(`Meta "${meta.nombre}" vence en ${diffDays} días.`, 'info');
    }
  });
}

// Cerrar modales al hacer clic fuera de ellos
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
  }
});
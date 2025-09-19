// Base de autenticación y utilidades
const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
let authToken = localStorage.getItem('authToken');
let gastos = [];
let ingresos = [];
let registroPendiente = null;
let tipoPendiente = null;

document.addEventListener('DOMContentLoaded', function() {
  checkAuth();
});

function checkAuth() {
  if (!authToken) return window.location.href = '/login';
  fetch(`${API_BASE}/api/auth/verify`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  })
  .then(r => r.ok ? r.json() : Promise.reject('Token inválido'))
  .then(() => { loadUserData(); cargarDatos(); })
  .catch(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.href = '/login';
  });
}

function loadUserData() {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  if (userData.nombre) document.getElementById('user-name').textContent = userData.nombre;
}

function logout() {
  if (confirm('¿Cerrar sesión?')) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.href = '/login';
  }
}

function showLoading() { document.getElementById('loading-overlay').style.display = 'flex'; }
function hideLoading() { document.getElementById('loading-overlay').style.display = 'none'; }

function makeAuthenticatedRequest(url, options = {}) {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    }
  };
  return fetch(url, {...defaultOptions, ...options})
    .then(r => {
      if (r.status === 401 || r.status === 403) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = '/login';
        throw new Error('No autorizado');
      }
      return r;
    });
}

// Cargar datos de gastos e ingresos
async function cargarDatos() {
  showLoading();
  try {
    const [gastosRes, ingresosRes] = await Promise.all([
      makeAuthenticatedRequest(`${API_BASE}/api/gastos`),
      makeAuthenticatedRequest(`${API_BASE}/api/ingresos`)
    ]);
    gastos = await gastosRes.json();
    ingresos = await ingresosRes.json();
    mostrarGastos();
    mostrarIngresos();
  } catch (err) {
    console.error(err); alert('Error cargando datos');
  } finally { hideLoading(); }
}

// Mostrar tablas
function mostrarGastos() {
  const tbody = document.querySelector('#tabla-gastos tbody');
  tbody.innerHTML = '';
  gastos.forEach(g => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${g.concepto}</td>
      <td>${g.semanal}</td>
      <td>${g.mensual}</td>
      <td>
        <button onclick="editarRegistro('gasto', ${g.id})">Editar</button>
        <button onclick="eliminarRegistro('gastos', ${g.id})">Eliminar</button>
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
      <td>${i.semanal}</td>
      <td>${i.mensual}</td>
      <td>
        <button onclick="editarRegistro('ingreso', ${i.id})">Editar</button>
        <button onclick="eliminarRegistro('ingresos', ${i.id})">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Editar registro
function editarRegistro(tipo, id) {
  tipoPendiente = tipo;
  registroPendiente = (tipo === 'gasto' ? gastos : ingresos).find(r => r.id === id);
  if (!registroPendiente) return;

  document.getElementById('edit-concepto').value = registroPendiente.concepto;
  document.getElementById('edit-semanal').value = registroPendiente.semanal;
  document.getElementById('edit-mensual').value = registroPendiente.mensual;
  document.getElementById('modal-edicion').style.display = 'flex';
}

function cerrarModal() {
  document.getElementById('modal-edicion').style.display = 'none';
  registroPendiente = null;
  tipoPendiente = null;
}

// Guardar edición
async function guardarEdicion() {
  if (!registroPendiente) return;

  const concepto = document.getElementById('edit-concepto').value.trim();
  const semanal = parseFloat(document.getElementById('edit-semanal').value) || 0;
  const mensual = parseFloat(document.getElementById('edit-mensual').value) || 0;

  if (!concepto || (semanal <= 0 && mensual <= 0)) {
    alert('Ingresa al menos un valor válido.');
    return;
  }

  const datos = { concepto, semanal, mensual };
  showLoading();
  try {
    const res = await makeAuthenticatedRequest(`${API_BASE}/api/${tipoPendiente}s/${registroPendiente.id}`, {
      method: 'PUT',
      body: JSON.stringify(datos)
    });
    if (res.ok) {
      const actualizado = await res.json();
      if (tipoPendiente === 'gasto') {
        gastos = gastos.map(g => g.id === actualizado.id ? actualizado : g);
        mostrarGastos();
      } else {
        ingresos = ingresos.map(i => i.id === actualizado.id ? actualizado : i);
        mostrarIngresos();
      }
      cerrarModal();
    } else {
      const error = await res.json();
      alert('Error: ' + (error.error || 'Error desconocido'));
    }
  } catch (err) {
    console.error(err);
    alert('Error guardando cambios');
  } finally { hideLoading(); }
}

// Eliminar registro (igual que home.js)
async function eliminarRegistro(tabla, id) {
  if (!confirm('¿Seguro que deseas eliminar este registro?')) return;
  showLoading();
  try {
    const res = await makeAuthenticatedRequest(`${API_BASE}/api/${tabla}/${id}`, { method: 'DELETE' });
    if (res.ok) {
      if (tabla === 'gastos') { gastos = gastos.filter(g => g.id !== id); mostrarGastos(); }
      else { ingresos = ingresos.filter(i => i.id !== id); mostrarIngresos(); }
    } else {
      const error = await res.json();
      alert('Error: ' + (error.error || 'Error desconocido'));
    }
  } catch (err) {
    console.error(err); alert('Error eliminando');
  } finally { hideLoading(); }
}

// Cerrar modal al hacer clic fuera
document.getElementById('modal-edicion').addEventListener('click', e => {
  if (e.target === e.currentTarget) cerrarModal();
});

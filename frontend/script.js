// script.js

// Base de datos en memoria
let gastos = JSON.parse(localStorage.getItem('finanzas-gastos') || '[]');
let ingresos = JSON.parse(localStorage.getItem('finanzas-ingresos') || '[]');
let nextIdGastos = Math.max(...gastos.map(g => g.id), 0) + 1;
let nextIdIngresos = Math.max(...ingresos.map(i => i.id), 0) + 1;

let tipoPendiente = null;
let datosPendientes = null;

function formatearNumero(num) {
  return '$' + num.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function guardarEnStorage() {
  localStorage.setItem('finanzas-gastos', JSON.stringify(gastos));
  localStorage.setItem('finanzas-ingresos', JSON.stringify(ingresos));
}

function cargarGastos() {
  const tbody = document.querySelector('#tabla-gastos tbody');
  tbody.innerHTML = '';
  let totalSemanal = 0;
  let totalMensual = 0;
  
  gastos.forEach(g => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${g.concepto}</td>
      <td class="amount">${formatearNumero(g.semanal)}</td>
      <td class="amount">${formatearNumero(g.mensual)}</td>
      <td><button class="btn-delete" onclick="eliminarRegistro('gastos', ${g.id})">Eliminar</button></td>
    `;
    tbody.appendChild(tr);
    totalSemanal += g.semanal;
    totalMensual += g.mensual;
  });
  
  document.getElementById('total-gasto-semanal').textContent = formatearNumero(totalSemanal);
  document.getElementById('total-gasto-mensual').textContent = formatearNumero(totalMensual);
  return totalMensual;
}

function cargarIngresos() {
  const tbody = document.querySelector('#tabla-ingresos tbody');
  tbody.innerHTML = '';
  let totalSemanal = 0;
  let totalMensual = 0;
  
  ingresos.forEach(i => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i.concepto}</td>
      <td class="amount">${formatearNumero(i.semanal)}</td>
      <td class="amount">${formatearNumero(i.mensual)}</td>
      <td><button class="btn-delete" onclick="eliminarRegistro('ingresos', ${i.id})">Eliminar</button></td>
    `;
    tbody.appendChild(tr);
    totalSemanal += i.semanal;
    totalMensual += i.mensual;
  });
  
  document.getElementById('total-ingreso-semanal').textContent = formatearNumero(totalSemanal);
  document.getElementById('total-ingreso-mensual').textContent = formatearNumero(totalMensual);
  return totalMensual;
}

function actualizarResumen() {
  const totalGastos = cargarGastos();
  const totalIngresos = cargarIngresos();
  const ganancias = totalIngresos - totalGastos;

  document.getElementById('resumen-gastos').textContent = formatearNumero(totalGastos);
  document.getElementById('resumen-ingresos').textContent = formatearNumero(totalIngresos);
  const gananciasElem = document.getElementById('resumen-ganancias');
  gananciasElem.textContent = formatearNumero(ganancias);
  gananciasElem.style.color = ganancias >= 0 ? '#145a32' : '#c0392b';
}

function eliminarRegistro(tabla, id) {
  if (!confirm('¿Seguro que deseas eliminar este registro?')) return;
  
  if (tabla === 'gastos') {
    gastos = gastos.filter(g => g.id !== id);
  } else {
    ingresos = ingresos.filter(i => i.id !== id);
  }
  
  guardarEnStorage();
  actualizarResumen();
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
    mensual = semanal * 4.33;
  } else if (mensual > 0 && semanal === 0) {
    semanal = mensual / 4.33;
  } else if (semanal === 0 && mensual === 0) {
    alert('Por favor, ingresa al menos un valor.');
    return;
  }

  datosPendientes = { concepto, semanal: Math.round(semanal * 100) / 100, mensual: Math.round(mensual * 100) / 100 };

  document.getElementById('modal-detalle').innerHTML = `
    <strong>Concepto:</strong> ${concepto}<br>
    <strong>Semanal:</strong> ${formatearNumero(datosPendientes.semanal)}<br>
    <strong>Mensual:</strong> ${formatearNumero(datosPendientes.mensual)}
  `;
  document.getElementById('modal-confirmacion').style.display = 'flex';
}

function guardarRegistro() {
  if (!datosPendientes) return;
  
  if (tipoPendiente === 'gasto') {
    gastos.push({
      id: nextIdGastos++,
      ...datosPendientes
    });
    document.getElementById('nuevo-gasto-concepto').value = '';
    document.getElementById('nuevo-gasto-semanal').value = '';
    document.getElementById('nuevo-gasto-mensual').value = '';
  } else {
    ingresos.push({
      id: nextIdIngresos++,
      ...datosPendientes
    });
    document.getElementById('nuevo-ingreso-concepto').value = '';
    document.getElementById('nuevo-ingreso-semanal').value = '';
    document.getElementById('nuevo-ingreso-mensual').value = '';
  }
  
  guardarEnStorage();
  cerrarModal();
  actualizarResumen();
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

// Cargar datos al iniciar
actualizarResumen();

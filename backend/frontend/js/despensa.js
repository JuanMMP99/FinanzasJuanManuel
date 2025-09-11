// Configuración global - Soluciona el error "API_BASE is not defined"
const API_BASE = "http://localhost:3000";

// Variable global para almacenar los productos - Soluciona el error "despensa already declared"
let productosDespensa = [];

// Mostrar fecha actual en el campo de fecha de compra
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("nuevo-producto-fecha-compra").valueAsDate =
    new Date();

  // Cargar datos del usuario
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (user && user.nombre) {
    document.getElementById("user-name").textContent = user.nombre;
  }

  // Cargar productos de la despensa
  cargarDespensa();
});

async function cargarDespensa() {
  try {
    mostrarLoading(true);
    // En una implementación real, aquí se haría la llamada a la API
    // Simulamos una respuesta con datos de ejemplo
    await new Promise((resolve) => setTimeout(resolve, 1000));

    mostrarDespensaTabla();
  } catch (err) {
    console.error("Error cargando despensa:", err);
    alert("Error al cargar la despensa");
  } finally {
    mostrarLoading(false);
  }
}

function mostrarDespensaTabla() {
  const tbody = document.querySelector("#tabla-despensa tbody");
  tbody.innerHTML = "";

  if (productosDespensa.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" style="text-align: center;">No hay productos en la despensa</td></tr>';
    return;
  }

  productosDespensa.forEach((p) => {
    const hoy = new Date();
    const fechaCompra = new Date(p.fechaCompra);
    const diasDesdeCompra = Math.floor(
      (hoy - fechaCompra) / (1000 * 60 * 60 * 24)
    );
    const diasRestantes = Math.max(p.duracion - diasDesdeCompra, 0);

    // Calcular días que duró si está terminado
    const diasDuracion =
      p.terminado && p.fechaTerminado
        ? Math.floor(
            (new Date(p.fechaTerminado) - fechaCompra) / (1000 * 60 * 60 * 24)
          )
        : null;

    // Determinar clase CSS según días restantes
    let estadoClase = "bueno";
    if (diasRestantes <= 2) estadoClase = "urgente";
    else if (diasRestantes <= 5) estadoClase = "advertencia";

    const tr = document.createElement("tr");
    tr.innerHTML = `
                    <td>${p.nombre}</td>
                    <td>${p.cantidad} ${p.unidad}</td>
                    <td>$${p.precio ? p.precio.toFixed(2) : "0.00"}</td>
                    <td>${new Date(p.fechaCompra).toLocaleDateString()}</td>
                    <td>${diasDesdeCompra}</td>
                    <td class="${estadoClase}">${
      p.terminado
        ? diasDuracion !== null
          ? `Duró ${diasDuracion} días`
          : "-"
        : diasRestantes
    }</td>
                    <td>
                        <input type="checkbox" class="terminado-checkbox" ${
                          p.terminado ? "checked" : ""
                        } 
                               onchange="marcarTerminado(${
                                 p.id
                               }, this.checked)" />
                    </td>
                    <td class="action-buttons">
                        <button class="btn-edit" onclick="editarProducto(${
                          p.id
                        })">Editar</button>
                        <button class="btn-danger" onclick="eliminarProducto(${
                          p.id
                        })">Eliminar</button>
                    </td>
                `;
    tbody.appendChild(tr);
  });
}

function confirmarNuevo() {
  const nombre = document.getElementById("nuevo-producto-nombre").value.trim();
  const cantidad = parseFloat(
    document.getElementById("nuevo-producto-cantidad").value
  );
  const unidad = document.getElementById("nuevo-producto-unidad").value;
  const precio =
    parseFloat(document.getElementById("nuevo-producto-precio").value) || 0;
  const fechaCompra = document.getElementById(
    "nuevo-producto-fecha-compra"
  ).value;
  const duracion = parseInt(
    document.getElementById("nuevo-producto-duracion").value
  );

  if (
    !nombre ||
    isNaN(cantidad) ||
    cantidad <= 0 ||
    isNaN(duracion) ||
    duracion <= 0
  ) {
    alert(
      "Por favor completa todos los campos obligatorios: nombre, cantidad y duración."
    );
    return;
  }

  const nuevo = {
    nombre,
    cantidad,
    unidad,
    precio,
    fechaCompra: fechaCompra || new Date().toISOString(),
    duracion,
    terminado: false,
  };

  // Mostrar modal de confirmación
  document.getElementById(
    "modal-detalle"
  ).textContent = `¿Agregar ${cantidad} ${unidad} de ${nombre} por $${precio.toFixed(
    2
  )}?`;
  document.getElementById("modal-confirmacion").style.display = "flex";

  // Guardar temporalmente el producto para confirmación
  window.productoTemporal = nuevo;
}

async function guardarRegistro() {
  try {
    mostrarLoading(true);
    // En una implementación real, aquí se haría la llamada a la API
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simular respuesta del servidor
    const nuevoProducto = {
      id: Date.now(), // ID temporal
      ...window.productoTemporal,
    };

    productosDespensa.unshift(nuevoProducto);
    mostrarDespensaTabla();
    limpiarFormulario();
    cerrarModal();

    alert("Producto agregado correctamente");
  } catch (err) {
    console.error("Error guardando producto:", err);
    alert("Error al guardar el producto");
  } finally {
    mostrarLoading(false);
  }
}

async function marcarTerminado(id, terminado) {
  try {
    mostrarLoading(true);
    // En una implementación real, aquí se haría la llamada a la API
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Actualizar localmente
    const index = productosDespensa.findIndex((p) => p.id === id);
    if (index !== -1) {
      productosDespensa[index].terminado = terminado;
      productosDespensa[index].fechaTerminado = terminado
        ? new Date().toISOString()
        : null;
      mostrarDespensaTabla();
    }
  } catch (err) {
    console.error("Error actualizando producto:", err);
    alert("Error al actualizar el producto");
  } finally {
    mostrarLoading(false);
  }
}

function limpiarFormulario() {
  document.getElementById("nuevo-producto-nombre").value = "";
  document.getElementById("nuevo-producto-cantidad").value = "";
  document.getElementById("nuevo-producto-precio").value = "";
  document.getElementById("nuevo-producto-duracion").value = "";
  document.getElementById("nuevo-producto-fecha-compra").valueAsDate =
    new Date();
  document.getElementById("nuevo-producto-unidad").value = "unidades";
}

function cerrarModal() {
  document.getElementById("modal-confirmacion").style.display = "none";
}

function mostrarLoading(mostrar) {
  document.getElementById("loading-overlay").style.display = mostrar
    ? "flex"
    : "none";
}

async function eliminarProducto(id) {
  if (!confirm("¿Estás seguro de que quieres eliminar este producto?")) return;

  try {
    mostrarLoading(true);
    // En una implementación real, aquí se haría la llamada a la API
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Eliminar localmente
    productosDespensa = productosDespensa.filter((p) => p.id !== id);
    mostrarDespensaTabla();

    alert("Producto eliminado correctamente");
  } catch (err) {
    console.error("Error eliminando producto:", err);
    alert("Error al eliminar el producto");
  } finally {
    mostrarLoading(false);
  }
}

function editarProducto(id) {
  alert(
    "Funcionalidad de edición en desarrollo. Por ahora, puedes eliminar y volver a agregar el producto."
  );
}

function irAHome() {
  alert("Redirigiendo a la página de inicio...");
  window.location.href = 'index.html'; 
}

function logout() {
  if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    alert("Sesión cerrada. Redirigiendo...");
    // window.location.href = 'login.html'; // En una implementación real
  }
}

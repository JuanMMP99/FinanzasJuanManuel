// Configuración global
const API_BASE = "http://localhost:3000";
const authToken = localStorage.getItem("authToken");

// Variable global para almacenar los productos
let productosDespensa = [];

// Mostrar fecha actual en el campo de fecha de compra
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("nuevo-producto-fecha-compra").valueAsDate =
    new Date();

  // Cargar datos del usuario
  const user = JSON.parse(localStorage.getItem("userData") || "{}");
  if (user && user.nombre) {
    document.getElementById("user-name").textContent = user.nombre;
  }

  // Cargar productos de la despensa
  cargarDespensa();
});

// Función para hacer peticiones autenticadas
async function makeAuthenticatedRequest(url, options = {}) {
  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {}),
    },
  };

  return fetch(url, mergedOptions).then((response) => {
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userData");
      window.location.href = "/login";
      throw new Error("No autorizado");
    }
    return response;
  });
}

// Mostrar/ocultar loading
function mostrarLoading(mostrar) {
  document.getElementById("loading-overlay").style.display = mostrar
    ? "flex"
    : "none";
}

// Cargar productos desde la base de datos
async function cargarDespensa() {
  try {
    mostrarLoading(true);

    const response = await makeAuthenticatedRequest(`${API_BASE}/api/despensa`);
    if (response.ok) {
      productosDespensa = await response.json();
      mostrarDespensaTabla();
    } else {
      console.error("Error cargando despensa:", await response.text());
      showNotification("Error al cargar la despensa", "error");
    }
  } catch (err) {
    console.error("Error cargando despensa:", err);
    showNotification("Error al cargar la despensa", "error");
  } finally {
    mostrarLoading(false);
  }
}

function showNotification(message, type = "info") {
  const notificationContainer =
    document.getElementById("notification-container") ||
    createNotificationContainer();

  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  notificationContainer.appendChild(notification);

  // Eliminar la notificación después de 3 segundos
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Crear contenedor de notificaciones si no existe
function createNotificationContainer() {
  const container = document.createElement("div");
  container.id = "notification-container";
  container.className = "notification-container";
  document.body.appendChild(container);
  return container;
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
    const fechaCompra = new Date(p.fecha_compra);
    const diasDesdeCompra = Math.floor(
      (hoy - fechaCompra) / (1000 * 60 * 60 * 24)
    );
    const diasRestantes = Math.max(p.duracion - diasDesdeCompra, 0);

    // Calcular días que duró si está terminado
    const diasDuracion =
      p.terminado && p.fecha_terminado
        ? Math.floor(
            (new Date(p.fecha_terminado) - fechaCompra) / (1000 * 60 * 60 * 24)
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
  <td>${new Date(p.fecha_compra).toLocaleDateString()}</td>
  <td>${diasDesdeCompra}</td>
  <td class="${estadoClase}">
    ${
      p.terminado
        ? p.fecha_terminado
          ? `Duró ${diasDuracion} días`
          : "Terminado" // Muestra 'Terminado' si la fecha no existe
        : diasRestantes
    }
  </td>
  <td>
    <input type="checkbox" class="terminado-checkbox" data-id="${p.id}" ${
      p.terminado ? "checked" : ""
    } 
           onchange="marcarTerminado(${p.id}, this.checked)" />
  </td>
  <td class="action-buttons">
    <button class="btn-edit" onclick="editarProducto(${p.id})">Editar</button>
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
  const fechaCompraVal = document.getElementById(
    "nuevo-producto-fecha-compra"
  ).value;
  // convertimos la fecha a ISO; si no hay, usamos ahora
  const fecha_compra = fechaCompraVal
    ? new Date(fechaCompraVal).toISOString()
    : new Date().toISOString();

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
    fecha_compra,
    duracion,
    terminado: false,
  };

  // Si estamos editando, incluir el ID en los datos
  if (window.productoEditando) {
    nuevo.id = window.productoEditando;
    document.getElementById(
      "modal-detalle"
    ).textContent = `¿Actualizar ${cantidad} ${unidad} de ${nombre} por $${precio.toFixed(
      2
    )}?`;
  } else {
    document.getElementById(
      "modal-detalle"
    ).textContent = `¿Agregar ${cantidad} ${unidad} de ${nombre} por $${precio.toFixed(
      2
    )}?`;
  }

  window.productoTemporal = nuevo;
  document.getElementById("modal-confirmacion").style.display = "flex";
}

// guardarRegistro: detecta si es creación (POST) o actualización (PUT)
async function guardarRegistro() {
  try {
    mostrarLoading(true);

    const isEditing = !!window.productoEditando;
    const url = isEditing
      ? `${API_BASE}/api/despensa/${window.productoEditando}`
      : `${API_BASE}/api/despensa`;
    const method = isEditing ? "PUT" : "POST";

    // Preparar datos para enviar (sin el ID en el cuerpo para PUT)
    const datosParaEnviar = { ...window.productoTemporal };
    if (isEditing) {
      delete datosParaEnviar.id; // El ID ya está en la URL
    }

    const response = await makeAuthenticatedRequest(url, {
      method,
      body: JSON.stringify(datosParaEnviar),
    });

    if (response.ok) {
      const productoResp = await response.json();

      if (isEditing) {
        // Reemplazar el producto existente en el array local
        const index = productosDespensa.findIndex(
          (p) => p.id === window.productoEditando
        );
        if (index !== -1) {
          productosDespensa[index] = productoResp;
        } else {
          // si por alguna razón no estaba, añadirlo (fallback)
          productosDespensa.unshift(productoResp);
        }
        showNotification("Producto actualizado correctamente", "success");
      } else {
        // creación normal: añadir al inicio
        productosDespensa.unshift(productoResp);
        showNotification("Producto agregado correctamente", "success");
      }

      mostrarDespensaTabla();
      limpiarFormulario();
      cerrarModal();
    } else {
      // intentar leer json; si no, texto
      let err;
      try {
        err = await response.json();
        err = err.error || JSON.stringify(err);
      } catch (e) {
        err = await response.text();
      }
      showNotification("Error al guardar el producto: " + err, "error");
    }
  } catch (err) {
    console.error("Error guardando producto:", err);
    showNotification("Error de conexión al guardar", "error");
  } finally {
    mostrarLoading(false);
  }
}

async function marcarTerminado(id, terminado) {
  try {
    mostrarLoading(true);

    const datosActualizados = {
      terminado: terminado,
      fecha_terminado: terminado ? new Date().toISOString() : null,
    };

    console.log("Enviando datos:", datosActualizados); // Para debugging

    const response = await makeAuthenticatedRequest(
      `${API_BASE}/api/despensa/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(datosActualizados),
      }
    );

    if (response.ok) {
      const productoActualizado = await response.json();

      // Actualizar localmente
      const index = productosDespensa.findIndex((p) => p.id === id);
      if (index !== -1) {
        productosDespensa[index] = productoActualizado;
        mostrarDespensaTabla();
        showNotification(
          terminado ? "Producto marcado como terminado" : "Producto reactivado",
          "success"
        );
      }
    } else {
      const errorText = await response.text();
      console.error("Error del servidor:", errorText);
      showNotification("Error al actualizar el producto", "error");

      // Revertir el checkbox si falla
      const checkbox = document.querySelector(
        `.terminado-checkbox[data-id="${id}"]`
      );
      if (checkbox) {
        checkbox.checked = !terminado;
      }
    }
  } catch (err) {
    console.error("Error actualizando producto:", err);
    showNotification("Error de conexión", "error");

    // Revertir el checkbox si falla
    const checkbox = document.querySelector(
      `.terminado-checkbox[data-id="${id}"]`
    );
    if (checkbox) {
      checkbox.checked = !terminado;
    }
  } finally {
    mostrarLoading(false);
  }
}

// limpiarFormulario: resetea todo y cierra modo edición
function limpiarFormulario() {
  document.getElementById("nuevo-producto-nombre").value = "";
  document.getElementById("nuevo-producto-cantidad").value = "";
  document.getElementById("nuevo-producto-precio").value = "";
  document.getElementById("nuevo-producto-duracion").value = "";
  document.getElementById("nuevo-producto-fecha-compra").valueAsDate =
    new Date();
  document.getElementById("nuevo-producto-unidad").value = "unidades";

  // reset estado de edición
  window.productoTemporal = null;
  window.productoEditando = null;
  if (document.getElementById("btn-agregar")) {
    document.getElementById("btn-agregar").textContent = "Agregar Producto";
  }
}

function cerrarModal() {
  document.getElementById("modal-confirmacion").style.display = "none";
}

async function eliminarProducto(id) {
  if (!confirm("¿Estás seguro de que quieres eliminar este producto?")) return;

  try {
    mostrarLoading(true);

    const response = await makeAuthenticatedRequest(
      `${API_BASE}/api/despensa/${id}`,
      {
        method: "DELETE",
      }
    );

    if (response.ok) {
      // Eliminar localmente
      productosDespensa = productosDespensa.filter((p) => p.id !== id);
      mostrarDespensaTabla();
      showNotification("Producto eliminado correctamente", "success");
    } else {
      const error = await response.json();
      showNotification(
        "Error al eliminar el producto: " +
          (error.error || "Error desconocido"),
        "error"
      );
    }
  } catch (err) {
    console.error("Error eliminando producto:", err);
    alert("Error al eliminar el producto");
  } finally {
    mostrarLoading(false);
  }
}

// editarProducto: prepara el formulario para editar y ajusta el botón
function editarProducto(id) {
  const producto = productosDespensa.find((p) => p.id === id);
  if (!producto) {
    alert("Producto no encontrado");
    return;
  }

  // Llenar el formulario con los datos del producto
  document.getElementById("nuevo-producto-nombre").value = producto.nombre;
  document.getElementById("nuevo-producto-cantidad").value = producto.cantidad;
  document.getElementById("nuevo-producto-unidad").value = producto.unidad;
  document.getElementById("nuevo-producto-precio").value =
    producto.precio || "";

  // Asegurarse de formatear la fecha al formato input date (YYYY-MM-DD)
  if (producto.fecha_compra) {
    const fechaIso = new Date(producto.fecha_compra).toISOString();
    document.getElementById("nuevo-producto-fecha-compra").value =
      fechaIso.split("T")[0];
  } else {
    document.getElementById("nuevo-producto-fecha-compra").valueAsDate =
      new Date();
  }

  document.getElementById("nuevo-producto-duracion").value =
    producto.duracion || "";

  // Guardar el ID para la actualización y cambiar el texto del botón
  window.productoEditando = id;
  if (document.getElementById("btn-agregar")) {
    document.getElementById("btn-agregar").textContent = "Guardar Cambios";
  }

  // Dar una pista al usuario (mejor que alert); opcionalmente podrías mostrar un toast
  showNotification("Editando producto. Haz los cambios y confirma.", "info");
}

function irAHome() {
  window.location.href = "index.html";
}

function logout() {
  if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    window.location.href = "login.html";
  }
}
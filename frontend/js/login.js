      const API_BASE =
        window.location.hostname === "localhost" ? "http://localhost:3000" : "";

      function showForm(formType, event) {
        // Actualizar botones
        document.querySelectorAll(".tab-button").forEach((btn) => {
          btn.classList.remove("active");
          btn.setAttribute("aria-selected", "false");
        });
        event.currentTarget.classList.add("active");
        event.currentTarget.setAttribute("aria-selected", "true");

        // Mostrar formulario correspondiente
        document
          .querySelectorAll(".auth-form")
          .forEach((form) => form.classList.remove("active"));
        document.getElementById(formType + "-form").classList.add("active");

        // Limpiar mensajes
        hideMessages();
      }

      function showError(message) {
        const errorDiv = document.getElementById("error-message");
        errorDiv.textContent = message;
        errorDiv.style.display = "block";
        document.getElementById("success-message").style.display = "none";
      }

      function showSuccess(message) {
        const successDiv = document.getElementById("success-message");
        successDiv.textContent = message;
        successDiv.style.display = "block";
        document.getElementById("error-message").style.display = "none";
      }

      function hideMessages() {
        document.getElementById("error-message").style.display = "none";
        document.getElementById("success-message").style.display = "none";
      }

      function setLoading(isLoading) {
        const container = document.getElementById("auth-container");
        if (isLoading) {
          container.classList.add("loading");
        } else {
          container.classList.remove("loading");
        }
      }

      // Manejar login
      document
        .getElementById("login-form")
        .addEventListener("submit", async (e) => {
          e.preventDefault();
          setLoading(true);
          hideMessages();

          const formData = new FormData(e.target);
          const loginData = {
            email: formData.get("email"),
            password: formData.get("password"),
          };

          try {
            const response = await fetch(`${API_BASE}/api/auth/login`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(loginData),
            });

            const result = await response.json();

            if (response.ok) {
              // Guardar token en localStorage
              localStorage.setItem("authToken", result.token);
              localStorage.setItem("userData", JSON.stringify(result.user));

              showSuccess("¡Inicio de sesión exitoso! Redirigiendo...");

              // Redireccionar después de 1 segundo
              setTimeout(() => {
                window.location.href = "/";
              }, 1000);
            } else {
              showError(result.error || "Error al iniciar sesión");
            }
          } catch (error) {
            showError("Error de conexión. Por favor, intenta de nuevo.");
            console.error("Error:", error);
          } finally {
            setLoading(false);
          }
        });

      // Manejar registro
      document
        .getElementById("register-form")
        .addEventListener("submit", async (e) => {
          e.preventDefault();
          setLoading(true);
          hideMessages();

          const formData = new FormData(e.target);
          const password = formData.get("password");
          const confirmPassword = formData.get("confirmPassword");

          if (password !== confirmPassword) {
            showError("Las contraseñas no coinciden");
            setLoading(false);
            return;
          }

          const registerData = {
            nombre: formData.get("nombre"),
            email: formData.get("email"),
            password: password,
          };

          try {
            const response = await fetch(`${API_BASE}/api/auth/register`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(registerData),
            });

            const result = await response.json();

            if (response.ok) {
              showSuccess(
                "¡Cuenta creada exitosamente! Ahora puedes iniciar sesión."
              );

              // Cambiar a formulario de login después de 2 segundos
              setTimeout(() => {
                showForm("login", document.getElementById("tab-login"));
                document.getElementById("login-email").value =
                  registerData.email;
              }, 2000);
            } else {
              showError(result.error || "Error al crear la cuenta");
            }
          } catch (error) {
            showError("Error de conexión. Por favor, intenta de nuevo.");
            console.error("Error:", error);
          } finally {
            setLoading(false);
          }
        });

      // Verificar si el usuario ya está logueado
      document.addEventListener("DOMContentLoaded", () => {
        const token = localStorage.getItem("authToken");
        if (token) {
          // Verificar si el token es válido
          fetch(`${API_BASE}/api/auth/verify`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
            .then((response) => {
              if (response.ok) {
                window.location.href = "/";
              } else {
                // Token inválido, limpiar localStorage
                localStorage.removeItem("authToken");
                localStorage.removeItem("userData");
              }
            })
            .catch((error) => {
              console.error("Error verificando token:", error);
              localStorage.removeItem("authToken");
              localStorage.removeItem("userData");
            });
        }
      });
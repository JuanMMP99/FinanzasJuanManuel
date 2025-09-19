// --- Sistema de Notificaciones (Toasts) ---

function showToast(message, type = 'info') {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `<span>${icon}</span> ${message}`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
        if (container.children.length === 0) {
            container.remove();
        }
    }, 5000);
}

// --- Sistema de Confirmación (Modal) ---

function showConfirm(title, message) {
    return new Promise((resolve) => {
        let modal = document.getElementById('custom-confirm-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'custom-confirm-modal';
            modal.className = 'modal-confirm';
            modal.innerHTML = `
                <div class="modal-confirm-content">
                    <h3 id="confirm-title"></h3>
                    <p id="confirm-message"></p>
                    <div class="modal-confirm-buttons">
                        <button id="confirm-btn-yes" class="btn-danger">Confirmar</button>
                        <button id="confirm-btn-no" class="btn-secondary">Cancelar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;

        modal.classList.add('active');

        document.getElementById('confirm-btn-yes').onclick = () => {
            modal.classList.remove('active');
            resolve(true);
        };
        document.getElementById('confirm-btn-no').onclick = () => {
            modal.classList.remove('active');
            resolve(false);
        };
    });
}
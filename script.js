// Глобальная переменная доступа
let hasAccess = localStorage.getItem('neiro_access') === 'true';

document.addEventListener('DOMContentLoaded', () => {

    // Блокировка кнопок уроков, если нет доступа
    // При клике без доступа — открываем окно входа
    const allLessonBtns = document.querySelectorAll('.btn-primary');
    allLessonBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!hasAccess) {
                e.preventDefault();
                openModal('modal-auth');
            }
        });
    });

});

// --- Вспомогательные функции ---

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
}

function closeModals() {
    document.querySelectorAll('.custom-modal').forEach(m => m.style.display = 'none');
}

function setBtnError(btn, text, originalText, originalColor) {
    btn.innerText = text;
    btn.style.background = "#ff4444";
    setTimeout(() => {
        btn.innerText = originalText;
        btn.style.background = originalColor;
        btn.disabled = false;
    }, 3000);
}

function setBtnSuccess(btn, text) {
    btn.innerText = text;
    btn.style.background = "#00C851";
}

// --- Логика входа ---

async function checkPass() {
    const email = document.getElementById('auth-email').value.trim();
    const pass = document.getElementById('auth-pass').value.trim();
    const btn = document.querySelector('#modal-auth .modal-btn');
    const originalText = btn.innerText;
    const originalColor = window.getComputedStyle(btn).backgroundColor;

    if (!email || !pass) {
        setBtnError(btn, "ЗАПОЛНИТЕ ПОЛЯ", originalText, originalColor);
        return;
    }

    btn.innerText = "ПРОВЕРКА...";
    btn.disabled = true;

    try {
        const response = await fetch('https://n8n.neirobistro.ru/webhook/check-access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass })
        });

        if (response.ok) {
            const result = await response.json();
            if (result.access) {
                localStorage.setItem('neiro_access', 'true');
                hasAccess = true;
                setBtnSuccess(btn, "ДОСТУП РАЗРЕШЕН!");
                setTimeout(() => {
                    closeModals();
                    window.location.href = window.location.pathname;
                }, 1500);
            } else {
                setBtnError(btn, "НЕВЕРНЫЙ ПАРОЛЬ", originalText, originalColor);
            }
        } else {
            setBtnError(btn, "НЕТ ТАКОГО УЧЕНИКА", originalText, originalColor);
        }
    } catch {
        setBtnError(btn, "СБОЙ СЕТИ", originalText, originalColor);
    }
}

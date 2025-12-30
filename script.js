let hasAccess = localStorage.getItem('neiro_access') === 'true';

document.addEventListener('DOMContentLoaded', () => {
    // ЗАДАЧА 1: Проверка статуса после оплаты
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');

    if (status === 'success') {
        openModal('modal-success');
        // Очищаем URL от параметров, чтобы при обновлении окно не вылезало снова
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === 'fail') {
        alert("Оплата не прошла или была отменена.");
    }

    // Блокировка кнопок уроков
    const allLessonBtns = document.querySelectorAll('.btn-primary');
    allLessonBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!hasAccess) {
                e.preventDefault();
                const paySection = document.getElementById('section-pay');
                if (paySection) paySection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModals() { document.querySelectorAll('.custom-modal').forEach(m => m.style.display = 'none'); }

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

// ЗАДАЧА 3: Доступ только здесь
async function checkPass() {
    const email = document.getElementById('auth-email').value.trim();
    const pass = document.getElementById('auth-pass').value.trim();
    const btn = document.querySelector('#modal-auth .modal-btn');
    const originalText = btn.innerText;
    const originalColor = window.getComputedStyle(btn).backgroundColor;

    if (!email || !pass) { setBtnError(btn, "ЗАПОЛНИТЕ ПОЛЯ", originalText, originalColor); return; }

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
                setTimeout(() => { closeModals(); location.reload(); }, 1500);
            } else { setBtnError(btn, "НЕВЕРНЫЙ ПАРОЛЬ", originalText, originalColor); }
        } else { 
            // Обработка случая, когда пользователя нет
            setBtnError(btn, "НЕТ ТАКОГО УЧЕНИКА", originalText, originalColor); 
        }
    } catch { setBtnError(btn, "СБОЙ СЕТИ", originalText, originalColor); }
}

async function sendToN8N() {
    const name = document.getElementById('pay-name').value.trim();
    const email = document.getElementById('pay-email').value.trim();
    const phone = document.getElementById('pay-phone').value.trim();
    const btn = document.querySelector('#modal-pay .modal-btn');
    const originalText = btn.innerText;
    const originalColor = window.getComputedStyle(btn).backgroundColor;

    // 1. Проверка на пустоту
    if(!name || !email || !phone) { 
        setBtnError(btn, "ЗАПОЛНИТЕ ВСЕ ПОЛЯ", originalText, originalColor); 
        return; 
    }

    // 2. Валидация Email (наличие @ и точки)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        setBtnError(btn, "ОШИБКА В EMAIL", originalText, originalColor);
        return;
    }

    // 3. Валидация Телефона (минимум 7 цифр, разрешены +, -, скобки)
    // Убираем все лишнее, оставляем только цифры
    const phoneDigits = phone.replace(/\D/g, ''); 
    // Проверяем длину (обычно номера от 7 до 15 цифр)
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
        setBtnError(btn, "НЕВЕРНЫЙ НОМЕР", originalText, originalColor);
        return;
    }
    
    btn.innerText = "ОФОРМЛЯЕМ...";
    btn.disabled = true;

    try {
        const response = await fetch('https://n8n.neirobistro.ru/webhook/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, date: new Date().toISOString(), product: "Neiro Bistro Course" })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Проверка на повторную покупку
            if (result.status === 'exists') {
                setBtnError(btn, "УЖЕ КУПЛЕНО! ПРОВЕРЬТЕ ПОЧТУ", originalText, originalColor);
                return;
            }

            if (result.payment_url) {
                setBtnSuccess(btn, "ПЕРЕХОД К ОПЛАТЕ...");
                setTimeout(() => window.location.href = result.payment_url, 1000);
            } else {
                setBtnError(btn, "ОШИБКА ПОЛУЧЕНИЯ ССЫЛКИ", originalText, originalColor);
            }
        } else { setBtnError(btn, "ОШИБКА ЗАПРОСА", originalText, originalColor); }
    } catch { setBtnError(btn, "ОШИБКА СЕТИ", originalText, originalColor); }
}


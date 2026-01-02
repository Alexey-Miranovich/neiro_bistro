let hasAccess = localStorage.getItem('neiro_access') === 'true';

document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, нужно ли показать уведомление после возврата с оплаты
    if (localStorage.getItem('show_payment_notification') === 'true') {
        localStorage.removeItem('show_payment_notification');
        setTimeout(() => {
            document.getElementById('modal-success').style.display = 'flex';
        }, 1000);
    }
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
    
    // Обработчик для проверки чекбоксов
    const requiredCheckboxes = document.querySelectorAll('.required-checkbox');
    const payBtn = document.getElementById('pay-btn');
    
    function checkAgreements() {
        const allChecked = Array.from(requiredCheckboxes).every(checkbox => checkbox.checked);
        if (payBtn) {
            payBtn.disabled = !allChecked;
            payBtn.style.opacity = allChecked ? '1' : '0.5';
        }
    }
    
    requiredCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', checkAgreements);
    });
    
    // Начальная проверка
    checkAgreements();
});

function openModal(id) { document.getElementById(id).style.display = 'flex'; }

function handleBuyClick() {
    if (hasAccess) {
        openModal('modal-already-purchased');
    } else {
        openModal('modal-pay');
    }
}
function closeModals() { 
    // Проверяем, закрывается ли модальное окно оплаты
    const payModal = document.getElementById('modal-pay');
    if (payModal && payModal.style.display === 'flex') {
        // Показываем уведомление при закрытии окна оплаты
        setTimeout(() => {
            document.getElementById('modal-success').style.display = 'flex';
        }, 300);
    }
    document.querySelectorAll('.custom-modal').forEach(m => m.style.display = 'none'); 
}

function setBtnError(btn, text, originalText, originalColor) {
    btn.innerText = text;
    btn.style.background = "#ff4444";
    setTimeout(() => {
        btn.innerText = originalText;
        btn.style.background = originalColor;
        btn.disabled = false;
    }, 2000);
}

function setBtnSuccess(btn, text) {
    btn.innerText = text;
    btn.style.background = "#00C851";
}

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
            } else { setBtnError(btn, "НЕВЕРНО", originalText, originalColor); }
        } else { setBtnError(btn, "ОШИБКА СЕРВЕРА", originalText, originalColor); }
    } catch { setBtnError(btn, "СБОЙ СЕТИ", originalText, originalColor); }
}

async function sendToN8N() {
    const name = document.getElementById('pay-name').value.trim();
    const email = document.getElementById('pay-email').value.trim();
    const phone = document.getElementById('pay-phone').value.trim();
    const btn = document.querySelector('#modal-pay .modal-btn');
    const originalText = btn.innerText;
    const originalColor = window.getComputedStyle(btn).backgroundColor;
    
    // Проверка обязательных чекбоксов
    const requiredCheckboxes = document.querySelectorAll('.required-checkbox');
    const allChecked = Array.from(requiredCheckboxes).every(checkbox => checkbox.checked);
    
    if (!allChecked) {
        setBtnError(btn, "ПОСТАВЬТЕ ГАЛОЧКИ", originalText, originalColor);
        return;
    }

    if(!name || !email || !phone) { setBtnError(btn, "ЗАПОЛНИТЕ ВСЕ", originalText, originalColor); return; }
    
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
            if (result.payment_url) {
                setBtnSuccess(btn, "ПЕРЕХОД К ОПЛАТЕ...");
                // Сохраняем флаг для показа уведомления при возврате
                localStorage.setItem('show_payment_notification', 'true');
                setTimeout(() => window.location.href = result.payment_url, 1000);
            } else {
                setBtnSuccess(btn, "ЗАЯВКА ПРИНЯТА!");
                setTimeout(() => { 
                    closeModals(); 
                    // Показываем уведомление после успешной отправки
                    setTimeout(() => {
                        document.getElementById('modal-success').style.display = 'flex';
                    }, 300);
                    btn.innerText = originalText; 
                    btn.style.background = originalColor; 
                    btn.disabled = false; 
                }, 2000);
            }
        } else { setBtnError(btn, "ОШИБКА", originalText, originalColor); }
    } catch { setBtnError(btn, "ОШИБКА СЕТИ", originalText, originalColor); }

}


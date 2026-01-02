Без паники. Я собрал **полный** файл `script.js` из всех частей, которые мы утверждали.

В этом коде есть всё:

1. **Проверка доступа** (открытие уроков).
2. **Валидация чекбоксов** (кнопка не нажмется без галочек).
3. **Обработка возврата с оплаты** (показ окна "Обработка заказа").
4. **Вход в личный кабинет**.
5. **Исправленная оплата**: если курс куплен — кнопка краснеет и пишет "КУРС УЖЕ КУПЛЕН" (без лишних окон).

Просто скопируйте этот код целиком и вставьте в `script.js`, заменив там всё содержимое.

```javascript
let hasAccess = localStorage.getItem('neiro_access') === 'true';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Проверка статуса после возврата с оплаты (ЮКасса)
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');

    if (status === 'success') {
        // Открываем окно "Обработка заказа / Успех"
        openModal('modal-success');
        // Очищаем URL, чтобы окно не вылезало при обновлении страницы
        window.history.replaceState({}, document.title, window.location.pathname);
    } 
    // Если использовался старый метод через localStorage (для подстраховки)
    else if (localStorage.getItem('show_payment_notification') === 'true') {
        localStorage.removeItem('show_payment_notification');
        setTimeout(() => {
            openModal('modal-success');
        }, 1000);
    }

    // 2. Блокировка кнопок уроков, если нет доступа
    const allLessonBtns = document.querySelectorAll('.btn-primary');
    allLessonBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!hasAccess) {
                e.preventDefault(); // Запрещаем переход
                const paySection = document.getElementById('section-pay');
                if (paySection) paySection.scrollIntoView({ behavior: 'smooth' }); // Скроллим к оплате
            }
        });
    });
    
    // 3. Логика чекбоксов (Оферта и Политика)
    const requiredCheckboxes = document.querySelectorAll('.required-checkbox');
    const payBtn = document.getElementById('pay-btn');
    
    function checkAgreements() {
        // Кнопка активна, только если все обязательные галочки стоят
        const allChecked = Array.from(requiredCheckboxes).every(checkbox => checkbox.checked);
        if (payBtn) {
            payBtn.disabled = !allChecked;
            payBtn.style.opacity = allChecked ? '1' : '0.5';
        }
    }
    
    requiredCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', checkAgreements);
    });
    
    // Запускаем проверку при загрузке (чтобы кнопка была серой сразу)
    checkAgreements();
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
    btn.style.background = "#ff4444"; // Красный цвет ошибки
    setTimeout(() => {
        btn.innerText = originalText;
        btn.style.background = originalColor;
        btn.disabled = false;
    }, 3000); // Возвращаем через 3 секунды
}

function setBtnSuccess(btn, text) {
    btn.innerText = text;
    btn.style.background = "#00C851"; // Зеленый цвет успеха
}

// --- Логика Входа (Личный кабинет) ---

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
                setTimeout(() => { closeModals(); location.reload(); }, 1500);
            } else { 
                setBtnError(btn, "НЕВЕРНЫЙ ПАРОЛЬ", originalText, originalColor); 
            }
        } else { 
            // Если пользователя нет в базе
            setBtnError(btn, "НЕТ ТАКОГО УЧЕНИКА", originalText, originalColor); 
        }
    } catch { 
        setBtnError(btn, "СБОЙ СЕТИ", originalText, originalColor); 
    }
}

// --- Логика Оплаты (С интеграцией n8n) ---

async function sendToN8N() {
    const name = document.getElementById('pay-name').value.trim();
    const email = document.getElementById('pay-email').value.trim();
    const phone = document.getElementById('pay-phone').value.trim();
    const btn = document.querySelector('#modal-pay .modal-btn');
    const originalText = btn.innerText;
    const originalColor = window.getComputedStyle(btn).backgroundColor;
    
    // 1. Проверка галочек (на всякий случай дублируем)
    const requiredCheckboxes = document.querySelectorAll('.required-checkbox');
    const allChecked = Array.from(requiredCheckboxes).every(checkbox => checkbox.checked);
    
    if (!allChecked) {
        setBtnError(btn, "ПОСТАВЬТЕ ГАЛОЧКИ", originalText, originalColor);
        return;
    }

    // 2. Проверка заполнения полей
    if(!name || !email || !phone) { 
        setBtnError(btn, "ЗАПОЛНИТЕ ВСЕ", originalText, originalColor); 
        return; 
    }
    
    btn.innerText = "ОФОРМЛЯЕМ...";
    btn.disabled = true;

    try {
        const response = await fetch('https://n8n.neirobistro.ru/webhook/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name, 
                email, 
                phone, 
                date: new Date().toISOString(), 
                product: "Neiro Bistro Course" 
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // --- ПРОВЕРКА: ЕСЛИ КУРС УЖЕ КУПЛЕН ---
            if (result.status === 'exists') {
                // Красим кнопку в красный и пишем сообщение
                setBtnError(btn, "КУРС УЖЕ КУПЛЕН", originalText, originalColor);
                return; // Останавливаем выполнение, никуда не переходим
            }
            // ---------------------------------------

            if (result.payment_url) {
                setBtnSuccess(btn, "ПЕРЕХОД К ОПЛАТЕ...");
                // Сохраняем флаг, чтобы показать окно при возврате (если редирект сработает криво)
                localStorage.setItem('show_payment_notification', 'true');
                // Перенаправляем на ЮКассу
                setTimeout(() => window.location.href = result.payment_url, 1000);
            } else {
                // Если ссылка не пришла (редкий случай, но бывает)
                setBtnSuccess(btn, "ЗАЯВКА ПРИНЯТА!");
                setTimeout(() => { 
                    closeModals(); 
                    // Показываем окно "Обработка", так как ссылка не пришла, но заказ создан
                    setTimeout(() => {
                        openModal('modal-success');
                    }, 300);
                    // Возвращаем кнопку в норму
                    btn.innerText = originalText; 
                    btn.style.background = originalColor; 
                    btn.disabled = false; 
                }, 2000);
            }
        } else { 
            setBtnError(btn, "ОШИБКА ЗАПРОСА", originalText, originalColor); 
        }
    } catch { 
        setBtnError(btn, "ОШИБКА СЕТИ", originalText, originalColor); 
    }
}

```

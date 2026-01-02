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
            
            // --- ИЗМЕНЕНИЕ: ТЕПЕРЬ ПРОСТО ПИШЕМ НА КНОПКЕ ---
            if (result.status === 'exists') {
                setBtnError(btn, "КУРС УЖЕ КУПЛЕН", originalText, originalColor);
                return; // Останавливаемся, никуда не переходим
            }
            // ------------------------------------------------

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

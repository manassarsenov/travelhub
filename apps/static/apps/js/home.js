function initFlashTimers() {
    document.querySelectorAll('.deal-timer').forEach(timer => {
        const endTime = new Date(timer.dataset.end);

        // Taymer ichidagi barcha span va div larni topib olamiz
        const dayItem = timer.querySelector('.day-item'); // Kun qutichasi (HTML ga qo'shganimiz)
        const daysSpan = timer.querySelector('.days');
        const hoursSpan = timer.querySelector('.hours');
        const minsSpan = timer.querySelector('.minutes');
        const secsSpan = timer.querySelector('.seconds');

        const interval = setInterval(() => {
            const now = new Date();
            const diff = endTime - now;

            if (diff <= 0) {
                // Timer tugadi — card o'chadi
                clearInterval(interval);
                const card = timer.closest('.destination-card');
                if (card) card.remove();
                return;
            }

            // 🚀 TO'G'RILANGAN HISOBLASH (Kun, Soat, Minut, Sekund)
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);

            // 🚀 AGAR KUN 0 DAN KATTA BO'LSA, DAYS XONASINI KO'RSATAMIZ
            if (dayItem && daysSpan) {
                if (days > 0) {
                    dayItem.style.display = 'flex'; // Qutini ko'rsatish
                    daysSpan.textContent = String(days).padStart(2, '0'); // Raqamni yozish
                } else {
                    dayItem.style.display = 'none'; // 24 soatdan kam qolsa yashirish
                }
            }

            // Soat, minut, sekundlarni yozish
            if (hoursSpan) hoursSpan.textContent = String(hours).padStart(2, '0');
            if (minsSpan) minsSpan.textContent = String(mins).padStart(2, '0');
            if (secsSpan) secsSpan.textContent = String(secs).padStart(2, '0');

        }, 1000);
    });
}

document.addEventListener('DOMContentLoaded', initFlashTimers);
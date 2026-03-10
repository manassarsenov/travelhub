function initFlashTimers() {
    document.querySelectorAll('.deal-timer').forEach(timer => {
        const endTime = new Date(timer.dataset.end);

        const interval = setInterval(() => {
            const now = new Date();
            const diff = endTime - now;

            if (diff <= 0) {
                // Timer tugadi — card o'chadi
                clearInterval(interval);
                timer.closest('.destination-card').remove();
                return;
            }

            const hours = Math.floor(diff / 3600000);
            const mins = Math.floor((diff % 3600000) / 60000);
            const secs = Math.floor((diff % 60000) / 1000);

            timer.querySelector('.hours').textContent = String(hours).padStart(2, '0');
            timer.querySelector('.minutes').textContent = String(mins).padStart(2, '0');
            timer.querySelector('.seconds').textContent = String(secs).padStart(2, '0');
        }, 1000);
    });
}

document.addEventListener('DOMContentLoaded', initFlashTimers);
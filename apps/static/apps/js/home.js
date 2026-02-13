// 🎬 HERO VIDEO PLAY/PAUSE
const video = document.getElementById('heroVideo');
const toggleBtn = document.getElementById('toggleVideo');
toggleBtn.addEventListener('click', () => {
    if (video.paused) {
        video.play();
        toggleBtn.textContent = 'Pause';
    } else {
        video.pause();
        toggleBtn.textContent = 'Play';
    }
});

// ⏰ COUNTDOWN TIMERS
document.querySelectorAll('.timer').forEach(timer => {
    const endTime = new Date(timer.dataset.time).getTime();
    const updateTimer = () => {
        const now = new Date().getTime();
        const distance = endTime - now;
        if (distance < 0) {
            timer.textContent = "Expired";
            return;
        }
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        timer.textContent = `${days}d ${hours}h left`;
    };
    updateTimer();
    setInterval(updateTimer, 1000 * 60 * 60);
});

// 💬 LIVE ACTIVITY AUTO UPDATE
const activityList = document.getElementById('activityList');
const newActivities = [
    "Maria booked a trip to Bali 🌴",
    "David reserved a flight to London 🇬🇧",
    "Aisha just got a Maldives package 🏝️"
];
let i = 0;
setInterval(() => {
    const li = document.createElement('li');
    li.textContent = newActivities[i % newActivities.length];
    li.style.animation = "fadeIn 1s";
    activityList.prepend(li);
    if (activityList.children.length > 5) activityList.removeChild(activityList.lastChild);
    i++;
}, 4000);

// 💰 PRICE COMPARISON FUNCTION
function comparePrices() {
    const dest = document.getElementById('destination').value;
    const result = document.getElementById('compareResult');
    if (!dest) {
        result.textContent = "Please enter a destination!";
        return;
    }
    result.textContent = `Best price for ${dest}: $${(Math.random() * 800 + 200).toFixed(0)} 🔥`;
}

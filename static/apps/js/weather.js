/* ================================================================
   WEATHER MODAL JS
   main_base.js ga yoki alohida weather.js faylga qo'sh
   ================================================================ */

'use strict';

/* ---- Ob-havo ikonkalarini emoji ga aylantirish ---- */
function weatherIcon(code) {
    const icons = {
        '01d': '☀️', '01n': '🌙',
        '02d': '⛅', '02n': '⛅',
        '03d': '☁️', '03n': '☁️',
        '04d': '☁️', '04n': '☁️',
        '09d': '🌧️', '09n': '🌧️',
        '10d': '🌦️', '10n': '🌧️',
        '11d': '⛈️', '11n': '⛈️',
        '13d': '❄️', '13n': '❄️',
        '50d': '🌫️', '50n': '🌫️',
    };
    return icons[code] || '🌤️';
}

/* ---- Hafta kunlari ---- */
function getDayName(dateStr) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const d = new Date(dateStr);
    return days[d.getDay()];
}

function loadCardWeather(btn) {
    const lat = btn.dataset.lat;
    const lon = btn.dataset.lon;
    if (!lat || !lon) return;

    const tempEl = btn.querySelector('.weather-temp');
    if (!tempEl) return;

    tempEl.textContent = '--°C';

    fetch(`/weather/?lat=${lat}&lon=${lon}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const icon = weatherIcon(data.current.icon);
                // ← shu yerda "Today: 25°C ☀️" ko'rinishida chiqadi
                tempEl.textContent = `${data.current.temp}°C ${icon}`;
            }
        })
        .catch(() => {
            tempEl.textContent = '--°C';
        });
}


/* ---- Barcha card lardagi ob-havo tugmalarini yuklash ---- */
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.stat-weather[data-lat]').forEach(btn => {
        loadCardWeather(btn);
    });
});

/* ---- Observer — yangi cardlar (Load More) uchun ---- */
const weatherObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
                node.querySelectorAll('.stat-weather[data-lat]').forEach(btn => {
                    if (!btn.dataset.weatherLoaded) {
                        btn.dataset.weatherLoaded = 'true';
                        loadCardWeather(btn);
                    }
                });
            }
        });
    });
});

weatherObserver.observe(document.body, {childList: true, subtree: true});

/* ================================================================
   MODAL OCHISH
   ================================================================ */
function openWeatherModal(btn) {
    const lat = btn.dataset.lat;
    const lon = btn.dataset.lon;
    const city = btn.dataset.city || '';

    if (!lat || !lon) {
        showToast('Koordinatlar topilmadi', 'error');
        return;
    }

    const modal = document.getElementById('weatherModal');
    if (!modal) return;

    // Reset
    document.getElementById('weatherLoading').style.display = 'flex';
    document.getElementById('weatherContent').style.display = 'none';
    document.getElementById('weatherError').style.display = 'none';

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // API ga so'rov
    fetch(`/weather/?lat=${lat}&lon=${lon}`)
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.error || 'Xato');

            const c = data.current;

            // Header
            document.getElementById('wCityLabel').textContent = 'BUGUNGI OB-HAVO';
            document.getElementById('wLocation').textContent =
                `${c.city}${c.country ? ', ' + c.country : ''}`;
            document.getElementById('wIcon').textContent = weatherIcon(c.icon);
            document.getElementById('wTemp').textContent = `${c.temp}°C`;
            document.getElementById('wDesc').textContent = c.description;
            document.getElementById('wFeels').textContent = `Sezilishi: ${c.feels_like}°C`;

            // Stats
            document.getElementById('wHumidity').textContent = `${c.humidity}%`;
            document.getElementById('wWind').textContent = `${c.wind_speed} km/h`;
            document.getElementById('wVisibility').textContent = `${c.visibility} km`;

            // Forecast
            const forecastEl = document.getElementById('wForecast');
            forecastEl.innerHTML = '';
            data.forecast.forEach(day => {
                forecastEl.innerHTML += `
                    <div class="forecast-day">
                        <div class="forecast-name">${getDayName(day.date)}</div>
                        <div class="forecast-icon">${weatherIcon(day.icon)}</div>
                        <div class="forecast-temp">
                            <span class="temp-max">${day.temp_max}°</span>
                            <span class="temp-min">${day.temp_min}°</span>
                        </div>
                        <div class="forecast-desc">${day.description}</div>
                    </div>
                `;
            });

            // Link
            document.getElementById('wWeatherLink').href =
                `https://openweathermap.org/city/`;

            // Ko'rsatish
            document.getElementById('weatherLoading').style.display = 'none';
            document.getElementById('weatherContent').style.display = 'block';
        })
        .catch(() => {
            document.getElementById('weatherLoading').style.display = 'none';
            document.getElementById('weatherError').style.display = 'flex';
        });
}

/* ---- Modal yopish ---- */
function closeWeatherModal(e) {
    if (e && e.target !== document.getElementById('weatherModal')) return;
    const modal = document.getElementById('weatherModal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

/* ---- Qayta urinish ---- */
function retryWeather() {
    const modal = document.getElementById('weatherModal');
    if (!modal) return;
    modal.style.display = 'none';
}

/* ---- ESC tugmasi ---- */
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('weatherModal');
        if (modal && modal.style.display === 'flex') closeWeatherModal();
    }
});
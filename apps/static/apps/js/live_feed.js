/* ================================================================
   LIVE BOOKING FEED — AJAX Polling
   home.js ga yoki alohida live_feed.js faylga qo'sh
   ================================================================ */

'use strict';

const LiveFeed = {
    interval: null,
    isRunning: false,
    lastBookings: [],        // Oldingi bronlar — takrorlanmaslik uchun
    pollInterval: 10000,     // 10 sekund
};

/* ---- Boshlash ---- */
function startLiveFeed() {
    const container = document.getElementById('live-feed');
    if (!container) return;

    // Dastlab yuklash
    fetchLiveFeed();

    // Har 10 sekundda yangilash
    LiveFeed.interval = setInterval(fetchLiveFeed, LiveFeed.pollInterval);
    LiveFeed.isRunning = true;
}

/* ---- Server dan bronlarni olish ---- */
function fetchLiveFeed() {
    fetch('/bookings/live/')
        .then(res => res.json())
        .then(data => {
            if (data.bookings && data.bookings.length > 0) {
                renderLiveFeed(data.bookings);
            } else {
                renderEmptyFeed();
            }
        })
        .catch(() => {
            // Xato bo'lsa — fake ma'lumot ko'rsatish
            renderFakeFeed();
        });
}

/* ---- Bronlarni render qilish ---- */
function renderLiveFeed(bookings) {
    const container = document.getElementById('live-feed');
    if (!container) return;

    // Yangi bronlar bormi tekshir
    const newBookings = bookings.filter(b =>
        !LiveFeed.lastBookings.some(old =>
            old.name === b.name && old.destination === b.destination
        )
    );

    // Yangi bron bo'lsa — tepaga qo'sh
    newBookings.forEach((booking, idx) => {
        const card = createFeedCard(booking, true);
        container.insertBefore(card, container.firstChild);

        // Animatsiya
        setTimeout(() => card.classList.add('visible'), idx * 150);

        // Eski cardlar soni 10 dan oshsa — oxirgisini o'chir
        if (container.children.length > 10) {
            const last = container.lastChild;
            if (last) {
                last.style.opacity = '0';
                last.style.transform = 'translateX(20px)';
                setTimeout(() => last.remove(), 400);
            }
        }
    });

    // Birinchi yuklanishda hammani ko'rsatish
    if (container.children.length === 0) {
        bookings.forEach((booking, idx) => {
            const card = createFeedCard(booking, false);
            container.appendChild(card);
            setTimeout(() => card.classList.add('visible'), idx * 100);
        });
    }

    LiveFeed.lastBookings = bookings;
}

/* ---- Feed card yaratish ---- */
function createFeedCard(booking, isNew) {
    const card = document.createElement('div');
    card.className = `feed-item${isNew ? ' feed-item-new' : ''}`;

    const statusColor = booking.status === 'confirmed' ? '#10b981' : '#f59e0b';
    const statusText  = booking.status === 'confirmed' ? 'Confirmed' : 'Pending';
    const guests      = booking.adults > 1
        ? `${booking.adults} adults`
        : `${booking.adults} adult`;

    card.innerHTML = `
        <div class="feed-item-icon">✈️</div>
        <div class="feed-item-content">
            <div class="feed-item-main">
                <span class="feed-name">${booking.flag} ${booking.name}</span>
                ${booking.country ? `<span class="feed-country">from ${booking.country}</span>` : ''}
                <span class="feed-action">just booked</span>
                <span class="feed-destination">${booking.destination}</span>
            </div>
            <div class="feed-item-meta">
                <span class="feed-guests">👥 ${guests}</span>
                <span class="feed-price">💰 $${booking.price.toLocaleString()}</span>
                <span class="feed-status" style="color:${statusColor};">● ${statusText}</span>
                <span class="feed-time">🕐 ${booking.time_ago}</span>
            </div>
        </div>
        ${isNew ? '<span class="feed-new-badge">NEW</span>' : ''}
    `;

    return card;
}

/* ---- Bo'sh holat ---- */
function renderEmptyFeed() {
    const container = document.getElementById('live-feed');
    if (!container || container.children.length > 0) return;

    container.innerHTML = `
        <div class="feed-empty">
            <i class="fas fa-ticket-alt"></i>
            <p>Be the first to book today!</p>
        </div>
    `;
}

/* ---- Fake ma'lumot (API ishlamasa) ---- */
function renderFakeFeed() {
    const fakeBookings = [
        { flag: '🇬🇧', name: 'James T.',    country: 'UK',      destination: 'Dubai, UAE',        price: 1299, adults: 2, time_ago: '2 min ago',  status: 'confirmed' },
        { flag: '🇺🇸', name: 'Sarah M.',    country: 'USA',     destination: 'Maldives',           price: 2499, adults: 2, time_ago: '5 min ago',  status: 'confirmed' },
        { flag: '🇩🇪', name: 'Hans K.',     country: 'Germany', destination: 'Bali, Indonesia',    price: 1899, adults: 3, time_ago: '8 min ago',  status: 'confirmed' },
        { flag: '🇫🇷', name: 'Marie L.',    country: 'France',  destination: 'Paris, France',      price: 999,  adults: 2, time_ago: '12 min ago', status: 'pending'   },
        { flag: '🇯🇵', name: 'Yuki T.',     country: 'Japan',   destination: 'Tokyo, Japan',       price: 1599, adults: 1, time_ago: '15 min ago', status: 'confirmed' },
        { flag: '🇧🇷', name: 'Carlos S.',   country: 'Brazil',  destination: 'Istanbul, Turkey',   price: 1199, adults: 4, time_ago: '20 min ago', status: 'confirmed' },
        { flag: '🇦🇺', name: 'Emma W.',     country: 'Australia', destination: 'London, UK',       price: 2199, adults: 2, time_ago: '25 min ago', status: 'confirmed' },
        { flag: '🇮🇳', name: 'Raj P.',      country: 'India',   destination: 'Singapore',          price: 899,  adults: 3, time_ago: '30 min ago', status: 'confirmed' },
    ];

    renderLiveFeed(fakeBookings);
}

/* ---- Sahifa ko'rinishdan chiqsa polling to'xtatish ---- */
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        clearInterval(LiveFeed.interval);
        LiveFeed.isRunning = false;
    } else {
        if (!LiveFeed.isRunning) {
            fetchLiveFeed();
            LiveFeed.interval = setInterval(fetchLiveFeed, LiveFeed.pollInterval);
            LiveFeed.isRunning = true;
        }
    }
});

/* ---- DOMContentLoaded da boshlash ---- */
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('live-feed')) {
        startLiveFeed();
    }
});
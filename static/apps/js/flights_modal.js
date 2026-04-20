/* ================================================================
   FLIGHTS MODAL JS
   main_base.js ga yoki alohida faylga qo'sh
   ================================================================ */

const FM = {
    currentDestSlug: '',
    currentDestName: '',
    selectedFlightId: null,
    selectedCabin: 'economy',
    passengers: {adults: 1, children: 0, infants: 0},
    flights: [],
};

/* ---- Modal ochish ---- */
function goToFlights(btn) {
    // Card dan destination slug ni olish
    const card = btn.closest('[data-slug]') ||
        btn.closest('.destination-card') ||
        btn.closest('.package-card');

    // slug ni topish — card da data-slug bo'lishi kerak
    let slug = '';
    let name = '';

    if (card) {
        slug = card.dataset.slug || '';
        name = card.querySelector('h3')?.textContent?.trim() || '';
    }

    // Agar card da slug yo'q bo'lsa — button da data-slug
    if (!slug) {
        slug = btn.dataset.slug || '';
        name = btn.dataset.name || '';
    }

    if (!slug) {
        showToast('Destination not found', 'error');
        return;
    }

    FM.currentDestSlug = slug;
    FM.currentDestName = name;
    FM.selectedFlightId = null;

    // Modalni ochish
    const modal = document.getElementById('flightsModal');
    if (!modal) return;

    document.getElementById('fm-dest-name').textContent = name || 'Loading...';
    document.getElementById('fm-flights-list').style.display = 'none';
    document.getElementById('fm-empty').style.display = 'none';
    document.getElementById('fm-footer').style.display = 'none';
    document.getElementById('fm-success').style.display = 'none';
    document.getElementById('fm-loading').style.display = 'block';

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Reyslarni yuklash
    loadFlights(slug);
}

/* ---- Reyslarni yuklash ---- */
function loadFlights(slug) {
    fetch(`/flights/?destination=${slug}`)
        .then(res => res.json())
        .then(data => {
            document.getElementById('fm-loading').style.display = 'none';
            FM.flights = data.flights || [];
            FM.currentDestName = data.destination || FM.currentDestName;
            document.getElementById('fm-dest-name').textContent = FM.currentDestName;

            if (FM.flights.length === 0) {
                document.getElementById('fm-empty').style.display = 'block';
            } else {
                renderFlights();
            }
        })
        .catch(() => {
            document.getElementById('fm-loading').style.display = 'none';
            document.getElementById('fm-empty').style.display = 'block';
        });
}

/* ---- Reyslarni render qilish ---- */
function renderFlights() {
    const list = document.getElementById('fm-flights-list');
    list.innerHTML = '';
    list.style.display = 'flex';

    FM.flights.forEach(flight => {
        const price = getPrice(flight);
        if (!price) return; // Bu cabin class uchun narx yo'q

        const logo = flight.airline_logo
            ? `<img src="/media/${flight.airline_logo}" alt="${flight.airline_name}">`
            : `<span>${flight.airline_name[0]}</span>`;

        const card = document.createElement('div');
        card.className = 'fm-flight-card';
        card.dataset.flightId = flight.id;
        card.onclick = () => selectFlight(flight.id, price);

        card.innerHTML = `
            <div class="selected-check"><i class="fas fa-check"></i></div>
            <div class="fm-flight-top">
                <div class="fm-airline">
                    <div class="fm-airline-logo">${logo}</div>
                    <div>
                        <div class="fm-airline-name">${flight.airline_name}</div>
                        <div class="fm-flight-number">${flight.flight_number || ''}</div>
                    </div>
                </div>
                <div class="fm-price">
                    <div class="fm-price-amount">$${price}</div>
                    <div class="fm-price-per">per person</div>
                </div>
            </div>
            <div class="fm-route">
                <div class="fm-city">
                    <div class="fm-city-time">${flight.departure_time || '--:--'}</div>
                    <div class="fm-city-name">${flight.departure_city}</div>
                </div>
                <div class="fm-route-line">
                    <div class="line"></div>
                    <div class="fm-route-duration">${flight.duration}</div>
                    ${flight.is_direct ? '<span class="fm-direct-badge">Direct</span>' : ''}
                </div>
                <div class="fm-city">
                    <div class="fm-city-time">${flight.arrival_time || '--:--'}</div>
                    <div class="fm-city-name">${FM.currentDestName}</div>
                </div>
            </div>
            ${flight.seats_left <= 10 ? `<div class="fm-seats"><i class="fas fa-fire"></i> Only ${flight.seats_left} seats left!</div>` : ''}
        `;

        list.appendChild(card);
    });

    if (list.children.length === 0) {
        list.style.display = 'none';
        document.getElementById('fm-empty').style.display = 'block';
    }
}

/* ---- Reys tanlash ---- */
function selectFlight(flightId, pricePerPerson) {
    FM.selectedFlightId = flightId;

    // Barcha cardlardan selected olib tashla
    document.querySelectorAll('.fm-flight-card').forEach(c => c.classList.remove('selected'));

    // Tanlangan cardga selected qo'sh
    const selected = document.querySelector(`[data-flight-id="${flightId}"]`);
    if (selected) selected.classList.add('selected');

    // Totalani hisoblash
    updateFlightTotal();

    // Footer ko'rsatish
    document.getElementById('fm-footer').style.display = 'flex';
}

/* ---- Total narxni yangilash ---- */
function updateFlightTotal() {
    if (!FM.selectedFlightId) return;

    const flight = FM.flights.find(f => f.id === FM.selectedFlightId);
    if (!flight) return;

    const price = getPrice(flight);
    const total = price * (FM.passengers.adults + FM.passengers.children);
    document.getElementById('fm-total-amount').textContent = total.toFixed(0);
}

/* ---- Cabin class bo'yicha narx ---- */
function getPrice(flight) {
    if (FM.selectedCabin === 'business' && flight.price_business) return parseFloat(flight.price_business);
    if (FM.selectedCabin === 'first' && flight.price_first) return parseFloat(flight.price_first);
    return parseFloat(flight.price_economy);
}

/* ---- Cabin class o'zgartirish ---- */
function switchCabin(cabin, btn) {
    FM.selectedCabin = cabin;
    FM.selectedFlightId = null;

    // Tab active
    document.querySelectorAll('.fm-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    // Reyslarni qayta render qilish
    document.getElementById('fm-footer').style.display = 'none';
    renderFlights();
}

/* ---- Yo'lovchi soni o'zgartirish ---- */
function updateFlightCount(type, delta) {
    FM.passengers[type] = Math.max(0, FM.passengers[type] + delta);
    if (type === 'adults') FM.passengers[type] = Math.max(1, FM.passengers[type]);

    document.getElementById(`fm-${type}`).textContent = FM.passengers[type];
    updateFlightTotal();
}

/* ---- Bron qilish ---- */
function bookFlight() {
    if (!FM.selectedFlightId) {
        showToast('Please select a flight first', 'error');
        return;
    }

    const btn = document.getElementById('fm-book-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Booking...';

    const formData = new FormData();
    formData.append('flight_id', FM.selectedFlightId);
    formData.append('cabin_class', FM.selectedCabin);
    formData.append('adults', FM.passengers.adults);
    formData.append('children', FM.passengers.children);
    formData.append('infants', FM.passengers.infants);

    fetch('/flights/book/', {
        method: 'POST',
        headers: {'X-CSRFToken': getCsrfToken()},
        body: formData,
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // Success state
                document.getElementById('fm-flights-list').style.display = 'none';
                document.getElementById('fm-footer').style.display = 'none';
                document.querySelector('.fm-tabs').style.display = 'none';
                document.querySelector('.fm-passengers').style.display = 'none';

                document.getElementById('fm-success-booking-number').textContent =
                    `Booking #${data.booking_number} — Total: $${data.total_price}`;
                document.getElementById('fm-success').style.display = 'block';

                showToast(data.message, 'success');
            } else {
                showToast(data.error || 'Booking failed', 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-ticket-alt"></i> Book Flight';
            }
        })
        .catch(() => {
            showToast('Network error. Please try again.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-ticket-alt"></i> Book Flight';
        });
}

/* ---- Modal yopish ---- */
function closeFlightsModal(e) {
    if (e && e.target !== document.getElementById('flightsModal')) return;
    const modal = document.getElementById('flightsModal');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';

    // Reset
    FM.selectedFlightId = null;
    FM.flights = [];

    // Tabs va passengers qaytarish
    const tabs = document.querySelector('.fm-tabs');
    const pass = document.querySelector('.fm-passengers');
    if (tabs) tabs.style.display = 'flex';
    if (pass) pass.style.display = 'flex';

    const btn = document.getElementById('fm-book-btn');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-ticket-alt"></i> Book Flight';
    }
}

/* ---- ESC tugmasi ---- */
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeFlightsModal();
});

/* ---- CSRF token ---- */
function getCsrfToken() {
    const cookie = document.cookie.split(';').find(c => c.trim().startsWith('csrftoken='));
    return cookie ? decodeURIComponent(cookie.trim().split('=')[1]) : '';
}
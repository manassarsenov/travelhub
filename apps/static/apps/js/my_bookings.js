/* ================================
   MY BOOKINGS — Dynamic / AJAX
   ================================ */

/* i18n_patterns sababli URLlar oldidan til prefiksi kerak: /en/, /uz/, /ru/ ... */
const LANG_PREFIX = '/' + (window.location.pathname.split('/').filter(Boolean)[0] || 'en') + '/';
const API_URL = LANG_PREFIX + 'my_bookings/api/';
const DEFAULT_IMG = document.getElementById('bookings-container')?.dataset.defaultImg || '';

// Central store keyed by booking_number
const _bookings = new Map();

const state = {
    tab: 'all',
    search: '',
    sort: 'date-desc',
    pages: { upcoming: 1, completed: 1, cancelled: 1 },
};

/* ─── Bootstrap ──────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', function () {
    applyViewPreference();
    setupSearch();
    loadAll();
});

/* ─── Load sections ──────────────────────────────────────────────────────── */

function loadAll() {
    showLoading('upcoming');
    showLoading('completed');
    showLoading('cancelled');
    Promise.all([
        fetchSection('upcoming',  state.pages.upcoming),
        fetchSection('completed', state.pages.completed),
        fetchSection('cancelled', state.pages.cancelled),
    ]).then(checkGlobalEmpty);
}

function loadSection(status) {
    showLoading(status);
    fetchSection(status, state.pages[status]).then(checkGlobalEmpty);
}

function fetchSection(status, page) {
    const params = new URLSearchParams({
        status, page,
        search: state.search,
        sort:   state.sort,
    });
    return fetch(`${API_URL}?${params}`)
        .then(r => r.json())
        .then(data => renderSection(status, data))
        .catch(() => renderError(status));
}

/* ─── Render helpers ─────────────────────────────────────────────────────── */

function showLoading(status) {
    const grid = document.getElementById(`${status}-grid`);
    if (grid) grid.innerHTML = '<div class="section-loading"><i class="fas fa-circle-notch fa-spin"></i></div>';
    const sec = document.getElementById(`${status}-section`);
    if (sec) sec.style.display = 'block';
}

function renderSection(status, data) {
    const grid    = document.getElementById(`${status}-grid`);
    const section = document.getElementById(`${status}-section`);
    const countEl = document.getElementById(`count-${status}`);
    const tabCnt  = document.getElementById(`tab-count-${status}`);
    const paginEl = document.getElementById(`pagination-${status}`);

    if (countEl)  countEl.textContent  = data.count ? `(${data.count})` : '';
    if (tabCnt)   tabCnt.textContent   = data.count;

    // Dynamic stats — refreshed from every API response
    if (data.stats) updateStats(data.stats);

    if (!data.bookings || data.bookings.length === 0) {
        if (grid)    grid.innerHTML    = '';
        if (section) section.style.display = 'none';
        if (paginEl) paginEl.innerHTML = '';
        return;
    }

    // Cache bookings for detail modal
    data.bookings.forEach(b => _bookings.set(b.booking_number, b));

    if (section) section.style.display = 'block';
    if (grid) {
        grid.innerHTML = data.bookings.map(b => buildCard(b, status)).join('');
        applyCurrentView(grid);
    }
    if (paginEl) renderPagination(paginEl, status, data.page, data.total_pages);
}

function renderError(status) {
    const grid = document.getElementById(`${status}-grid`);
    if (grid) grid.innerHTML =
        '<div class="section-loading" style="color:#ef4444;"><i class="fas fa-exclamation-circle"></i> Failed to load</div>';
}

function updateStats(stats) {
    const set = (id, v) => {
        const el = document.getElementById(id);
        if (el && v !== undefined && v !== null) el.textContent = v;
    };
    set('stat-total',     stats.total);
    set('stat-upcoming',  stats.upcoming);
    set('stat-completed', stats.completed);
    set('stat-cancelled', stats.cancelled);
    set('tab-count-all',       stats.total);
    set('tab-count-upcoming',  stats.upcoming);
    set('tab-count-completed', stats.completed);
    set('tab-count-cancelled', stats.cancelled);
}

/* ─── Card builder ───────────────────────────────────────────────────────── */

function buildCard(b, status) {
    const imgSrc      = b.image_url || DEFAULT_IMG;
    const statusBadge = buildStatusBadge(b.status);
    const num         = esc(b.booking_number);

    let locationHtml = '';
    if (b.destination_city) {
        const loc = b.destination_location ? ` — ${esc(b.destination_location)}` : '';
        locationHtml = `<div class="detail-item"><i class="fas fa-map-marker-alt"></i><span>${esc(b.destination_city)}${loc}</span></div>`;
    }

    let countdownHtml = '';
    if (status === 'upcoming' && b.days_until > 0) {
        countdownHtml = `<div class="countdown-timer"><i class="fas fa-clock"></i><span>Trip starts in <strong>${b.days_until} day${b.days_until !== 1 ? 's' : ''}</strong></span></div>`;
    }

    let metaHtml = `<span class="meta-item"><i class="fas fa-credit-card"></i>${esc(b.payment_method)}${b.card_mask ? ' · ' + esc(b.card_mask) : ''}</span>`;
    if (b.promo_code)     metaHtml += `<span class="meta-item promo-tag"><i class="fas fa-tag"></i> ${esc(b.promo_code)}</span>`;
    if (b.transaction_id) metaHtml += `<span class="meta-item"><i class="fas fa-receipt"></i> ${esc(b.transaction_id)}</span>`;
    if (b.paid_at && status === 'completed') {
        metaHtml += `<span class="meta-item"><i class="fas fa-check-circle" style="color:#10b981;"></i> Paid ${esc(b.paid_at)}</span>`;
    }

    // View details button — uses booking_number key into _bookings map
    const viewBtn = `<button class="action-btn secondary" onclick="openDetails('${num}')"><i class="fas fa-eye"></i> View Details</button>`;

    let actionHtml = '';
    if (status === 'upcoming') {
        if (b.status === 'pending') {
            actionHtml += `<a href="/booking/step-2/${esc(b.destination_slug)}/" class="action-btn primary pulse"><i class="fas fa-credit-card"></i> Complete Payment</a>`;
        }
        actionHtml += viewBtn;
        actionHtml += `<button class="action-btn danger"
            data-num="${num}"
            data-free="${b.is_free_cancellation}"
            data-can-free="${b.can_free_cancel}"
            data-cancel-text="${esc(b.cancellation_text)}"
            data-total="${esc(b.total_price)}"
            data-fee-percent="${esc(b.preview_fee_percent)}"
            data-fee="${esc(b.preview_fee)}"
            data-refund="${esc(b.preview_refund)}"
            onclick="cancelBooking(this)">
            <i class="fas fa-times"></i> Cancel</button>`;
    } else if (status === 'completed') {
        actionHtml += viewBtn;
        actionHtml += `<a href="/destination-detail/${esc(b.destination_slug)}/" class="action-btn secondary"><i class="fas fa-redo"></i> Book Again</a>`;
        actionHtml += `<button class="action-btn secondary"
            data-dest-slug="${esc(b.destination_slug)}"
            data-dest-name="${esc(b.destination_name)}"
            data-booking-num="${num}"
            onclick="writeReview(this)"><i class="fas fa-star"></i> Review</button>`;
    } else {
        actionHtml += viewBtn;
        actionHtml += `<a href="/destination-detail/${esc(b.destination_slug)}/" class="action-btn secondary"><i class="fas fa-search"></i> Book Similar Trip</a>`;
    }

    let cancelInfoHtml = '';
    if (status === 'cancelled') {
        const fee    = parseFloat(b.cancellation_fee || '0');
        const refund = parseFloat(b.refund_amount    || '0');
        const fmt    = n => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        if (fee > 0) {
            cancelInfoHtml = `
                <div class="cancellation-info" style="flex-direction:column;align-items:stretch;gap:4px;">
                    <div style="display:flex;align-items:center;gap:8px;font-weight:700;">
                        <i class="fas fa-info-circle"></i>Cancelled${b.cancelled_at ? ' · ' + esc(b.cancelled_at) : ''}
                    </div>
                    <div style="display:flex;justify-content:space-between;font-weight:500;">
                        <span>Fee ushlandi:</span><span>− $${fmt(fee)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;color:#065f46;font-weight:700;">
                        <span>Qaytarildi:</span><span>$${fmt(refund)}</span>
                    </div>
                </div>`;
        } else {
            cancelInfoHtml = `
                <div class="cancellation-info" style="background:#ecfdf5;color:#065f46;">
                    <i class="fas fa-leaf"></i>
                    <span>Bepul bekor qilindi · $${fmt(refund)} qaytarildi</span>
                </div>`;
        }
    }

    return `
<div class="booking-card" data-status="${status}" data-booking-date="${esc(b.booking_date_iso)}" data-price="${esc(b.total_price)}" data-destination="${esc(b.destination_name)}">
    <div class="booking-image">
        <img src="${imgSrc}" alt="${esc(b.destination_name)}" onerror="this.src='${DEFAULT_IMG}'">
        ${statusBadge}
    </div>
    <div class="booking-content">
        <div class="booking-header">
            <h3>${esc(b.destination_name)}</h3>
            <p class="booking-id">#${num}</p>
        </div>
        <div class="booking-details">
            <div class="detail-item"><i class="fas fa-calendar"></i><span>${esc(b.booking_date)}${b.time ? ' · ' + esc(b.time) : ''}</span></div>
            <div class="detail-item"><i class="fas fa-users"></i><span>${esc(b.tickets)}</span></div>
            ${locationHtml}
            <div class="detail-item price"><i class="fas fa-dollar-sign"></i><span>$${parseFloat(b.total_price).toLocaleString()}</span></div>
        </div>
        <div class="booking-meta">${metaHtml}</div>
        ${countdownHtml}
        ${cancelInfoHtml}
        <div class="booking-actions">${actionHtml}</div>
    </div>
</div>`;
}

function buildStatusBadge(status) {
    const map = {
        confirmed: '<span class="status-badge confirmed"><i class="fas fa-check-circle"></i> CONFIRMED</span>',
        pending:   '<span class="status-badge pending"><i class="fas fa-exclamation-circle"></i> PENDING PAYMENT</span>',
        completed: '<span class="status-badge completed"><i class="fas fa-check"></i> COMPLETED</span>',
        cancelled: '<span class="status-badge cancelled"><i class="fas fa-times"></i> CANCELLED</span>',
    };
    return map[status] || '';
}

function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/* ─── Pagination ─────────────────────────────────────────────────────────── */

function renderPagination(container, status, currentPage, totalPages) {
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = `<button class="page-btn" onclick="goToPage('${status}',${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;

    pageRange(currentPage, totalPages).forEach(p => {
        if (p === '…') {
            html += `<span style="padding:0 4px;color:#94a3b8;align-self:center;">…</span>`;
        } else {
            html += `<button class="page-btn${p === currentPage ? ' active' : ''}" onclick="goToPage('${status}',${p})">${p}</button>`;
        }
    });

    html += `<button class="page-btn" onclick="goToPage('${status}',${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
    container.innerHTML = html;
}

function pageRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4)         return [1, 2, 3, 4, 5, '…', total];
    if (current >= total - 3) return [1, '…', total-4, total-3, total-2, total-1, total];
    return [1, '…', current - 1, current, current + 1, '…', total];
}

function goToPage(status, page) {
    state.pages[status] = page;
    loadSection(status);
    document.getElementById(`${status}-section`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ─── Filter tabs ────────────────────────────────────────────────────────── */

function filterBookings(tab) {
    state.tab = tab;
    state.pages = { upcoming: 1, completed: 1, cancelled: 1 };

    document.querySelectorAll('.filter-tab').forEach(t =>
        t.classList.toggle('active', t.dataset.status === tab)
    );

    const statuses = ['upcoming', 'completed', 'cancelled'];

    if (tab === 'all') {
        loadAll();
    } else {
        statuses.forEach(s => {
            const sec  = document.getElementById(`${s}-section`);
            const grid = document.getElementById(`${s}-grid`);
            const pag  = document.getElementById(`pagination-${s}`);
            if (sec)  sec.style.display  = s === tab ? 'block' : 'none';
            if (grid) grid.innerHTML     = '';
            if (pag)  pag.innerHTML      = '';
        });
        loadSection(tab);
    }

    document.querySelector('.bookings-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ─── Search ─────────────────────────────────────────────────────────────── */

function setupSearch() {
    const inp = document.getElementById('search-input');
    if (!inp) return;
    let timer;
    inp.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(() => {
            state.search = this.value.trim();
            state.pages  = { upcoming: 1, completed: 1, cancelled: 1 };
            state.tab === 'all' ? loadAll() : loadSection(state.tab);
        }, 350);
    });
}

/* ─── Sort ───────────────────────────────────────────────────────────────── */

function onSortChange() {
    state.sort  = document.getElementById('sort-select').value;
    state.pages = { upcoming: 1, completed: 1, cancelled: 1 };
    state.tab === 'all' ? loadAll() : loadSection(state.tab);
}

/* ─── View toggle ────────────────────────────────────────────────────────── */

function toggleView(view) {
    document.querySelectorAll('.view-btn').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.view === view)
    );
    localStorage.setItem('bookingsView', view);
    document.querySelectorAll('.bookings-grid').forEach(g => applyCurrentView(g));
}

function applyCurrentView(grid) {
    const view = localStorage.getItem('bookingsView') || 'grid';
    grid.style.gridTemplateColumns = view === 'list' ? '1fr' : '';
    document.querySelectorAll('.view-btn').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.view === view)
    );
}

function applyViewPreference() {
    const view = localStorage.getItem('bookingsView') || 'grid';
    document.querySelectorAll('.view-btn').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.view === view)
    );
}

/* ─── Global empty state ─────────────────────────────────────────────────── */

function checkGlobalEmpty() {
    const anyVisible = ['upcoming', 'completed', 'cancelled'].some(s => {
        const sec = document.getElementById(`${s}-section`);
        return sec && sec.style.display !== 'none';
    });
    const emptyState = document.getElementById('empty-state');
    if (emptyState) emptyState.style.display = anyVisible ? 'none' : 'flex';
}

/* ─── View details modal ─────────────────────────────────────────────────── */

function openDetails(bookingNum) {
    const b = _bookings.get(bookingNum);
    if (!b) return;

    const statusColors = {
        'Confirmed': '#10b981', 'Completed': '#3b82f6',
        'Pending Payment': '#f59e0b', 'Cancelled': '#ef4444'
    };
    const color = statusColors[b.status_display] || '#64748b';

    const freeCancelRow = (b.is_free_cancellation && b.cancellation_text) ? `
        <div class="d-row">
            <i class="fas fa-leaf" style="color:#10b981;width:20px;margin-top:2px;"></i>
            <div><strong>Free Cancellation</strong><p style="color:#10b981;">${esc(b.cancellation_text)}</p></div>
        </div>` : '';

    // Cancelled bookinglar uchun fee / refund details
    let cancelDetailsRow = '';
    if (b.status === 'cancelled') {
        const fee    = parseFloat(b.cancellation_fee || '0');
        const refund = parseFloat(b.refund_amount    || '0');
        const fmt    = n => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        cancelDetailsRow = `
            <div class="d-row">
                <i class="fas fa-undo" style="color:#10b981;width:20px;margin-top:2px;"></i>
                <div>
                    <strong>Refund</strong>
                    <p style="color:#10b981;">$${fmt(refund)} qaytarildi${fee > 0 ? ` (15% / $${fmt(fee)} ushlandi)` : ' (to\'liq summa)'}</p>
                </div>
            </div>
            ${b.cancelled_at ? `
            <div class="d-row">
                <i class="fas fa-calendar-times" style="color:#ef4444;width:20px;margin-top:2px;"></i>
                <div><strong>Cancelled On</strong><p>${esc(b.cancelled_at)}</p></div>
            </div>` : ''}`;
    }

    document.getElementById('modal-title').textContent = 'Booking Details';
    document.getElementById('modal-body').innerHTML = `
        <div style="padding:25px;">
            <div style="background:#f8fafc;border-radius:14px;padding:18px;margin-bottom:22px;border:1px dashed #cbd5e1;text-align:center;">
                <span style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">Booking Reference</span>
                <span style="font-size:22px;font-weight:800;color:#2563eb;font-family:monospace;letter-spacing:2px;">#${esc(b.booking_number)}</span>
            </div>
            <div style="display:grid;gap:2px;">
                <div class="d-row">
                    <i class="fas fa-map-marker-alt" style="color:var(--primary);width:20px;margin-top:2px;"></i>
                    <div><strong>Destination</strong><p>${esc(b.destination_name)}</p></div>
                </div>
                <div class="d-row">
                    <i class="fas fa-calendar" style="color:var(--primary);width:20px;margin-top:2px;"></i>
                    <div><strong>Travel Date</strong><p>${esc(b.booking_date)}${b.time ? ' · ' + esc(b.time) : ''}</p></div>
                </div>
                <div class="d-row">
                    <i class="fas fa-users" style="color:var(--primary);width:20px;margin-top:2px;"></i>
                    <div><strong>Guests</strong><p>${esc(b.tickets)}</p></div>
                </div>
                <div class="d-row">
                    <i class="fas fa-dollar-sign" style="color:var(--primary);width:20px;margin-top:2px;"></i>
                    <div><strong>Total Paid</strong><p>$${parseFloat(b.total_price).toLocaleString()}</p></div>
                </div>
                <div class="d-row">
                    <i class="fas fa-credit-card" style="color:var(--primary);width:20px;margin-top:2px;"></i>
                    <div><strong>Payment Method</strong><p>${esc(b.payment_method)}${b.card_mask ? ' · ' + esc(b.card_mask) : ''}</p></div>
                </div>
                ${b.paid_at ? `<div class="d-row"><i class="fas fa-check-circle" style="color:#10b981;width:20px;margin-top:2px;"></i><div><strong>Paid On</strong><p>${esc(b.paid_at)}</p></div></div>` : ''}
                <div class="d-row">
                    <i class="fas fa-info-circle" style="color:${color};width:20px;margin-top:2px;"></i>
                    <div><strong>Status</strong><p style="color:${color};font-weight:700;">${esc(b.status_display)}</p></div>
                </div>
                ${freeCancelRow}
                ${cancelDetailsRow}
            </div>
        </div>`;

    document.getElementById('modal').classList.add('show');
}

function closeModal() {
    document.getElementById('modal').classList.remove('show');
}

/* ─── Cancel ─────────────────────────────────────────────────────────────── */

let _cancelId = null;

function cancelBooking(btn) {
    const bookingNum = btn.dataset.num;
    const isFree     = btn.dataset.free === 'True';
    const canFree    = btn.dataset.canFree === 'True';
    const cancelText = btn.dataset.cancelText || '';

    const total       = parseFloat(btn.dataset.total       || '0');
    const feePercent  = parseFloat(btn.dataset.feePercent  || '0');
    const feeAmount   = parseFloat(btn.dataset.fee         || '0');
    const refundAmt   = parseFloat(btn.dataset.refund      || '0');

    _cancelId = bookingNum;
    document.getElementById('cancel-booking-display').textContent = '#' + bookingNum;

    const infoEl = document.getElementById('cancel-free-info');
    const fmt = n => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    infoEl.style.display = 'block';
    if (feePercent === 0) {
        // Bepul bekor qilish — to'liq qaytariladi
        infoEl.style.cssText = 'display:block;background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;padding:12px 14px;border-radius:10px;font-size:13px;line-height:1.6;margin-bottom:18px;text-align:left;';
        infoEl.innerHTML = `
            <div style="font-weight:700;margin-bottom:4px;">
                <i class="fas fa-leaf" style="margin-right:6px;"></i>Bepul bekor qilish
            </div>
            <div>Sizga to'liq summa qaytariladi:
                <strong style="color:#065f46;">$${fmt(refundAmt)}</strong>
            </div>
            ${cancelText ? `<div style="margin-top:4px;font-size:12px;opacity:.85;">${esc(cancelText)}</div>` : ''}`;
    } else {
        // Fee ushlanadi
        infoEl.style.cssText = 'display:block;background:#fef2f2;color:#991b1b;border:1px solid #fecaca;padding:12px 14px;border-radius:10px;font-size:13px;line-height:1.6;margin-bottom:18px;text-align:left;';
        const reason = isFree
            ? "Bepul bekor qilish muddati o'tib ketgan."
            : "Bu destination uchun bepul bekor qilish mavjud emas.";
        infoEl.innerHTML = `
            <div style="font-weight:700;margin-bottom:6px;">
                <i class="fas fa-exclamation-circle" style="margin-right:6px;"></i>${esc(reason)}
            </div>
            <div style="display:flex;justify-content:space-between;padding:2px 0;">
                <span>Jami summa:</span><strong>$${fmt(total)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;padding:2px 0;color:#991b1b;">
                <span>Ushlanadi (${feePercent}%):</span><strong>− $${fmt(feeAmount)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;padding:6px 0 0;border-top:1px dashed #fecaca;margin-top:4px;color:#065f46;font-weight:700;">
                <span>Qaytariladi:</span><strong>$${fmt(refundAmt)}</strong>
            </div>`;
    }

    document.getElementById('cancel-modal').classList.add('show');
    document.getElementById('confirm-cancel-btn').onclick = () => doCancel(bookingNum);
}

function closeCancelModal() {
    document.getElementById('cancel-modal').classList.remove('show');
    _cancelId = null;
}

function doCancel(bookingNum) {
    closeCancelModal();
    showToast('Cancelling booking...', 'info');

    fetch(`${LANG_PREFIX}my_bookings/${bookingNum}/cancel/`, {
        method: 'POST',
        headers: { 'X-CSRFToken': CSRF_TOKEN, 'Content-Type': 'application/json' }
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            showToast(data.message || 'Booking cancelled successfully.', 'success');
            _bookings.delete(bookingNum);
            // Dinamik refresh — reload qilmaymiz
            state.pages = { upcoming: 1, completed: 1, cancelled: 1 };
            state.tab === 'all' ? loadAll() : loadSection(state.tab);
        } else {
            showToast('Error: ' + data.message, 'error');
        }
    })
    .catch(() => showToast('Network error. Please try again.', 'error'));
}

/* ─── Write review ───────────────────────────────────────────────────────── */

let _reviewRating = 0;

function writeReview(btn) {
    const destSlug = btn.dataset.destSlug;
    const destName = btn.dataset.destName;
    _reviewRating = 0;

    document.getElementById('modal-title').textContent = 'Write a Review';
    document.getElementById('modal-body').innerHTML = `
        <div style="padding:22px;">
            <p style="color:var(--text-muted);margin-bottom:18px;">
                Reviewing: <strong style="color:var(--dark);">${esc(destName)}</strong>
            </p>
            <div style="margin-bottom:18px;">
                <label style="display:block;margin-bottom:8px;font-weight:700;font-size:13px;">Your Rating *</label>
                <div id="star-row" style="display:flex;gap:10px;font-size:30px;">
                    ${[1,2,3,4,5].map(i =>
                        `<i class="fas fa-star" data-val="${i}" style="color:#d1d5db;cursor:pointer;"
                            onmouseover="hoverStar(${i})" onmouseout="resetStars()" onclick="selectStar(${i})"></i>`
                    ).join('')}
                </div>
            </div>
            <div style="margin-bottom:20px;">
                <label style="display:block;margin-bottom:8px;font-weight:700;font-size:13px;">Your Review *</label>
                <textarea id="review-text" placeholder="Tell us about your experience..."
                    style="width:100%;min-height:110px;padding:12px;border:2px solid #e8ecf1;border-radius:10px;
                           font-family:inherit;resize:vertical;box-sizing:border-box;font-size:14px;"></textarea>
            </div>
            <button class="action-btn primary" style="width:100%;justify-content:center;"
                    onclick="submitReview('${esc(destSlug)}')">
                <i class="fas fa-paper-plane"></i> Submit Review
            </button>
        </div>`;

    document.getElementById('modal').classList.add('show');
}

function hoverStar(val) {
    document.querySelectorAll('#star-row i').forEach(s =>
        s.style.color = parseInt(s.dataset.val) <= val ? '#fbbf24' : '#d1d5db'
    );
}
function resetStars() {
    document.querySelectorAll('#star-row i').forEach(s =>
        s.style.color = parseInt(s.dataset.val) <= _reviewRating ? '#fbbf24' : '#d1d5db'
    );
}
function selectStar(val) { _reviewRating = val; resetStars(); }

function submitReview(destSlug) {
    if (!_reviewRating) { showToast('Please select a star rating.', 'warning'); return; }
    const text = document.getElementById('review-text')?.value?.trim();
    if (!text) { showToast('Please write your review.', 'warning'); return; }
    closeModal();
    showToast('Thank you for your review!', 'success');
}

/* ─── Toast ──────────────────────────────────────────────────────────────── */

function showToast(message, type = 'info') {
    const icons  = { success:'fa-check-circle', error:'fa-times-circle', info:'fa-info-circle', warning:'fa-exclamation-triangle' };
    const colors = { success:'#10b981', error:'#ef4444', info:'#3b82f6', warning:'#f59e0b' };
    const titles = { success:'Success', error:'Error', info:'Info', warning:'Warning' };

    const icon = document.getElementById('toast-icon');
    icon.className = `fas ${icons[type] || icons.info} toast-icon`;
    icon.style.color = colors[type] || colors.info;
    document.getElementById('toast-title').textContent   = titles[type] || 'Info';
    document.getElementById('toast-message').textContent = message;

    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
}
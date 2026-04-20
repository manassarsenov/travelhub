/* =====================================================
   destinations_card_details.js
   Premium & Advanced Level
   Backend bilan 100% dinamik ishlaydi
   ===================================================== */

'use strict';

// =====================================================
// 1. DINAMIK MA'LUMOTLARNI OLISH (Data Injection)
// =====================================================
let PRICES = {};
let CURRENCY = '$';
let OVERLAY_REVIEWS = [];

const backendDataRaw = document.getElementById('backend-data');
if (backendDataRaw) {
    try {
        const backendData = JSON.parse(backendDataRaw.textContent);
        PRICES = backendData.prices || {};
        CURRENCY = backendData.currency || '$';
        OVERLAY_REVIEWS = backendData.overlay_reviews || [];
    } catch (e) {
        console.error("Backend ma'lumotlarini o'qishda xatolik:", e);
    }
}

// Vaqtlar ro'yxati (Hozircha statik, lekin buni ham backenddan olish mumkin)
const TIMES_LIST = [
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00'
];

const MONTHS_FULL = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// =====================================================
// 2. GLOBAL STATE (Holatni saqlash)
// =====================================================
const S = {
    selectedDate: null,
    selectedTime: null,
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    calendarOpen: false,
    moreTimesOpen: false,
    isWishlisted: false,
    reviewIdx: 0,
    similarIdx: 0,
    photoIdx: 0,
    galleryOpen: false,
    overlayDotIdx: 0,
    currentDestSlug: ''
};

// =====================================================
// 3. ASOSIY INIT (Sahifa yuklanganda barcha sozlamalar)
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    // --- A. UI Komponentlarni ishga tushirish ---
    buildDateChips();
    buildTimeGrid();
    updateTotal(); // Dinamik narxni hisoblash
    initScoreBars();
    initMobileBar();

    if (OVERLAY_REVIEWS.length > 0) {
        startOverlayDots();
    }
    updateMonthLabel();

    // --- B. Uzun matnlarni avtomatik qisqartirish (Advanced Logic) ---
    const textSections = [
        {elId: 'dcd-description', btnId: 'dcd-desc-btn'},
        {elId: 'dcd-additional', btnId: 'dcd-add-btn'}
    ];

    textSections.forEach(item => {
        const el = document.getElementById(item.elId);
        const btn = document.getElementById(item.btnId);

        if (el && btn) {
            // Matn qisqa bo'lsa "Show more" tugmasini yashirish
            if (el.scrollHeight <= 205) {
                btn.style.display = 'none';
                el.classList.remove('collapsed');
                el.style.maxHeight = 'none';
            }
        }
    });

    // --- C. Review Modal uchun Slug olish ---
    const slugEl = document.getElementById('dest-slug-data');
    if (slugEl) {
        S.currentDestSlug = slugEl.dataset.slug || '';
        const slugInput = document.getElementById('rm-dest-slug');
        const destName = document.getElementById('dcd-rm-dest-name');
        if (slugInput) slugInput.value = S.currentDestSlug;
        if (destName) destName.textContent = document.getElementById('dest-name')?.textContent || '';
    }

    /// --- D. Premium Categorical Rating (Hover & Click Logic) ---
    const ratingCategories = document.querySelectorAll('.dcd-rm-stars-mini');
ratingCategories.forEach(container => {
    const stars = Array.from(container.querySelectorAll('i'));
    const categoryName = container.dataset.category;
    const hiddenInput = document.getElementById(`val-${categoryName}`);

    if (!hiddenInput) return;

    function updateStars(val) {
        stars.forEach((s, i) => {
            s.classList.toggle('active', i < val);
        });
    }

    stars.forEach((star, index) => {
        star.addEventListener('mouseenter', () => updateStars(index + 1));

        star.addEventListener('mouseleave', () => {
            updateStars(parseInt(hiddenInput.value) || 5);
        });

        star.addEventListener('click', () => {
            hiddenInput.value = index + 1;
            updateStars(index + 1);
        });
    });

    // Boshlang'ich holat - 5 yulduz sariq
    updateStars(parseInt(hiddenInput.value) || 5);
});
});

// =====================================================
// 4. DATE & TIME (Sana va vaqt tanlash)
// =====================================================
function buildDateChips() {
    const wrap = document.getElementById('dcd-date-chips');
    if (!wrap) return;
    wrap.innerHTML = '';
    const today = new Date();

    for (let i = 0; i < 4; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        const btn = document.createElement('button');
        btn.className = 'dcd-date-chip' + (i === 0 ? ' active' : '');
        btn.dataset.dateStr = d.toISOString().split('T')[0];
        btn.innerHTML = `
            <span class="chip-day">${dayNames[d.getDay()]}</span>
            <span class="chip-date">${d.getDate()}</span>
            <span class="chip-month">${MONTHS_FULL[d.getMonth()].slice(0, 3)}</span>
            ${i === 0 ? '<span class="chip-today">Today</span>' : ''}
            ${i === 1 ? '<span class="chip-tomorrow">Tomorrow</span>' : ''}
        `;
        btn.addEventListener('click', () => {
            document.querySelectorAll('.dcd-date-chip').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            S.selectedDate = btn.dataset.dateStr;
            S.currentMonth = d.getMonth();
            S.currentYear = d.getFullYear();
            updateMonthLabel();
            buildTimeGrid();
        });
        wrap.appendChild(btn);
    }
    S.selectedDate = today.toISOString().split('T')[0];
}

function changeMonth(dir) {
    S.currentMonth += dir;
    if (S.currentMonth > 11) { S.currentMonth = 0; S.currentYear++; }
    if (S.currentMonth < 0) { S.currentMonth = 11; S.currentYear--; }
    updateMonthLabel();
    if (S.calendarOpen) renderCalendar();
}

function updateMonthLabel() {
    const el = document.getElementById('dcd-month-title');
    if (el) el.textContent = `${MONTHS_FULL[S.currentMonth]} ${S.currentYear}`;
}

function toggleCalendar(e) {
    if (e) e.preventDefault();
    S.calendarOpen = !S.calendarOpen;
    const cal = document.getElementById('dcd-full-calendar');
    if (!cal) return;
    cal.style.display = S.calendarOpen ? 'block' : 'none';
    if (S.calendarOpen) renderCalendar();
}

function renderCalendar() {
    const grid = document.getElementById('dcd-cal-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const firstDay = new Date(S.currentYear, S.currentMonth, 1).getDay();
    const totalDays = new Date(S.currentYear, S.currentMonth + 1, 0).getDate();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const offset = firstDay === 0 ? 6 : firstDay - 1;

    for (let i = 0; i < offset; i++) {
        const empty = document.createElement('div');
        empty.className = 'dcd-cal-day empty';
        grid.appendChild(empty);
    }

    for (let d = 1; d <= totalDays; d++) {
        const date = new Date(S.currentYear, S.currentMonth, d);
        const dateStr = date.toISOString().split('T')[0];
        const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());

        const btn = document.createElement('button');
        btn.className = 'dcd-cal-day' + (isPast ? ' past' : '') +
            (dateStr === S.selectedDate ? ' active' : '') +
            (dateStr === todayStr ? ' today' : '');
        btn.textContent = d;
        btn.disabled = isPast;

        if (!isPast) {
            btn.addEventListener('click', () => {
                S.selectedDate = dateStr;
                S.currentMonth = date.getMonth();
                S.currentYear = date.getFullYear();
                document.querySelectorAll('.dcd-cal-day').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.dcd-date-chip').forEach(c => {
                    c.classList.toggle('active', c.dataset.dateStr === dateStr);
                });
                buildTimeGrid();
            });
        }
        grid.appendChild(btn);
    }
}

function buildTimeGrid() {
    const grid = document.getElementById('dcd-time-grid');
    if (!grid) return;
    grid.innerHTML = '';
    S.selectedTime = TIMES_LIST[0];

    TIMES_LIST.forEach((t, i) => {
        const btn = document.createElement('button');
        btn.className = 'dcd-time-btn' + (i >= 6 ? ' hidden-time' : '') + (i === 0 ? ' active' : '');
        btn.textContent = t;
        btn.dataset.t = t;
        btn.addEventListener('click', () => {
            document.querySelectorAll('.dcd-time-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            S.selectedTime = t;
        });
        grid.appendChild(btn);
    });

    const toggle = document.getElementById('dcd-times-toggle');
    if (toggle) {
        toggle.classList.remove('expanded');
        toggle.innerHTML = '<i class="fas fa-chevron-down"></i> Show more';
    }
    S.moreTimesOpen = false;
}

function toggleMoreTimes() {
    S.moreTimesOpen = !S.moreTimesOpen;
    document.querySelectorAll('.dcd-time-btn.hidden-time').forEach(b => {
        b.style.display = S.moreTimesOpen ? 'block' : 'none';
    });
    const toggle = document.getElementById('dcd-times-toggle');
    if (toggle) {
        toggle.classList.toggle('expanded', S.moreTimesOpen);
        toggle.innerHTML = S.moreTimesOpen
            ? '<i class="fas fa-chevron-up"></i> Show less'
            : '<i class="fas fa-chevron-down"></i> Show more';
    }
}

// =====================================================
// 5. TICKET COUNTER & DYNAMIC CALCULATION
// =====================================================
function changeTicket(ticketId, delta, price) {
    const el = document.getElementById(`count-${ticketId}`);
    if (!el) return;

    let currentVal = parseInt(el.textContent) || 0;
    let newVal = Math.max(0, currentVal + delta);
    el.textContent = newVal;

    // Animatsiya (Bounce)
    el.style.transform = delta > 0 ? 'scale(1.4)' : 'scale(0.7)';
    setTimeout(() => { el.style.transform = 'scale(1)'; }, 200);

    updateTotal();
}

function updateTotal() {
    let total = 0;
    // Barcha ticket counterlarini yig'ib chiqamiz
    document.querySelectorAll('.ticket-count').forEach(span => {
        const count = parseInt(span.textContent) || 0;
        const price = parseFloat(span.dataset.price) || 0;
        total += count * price;
    });

    const el = document.getElementById('total-num');
    if (el) el.textContent = total.toFixed(2); // Sentlar bilan to'g'ri chiqish uchun
}

function proceedBooking() {
    if (!S.selectedDate) {
        toast('Please select a date first', 'error'); return;
    }
    if (!S.selectedTime) {
        toast('Please select a time slot', 'error'); return;
    }

    let totalCount = 0;
    let totalAmount = 0;
    const ticketParams = new URLSearchParams();

    ticketParams.append('date', S.selectedDate);
    ticketParams.append('time', S.selectedTime);

    document.querySelectorAll('.ticket-count').forEach(span => {
        const count = parseInt(span.textContent) || 0;
        const price = parseFloat(span.dataset.price) || 0;
        const tId = span.id.replace('count-', '');

        if (count > 0) {
            ticketParams.append(`ticket_${tId}`, count);
            totalCount += count;
            totalAmount += count * price;
        }
    });

    if (totalCount === 0) {
        toast('Please select at least 1 ticket', 'error');
        return;
    }

    ticketParams.append('total', totalAmount);
    window.location.href = `/booking/create/?${ticketParams.toString()}`;
}

// =====================================================
// 6. UX / UI TOGGLES (Accordion, Modals, Sliders)
// =====================================================
function toggleDescription() {
    const el = document.getElementById('dcd-description');
    const btn = document.getElementById('dcd-desc-btn');
    if (!el || !btn) return;
    const isCollapsed = el.classList.contains('collapsed');
    if (isCollapsed) {
        el.classList.remove('collapsed');
        btn.innerHTML = 'Show less <i class="fas fa-chevron-up"></i>';
    } else {
        el.classList.add('collapsed');
        btn.innerHTML = 'Show more <i class="fas fa-chevron-down"></i>';
        el.scrollIntoView({behavior: 'smooth', block: 'center'});
    }
}

function toggleAdditional() {
    const el = document.getElementById('dcd-additional');
    const btn = document.getElementById('dcd-add-btn');
    if (!el || !btn) return;
    const isCollapsed = el.classList.contains('collapsed');
    if (isCollapsed) {
        el.classList.remove('collapsed');
        btn.innerHTML = 'Show less <i class="fas fa-chevron-up"></i>';
    } else {
        el.classList.add('collapsed');
        btn.innerHTML = 'Show more <i class="fas fa-chevron-down"></i>';
    }
}

function toggleFaq(btn) {
    const body = btn.nextElementSibling;
    const isOpen = btn.classList.contains('open');
    document.querySelectorAll('.dcd-faq-btn.open').forEach(b => {
        b.classList.remove('open');
        if (b.nextElementSibling) b.nextElementSibling.classList.remove('open');
    });
    if (!isOpen) {
        btn.classList.add('open');
        body.classList.add('open');
    }
}

// --- MODALS ---
function openGalleryModal(index) {
    const modal = document.getElementById('dcd-gallery-modal');
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    S.galleryOpen = true;
}

function closeGalleryModal() {
    const modal = document.getElementById('dcd-gallery-modal');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
    S.galleryOpen = false;
}

function selectTicketsFromModal() {
    closeGalleryModal();
    scrollToPanel();
}

function openReviewModal() {
    const modal = document.getElementById('reviewModal');
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeReviewModal(e) {
    if (e && e.target !== document.getElementById('reviewModal')) return;
    const modal = document.getElementById('reviewModal');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        if (S.galleryOpen) closeGalleryModal();
        closeReviewModal();
    }
});

// --- SLIDERS ---
function slideReviews(dir) {
    const track = document.getElementById('dcd-reviews-track');
    if (!track) return;
    const cards = track.querySelectorAll('.dcd-review-card');
    const cardW = 316;
    const max = Math.max(0, cards.length - 2);
    S.reviewIdx = Math.max(0, Math.min(max, S.reviewIdx + dir));
    track.style.transform = `translateX(-${S.reviewIdx * cardW}px)`;
}

function slideSimilar() {
    const track = document.getElementById('dcd-similar-track');
    if (!track) return;
    const cards = track.querySelectorAll('.dcd-sim-card');
    const cardW = 236;
    const max = Math.max(0, cards.length - 3);
    S.similarIdx = S.similarIdx >= max ? 0 : S.similarIdx + 1;
    track.style.transform = `translateX(-${S.similarIdx * cardW}px)`;
}

function slideSimilarBack() {
    const track = document.getElementById('dcd-similar-track');
    if (!track) return;
    const cards = track.querySelectorAll('.dcd-sim-card');
    const cardW = 236;
    const max = Math.max(0, cards.length - 3);
    S.similarIdx = S.similarIdx <= 0 ? max : S.similarIdx - 1;
    track.style.transform = `translateX(-${S.similarIdx * cardW}px)`;
}

function slidePhotos() {
    const track = document.getElementById('dcd-tp-track');
    if (!track) return;
    const items = track.querySelectorAll('.dcd-tp-item');
    const itemW = 252;
    const max = Math.max(0, items.length - 2);
    S.photoIdx = S.photoIdx >= max ? 0 : S.photoIdx + 1;
    track.style.transform = `translateX(-${S.photoIdx * itemW}px)`;
}

function slidePhotosBack() {
    const track = document.getElementById('dcd-tp-track');
    if (!track) return;
    const items = track.querySelectorAll('.dcd-tp-item');
    const itemW = 252;
    const max = Math.max(0, items.length - 2);
    S.photoIdx = S.photoIdx <= 0 ? max : S.photoIdx - 1;
    track.style.transform = `translateX(-${S.photoIdx * itemW}px)`;
}

function scrollToPanel() {
    const panel = document.getElementById('dcd-booking-panel');
    if (panel) panel.scrollIntoView({behavior: 'smooth', block: 'start'});
}

function initMobileBar() {
    const bar = document.getElementById('dcd-mobile-bar');
    const panel = document.getElementById('dcd-booking-panel');
    if (!bar || !panel) return;
    const observer = new IntersectionObserver(([entry]) => {
        bar.style.display = entry.isIntersecting ? 'none' : 'flex';
    }, {threshold: 0.1});
    observer.observe(panel);
}

function initScoreBars() {
    const bars = document.querySelectorAll('.dcd-score-fill');
    const observer = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                const bar = e.target;
                const w = bar.getAttribute('data-width') || '80';
                bar.style.width = w + '%';
                observer.unobserve(bar);
            }
        });
    }, {threshold: 0.5});
    bars.forEach(b => observer.observe(b));
}

function startOverlayDots() {
    setInterval(() => {
        if(OVERLAY_REVIEWS.length === 0) return;
        S.overlayDotIdx = (S.overlayDotIdx + 1) % OVERLAY_REVIEWS.length;
        changeDot(S.overlayDotIdx);
    }, 4000);
}

function changeDot(index) {
    if(OVERLAY_REVIEWS.length === 0) return;
    S.overlayDotIdx = index;
    const dots = document.querySelectorAll('#rating-dots .dot');
    dots.forEach((d, i) => d.classList.toggle('active', i === index));

    const r = OVERLAY_REVIEWS[index];
    const avatarEl = document.querySelector('.dcd-top-rev-avatar');
    const nameEl = document.querySelector('.dcd-top-reviewer strong');
    const textEl = document.querySelector('.dcd-top-rev-text');

    if (avatarEl && nameEl && textEl) {
        [avatarEl, nameEl, textEl].forEach(el => el.style.opacity = '0');
        setTimeout(() => {
            avatarEl.textContent = r.avatar;
            nameEl.textContent = r.name;
            textEl.textContent = r.text;
            [avatarEl, nameEl, textEl].forEach(el => el.style.opacity = '1');
        }, 200);
    }
}

// =====================================================
// 7. REVIEW YUBORISH (AJAX SUBMIT)
// =====================================================
function setVisitType(btn) {
    document.querySelectorAll('.dcd-rm-vtype').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const input = document.getElementById('rm-visit-type-val');
    if (input) input.value = btn.dataset.val;
}

function updateCharCount(textarea) {
    const count = document.getElementById('rm-char-num');
    if (count) count.textContent = textarea.value.length;
}

function submitReview(e) {
    e.preventDefault();

    const textVal = document.getElementById('rm-text')?.value.trim();
    // Barcha kategoriyalar kiritilganini tasdiqlash uchun (aslida barchasida default 5 turadi)
    const serviceVal = document.getElementById('val-service_quality')?.value;

    const submitBtn = document.getElementById('rm-submit-btn');
    const submitTxt = document.getElementById('rm-submit-text');
    const submitLoad = document.getElementById('rm-submit-loading');

    // Validatsiya
    if (!serviceVal) {
        showError('Please rate all categories.');
        return;
    }
    if (!textVal || textVal.length < 10) {
        showError('Please write at least 10 characters in your review.');
        return;
    }

    hideError();

    // Loading holati
    submitBtn.disabled = true;
    submitTxt.style.display = 'none';
    submitLoad.style.display = 'flex';

    const form = document.getElementById('reviewForm');
    const formData = new FormData(form);

    fetch('/reviews/submit/', {
        method: 'POST',
        headers: {'X-CSRFToken': getCsrfToken()},
        body: formData,
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showSuccess();
        } else {
            showError(data.error || 'Something went wrong. Please try again.');
            resetSubmitBtn();
        }
    })
    .catch(() => {
        showError('Network error. Please check your connection and try again.');
        resetSubmitBtn();
    });
}

function showSuccess() {
    const form = document.getElementById('reviewForm');
    const success = document.getElementById('rm-success');
    if (form) form.style.display = 'none';
    if (success) success.style.display = 'block';
}

function showError(msg) {
    const errorDiv = document.getElementById('rm-error');
    const errorText = document.getElementById('rm-error-text');
    if (errorDiv) errorDiv.style.display = 'flex';
    if (errorText) errorText.textContent = msg;
}

function hideError() {
    const errorDiv = document.getElementById('rm-error');
    if (errorDiv) errorDiv.style.display = 'none';
}

function resetSubmitBtn() {
    const submitBtn = document.getElementById('rm-submit-btn');
    const submitTxt = document.getElementById('rm-submit-text');
    const submitLoad = document.getElementById('rm-submit-loading');
    if (submitBtn) submitBtn.disabled = false;
    if (submitTxt) submitTxt.style.display = 'flex';
    if (submitLoad) submitLoad.style.display = 'none';
}

function getCsrfToken() {
    const cookie = document.cookie
        .split(';')
        .find(c => c.trim().startsWith('csrftoken='));
    return cookie ? decodeURIComponent(cookie.trim().split('=')[1]) : '';
}

// =====================================================
// 8. SHARE UTILS
// =====================================================
function shareDestination() {
    if (navigator.share) {
        navigator.share({title: document.title, url: window.location.href})
            .catch(() => copyLink());
    } else {
        copyLink();
    }
}

function copyLink() {
    navigator.clipboard.writeText(window.location.href)
        .then(() => toast('Link copied to clipboard!', 'success'))
        .catch(() => toast('Could not copy link', 'error'));
}

function toast(message, type = 'success') {
    if (typeof showToast === 'function') {
        showToast(message, type);
        return;
    }
    const t = document.getElementById('toast');
    const ti = document.getElementById('toast-title');
    const tm = document.getElementById('toast-message');
    const ic = document.getElementById('toast-icon');
    if (!t) return;

    t.className = `toast ${type} show`;
    if (ti) ti.textContent = type === 'success' ? 'Success' : 'Notice';
    if (tm) tm.textContent = message;
    if (ic) ic.className = `fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'} toast-icon ${type}`;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}
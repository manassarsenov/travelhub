/* =====================================================
   destinations_card_details.js
   100% Frontend — hech qanday backend so'rovi yo'q
   ===================================================== */

'use strict';

// ===== STATIC DATA (hardcoded) =====
const PRICES = {adult: 33, child: 30, caregiver: 0, infant: 0};
const CURRENCY = '$';

const TIMES_LIST = [
    '12:00', '12:30', '13:00',
    '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00',
    '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00'
];

const MONTHS_FULL = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// Rating overlay reviews (hardcoded)
const OVERLAY_REVIEWS = [
    {
        avatar: 'L',
        name: 'Louise',
        text: 'Well organised. Woman in ticket office has great customer service skills. Amazing views.'
    },
    {
        avatar: 'W',
        name: 'Wayne',
        text: 'Great attraction. A must see when travelling in London. The view from the eye is amazing.'
    },
    {avatar: 'T', name: 'Ted', text: 'Many thanks to Lucy and James — excellent service at the Fast Track queue!'},
    {avatar: 'P', name: 'Peter', text: 'Unique calming ride and stunning views of Big Ben and Buckingham Palace.'}
];

// ===== STATE =====
const S = {
    selectedDate: null,
    selectedTime: null,
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    calendarOpen: false,
    moreTimesOpen: false,
    isWishlisted: false,
    tickets: {adult: 0, child: 0, caregiver: 1, infant: 0},
    reviewIdx: 0,
    similarIdx: 0,
    photoIdx: 0,
    galleryOpen: false,
    overlayDotIdx: 0
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    buildDateChips();
    buildTimeGrid();
    updateTotal();
    initScoreBars();
    initMobileBar();
    startOverlayDots();
    updateMonthLabel();
});

/* =====================================================
   DATE CHIPS — next 4 days
   ===================================================== */
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
            buildTimeGrid(); // refresh times for new date
        });
        wrap.appendChild(btn);
    }
    // Default = today
    S.selectedDate = today.toISOString().split('T')[0];
}

/* =====================================================
   MONTH NAVIGATION
   ===================================================== */
function changeMonth(dir) {
    S.currentMonth += dir;
    if (S.currentMonth > 11) {
        S.currentMonth = 0;
        S.currentYear++;
    }
    if (S.currentMonth < 0) {
        S.currentMonth = 11;
        S.currentYear--;
    }
    updateMonthLabel();
    if (S.calendarOpen) renderCalendar();
}

function updateMonthLabel() {
    const el = document.getElementById('dcd-month-title');
    if (el) el.textContent = `${MONTHS_FULL[S.currentMonth]} ${S.currentYear}`;
}

/* =====================================================
   FULL CALENDAR TOGGLE
   ===================================================== */
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

    // Monday-start offset
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
                // Update chips: clear all active
                document.querySelectorAll('.dcd-date-chip').forEach(c => {
                    c.classList.toggle('active', c.dataset.dateStr === dateStr);
                });
                buildTimeGrid();
            });
        }
        grid.appendChild(btn);
    }
}

/* =====================================================
   TIME GRID
   ===================================================== */
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

    // Reset show-more btn
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

/* =====================================================
   TICKET COUNTER
   ===================================================== */
function changeTicket(type, delta) {
    S.tickets[type] = Math.max(0, S.tickets[type] + delta);
    const el = document.getElementById(`count-${type}`);
    if (el) {
        el.textContent = S.tickets[type];
        // Bounce animation
        el.style.transform = delta > 0 ? 'scale(1.4)' : 'scale(0.7)';
        setTimeout(() => {
            el.style.transform = 'scale(1)';
        }, 200);
    }
    updateTotal();
}

function updateTotal() {
    const total = (S.tickets.adult * PRICES.adult) + (S.tickets.child * PRICES.child);
    const el = document.getElementById('total-num');
    if (el) el.textContent = total;
}

/* =====================================================
   BOOK BUTTON
   ===================================================== */
function proceedBooking() {
    if (!S.selectedDate) {
        toast('Please select a date first', 'error');
        return;
    }
    if (!S.selectedTime) {
        toast('Please select a time slot', 'error');
        return;
    }
    if (S.tickets.adult + S.tickets.child === 0) {
        toast('Please select at least 1 ticket', 'error');
        return;
    }
    const total = (S.tickets.adult * PRICES.adult) + (S.tickets.child * PRICES.child);
    toast(`Booking: ${S.selectedDate} at ${S.selectedTime} — Total: ${CURRENCY}${total}`, 'success');

    // Redirect to booking page with query params
    setTimeout(() => {
        const params = new URLSearchParams({
            date: S.selectedDate,
            time: S.selectedTime,
            adult: S.tickets.adult,
            child: S.tickets.child,
            caregiver: S.tickets.caregiver,
            infant: S.tickets.infant,
            total: total
        });
        window.location.href = `/booking/create/?${params.toString()}`;
    }, 1200);
}

/* =====================================================
   WISHLIST — frontend only (localStorage)
   ===================================================== */
// function toggleWishlist() {
//     S.isWishlisted = !S.isWishlisted;
//     const btn = document.getElementById('wishlist-btn');
//     if (!btn) return;
//     if (S.isWishlisted) {
//         btn.innerHTML = '<i class="fas fa-heart"></i> Saved';
//         btn.classList.add('active');
//         toast('Added to wishlist!', 'success');
//     } else {
//         btn.innerHTML = '<i class="far fa-heart"></i> Save';
//         btn.classList.remove('active');
//         toast('Removed from wishlist', 'success');
//     }
//     // Save in localStorage
//     const saved = JSON.parse(localStorage.getItem('th_wishlist') || '[]');
//     const id = 'london-eye';
//     if (S.isWishlisted) {
//         if (!saved.includes(id)) saved.push(id);
//     } else {
//         const idx = saved.indexOf(id);
//         if (idx > -1) saved.splice(idx, 1);
//     }
//     localStorage.setItem('th_wishlist', JSON.stringify(saved));
//
//     // Update navbar wishlist count
//     const badge = document.getElementById('wishlist-count');
//     if (badge) badge.textContent = saved.length;
// }

// Check localStorage on load
// document.addEventListener('DOMContentLoaded', () => {
//     const saved = JSON.parse(localStorage.getItem('th_wishlist') || '[]');
//     if (saved.includes('london-eye')) {
//         S.isWishlisted = true;
//         const btn = document.getElementById('wishlist-btn');
//         if (btn) {
//             btn.innerHTML = '<i class="fas fa-heart"></i> Saved';
//             btn.classList.add('active');
//         }
//     }
// });

/* =====================================================
   SHARE
   ===================================================== */
function shareDestination() {
    if (navigator.share) {
        navigator.share({title: 'Admission to the London Eye — TravelHub', url: window.location.href})
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

/* =====================================================
   DESCRIPTION TOGGLES
   ===================================================== */
function toggleDescription() {
    const el = document.getElementById('dcd-description');
    const btn = document.getElementById('dcd-desc-btn');
    if (!el || !btn) return;
    const isOpen = !el.classList.contains('collapsed');
    el.classList.toggle('collapsed', isOpen);
    btn.classList.toggle('expanded', !isOpen);
    btn.innerHTML = isOpen
        ? 'Show more <i class="fas fa-chevron-down"></i>'
        : 'Show less <i class="fas fa-chevron-up"></i>';
}

function toggleAdditional() {
    const el = document.getElementById('dcd-additional');
    const btn = document.getElementById('dcd-add-btn');
    if (!el || !btn) return;
    const isOpen = !el.classList.contains('collapsed');
    el.classList.toggle('collapsed', isOpen);
    btn.classList.toggle('expanded', !isOpen);
    btn.innerHTML = isOpen
        ? 'Show more <i class="fas fa-chevron-down"></i>'
        : 'Show less <i class="fas fa-chevron-up"></i>';
}

/* =====================================================
   FAQ ACCORDION
   ===================================================== */
function toggleFaq(btn) {
    const body = btn.nextElementSibling;
    const isOpen = btn.classList.contains('open');
    // Close all
    document.querySelectorAll('.dcd-faq-btn.open').forEach(b => {
        b.classList.remove('open');
        if (b.nextElementSibling) b.nextElementSibling.classList.remove('open');
    });
    if (!isOpen) {
        btn.classList.add('open');
        body.classList.add('open');
    }
}

/* =====================================================
   GALLERY MODAL
   ===================================================== */
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

// Close on ESC
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && S.galleryOpen) closeGalleryModal();
});

/* =====================================================
   REVIEWS SLIDER
   ===================================================== */
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initReviewSlider, 100);
});

function initReviewSlider() {
    const track = document.getElementById('dcd-reviews-track');
    const prevBtn = document.getElementById('rev-prev');
    const nextBtn = document.getElementById('rev-next');
    const controls = document.querySelector('.dcd-slider-navigation-v2');

    if (!track || !prevBtn || !nextBtn) return;

    const cards = track.querySelectorAll('.dcd-review-card-v2');

    // QOIDA: Agar reviewlar 0 ta bo'lsa, hamma narsani yashiramiz
    if (cards.length === 0) {
        if (controls) controls.style.display = 'none';
        return;
    }

    // Agar 2 ta yoki undan kam bo'lsa, strelkalarni yashiramiz
    if (cards.length <= 2) {
        prevBtn.classList.add('hide-arrow');
        nextBtn.classList.add('hide-arrow');
        const status = document.querySelector('.slider-status-v2');
        if (status) status.style.display = 'none';
        return;
    }

    S.reviewIdx = 0;
    track.style.transform = `translateX(0px)`;
    updateArrowStates(cards.length);
    updateProgressBar(0, cards.length);
}

function slideReviews(dir) {
    const track = document.getElementById('dcd-reviews-track');
    if (!track) return;
    const cards = track.querySelectorAll('.dcd-review-card-v2');
    if (cards.length <= 2) return;

    const cardW = cards[0].offsetWidth + 30; // 30px gap for V2
    const max = Math.max(0, cards.length - 2);

    S.reviewIdx = Math.max(0, Math.min(max, S.reviewIdx + dir));

    track.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
    track.style.transform = `translateX(-${S.reviewIdx * cardW}px)`;

    updateArrowStates(cards.length, max);
    updateProgressBar(S.reviewIdx, cards.length);
}

function updateProgressBar(idx, total) {
    const bar = document.getElementById('review-progress-bar');
    if (!bar) return;
    const progress = ((idx) / (total - 2)) * 100;
    bar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
}

function updateArrowStates(totalCards, maxIdx = null) {
    const prevBtn = document.getElementById('rev-prev');
    const nextBtn = document.getElementById('rev-next');

    if (!prevBtn || !nextBtn) return;

    if (totalCards <= 2) {
        prevBtn.classList.add('hide-arrow');
        nextBtn.classList.add('hide-arrow');
        return;
    }

    if (maxIdx === null) {
        maxIdx = Math.max(0, totalCards - 2);
    }

    if (S.reviewIdx <= 0) {
        prevBtn.classList.add('hide-arrow');
        nextBtn.classList.remove('hide-arrow');
    } else if (S.reviewIdx >= maxIdx) {
        nextBtn.classList.add('hide-arrow');
        prevBtn.classList.remove('hide-arrow');
    } else {
        prevBtn.classList.remove('hide-arrow');
        nextBtn.classList.remove('hide-arrow');
    }
}

/* =====================================================
   SIMILAR SLIDER
   ===================================================== */
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

/* =====================================================
   TRAVELLER PHOTOS SLIDER
   ===================================================== */
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

    // 🔁 ORQAGA LOGIKA
    S.photoIdx = S.photoIdx <= 0 ? max : S.photoIdx - 1;

    track.style.transform = `translateX(-${S.photoIdx * itemW}px)`;
}

/* =====================================================
   SCROLL TO BOOKING PANEL
   ===================================================== */
function scrollToPanel() {
    const panel = document.getElementById('dcd-booking-panel');
    if (panel) panel.scrollIntoView({behavior: 'smooth', block: 'start'});
}

/* =====================================================
   MOBILE BAR — show/hide based on panel visibility
   ===================================================== */
function initMobileBar() {
    const bar = document.getElementById('dcd-mobile-bar');
    const panel = document.getElementById('dcd-booking-panel');
    if (!bar || !panel) return;

    const observer = new IntersectionObserver(([entry]) => {
        bar.style.display = entry.isIntersecting ? 'none' : 'flex';
    }, {threshold: 0.1});
    observer.observe(panel);
}

/* =====================================================
   SCORE BARS ANIMATION
   ===================================================== */
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

/* =====================================================
   RATING CARD OVERLAY DOTS — auto rotate
   ===================================================== */
function startOverlayDots() {
    setInterval(() => {
        S.overlayDotIdx = (S.overlayDotIdx + 1) % OVERLAY_REVIEWS.length;
        changeDot(S.overlayDotIdx);
    }, 4000);
}

function changeDot(index) {
    S.overlayDotIdx = index;
    const dots = document.querySelectorAll('#rating-dots .dot');
    dots.forEach((d, i) => d.classList.toggle('active', i === index));

    const r = OVERLAY_REVIEWS[index];
    const avatarEl = document.querySelector('.dcd-top-rev-avatar');
    const nameEl = document.querySelector('.dcd-top-reviewer strong');
    const textEl = document.querySelector('.dcd-top-rev-text');

    if (avatarEl && nameEl && textEl) {
        // Fade transition
        [avatarEl, nameEl, textEl].forEach(el => el.style.opacity = '0');
        setTimeout(() => {
            avatarEl.textContent = r.avatar;
            nameEl.textContent = r.name;
            textEl.textContent = r.text;
            [avatarEl, nameEl, textEl].forEach(el => el.style.opacity = '1');
        }, 200);
    }
}

/* =====================================================
   TOAST NOTIFICATION
   ===================================================== */
function toast(message, type = 'success') {
    // main_base.js da showToast funksiyasi bor
    if (typeof showToast === 'function') {
        showToast(message, type);
        return;
    }
    // Fallback
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

/* ================================================================
   REVIEW MODAL JS — destination_detail.js ga qo'sh
   ================================================================ */

let currentRating = 0;
let currentDestSlug = '';

// destination slug ni page dan olish
// destination_detail.html da <div data-slug="{{ destination.slug }}"> bo'lishi kerak
document.addEventListener('DOMContentLoaded', () => {
    const slugEl = document.getElementById('dest-slug-data');
    if (slugEl) {
        currentDestSlug = slugEl.dataset.slug || '';
        const slugInput = document.getElementById('rm-dest-slug');
        const destName = document.getElementById('dcd-rm-dest-name');
        if (slugInput) slugInput.value = currentDestSlug;
        if (destName) destName.textContent = document.getElementById('dest-name')?.textContent || '';
    }
});

// Modal ochish
function openReviewModal() {
    const modal = document.getElementById('reviewModal');
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

// Modal yopish
function closeReviewModal(e) {
    if (e && e.target !== document.getElementById('reviewModal')) return;
    const modal = document.getElementById('reviewModal');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
}

// ESC tugmasi bilan yopish
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeReviewModal();
});

// Yulduz reyting
const ratingLabels = {
    1: '😞 Terrible',
    2: '😕 Poor',
    3: '😊 Average',
    4: '😄 Good',
    5: '🤩 Excellent!'
};

function setRating(val) {
    currentRating = val;
    const stars = document.querySelectorAll('.dcd-rm-star');
    const label = document.getElementById('rm-rating-label');
    const input = document.getElementById('rm-rating-val');

    stars.forEach((star, i) => {
        star.classList.toggle('active', i < val);
    });

    if (label) {
        label.textContent = ratingLabels[val];
        label.classList.add('rated');
    }
    if (input) input.value = val;
}

// Yulduz hover effekti
document.querySelectorAll('.dcd-rm-star').forEach((star, idx) => {
    star.addEventListener('mouseenter', () => {
        document.querySelectorAll('.dcd-rm-star').forEach((s, i) => {
            s.classList.toggle('hovered', i <= idx);
        });
    });
    star.addEventListener('mouseleave', () => {
        document.querySelectorAll('.dcd-rm-star').forEach(s => s.classList.remove('hovered'));
    });
});

// Tashrif turi
function setVisitType(btn) {
    document.querySelectorAll('.dcd-rm-vtype').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const input = document.getElementById('rm-visit-type-val');
    if (input) input.value = btn.dataset.val;
}

// Textarea harf hisobi
function updateCharCount(textarea) {
    const count = document.getElementById('rm-char-num');
    if (count) count.textContent = textarea.value.length;
}

// Review yuborish
function submitReview(e) {
    e.preventDefault();

    const ratingVal = document.getElementById('rm-rating-val')?.value;
    const textVal = document.getElementById('rm-text')?.value.trim();
    const errorDiv = document.getElementById('rm-error');
    const errorText = document.getElementById('rm-error-text');
    const submitBtn = document.getElementById('rm-submit-btn');
    const submitTxt = document.getElementById('rm-submit-text');
    const submitLoad = document.getElementById('rm-submit-loading');

    // Validatsiya
    if (!ratingVal) {
        showError('Please select a rating (1-5 stars).');
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

    // Form data
    const form = document.getElementById('reviewForm');
    const formData = new FormData(form);

    // // visited_at ni to'g'ri format qilish
    // const visitedAt = formData.get('visited_at');
    // if (visitedAt) {
    //     formData.set('visited_at', visitedAt + '-01'); // YYYY-MM → YYYY-MM-DD
    // }

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

// Izohlarga Like bosish funksiyasi
function toggleLike(buttonElement) {
    const url = buttonElement.getAttribute('data-url');
    const icon = buttonElement.querySelector('i');
    const countSpan = buttonElement.querySelector('.count');

    // Kichik loading effekti
    icon.style.opacity = '0.5';

    fetch(url, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        if (!response.ok) {
            if(response.status === 403 || response.status === 401) {
                showToast('Info', 'Please login to like reviews', 'info');
                throw new Error('Unauthorized');
            }
            throw new Error('Network error');
        }
        return response.json();
    })
    .then(data => {
        icon.style.opacity = '1';

        // Ekranda raqamni yangilash
        if (countSpan) countSpan.textContent = data.total_likes;

        // Tugma holatini o'zgartirish
        if (data.liked) {
            buttonElement.classList.add('is-liked');
            icon.className = 'fas fa-heart'; // To'ldirilgan yurak
        } else {
            buttonElement.classList.remove('is-liked');
            icon.className = 'far fa-heart'; // Bo'sh yurak
        }
    })
    .catch(error => {
        icon.style.opacity = '1';
        console.error('Like error:', error);
    });
}

// Django CSRF tokenini olish
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
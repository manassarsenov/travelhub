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

// Vaqtlar ro'yxati (Hozircha statik)
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
// 2. GLOBAL STATE
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
// 3. ASOSIY INIT (Sahifa yuklanganda)
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    // --- A. UI Komponentlarni ishga tushirish ---
    buildDateChips();
    buildTimeGrid();
    updateTotal();
    initScoreBars();
    initMobileBar();

    if (OVERLAY_REVIEWS.length > 0) {
        startOverlayDots();
    }
    updateMonthLabel();

    // --- B. Uzun matnlarni avtomatik qisqartirish ---
    const textSections = [
        {elId: 'dcd-description', btnId: 'dcd-desc-btn'},
        {elId: 'dcd-additional', btnId: 'dcd-add-btn'}
    ];

    textSections.forEach(item => {
        const el = document.getElementById(item.elId);
        const btn = document.getElementById(item.btnId);

        if (el && btn) {
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

    // --- D. Premium Categorical Rating (FONTAWESOME SAFE) ---
    document.querySelectorAll('.dcd-rm-stars-mini').forEach(container => {
        const stars = Array.from(container.querySelectorAll('.star-wrap'));
        const categoryName = container.dataset.category;
        const hiddenInput = document.getElementById(`val-${categoryName}`);

        if (!hiddenInput) return;

        // Yulduzlarni yangilash funksiyasi
        const updateStars = (rating) => {
            stars.forEach((star, index) => {
                const starVal = index + 1; // 1 dan 5 gacha
                if (starVal <= rating) {
                    star.classList.add('active');
                    star.style.color = '#fbbf24'; // Sariq
                    star.querySelector('i').style.color = '#fbbf24';
                } else {
                    star.classList.remove('active');
                    star.style.color = '#e2e8f0'; // Kulrang
                    star.querySelector('i').style.color = '#e2e8f0';
                }
            });
        };

        // Boshlang'ich holat
        let currentRating = parseInt(hiddenInput.value) || 5;
        updateStars(currentRating);

        // Click va Hover eventlari
        stars.forEach((star, index) => {
            const starVal = index + 1;

            star.addEventListener('mouseenter', () => updateStars(starVal));
            star.addEventListener('mouseleave', () => updateStars(currentRating));

            star.addEventListener('click', () => {
                currentRating = starVal;
                hiddenInput.value = currentRating;
                updateStars(currentRating);

                star.style.transform = 'scale(1.4)';
                setTimeout(() => {
                    star.style.transform = '';
                }, 150);
            });
        });
    });

    // --- E. MUVAFFAQIYAT XABARINI USHLAB OLISH VA MODALNI OCHISH ---
    // HTMLda success bloki bormi yo'qmi tekshiramiz
    const successBlock = document.getElementById('rm-success');
    const reviewForm = document.getElementById('reviewForm');
    const reviewModal = document.getElementById('reviewModal');

    if (successBlock) {
        // Demak, Django formani muvaffaqiyatli saqlab, sahifani yangilagan
        if (reviewForm) {
            reviewForm.style.display = 'none'; // Formani yashiramiz
        }
        if (reviewModal) {
            reviewModal.classList.add('open'); // Modalni avtomatik ochamiz
        }
    }

    // URL hash tekshirish (Agar #reviewModal bo'lsa modalni ochish)
    if (window.location.hash === '#reviewModal') {
        openReviewModal();
    }
});
// =====================================================
// 4. DATE & TIME
// =====================================================
// =====================================================
// 4. DATE & TIME
// =====================================================
function buildDateChips() {
    const wrap = document.getElementById('dcd-date-chips');
    if (!wrap) return;
    wrap.innerHTML = '';
    const today = new Date();

    // 4 ta emas, endi 6 ta kun chiqariladi
    for (let i = 0; i < 6; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        const btn = document.createElement('button');

        // Forma submit bo'lib ketmasligi uchun majburiy button type
        btn.type = 'button';

        btn.className = 'dcd-date-chip' + (i === 0 ? ' active' : '');
        btn.dataset.dateStr = d.toISOString().split('T')[0]; // Masalan: "2026-04-29"

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

            // Global JS o'zgaruvchisini yangilaymiz
            S.selectedDate = btn.dataset.dateStr;
            S.currentMonth = d.getMonth();
            S.currentYear = d.getFullYear();

            // ⚠️ ENG ASOSIY JOYI: Backendga jo'natish uchun HTML dagi yashirin inputga qiymat yozamiz
            const hiddenDateInput = document.getElementById('form-selected-date');
            if (hiddenDateInput) hiddenDateInput.value = S.selectedDate;

            updateMonthLabel();
            buildTimeGrid();
        });

        wrap.appendChild(btn);
    }

    // Sahifa yuklanganda dastlabki (Bugungi) sanani ham yashirin inputga yozib qo'yamiz
    S.selectedDate = today.toISOString().split('T')[0];
    const hiddenDateInput = document.getElementById('form-selected-date');
    if (hiddenDateInput) hiddenDateInput.value = S.selectedDate;
}

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
            // Forma yuborilmasligi uchun type qo'shamiz
            btn.type = 'button';

            btn.addEventListener('click', () => {
                S.selectedDate = dateStr;
                S.currentMonth = date.getMonth();
                S.currentYear = date.getFullYear();

                // ⚠️ Kalendardan tanlangan sanani yashirin inputga yozamiz
                const hiddenDateInput = document.getElementById('form-selected-date');
                if (hiddenDateInput) hiddenDateInput.value = S.selectedDate;

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
// 5. TICKET COUNTER
// =====================================================
function changeTicket(ticketId, delta, price) {
    const el = document.getElementById(`count-${ticketId}`);
    if (!el) return;

    let currentVal = parseInt(el.textContent) || 0;
    let newVal = Math.max(0, currentVal + delta);
    el.textContent = newVal;

    el.style.transform = delta > 0 ? 'scale(1.4)' : 'scale(0.7)';
    setTimeout(() => {
        el.style.transform = 'scale(1)';
    }, 200);

    updateTotal();
}

function updateTotal() {
    let total = 0;
    document.querySelectorAll('.ticket-count').forEach(span => {
        const count = parseInt(span.textContent) || 0;
        const price = parseFloat(span.dataset.price) || 0;
        total += count * price;
    });

    const el = document.getElementById('total-num');
    if (el) el.textContent = total.toFixed(2);
}

// =====================================================
// 6. UX / UI TOGGLES
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

function slideSimilar() {
    const track = document.getElementById('dcd-similar-track');
    if (!track) return;
    const cards = track.querySelectorAll('.dcd-sim-card');
    if (cards.length === 0) return;

    const cardWidth = 260; // Yangi qat'iy kenglik
    const gap = 20;
    const step = cardWidth + gap;

    const containerWidth = track.parentElement.offsetWidth;
    const visibleCards = Math.floor(containerWidth / step) || 1;
    const maxIdx = Math.max(0, cards.length - visibleCards);

    if (S.similarIdx < maxIdx) {
        S.similarIdx++;
    } else {
        S.similarIdx = 0;
    }

    track.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
    track.style.transform = `translateX(-${S.similarIdx * step}px)`;
}

function slideSimilarBack() {
    const track = document.getElementById('dcd-similar-track');
    if (!track) return;
    const cards = track.querySelectorAll('.dcd-sim-card');
    if (cards.length === 0) return;

    const cardWidth = 260;
    const gap = 20;
    const step = cardWidth + gap;

    const containerWidth = track.parentElement.offsetWidth;
    const visibleCards = Math.floor(containerWidth / step) || 1;
    const maxIdx = Math.max(0, cards.length - visibleCards);

    if (S.similarIdx > 0) {
        S.similarIdx--;
    } else {
        S.similarIdx = maxIdx;
    }

    track.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
    track.style.transform = `translateX(-${S.similarIdx * step}px)`;
}

function updateSimilarArrows(totalCards, visibleCards) {
    const prevBtn = document.querySelector('.dcd-sim-arrow.left');
    const nextBtn = document.querySelector('.dcd-sim-arrow.right');
    if (!prevBtn || !nextBtn) return;

    if (totalCards <= visibleCards) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    } else {
        prevBtn.style.display = 'flex';
        nextBtn.style.display = 'flex';
    }
}

// Sahifa yuklanganda strelkalarni tekshirish
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const track = document.getElementById('dcd-similar-track');
        if (track) {
            const cards = track.querySelectorAll('.dcd-sim-card');
            const containerWidth = track.parentElement.offsetWidth;
            if (cards.length > 0) {
                const cardWidth = cards[0].offsetWidth;
                const gap = parseFloat(window.getComputedStyle(track).gap) || 0;
                const visibleCards = Math.floor((containerWidth + gap) / (cardWidth + gap));
                updateSimilarArrows(cards.length, visibleCards);
            }
        }
    }, 500);
});

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
        if (OVERLAY_REVIEWS.length === 0) return;
        S.overlayDotIdx = (S.overlayDotIdx + 1) % OVERLAY_REVIEWS.length;
        changeDot(S.overlayDotIdx);
    }, 4000);
}

function changeDot(index) {
    if (OVERLAY_REVIEWS.length === 0) return;
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
    // Barcha kategoriyalar kiritilganini tasdiqlash uchun
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

window.reviewSliderIdx = 0;

document.addEventListener('DOMContentLoaded', function () {
    // Sahifa to'liq ochilib, elementlar o'lchamini olguncha 100ms kutamiz
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

    // Indexni nollaymiz
    S.reviewIdx = 0;
    track.style.transform = `translateX(0px)`;

    // Boshlang'ich holatni tekshiramiz
    updateArrowStates(cards.length);
}

function slideReviews(dir) {
    const track = document.getElementById('dcd-reviews-track');
    const cards = track.querySelectorAll('.dcd-review-card-premium');

    if (!track || cards.length <= 2) return;

    // Kartochka kengligi va orasidagi joy (gap: 25px)
    const cardW = cards[0].offsetWidth + 25;

    // Ekranga 2 tasi sig'adi deb hisoblaymiz (slider 2 tadan keyin suriladi)
    const maxIdx = Math.max(0, cards.length - 2);

    // Yangi indexni hisoblaymiz
    let newIdx = S.reviewIdx + dir;
    if (newIdx < 0) newIdx = 0;
    if (newIdx > maxIdx) newIdx = maxIdx;

    S.reviewIdx = newIdx;

    // Surish animatsiyasi
    track.style.transition = 'transform 0.4s ease-in-out';
    track.style.transform = `translateX(-${S.reviewIdx * cardW}px)`;

    // Strelkalarni yangilaymiz
    updateArrowStates(cards.length, maxIdx);
}

function updateArrowStates(totalCards, maxIdx = null) {
    const prevBtn = document.querySelector('.dcd-rev-prev');
    const nextBtn = document.querySelector('.dcd-rev-next');

    if (!prevBtn || !nextBtn) return;

    // AGAR 2 TA YOKI UNDAN KAM BO'LSA - HAR QANDAY HOLATDA YASHIRISH
    if (totalCards <= 2) {
        prevBtn.classList.add('hide-arrow');
        nextBtn.classList.add('hide-arrow');
        prevBtn.style.display = 'none'; // Qo'shimcha xavfsizlik
        nextBtn.style.display = 'none';
        return;
    } else {
        prevBtn.style.display = ''; // Qayta ko'rsatish
        nextBtn.style.display = '';
    }

    if (maxIdx === null) {
        maxIdx = Math.max(0, totalCards - 2);
    }

    // 1. BOSHIDA tursak (index == 0) -> Chap (prev) yashirinadi, o'ng (next) chiqadi
    if (S.reviewIdx <= 0) {
        prevBtn.classList.add('hide-arrow');
        nextBtn.classList.remove('hide-arrow');
    }
    // 2. OXIRIDA tursak (index >= maxIdx) -> O'ng (next) yashirinadi, chap (prev) chiqadi
    else if (S.reviewIdx >= maxIdx) {
        nextBtn.classList.add('hide-arrow');
        prevBtn.classList.remove('hide-arrow');
    }
    // 3. O'RTADA tursak -> Ikkalasi ham ko'rinadi
    else {
        prevBtn.classList.remove('hide-arrow');
        nextBtn.classList.remove('hide-arrow');
    }
}


// =====================================================
// 9. IZOHLARGA LIKE BOSISH (SMART AJAX)
// =====================================================
function toggleLike(buttonElement) {
    const url = buttonElement.getAttribute('data-url');
    const icon = buttonElement.querySelector('i');

    const originalIconClass = icon.className.includes('fa-heart') ? 'fa-heart' : 'fa-thumbs-up';
    icon.className = 'fas fa-spinner fa-spin'; // Loading...

    fetch(url, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCsrfToken(),
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
        .then(response => {
            if (!response.ok) {
                if (response.status === 403 || response.status === 401) {
                    toast('Please login to like reviews', 'error');
                    throw new Error('Unauthorized');
                }
                throw new Error('Network error');
            }
            return response.json();
        })
        .then(data => {
            // Layk bosilsa, V2 dizayni uchun "is-liked" qo'shamiz
            if (data.liked) {
                buttonElement.classList.add('is-active', 'liked', 'is-liked');
                icon.className = `fas ${originalIconClass}`;
            } else {
                buttonElement.classList.remove('is-active', 'liked', 'is-liked');
                icon.className = `far ${originalIconClass}`;
            }

            // Raqamni o'zgartirish (.count yoki .like-count ni qidiradi)
            const countSpan = buttonElement.querySelector('.like-count') || buttonElement.querySelector('.count');
            if (countSpan) countSpan.textContent = data.total_likes;
        })
        .catch(error => {
            // Xato bersa oldingi holiga qaytaramiz
            const isLiked = buttonElement.classList.contains('is-liked');
            icon.className = `${isLiked ? 'fas' : 'far'} ${originalIconClass}`;
        });
}
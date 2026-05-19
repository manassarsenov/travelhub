function getCurrentLang() {
    const parts = window.location.pathname.split('/');
    return ['uz', 'en', 'ru'].includes(parts[1]) ? parts[1] : (document.documentElement.lang || 'en');
}

// Initialize
window.addEventListener('load', function () {
    const screen = document.getElementById('loading-screen');
    screen.style.transition = 'opacity 0.3s ease';
    screen.style.opacity = '0';
    setTimeout(() => { screen.style.display = 'none'; }, 300);

    setupScrollEffects();
    // --- DJANGO XABARLARINI USHLAB OLISH ---
    checkForDjangoMessages();
});

function checkForDjangoMessages() {
    const msgContainer = document.getElementById('django-messages-data');
    if (!msgContainer) return;

    const messages = msgContainer.querySelectorAll('.django-msg-item');
    if (messages.length === 0) return;

    let delay = 100; // Xabarlar ustma-ust chiqib ketmasligi uchun

    messages.forEach(msg => {
        setTimeout(() => {
            let type = msg.getAttribute('data-type'); // 'success', 'error', 'info', 'warning'
            let text = msg.getAttribute('data-text');

            let title = "Xabar";

            // Django dan kelgan 'error' ni JS dagi 'error' turiga moslashtiramiz
            if (type === 'error' || type === 'danger') {
                title = "Xatolik";
                type = "error";
            } else if (type === 'success') {
                title = "Muvaffaqiyat!";
            }

            // Sizning mavjud zo'r funksiyangizni ishga tushiramiz
            showToast(title, text, type);

        }, delay);

        delay += 600; // Keyingi xabar yarim sekunddan keyin chiqadi
    });

    // O'qib bo'lingach, ularni HTML dan o'chirib tashlaymiz (toza turishi uchun)
    msgContainer.innerHTML = '';
}

// // Language Switcher
// function switchLang(lang, index) {
//     const buttons = document.querySelectorAll('.lang-btn');
//     const slider = document.getElementById('lang-slider');
//
//     buttons.forEach(btn => btn.classList.remove('active'));
//     buttons[index].classList.add('active');
//
//     slider.style.transform = `translateX(${index * 60}px)`;
//
//     showToast('Language Changed', `Switched to ${lang.toUpperCase()}`, 'success');
// }


// Dark Mode
let darkMode = false;

function toggleDarkMode() {
    darkMode = !darkMode;
    const icon = document.getElementById('theme-icon');

    if (darkMode) {
        document.body.style.background = '#0f172a';
        document.body.style.color = 'white';
        icon.classList.replace('fa-moon', 'fa-sun');
        showToast('Dark Mode', 'Enabled', 'success');
    } else {
        document.body.style.background = '#f8fafc';
        document.body.style.color = '#0f172a';
        icon.classList.replace('fa-sun', 'fa-moon');
        showToast('Light Mode', 'Enabled', 'success');
    }
}

// Mobile Menu
function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const hamburger = document.querySelector('.hamburger');

    menu.classList.toggle('active');
    hamburger.classList.toggle('active');
}

// User Menu
function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    dropdown.classList.toggle('show');
}

// Close dropdowns on outside click
document.addEventListener('click', function (e) {
    if (!e.target.closest('.user-menu')) {
        const dd = document.getElementById('user-dropdown');
        if (dd) dd.classList.remove('show');
    }
});

function toggleWishlist(btn, event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    const slug = btn.dataset.slug;
    if (!slug) return;

    const icon = btn.querySelector('i');
    btn.disabled = true;

    const csrfToken = document.cookie.split(';')
        .find(c => c.trim().startsWith('csrftoken='))
        ?.split('=')?.[1] || '';

    const _lang = '/' + window.location.pathname.split('/').filter(Boolean)[0] + '/';
    fetch(_lang + 'api/wishlist/toggle/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': csrfToken,
        },
        body: `slug=${encodeURIComponent(slug)}`,
    })
    .then(r => {
        if (r.status === 302 || r.redirected) {
            window.location.href = '/auth/login/?next=' + window.location.pathname;
            return null;
        }
        return r.json();
    })
    .then(data => {
        if (!data) return;
        btn.disabled = false;
        if (data.wishlisted) {
            btn.classList.add('wishlisted');
            icon.className = 'fas fa-heart';
            icon.style.transition = 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)';
            icon.style.transform = 'scale(1.3)';
            setTimeout(() => { icon.style.transform = 'scale(1)'; }, 260);
            showToast("Qo'shildi", "Wishlistga qo'shildi!", 'success');
            // "You May Also Like" kartani real-time o'chirish + wishlist gridga qo'shish
            const similarCard = btn.closest('.similar-card');
            if (similarCard) {
                similarCard.style.transition = 'opacity 0.3s, transform 0.3s';
                similarCard.style.opacity = '0';
                similarCard.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    similarCard.remove();
                    const section = document.querySelector('.similar-content');
                    if (section && !section.querySelector('.similar-card')) {
                        const wrapper = section.closest('.similar-section') || section.parentElement;
                        if (wrapper) wrapper.style.display = 'none';
                    }
                    // Wishlist gridga yangi karta qo'shamiz
                    if (data.destination && window.location.pathname.includes('/wishlist/')) {
                        _addToWishlistGrid(data.destination);
                    }
                }, 300);
            }
        } else {
            btn.classList.remove('wishlisted');
            icon.className = 'far fa-heart';
            showToast("O'chirildi", "Wishlistdan o'chirildi", 'info');
            // wishlist sahifasida bo'lsak kartani real-time o'chiramiz
            if (window.location.pathname.includes('/wishlist/')) {
                const card = btn.closest('.wishlist-card');
                if (card) {
                    // "You May Also Like" ga qo'shish uchun oldindan ma'lumot olamiz
                    const destSlug  = card.dataset.slug;
                    const nameEl    = card.querySelector('h3');
                    const destName  = nameEl ? nameEl.textContent.trim() : destSlug;
                    const destPrice = card.dataset.price;
                    const imgEl     = card.querySelector('.card-image img');
                    const destImg   = imgEl ? imgEl.src : '';
                    const linkEl    = card.querySelector('.quick-view-btn');
                    const destUrl   = linkEl ? linkEl.href : '#';

                    card.style.transition = 'opacity 0.3s, transform 0.3s';
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        card.remove();
                        if (typeof updateWishlistStats === 'function') updateWishlistStats();
                        if (typeof updateTabCounts   === 'function') updateTabCounts();
                        _addToSimilar(destSlug, destName, destPrice, destImg, destUrl);
                    }, 300);
                }
            }
        }
        const countEl = document.getElementById('wishlist-count');
        if (countEl) countEl.textContent = document.querySelectorAll('.wishlist-btn.wishlisted').length;
    })
    .catch(() => {
        btn.disabled = false;
        showToast('Xatolik', 'Iltimos, qaytadan urinib ko\'ring', 'error');
    });
}

// Autocomplete
function showAutocomplete(value) {
    const results = document.getElementById('autocomplete-results');

    if (value.length < 2) {
        results.classList.remove('show');
        return;
    }

    const filtered = destinations.filter(d =>
        d.name.toLowerCase().includes(value.toLowerCase()) ||
        d.location.toLowerCase().includes(value.toLowerCase())
    );

    if (filtered.length > 0) {
        results.innerHTML = filtered.map(d => `
                <div class="autocomplete-item" onclick="selectDestination('${d.name}')">
                    <i class="fas fa-map-marker-alt"></i>
                    <div>
                        <div style="font-weight: 600;">${d.name}</div>
                        <div style="font-size: 13px; color: var(--gray);">${d.location}</div>
                    </div>
                </div>
            `).join('');
        results.classList.add('show');
    } else {
        results.classList.remove('show');
    }
}

function selectDestination(name) {
    document.getElementById('search-location').value = name;
    document.getElementById('autocomplete-results').classList.remove('show');
}

// Scroll Effects
function setupScrollEffects() {
    const scrollTop = document.getElementById('scroll-top');
    const navbar = document.getElementById('navbar');

    window.addEventListener('scroll', function () {
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        if (window.scrollY > 500) {
            scrollTop.classList.add('show');
        } else {
            scrollTop.classList.remove('show');
        }
    });
}

function scrollToTop() {
    window.scrollTo({top: 0, behavior: 'smooth'});
}

// Toast
function showToast(title, message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toast-icon');
    const titleEl = document.getElementById('toast-title');
    const messageEl = document.getElementById('toast-message');

    titleEl.textContent = title;
    messageEl.textContent = message;

    toast.className = 'toast ' + type;
    icon.className = 'fas toast-icon ' + type;

    if (type === 'success') {
        icon.classList.add('fa-check-circle');
    } else {
        icon.classList.add('fa-exclamation-circle');
    }

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}

// Modal
function openModal(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = content;
    document.getElementById('modal').classList.add('show');
}

function closeModal() {
    document.getElementById('modal').classList.remove('show');
}

// Functions
function searchDestinations() {
    showToast('Searching', 'Finding best destinations for you...', 'success');
}

function viewDestination(id) {
    const dest = destinations.find(d => d.id === id);
    showToast('Loading', `Opening ${dest.name}...`, 'success');
}

function filterCategory(category) {
    showToast('Filter', `Showing ${category} destinations`, 'success');
}

function startQuiz() {
    showToast('Quiz', 'Starting recommendation quiz...', 'success');
}

function subscribeNewsletter() {
    const email = document.getElementById('newsletter-email').value;

    if (!email || !email.includes('@')) {
        showToast('Error', 'Please enter a valid email', 'error');
        return;
    }

    showToast('Subscribed', 'Thank you for subscribing!', 'success');
    document.getElementById('newsletter-email').value = '';
}

// <!-- ===== LANGUAGE SLIDER FIX — JS ===== -->

/*
 * MUAMMO: Eski kodda lang-slider faqat left: 3px dan boshlanar edi
 * va width: 35px qattiq belgilangan edi.
 * Bu "RU" button boshqa tugmalardan kengroq bo'lganda noto'g'ri
 * ko'rinishiga sabab bo'lardi.
 *
 * YECHIM: Har bir bosish vaqtida aktiv buttonning
 * haqiqiy offsetLeft va offsetWidth dan foydalanamiz.
 */
function switchLang(lang, idx) {
    // Barcha buttonlarni nofaol qilish
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));

    // Bosilgan buttonga aktiv class
    const activeBtn = document.querySelector(`.lang-btn[data-lang="${lang}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Sliderni to'g'ri joyga ko'chirish
    updateLangSlider();

    // Mobil ham yangilash
    document.querySelectorAll('.mobile-lang-btn').forEach(b => b.classList.remove('active'));
    const mobileIdx = ['en', 'uz', 'ru'].indexOf(lang);
    const mobileBtns = document.querySelectorAll('.mobile-lang-btn');
    if (mobileBtns[mobileIdx]) mobileBtns[mobileIdx].classList.add('active');
    showToast('Language', `Changed to ${lang.toUpperCase()}`, 'success');


    // Sahifani qayta yuklash (ixtiyoriy, Django i18n uchun)
    // window.location.href = `/${lang}/`;
}

function updateLangSlider() {
    const slider = document.getElementById('lang-slider');
    const activeBtn = document.querySelector('.lang-btn.active');
    if (!slider || !activeBtn) return;

    const switcher = document.getElementById('lang-switcher');
    const switcherRect = switcher.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();

    // Sliderni button ustiga qo'yamiz
    slider.style.left = (activeBtn.offsetLeft) + 'px';
    slider.style.width = activeBtn.offsetWidth + 'px';
}

/* Sahifa yuklanganda sliderni to'g'ri joyga qo'yish */
document.addEventListener('DOMContentLoaded', function () {
    updateLangSlider();
});

function switchMobileLang(lang) {
    document.querySelectorAll('.mobile-lang-btn').forEach(b => b.classList.remove('active'));
    const idx = ['en', 'uz', 'ru'].indexOf(lang);
    const btns = document.querySelectorAll('.mobile-lang-btn');
    if (btns[idx]) btns[idx].classList.add('active');
    switchLang(lang, idx);
}

// <!-- ===== RECENT SEARCHES LOGIC ===== -->
const STORAGE_KEY = 'travelhub_recent_searches';
const MAX_RECENT = 8;

function getRecentSearches() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

function saveRecentSearches(arr) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

function addRecentSearch(query) {
    if (!query.trim()) return;
    let arr = getRecentSearches().filter(q => q !== query);
    arr.unshift(query);
    if (arr.length > MAX_RECENT) arr = arr.slice(0, MAX_RECENT);
    saveRecentSearches(arr);
}

function removeRecentItem(query) {
    saveRecentSearches(getRecentSearches().filter(q => q !== query));
    renderRecentList();
}

function clearAllRecent() {
    saveRecentSearches([]);
    renderRecentList();
}

function renderRecentList() {
    const list = document.getElementById('recent-list');
    const arr = getRecentSearches();
    if (!arr.length) {
        list.innerHTML = `
                <div class="recent-empty">
                    <i class="fas fa-clock-rotate-left"></i>
                    <p>No recent searches yet</p>
                </div>`;
        return;
    }
    list.innerHTML = arr.map(q => `
            <button class="recent-item" onclick="pickRecent('${q.replace(/'/g, "\\'")}')">
                <span class="recent-item-icon"><i class="fas fa-clock-rotate-left"></i></span>
                <span class="recent-item-text">${q}</span>
                <span class="recent-item-del" onclick="event.stopPropagation(); removeRecentItem('${q.replace(/'/g, "\\'")}')">
                    <i class="fas fa-times"></i>
                </span>
            </button>`).join('');
}

function pickRecent(query) {
    document.getElementById('global-search-input').value = query;
    hideRecentSearches();
    doSearch();
}

function showRecentSearches() {
    renderRecentList();
    document.getElementById('recent-searches-dropdown').classList.add('show');
}

function hideRecentSearches() {
    document.getElementById('recent-searches-dropdown')?.classList.remove('show');
}

function doSearch() {
    const q = document.getElementById('global-search-input').value.trim();
    if (!q) return;
    addRecentSearch(q);
    hideLiveSuggestions();
    performGlobalSearch();
}

function handleSearchKey(e) {
    if (e.key === 'Enter') {
        doSearch();
    } else if (e.key === 'Escape') {
        hideRecentSearches();
        hideLiveSuggestions();
        document.getElementById('global-search-input').blur();
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        _focusSuggestionItem(1);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        _focusSuggestionItem(-1);
    }
}

function _focusSuggestionItem(dir) {
    const dd = document.getElementById('live-suggestions-dropdown');
    if (!dd || !dd.classList.contains('show')) return;
    const items = Array.from(dd.querySelectorAll('.ls-item'));
    if (!items.length) return;
    const active = document.activeElement;
    let idx = items.indexOf(active);
    idx = Math.max(0, Math.min(items.length - 1, idx + dir));
    items[idx].focus();
}

document.addEventListener('click', function (e) {
    const wrap = document.getElementById('navbar-search-wrap');
    if (wrap && !wrap.contains(e.target)) {
        hideRecentSearches();
        hideLiveSuggestions();
    }
});

// ============================================================
// PREMIUM GLOBAL SEARCH — real-time API + full results overlay
// ============================================================

let _searchTimer = null;
let _lastSearchQuery = '';
let _cachedResults = [];

function onSearchFocus() {
    const q = document.getElementById('global-search-input').value.trim();
    if (q.length >= 1) {
        if (_lastSearchQuery === q && _cachedResults.length > 0) {
            renderLiveSuggestions(_cachedResults, q);
        } else {
            showLiveSuggestionsLoading();
            fetchLiveSuggestions(q);
        }
    }
}

function onSearchInput(value) {
    clearTimeout(_searchTimer);
    const q = value.trim();

    if (q.length < 1) {
        hideLiveSuggestions();
        return;
    }

    showLiveSuggestionsLoading();
    // 1 harf bo'lsa 500ms, 2+ harf bo'lsa 250ms kutadi
    const delay = q.length === 1 ? 500 : 250;
    _searchTimer = setTimeout(() => fetchLiveSuggestions(q), delay);
}

function showLiveSuggestionsLoading() {
    const dd = document.getElementById('live-suggestions-dropdown');
    const loading = document.getElementById('ls-loading');
    const results = document.getElementById('ls-results');
    const footer = document.getElementById('ls-footer');

    if (!dd) return;
    loading.style.display = 'flex';
    results.innerHTML = '';
    footer.style.display = 'none';
    dd.classList.add('show');
}

async function fetchLiveSuggestions(q) {
    try {
        const res = await fetch('/' + getCurrentLang() + '/api/global-search/?q=' + encodeURIComponent(q));
        if (!res.ok) throw new Error('Network error');
        const data = await res.json();
        _lastSearchQuery = q;
        _cachedResults = data.results || [];
        renderLiveSuggestions(_cachedResults, q);
    } catch (err) {
        hideLiveSuggestions();
    }
}

function _escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function _highlightMatch(text, query) {
    if (!text || !query) return text || '';
    const re = new RegExp('(' + _escapeRegex(query) + ')', 'gi');
    return text.replace(re, '<mark class="ls-highlight">$1</mark>');
}

function renderLiveSuggestions(results, q) {
    const dd        = document.getElementById('live-suggestions-dropdown');
    const loading   = document.getElementById('ls-loading');
    const resultsEl = document.getElementById('ls-results');
    const footer    = document.getElementById('ls-footer');
    const countBadge = document.getElementById('ls-count-badge');

    if (!dd) return;
    loading.style.display = 'none';
    dd.classList.add('show');

    if (!results.length) {
        resultsEl.innerHTML =
            '<div class="ls-empty">' +
            '<i class="fas fa-magnifying-glass"></i>' +
            '<p>No results for "' + q + '"</p>' +
            '<small>Try a different keyword</small>' +
            '</div>';
        footer.style.display = 'none';
        return;
    }

    const destinations = results.filter(r => r.type === 'destination');
    const hotels       = results.filter(r => r.type === 'hotel');
    let html = '';

    if (destinations.length) {
        html += '<div class="ls-section-title">' +
            '<i class="fas fa-map-marker-alt" style="color:var(--primary)"></i>Destinations' +
            '</div>';

        destinations.slice(0, 3).forEach(r => {
            const thumb = r.image
                ? '<div class="ls-thumb"><img src="' + r.image + '" alt="' + r.title + '" loading="lazy"></div>'
                : '<div class="ls-thumb-icon"><i class="fas fa-map-marked-alt"></i></div>';

            const ratingHtml = r.rating > 0
                ? '<span class="ls-rating"><i class="fas fa-star"></i>' + r.rating + '</span>'
                : '';

            const locationHtml = r.subtitle
                ? '<i class="fas fa-location-dot" style="font-size:10px;color:#94a3b8"></i><span>' + r.subtitle + '</span>'
                : '';

            html +=
                '<a class="ls-item" href="' + r.url + '">' +
                thumb +
                '<div class="ls-info">' +
                    '<div class="ls-title">' + _highlightMatch(r.title, q) + '</div>' +
                    '<div class="ls-sub">' + locationHtml + (ratingHtml ? '<span style="color:#e2e8f0">·</span>' + ratingHtml : '') + '</div>' +
                '</div>' +
                '<div class="ls-meta">' +
                    '<div class="ls-price">$' + r.price + '</div>' +
                    '<div class="ls-price-label">per person</div>' +
                '</div>' +
                '</a>';
        });
    }

    if (hotels.length) {
        html += '<div class="ls-section-title">' +
            '<i class="fas fa-hotel" style="color:#d97706"></i>Hotels' +
            '</div>';

        hotels.slice(0, 2).forEach(r => {
            const thumb = r.image
                ? '<div class="ls-thumb"><img src="' + r.image + '" alt="' + r.title + '" loading="lazy"></div>'
                : '<div class="ls-thumb-icon hotel-icon"><i class="fas fa-hotel"></i></div>';

            const starsHtml = r.stars
                ? '<span class="ls-hotel-stars">' + '★'.repeat(r.stars) + '</span>'
                : '';

            const locationHtml = r.subtitle
                ? '<i class="fas fa-location-dot" style="font-size:10px;color:#94a3b8"></i><span>' + r.subtitle + '</span>'
                : '';

            html +=
                '<a class="ls-item" href="' + r.url + '">' +
                thumb +
                '<div class="ls-info">' +
                    '<div class="ls-title">' + _highlightMatch(r.title, q) + '</div>' +
                    '<div class="ls-sub">' + starsHtml + (locationHtml ? '<span style="color:#e2e8f0">·</span>' + locationHtml : '') + '</div>' +
                '</div>' +
                '<div class="ls-meta">' +
                    '<div class="ls-price">$' + r.price + '</div>' +
                    '<div class="ls-price-label">per night</div>' +
                '</div>' +
                '</a>';
        });
    }

    resultsEl.innerHTML = html;
    if (countBadge) countBadge.textContent = results.length;
    footer.style.display = 'block';
}

function showLiveSuggestions() {
    const dd = document.getElementById('live-suggestions-dropdown');
    if (dd) dd.classList.add('show');
}

function hideLiveSuggestions() {
    const dd = document.getElementById('live-suggestions-dropdown');
    if (dd) dd.classList.remove('show');
}

// "See all results" → destinations sahifasiga yo'naltirish
function performGlobalSearch() {
    const q = document.getElementById('global-search-input').value.trim();
    if (!q) return;
    addRecentSearch(q);
    hideLiveSuggestions();

    window.location.href = '/' + getCurrentLang() + '/destinations/?q=' + encodeURIComponent(q);
}

function _renderSearchOverlay(results, q, total) {
    const content = document.getElementById('search-results-content');
    const headerH2 = document.querySelector('.search-results-header h2');

    if (headerH2) {
        headerH2.textContent = total > 0
            ? total + ' result' + (total > 1 ? 's' : '') + ' for "' + q + '"'
            : 'No results for "' + q + '"';
    }

    if (!results.length) {
        content.innerHTML =
            '<div class="no-results">' +
            '<i class="fas fa-search"></i>' +
            '<h3>No results found</h3>' +
            '<p>Try different keywords or check your spelling.</p>' +
            '</div>';
        return;
    }

    const cards = results.map(r => {
        const noImg = r.type === 'hotel'
            ? 'background:linear-gradient(135deg,#f59e0b,#d97706);'
            : 'background:linear-gradient(135deg,var(--primary),var(--secondary));';
        const noImgIcon = r.type === 'hotel' ? 'fa-hotel' : 'fa-map-marked-alt';
        const imgEl = r.image
            ? '<img src="' + r.image + '" alt="' + r.title + '" loading="lazy">'
            : '<div style="width:100%;height:100%;' + noImg + 'display:flex;align-items:center;justify-content:center"><i class="fas ' + noImgIcon + '" style="font-size:44px;color:white;opacity:0.45"></i></div>';

        const badgeColor = r.type === 'hotel' ? 'color:#b45309;' : '';
        const badgeText  = r.type === 'hotel' ? 'Hotel' : 'Destination';

        const ratingLine = (r.type === 'destination' && r.rating > 0)
            ? '<div style="margin:6px 0;display:flex;align-items:center;gap:4px;font-size:13px;"><span style="color:#f59e0b">&#9733;</span><strong>' + r.rating + '</strong></div>'
            : '';
        const starsLine = (r.type === 'hotel' && r.stars)
            ? '<div style="color:#f59e0b;font-size:14px;margin:4px 0">' + '&#9733;'.repeat(r.stars) + '</div>'
            : '';

        const priceLabel = r.type === 'hotel' ? '/night' : '/person';

        return '<div class="search-result-card" onclick="window.location.href=\'' + r.url + '\'">' +
            '<div class="result-image">' + imgEl +
            '<span class="result-type" style="' + badgeColor + '">' + badgeText + '</span>' +
            '</div>' +
            '<div class="result-content">' +
            '<h3>' + r.title + '</h3>' +
            (r.subtitle ? '<p class="result-location"><i class="fas fa-map-marker-alt"></i>' + r.subtitle + '</p>' : '') +
            ratingLine + starsLine +
            '<div class="result-price">$' + r.price + '<span> ' + priceLabel + '</span></div>' +
            '</div>' +
            '</div>';
    }).join('');

    content.innerHTML = '<div class="search-results-grid">' + cards + '</div>';
}

function closeSearchResults() {
    const overlay = document.getElementById('search-results-overlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Close overlay on Escape
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeSearchResults();
    }
});

// Active nav link auto-detection
document.addEventListener('DOMContentLoaded', function () {
    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach(link => {
        try {
            const linkPath = new URL(link.href, window.location.origin).pathname;
            if (linkPath === currentPath) link.classList.add('active');
        } catch (_) {}
    });
});

// Initialize
window.addEventListener('load', function () {
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
    }, 2000);

    setupScrollEffects();
});

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
        document.getElementById('user-dropdown').classList.remove('show');
    }
    if (!e.target.closest('.search-field')) {
        document.getElementById('autocomplete-results').classList.remove('show');
    }
});

// Wishlist
let wishlist = [];

function toggleWishlist(btn) {
    const icon = btn.querySelector('i');
    const isWishlisted = btn.classList.contains('wishlisted');

    if (isWishlisted) {
        btn.classList.remove('wishlisted');
        icon.className = 'far fa-heart';
        icon.style.color = '';
        showToast('Removed', 'Removed from wishlist', 'error');
    } else {
        btn.classList.add('wishlisted');
        icon.className = 'fas fa-heart';
        icon.style.color = '#ef4444';
        icon.style.transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
        icon.style.transform = 'scale(1.2)';
        setTimeout(() => icon.style.transform = 'scale(1)', 250);
        showToast('Added', 'Added to wishlist', 'success');
    }

    const countEl = document.getElementById('wishlist-count');
    if (countEl) countEl.textContent = document.querySelectorAll('.wishlist-btn.wishlisted').length;
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
    }, 3500);
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
    document.getElementById('recent-searches-dropdown').classList.remove('show');
}

function doSearch() {
    const q = document.getElementById('global-search-input').value.trim();
    if (!q) return;
    addRecentSearch(q);
    hideRecentSearches();
    if (typeof performGlobalSearch === 'function') performGlobalSearch();
}

function handleSearchKey(e) {
    if (e.key === 'Enter') doSearch();
    if (e.key === 'Escape') hideRecentSearches();
}

document.addEventListener('click', function (e) {
    const wrap = document.getElementById('navbar-search-wrap');
    if (wrap && !wrap.contains(e.target)) hideRecentSearches();
});

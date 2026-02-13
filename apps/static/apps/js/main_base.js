
// Sample Data
const destinations = [
    {
        id: 1,
        name: "Maldives Paradise Resort",
        location: "Maldives",
        category: "Beach",
        price: 2500,
        rating: 4.9,
        reviews: 342,
        image: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800",
        lat: 3.2028,
        lng: 73.2207,
        featured: true,
        trending: true
    },
    {
        id: 2,
        name: "Swiss Alps Adventure",
        location: "Switzerland",
        category: "Mountain",
        price: 1800,
        rating: 4.8,
        reviews: 256,
        image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800",
        lat: 46.8182,
        lng: 8.2275,
        featured: true,
        trending: false
    },
    {
        id: 3,
        name: "Bali Cultural Experience",
        location: "Indonesia",
        category: "Cultural",
        price: 900,
        rating: 4.7,
        reviews: 489,
        image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800",
        lat: -8.4095,
        lng: 115.1889,
        featured: true,
        trending: true
    },
    {
        id: 4,
        name: "Dubai Luxury Getaway",
        location: "UAE",
        category: "City",
        price: 3200,
        rating: 4.9,
        reviews: 523,
        image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800",
        lat: 25.2048,
        lng: 55.2708,
        featured: false,
        trending: true
    },
    {
        id: 5,
        name: "Santorini Romantic Escape",
        location: "Greece",
        category: "Beach",
        price: 2100,
        rating: 4.8,
        reviews: 412,
        image: "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800",
        lat: 36.3932,
        lng: 25.4615,
        featured: false,
        trending: true
    },
    {
        id: 6,
        name: "Tokyo Urban Adventure",
        location: "Japan",
        category: "City",
        price: 1600,
        rating: 4.7,
        reviews: 634,
        image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800",
        lat: 35.6762,
        lng: 139.6503,
        featured: false,
        trending: false
    }
];

// Initialize
window.addEventListener('load', function () {
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
        loadDestinations();
        initMap();
    }, 2000);

    setupScrollEffects();
});

// Load Destinations
function loadDestinations() {
    const featured = destinations.filter(d => d.featured);
    const trending = destinations.filter(d => d.trending);

    document.getElementById('featured-destinations').innerHTML = featured.map(d => createDestinationCard(d)).join('');
    document.getElementById('trending-destinations').innerHTML = trending.map(d => createDestinationCard(d)).join('');
}

// Create Destination Card
function createDestinationCard(dest) {
    return `
            <div class="destination-card" onclick="viewDestination(${dest.id})">
                <div class="card-image">
                    <img src="${dest.image}" alt="${dest.name}">
                    <div class="card-badge">${dest.category}</div>
                    <button class="wishlist-btn" onclick="event.stopPropagation(); toggleWishlist(${dest.id})">
                        <i class="far fa-heart"></i>
                    </button>
                </div>
                <div class="card-content">
                    <h3>${dest.name}</h3>
                    <div class="card-location">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${dest.location}</span>
                    </div>
                    <div class="card-footer">
                        <div class="rating">
                            <i class="fas fa-star stars"></i>
                            <span style="font-weight: 800;">${dest.rating}</span>
                            <span style="color: var(--gray); font-size: 14px;">(${dest.reviews})</span>
                        </div>
                        <div class="price">
                            ${dest.price}
                            <span>/night</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
}

// Initialize Map
function initMap() {
    const map = L.map('map').setView([20, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    destinations.forEach(dest => {
        L.marker([dest.lat, dest.lng])
            .addTo(map)
            .bindPopup(`
                    <div style="text-align: center;">
                        <h4 style="margin-bottom: 5px;">${dest.name}</h4>
                        <p style="color: gray; margin-bottom: 10px;">${dest.location}</p>
                        <p style="font-weight: bold; color: #667eea;">${dest.price}/night</p>
                    </div>
                `);
    });
}

// Language Switcher
function switchLang(lang, index) {
    const buttons = document.querySelectorAll('.lang-btn');
    const slider = document.getElementById('lang-slider');

    buttons.forEach(btn => btn.classList.remove('active'));
    buttons[index].classList.add('active');

    slider.style.transform = `translateX(${index * 60}px)`;

    showToast('Language Changed', `Switched to ${lang.toUpperCase()}`, 'success');
}

// Mobile Language
function switchMobileLang(lang) {
    document.querySelectorAll('.mobile-lang-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    showToast('Language', `Changed to ${lang.toUpperCase()}`, 'success');
}

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

function toggleWishlist(id) {
    if (wishlist.includes(id)) {
        wishlist = wishlist.filter(item => item !== id);
        showToast('Removed', 'Removed from wishlist', 'error');
    } else {
        wishlist.push(id);
        showToast('Added', 'Added to wishlist', 'success');
    }
    document.getElementById('wishlist-count').textContent = wishlist.length;
}

function openWishlist() {
    showToast('Wishlist', `You have ${wishlist.length} items`, 'success');
}

// function goToNotifications() {
//     window.location.href = "{% url 'notification_page' %}";}

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


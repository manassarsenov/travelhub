// ===================================
// DESTINATIONS PAGE - JAVASCRIPT
// ===================================

// Smooth scroll to section
function scrollToSection(selector) {
    const section = document.querySelector(selector);
    if (section) {
        section.scrollIntoView({behavior: 'smooth'});
    }
}

// Video controls
const heroVideo = document.querySelector('.hero-video');
const playPauseBtn = document.getElementById('play-pause-btn');
const muteBtn = document.getElementById('mute-btn');

function toggleVideo() {
    if (heroVideo.paused) {
        heroVideo.play();
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    } else {
        heroVideo.pause();
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
}

function toggleMute() {
    heroVideo.muted = !heroVideo.muted;
    muteBtn.innerHTML = heroVideo.muted
        ? '<i class="fas fa-volume-mute"></i>'
        : '<i class="fas fa-volume-up"></i>';
}

// Counter animation for numbers
function animateCounter(element) {
    const target = parseInt(element.getAttribute('data-count'));
    const duration = 2000;
    const increment = target / (duration / 16);
    let current = 0;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target.toLocaleString();
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current).toLocaleString();
        }
    }, 16);
}

// Intersection Observer for counter animations
const observerOptions = {
    threshold: 0.5,
    rootMargin: '0px'
};

const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const counters = entry.target.querySelectorAll('.metric-number, .stat-number');
            counters.forEach(counter => {
                if (!counter.classList.contains('animated')) {
                    counter.classList.add('animated');
                    animateCounter(counter);
                }
            });
        }
    });
}, observerOptions);

// Observe sections with counters
document.addEventListener('DOMContentLoaded', () => {
    const metricsSection = document.querySelector('.metrics');
    const statsSection = document.querySelector('.stats-dashboard');

    if (metricsSection) counterObserver.observe(metricsSection);
    if (statsSection) counterObserver.observe(statsSection);
});

// Timeline functionality
let currentYear = '2020';

function showTimelineCard(year) {
    // Update active year
    document.querySelectorAll('.timeline-year').forEach(y => {
        y.classList.remove('active');
    });
    document.querySelector(`[data-year="${year}"]`).classList.add('active');

    // Update active card
    document.querySelectorAll('.timeline-card').forEach(card => {
        card.classList.remove('active');
    });
    document.getElementById(`card-${year}`).classList.add('active');

    // Update progress line
    const yearIndex = ['2020', '2021', '2022', '2023', '2024', '2025'].indexOf(year);
    const progressPercentage = (yearIndex / 5) * 100;
    document.getElementById('timeline-progress').style.width = progressPercentage + '%';

    currentYear = year;
}

// Flip card functionality for values
function flipCard(card) {
    card.classList.toggle('flipped');
}

// Flip team card functionality
function flipTeamCard(card) {
    card.classList.toggle('flipped');
}

// Auto-play timeline animation
let timelineAutoPlay = true;
let timelineInterval;

function startTimelineAutoPlay() {
    const years = ['2020', '2021', '2022', '2023', '2024', '2025'];
    let currentIndex = 0;

    timelineInterval = setInterval(() => {
        if (timelineAutoPlay) {
            currentIndex = (currentIndex + 1) % years.length;
            showTimelineCard(years[currentIndex]);
        }
    }, 4000);
}

// Stop autoplay when user interacts
document.querySelectorAll('.timeline-year').forEach(year => {
    year.addEventListener('click', () => {
        timelineAutoPlay = false;
        clearInterval(timelineInterval);
    });
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Start timeline autoplay
    startTimelineAutoPlay();

    // AOS (Animate On Scroll) initialization - if using AOS library
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 1000,
            once: true,
            offset: 100
        });
    }

    // Parallax effect for hero
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const heroContent = document.querySelector('.hero-content');
        const heroVideo = document.querySelector('.hero-video');

        if (heroContent && scrolled < window.innerHeight) {
            heroContent.style.transform = `translateY(${scrolled * 0.5}px)`;
            heroContent.style.opacity = 1 - (scrolled / window.innerHeight);
        }

        if (heroVideo && scrolled < window.innerHeight) {
            heroVideo.style.transform = `translateY(${scrolled * 0.3}px)`;
        }
    });

    // Add click listeners to all value cards
    document.querySelectorAll('.value-card').forEach(card => {
        card.addEventListener('click', () => {
            flipCard(card);
        });
    });

    // Add click listeners to all team cards
    document.querySelectorAll('.team-card').forEach(card => {
        card.addEventListener('click', () => {
            flipTeamCard(card);
        });
    });
});

// Prevent card flip when clicking on social links
document.querySelectorAll('.team-socials a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.stopPropagation();
    });
});

// Smooth reveal animations on scroll
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
        }
    });
}, {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
});

// Observe all sections for reveal animation
document.addEventListener('DOMContentLoaded', () => {
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        revealObserver.observe(section);
    });
});

// Mission & Vision hover effect enhancement
document.addEventListener('DOMContentLoaded', () => {
    const mission = document.querySelector('.mission');
    const vision = document.querySelector('.vision');

    if (mission && vision) {
        mission.addEventListener('mouseenter', () => {
            vision.style.flex = '0.8';
        });

        mission.addEventListener('mouseleave', () => {
            vision.style.flex = '1';
        });

        vision.addEventListener('mouseenter', () => {
            mission.style.flex = '0.8';
        });

        vision.addEventListener('mouseleave', () => {
            mission.style.flex = '1';
        });
    }
});

// Loading animation for images
document.addEventListener('DOMContentLoaded', () => {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('load', () => {
            img.classList.add('loaded');
        });
    });
});


/* ---- Region tab almashtirish ---- */
function switchRegion(region, btn) {
    document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.cities-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('panel-' + region);
    if (panel) panel.classList.add('active');

    const loadMoreBtn = document.getElementById('cities-load-more-btn');
    const showingText = document.getElementById('cities-showing-text');

    // Allaqachon yuklangan bo'lsa — faqat showing text va load more yangilansin
    if (panel.dataset.loaded === 'true') {
        const total = parseInt(panel.dataset.total || 0);
        const shown = panel.querySelectorAll('.city-card').length;

        showingText.textContent = `Showing ${shown} of ${total} cities`;

        if (shown < total) {
            loadMoreBtn.style.display = '';
            loadMoreBtn.dataset.region = region;
            loadMoreBtn.dataset.offset = shown;
        } else {
            loadMoreBtn.style.display = 'none';
        }
        return;
    }

    // Yangi region — AJAX bilan yuklash
    const grid = panel.querySelector('.cities-grid');
    grid.innerHTML = '<div style="text-align:center;padding:40px"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
    const lang = document.documentElement.lang || 'en';

    fetch(`/${lang}/destinations/cities/${region}/`)
        .then(res => res.json())
        .then(data => {
            grid.innerHTML = '';
            data.cities.forEach(city => {
                grid.innerHTML += `
                    <div class="city-card" onclick="filterByCity('${city.name}')">
                        <img src="${city.image_url}" alt="${city.name}" loading="lazy">
                        <div class="city-card-overlay"></div>
                        <div class="city-card-info">
                            <div class="city-card-name">${city.name}</div>
                            <div class="city-card-things">${city.things_to_do} things to do</div>
                        </div>
                    </div>`;
            });

            if (data.has_more) {
                loadMoreBtn.style.display = '';
                loadMoreBtn.dataset.region = region;
                loadMoreBtn.dataset.offset = 8;
                showingText.textContent = `Showing 8 of ${data.total} cities`;
            } else {
                loadMoreBtn.style.display = 'none';
                showingText.textContent = `Showing ${data.cities.length} of ${data.total} cities`;
            }

            panel.dataset.loaded = 'true';
        })
        .catch(() => {
            grid.innerHTML = '<p>Xatolik yuz berdi</p>';
        });
}

function loadMoreCities() {
    const btn = document.getElementById('cities-load-more-btn');
    const showingText = document.getElementById('cities-showing-text');
    const region = btn.dataset.region;
    const offset = parseInt(btn.dataset.offset);
    const lang = document.documentElement.lang || 'en';

    const panel = document.getElementById('panel-' + region);
    const grid = panel.querySelector('.cities-grid');
    const total = parseInt(panel.dataset.total || 0);

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    btn.disabled = true;

    fetch(`/${lang}/destinations/cities/${region}/?offset=${offset}`)
        .then(res => res.json())
        .then(data => {
            data.cities.forEach(city => {
                grid.innerHTML += `
                    <div class="city-card" onclick="filterByCity('${city.name}')">
                        <img src="${city.image_url}" alt="${city.name}" loading="lazy">
                        <div class="city-card-overlay"></div>
                        <div class="city-card-info">
                            <div class="city-card-name">${city.name}</div>
                            <div class="city-card-things">${city.things_to_do} things to do</div>
                        </div>
                    </div>`;
            });

            const newOffset = offset + data.cities.length;
            btn.dataset.offset = newOffset;
            showingText.textContent = `Showing ${newOffset} of ${total} cities`;

            if (!data.has_more) {
                btn.style.display = 'none';
            } else {
                btn.innerHTML = '<i class="fas fa-plus-circle"></i> Load More Cities';
                btn.disabled = false;
            }
        })
        .catch(() => {
            btn.innerHTML = '<i class="fas fa-plus-circle"></i> Load More Cities';
            btn.disabled = false;
        });
}

document.addEventListener('DOMContentLoaded', () => {
    const firstPanel = document.querySelector('.cities-panel.active');
    if (firstPanel) {
        const total = parseInt(firstPanel.dataset.total || 0);
        const shown = firstPanel.querySelectorAll('.city-card').length;
        const loadMoreBtn = document.getElementById('cities-load-more-btn');
        const showingText = document.getElementById('cities-showing-text');
        const regionSlug = firstPanel.id.replace('panel-', '');

        showingText.textContent = `Showing ${shown} of ${total} cities`;

        if (total > 8) {
            loadMoreBtn.style.display = '';
            loadMoreBtn.dataset.region = regionSlug;
            loadMoreBtn.dataset.offset = 8;
        }
    }
});

/* ---- City card bosilganda ---- */
function filterByCity(cityName) {
    const exploreSection = document.getElementById('explore-section');
    const mainDestinations = document.getElementById('main-destinations');
    const grid = document.getElementById('destinations-grid');
    const allCards = grid.querySelectorAll('.destination-card');

    // explore section yashiriladi
    exploreSection.style.display = 'none';

    // main destinations ko'rsatiladi
    mainDestinations.classList.add('visible');

    // Badge yangilanadi
    document.getElementById('active-city-name').textContent = cityName;

    let found = false;

    allCards.forEach(card => {
        const cardCity = card.getAttribute('data-city');
        if (cardCity && cardCity.toLowerCase() === cityName.toLowerCase()) {
            card.style.display = '';
            found = true;
        } else {
            card.style.display = 'none';
        }
    });

    if (found) {
        document.getElementById('results-count').textContent = '1';
        document.getElementById('results-subtitle').textContent = 'Showing results for: ' + cityName;
        document.getElementById('load-more-btn').style.display = 'none';
        document.getElementById('showing-text').textContent = 'Showing 1 destination for ' + cityName;
    } else {
        // Bu city bizning cardlarda yo'q — barcha cardlarni ko'rsat
        let shown = 0;
        allCards.forEach(card => {
            if (shown < 6) {
                card.style.display = '';
                shown++;
            } else {
                card.style.display = 'none';
                card.classList.add('hidden-card');
            }
        });
        document.getElementById('results-count').textContent = '156';
        document.getElementById('results-subtitle').textContent = 'No exact match for "' + cityName + '" — showing all';
        document.getElementById('load-more-btn').style.display = '';
        document.getElementById('showing-text').textContent = 'Showing 6 of 156 destinations';
    }

    // Smooth scroll — destinations qismiga
    mainDestinations.scrollIntoView({behavior: 'smooth', block: 'start'});
}

/* ---- "Back to Explore" tugmasi ---- */
function backToExplore() {
    const exploreSection = document.getElementById('explore-section');
    const mainDestinations = document.getElementById('main-destinations');
    const grid = document.getElementById('destinations-grid');
    const allCards = grid.querySelectorAll('.destination-card');

    // main destinations yashiriladi
    mainDestinations.classList.remove('visible');

    // explore section qaytadi
    exploreSection.style.display = '';

    // Barcha cardlarni qaytarish
    let shown = 0;
    allCards.forEach(card => {
        if (shown < 6) {
            card.style.display = '';
            card.classList.remove('hidden-card');
            shown++;
        } else {
            card.style.display = 'none';
            card.classList.add('hidden-card');
        }
    });

    document.getElementById('results-count').textContent = '156';
    document.getElementById('results-subtitle').textContent = 'Based on your preferences';
    document.getElementById('load-more-btn').style.display = '';
    document.getElementById('showing-text').textContent = 'Showing 6 of 156 destinations';

    // Explore section ga scroll
    exploreSection.scrollIntoView({behavior: 'smooth', block: 'start'});
}


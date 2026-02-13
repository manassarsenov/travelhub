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
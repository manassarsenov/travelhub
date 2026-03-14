// ===================================
// TELEGRAM CHANNEL PAGE JAVASCRIPT
// ===================================

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {

    // Initialize all functions
    initCounters();
    initTypingEffect();
    initScrollAnimations();
    initCountdownTimer();
    initStickyBar();
    initMessageCarousel();
    initAOS();

});

// ===================================
// 1. COUNTER ANIMATION
// ===================================

function initCounters() {
    const counters = document.querySelectorAll('.counter');

    const animateCounter = (counter) => {
        const target = parseFloat(counter.getAttribute('data-target'));
        const duration = 2000; // 2 seconds
        const step = target / (duration / 16); // 60fps
        let current = 0;

        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                counter.textContent = formatNumber(target);
                clearInterval(timer);
            } else {
                counter.textContent = formatNumber(Math.floor(current));
            }
        }, 16);
    };

    const formatNumber = (num) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(0) + 'K';
        } else {
            return num.toString();
        }
    };

    // Intersection Observer for counter animation
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
}

// ===================================
// 2. TYPING EFFECT
// ===================================

function initTypingEffect() {
    const typingText = document.querySelector('.typing-text');
    if (!typingText) return;

    const text = "Join Our Exclusive Travel Community";
    let index = 0;
    let isDeleting = false;

    function type() {
        if (!isDeleting && index <= text.length) {
            typingText.textContent = text.substring(0, index);
            index++;
            setTimeout(type, 100);
        } else if (isDeleting && index >= 0) {
            typingText.textContent = text.substring(0, index);
            index--;
            setTimeout(type, 50);
        } else {
            isDeleting = !isDeleting;
            setTimeout(type, 2000);
        }
    }

    // Start typing effect after a delay
    setTimeout(type, 1000);
}

// ===================================
// 3. SCROLL ANIMATIONS
// ===================================

function initScrollAnimations() {
    // Add scroll animations to elements
    const animateOnScroll = document.querySelectorAll('[data-aos]');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('aos-animate');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    animateOnScroll.forEach(el => observer.observe(el));
}

// ===================================
// 4. COUNTDOWN TIMER
// ===================================

function initCountdownTimer() {
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');

    if (!hoursEl || !minutesEl || !secondsEl) return;

    // Set countdown to 24 hours from now
    const endTime = new Date().getTime() + (24 * 60 * 60 * 1000);

    function updateTimer() {
        const now = new Date().getTime();
        const distance = endTime - now;

        if (distance < 0) {
            clearInterval(timerInterval);
            hoursEl.textContent = '00';
            minutesEl.textContent = '00';
            secondsEl.textContent = '00';
            return;
        }

        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        hoursEl.textContent = hours.toString().padStart(2, '0');
        minutesEl.textContent = minutes.toString().padStart(2, '0');
        secondsEl.textContent = seconds.toString().padStart(2, '0');
    }

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
}

// ===================================
// 5. STICKY BOTTOM BAR
// ===================================

function initStickyBar() {
    const stickyBar = document.getElementById('sticky-bottom-bar');
    if (!stickyBar) return;

    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        // Show on mobile when scrolling down
        if (window.innerWidth <= 768) {
            if (currentScroll > 500 && currentScroll > lastScroll) {
                stickyBar.classList.add('visible');
            } else {
                stickyBar.classList.remove('visible');
            }
        }

        lastScroll = currentScroll;
    });
}

// ===================================
// 6. MESSAGE CAROUSEL AUTO-SCROLL
// ===================================

function initMessageCarousel() {
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return;

    let isPaused = false;
    let scrollPosition = 0;

    // Auto-scroll messages
    const autoScroll = setInterval(() => {
        if (!isPaused && messagesContainer.scrollTop < messagesContainer.scrollHeight - messagesContainer.clientHeight) {
            messagesContainer.scrollTop += 1;
        } else if (!isPaused) {
            messagesContainer.scrollTop = 0;
        }
    }, 50);

    // Pause on hover
    messagesContainer.addEventListener('mouseenter', () => {
        isPaused = true;
    });

    messagesContainer.addEventListener('mouseleave', () => {
        isPaused = false;
    });
}

// ===================================
// 7. AOS (Animate On Scroll) INIT
// ===================================

function initAOS() {
    // Simple AOS implementation
    const elements = document.querySelectorAll('[data-aos]');

    elements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s ease';
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.getAttribute('data-aos-delay') || 0;
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, delay);
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });

    elements.forEach(el => observer.observe(el));
}

// ===================================
// 8. JOIN TELEGRAM CHANNEL
// ===================================

function joinTelegramChannel() {
    // Replace with your actual Telegram channel link
    const telegramLink = 'https://t.me/yourtravelhub';

    // Detect if mobile or desktop
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
        // Deep link for mobile app
        window.location.href = telegramLink;
    } else {
        // Open in new tab for desktop
        window.open(telegramLink, '_blank');
    }

    // Track analytics (optional)
    if (typeof gtag !== 'undefined') {
        gtag('event', 'join_channel', {
            'event_category': 'engagement',
            'event_label': 'telegram_channel'
        });
    }

    // Show toast notification
    showToast('Opening Telegram...', 'Please wait while we redirect you to our channel', 'info');
}

// ===================================
// 9. SCROLL TO PREVIEW
// ===================================

function scrollToPreview() {
    const previewSection = document.getElementById('live-preview');
    if (previewSection) {
        previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ===================================
// 10. TOAST NOTIFICATION
// ===================================

function showToast(title, message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toast-title');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');

    if (!toast) return;

    // Set content
    toastTitle.textContent = title;
    toastMessage.textContent = message;

    // Set icon based on type
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };

    toastIcon.className = `fas ${icons[type] || icons.success} toast-icon`;

    // Show toast
    toast.classList.add('show');

    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ===================================
// 11. PARTICLES ANIMATION
// ===================================

function createParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;

    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 5 + 2}px;
            height: ${Math.random() * 5 + 2}px;
            background: rgba(255, 255, 255, ${Math.random() * 0.5 + 0.2});
            border-radius: 50%;
            top: ${Math.random() * 100}%;
            left: ${Math.random() * 100}%;
            animation: floatParticle ${Math.random() * 10 + 10}s infinite;
            animation-delay: ${Math.random() * 5}s;
        `;
        particlesContainer.appendChild(particle);
    }
}

// Initialize particles
createParticles();

// ===================================
// 12. LIVE MEMBER COUNT UPDATE
// ===================================

function updateLiveMembers() {
    const memberCounters = document.querySelectorAll('.counter[data-target="12547"]');

    // Simulate live updates (replace with actual API call)
    setInterval(() => {
        memberCounters.forEach(counter => {
            const currentValue = parseInt(counter.textContent.replace(/[^0-9]/g, ''));
            const newValue = currentValue + Math.floor(Math.random() * 3);
            counter.textContent = newValue.toLocaleString();
        });
    }, 10000); // Update every 10 seconds
}

// Start live updates
updateLiveMembers();

// ===================================
// 13. SHARE FUNCTIONALITY
// ===================================

function shareChannel() {
    const shareData = {
        title: 'TravelHub - Exclusive Travel Community',
        text: 'Join thousands of travelers and get exclusive deals!',
        url: window.location.href
    };

    if (navigator.share) {
        navigator.share(shareData)
            .then(() => console.log('Shared successfully'))
            .catch((error) => console.log('Error sharing:', error));
    } else {
        // Fallback: Copy to clipboard
        navigator.clipboard.writeText(window.location.href)
            .then(() => {
                showToast('Link Copied!', 'Share this link with your friends', 'success');
            });
    }
}

// ===================================
// 14. KEYBOARD NAVIGATION
// ===================================

document.addEventListener('keydown', (e) => {
    // Press 'J' to join
    if (e.key === 'j' || e.key === 'J') {
        joinTelegramChannel();
    }

    // Press 'S' to share
    if (e.key === 's' || e.key === 'S') {
        shareChannel();
    }
});

// ===================================
// 15. PERFORMANCE OPTIMIZATION
// ===================================

// Lazy load images
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add('loaded');
                imageObserver.unobserve(img);
            }
        });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// Preload critical assets
function preloadAssets() {
    const criticalAssets = [
        // Add your critical assets here
    ];

    criticalAssets.forEach(asset => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = asset;
        link.as = asset.endsWith('.css') ? 'style' : 'script';
        document.head.appendChild(link);
    });
}

preloadAssets();

// ===================================
// 16. ERROR HANDLING
// ===================================

window.addEventListener('error', (e) => {
    console.error('Error:', e.message);
    // Optionally show user-friendly error message
});

// ===================================
// EXPORT FUNCTIONS FOR GLOBAL USE
// ===================================

window.joinTelegramChannel = joinTelegramChannel;
window.scrollToPreview = scrollToPreview;
window.shareChannel = shareChannel;
/* ===================================
   TERMS OF SERVICE - COMPLETE JS
   =================================== */

// ===================================
// 1. PAGE LOAD & INITIALIZATION
// ===================================
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupScrollTracking();
    setupSidebarNavigation();
    setupSmoothScroll();
    setupProgressBar();
});

function initializePage() {
    console.log('Terms of Service page loaded');

    // Set first nav item as active
    const firstNavItem = document.querySelector('.nav-item');
    if (firstNavItem) {
        firstNavItem.classList.add('active');
    }
}

// ===================================
// 2. SIDEBAR NAVIGATION & SCROLL TRACKING
// ===================================
function setupScrollTracking() {
    const sections = document.querySelectorAll('.terms-section');
    const navItems = document.querySelectorAll('.nav-item');

    // Intersection Observer for automatic active state
    const observerOptions = {
        root: null,
        rootMargin: '-100px 0px -70% 0px',
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.getAttribute('id');

                // Remove active from all nav items
                navItems.forEach(item => item.classList.remove('active'));

                // Add active to corresponding nav item
                const activeNavItem = document.querySelector(`.nav-item[href="#${sectionId}"]`);
                if (activeNavItem) {
                    activeNavItem.classList.add('active');
                }
            }
        });
    }, observerOptions);

    sections.forEach(section => observer.observe(section));
}

function setupSidebarNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();

            // Remove active from all
            navItems.forEach(nav => nav.classList.remove('active'));

            // Add active to clicked item
            this.classList.add('active');

            // Smooth scroll to section
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);

            if (targetSection) {
                const navbarHeight = 80;
                const targetPosition = targetSection.offsetTop - navbarHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

function setupSmoothScroll() {
    // Add smooth scrolling to all anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);

            if (target) {
                const navbarHeight = 80;
                const targetPosition = target.offsetTop - navbarHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ===================================
// 3. PROGRESS BAR
// ===================================
function setupProgressBar() {
    const progressBar = document.getElementById('reading-progress');

    window.addEventListener('scroll', () => {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        const scrollPercentage = (scrollTop / (documentHeight - windowHeight)) * 100;

        if (progressBar) {
            progressBar.style.width = scrollPercentage + '%';
        }
    });
}

// ===================================
// 4. QUICK ACTIONS
// ===================================
function downloadPDF() {
    window.print();
    showToast('Download started', 'Your PDF is being generated...', 'success');
}

function shareTerms() {
    if (navigator.share) {
        navigator.share({
            title: 'Terms of Service - TravelHub',
            text: 'Check out TravelHub Terms of Service',
            url: window.location.href
        }).then(() => {
            showToast('Shared!', 'Terms of Service shared successfully', 'success');
        }).catch(() => {
            copyToClipboard(window.location.href);
        });
    } else {
        copyToClipboard(window.location.href);
    }
}

function translateTerms() {
    showToast('Coming Soon', 'Translation feature will be available soon', 'info');
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Link Copied!', 'Terms of Service link copied to clipboard', 'success');
    }).catch(() => {
        showToast('Error', 'Failed to copy link', 'error');
    });
}

// ===================================
// 5. ACCEPT TERMS BUTTON
// ===================================
function acceptTerms() {
    // Store acceptance in localStorage
    const acceptanceData = {
        accepted: true,
        timestamp: new Date().toISOString(),
        version: '1.0'
    };

    localStorage.setItem('termsAccepted', JSON.stringify(acceptanceData));

    showToast('Success!', 'Terms of Service accepted', 'success');

    // Redirect after 1.5 seconds
    setTimeout(() => {
        window.location.href = '/'; // Redirect to home
    }, 1500);
}

// ===================================
// 6. TOAST NOTIFICATION
// ===================================
function showToast(title, message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toast-icon');
    const toastTitle = document.getElementById('toast-title');
    const toastMessage = document.getElementById('toast-message');

    // Set icon based on type
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-times-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };

    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };

    toastIcon.className = `${icons[type]} toast-icon`;
    toastIcon.style.color = colors[type];
    toastTitle.textContent = title;
    toastMessage.textContent = message;

    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// ===================================
// 7. NAVBAR SCROLL EFFECT
// ===================================
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ===================================
// 8. SCROLL TO TOP
// ===================================
const scrollTopBtn = document.getElementById('scroll-top');

window.addEventListener('scroll', () => {
    if (window.scrollY > 500) {
        scrollTopBtn.classList.add('show');
    } else {
        scrollTopBtn.classList.remove('show');
    }
});

// function scrollToTop() {
//     window.scrollTo({
//         top: 0,
//         behavior: 'smooth'
//     });
// }

// ===================================
// 9. KEYBOARD SHORTCUTS
// ===================================
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + P = Print
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.print();
    }

    // Escape = Close modal
    if (e.key === 'Escape') {
        closeModal();
    }
});

// ===================================
// 10. SEARCH FUNCTIONALITY (Optional)
// ===================================
function searchTerms(query) {
    const sections = document.querySelectorAll('.terms-section');
    const searchQuery = query.toLowerCase();

    sections.forEach(section => {
        const content = section.textContent.toLowerCase();
        if (content.includes(searchQuery)) {
            section.style.display = 'block';
            highlightText(section, searchQuery);
        } else {
            section.style.display = 'none';
        }
    });
}

function highlightText(element, query) {
    // Implementation for highlighting search results
    // This is a basic example
    const innerHTML = element.innerHTML;
    const index = innerHTML.toLowerCase().indexOf(query);

    if (index >= 0) {
        const highlighted = innerHTML.substring(0, index) +
            '<mark>' + innerHTML.substring(index, index + query.length) + '</mark>' +
            innerHTML.substring(index + query.length);
        element.innerHTML = highlighted;
    }
}

// ===================================
// 11. PRINT STYLES OPTIMIZATION
// ===================================
window.addEventListener('beforeprint', () => {
    // Expand all collapsed sections before printing
    document.querySelectorAll('.collapsible').forEach(el => {
        el.classList.add('expanded');
    });
});

window.addEventListener('afterprint', () => {
    // Restore collapsed state after printing
    document.querySelectorAll('.collapsible').forEach(el => {
        el.classList.remove('expanded');
    });
});

// ===================================
// 12. ANALYTICS & TRACKING
// ===================================
function trackSectionView(sectionId) {
    // Send analytics event
    if (typeof gtag !== 'undefined') {
        gtag('event', 'section_view', {
            'section_id': sectionId,
            'page_path': window.location.pathname
        });
    }

    console.log('Section viewed:', sectionId);
}

// ===================================
// 13. MOBILE OPTIMIZATIONS
// ===================================
if (window.innerWidth < 992) {
    // Make sidebar non-sticky on mobile
    const sidebar = document.querySelector('.sidebar-sticky');
    if (sidebar) {
        sidebar.style.position = 'static';
    }
}

// ===================================
// 14. ACCESSIBILITY IMPROVEMENTS
// ===================================
document.querySelectorAll('.nav-item').forEach(item => {
    item.setAttribute('role', 'menuitem');
    item.setAttribute('tabindex', '0');

    // Add keyboard support
    item.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            item.click();
        }
    });
});

// ===================================
// 15. UTILITY FUNCTIONS
// ===================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ===================================
// 16. CONSOLE WELCOME MESSAGE
// ===================================
console.log('%c🌍 TravelHub - Terms of Service',
    'font-size: 24px; font-weight: bold; color: #667eea;');
console.log('%cLegal Document Version 1.0 | Last Updated: Dec 16, 2025',
    'font-size: 14px; color: #64748b;');

// ===================================
// EXPORTS (if using modules)
// ===================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        acceptTerms,
        downloadPDF,
        shareTerms,
        translateTerms,
        showToast,
        scrollToTop
    };
}
/* ================================
   MY BOOKINGS PAGE - JAVASCRIPT
   ================================ */

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeBookingsPage();
    setupSearchFunctionality();
    setupViewPreference();
});

/* ================================
   INITIALIZATION
   ================================ */

function initializeBookingsPage() {
    // Update counts
    updateBookingCounts();

    // Set default view
    const savedView = localStorage.getItem('bookingsView') || 'grid';
    toggleView(savedView);

    console.log('My Bookings page initialized');
}

function updateBookingCounts() {
    // Count bookings by status
    const allBookings = document.querySelectorAll('.booking-card');
    const upcomingBookings = document.querySelectorAll('[data-status="upcoming"]');
    const completedBookings = document.querySelectorAll('[data-status="completed"]');
    const cancelledBookings = document.querySelectorAll('[data-status="cancelled"]');

    // Update stat cards
    document.getElementById('total-count').textContent = allBookings.length;
    document.getElementById('upcoming-count').textContent = upcomingBookings.length;
    document.getElementById('completed-count').textContent = completedBookings.length;
    document.getElementById('cancelled-count').textContent = cancelledBookings.length;
}

/* ================================
   FILTER FUNCTIONALITY
   ================================ */

function filterBookings(status) {
    const tabs = document.querySelectorAll('.filter-tab');
    const sections = document.querySelectorAll('.bookings-section');
    const emptyState = document.getElementById('empty-state');

    // Update active tab
    tabs.forEach(tab => {
        if (tab.dataset.status === status) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Show/hide sections based on filter
    if (status === 'all') {
        sections.forEach(section => section.style.display = 'block');
        emptyState.style.display = 'none';
    } else {
        sections.forEach(section => {
            const sectionId = section.id;
            if (sectionId.includes(status)) {
                section.style.display = 'block';
            } else {
                section.style.display = 'none';
            }
        });

        // Check if any bookings are visible
        const visibleBookings = document.querySelectorAll(`[data-status="${status}"]`);
        if (visibleBookings.length === 0) {
            emptyState.style.display = 'flex';
        } else {
            emptyState.style.display = 'none';
        }
    }

    // Smooth scroll to top of bookings
    document.querySelector('.bookings-container').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

/* ================================
   SEARCH FUNCTIONALITY
   ================================ */

function setupSearchFunctionality() {
    const searchInput = document.getElementById('search-input');

    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const bookingCards = document.querySelectorAll('.booking-card');

        bookingCards.forEach(card => {
            const destination = card.querySelector('.booking-header h3').textContent.toLowerCase();
            const hotel = card.querySelector('.detail-item:nth-child(2) span').textContent.toLowerCase();
            const bookingId = card.querySelector('.booking-id').textContent.toLowerCase();

            const matches = destination.includes(searchTerm) ||
                          hotel.includes(searchTerm) ||
                          bookingId.includes(searchTerm);

            if (matches) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });

        // Show empty state if no results
        checkEmptyState();
    });
}

function checkEmptyState() {
    const visibleCards = document.querySelectorAll('.booking-card[style="display: block"], .booking-card:not([style*="display: none"])');
    const emptyState = document.getElementById('empty-state');

    if (visibleCards.length === 0) {
        emptyState.style.display = 'flex';
    } else {
        emptyState.style.display = 'none';
    }
}

/* ================================
   SORT FUNCTIONALITY
   ================================ */

function sortBookings() {
    const sortValue = document.getElementById('sort-select').value;
    const grids = document.querySelectorAll('.bookings-grid');

    grids.forEach(grid => {
        const cards = Array.from(grid.querySelectorAll('.booking-card'));

        cards.sort((a, b) => {
            switch(sortValue) {
                case 'date-desc':
                    return compareDates(b, a);
                case 'date-asc':
                    return compareDates(a, b);
                case 'price-high':
                    return comparePrice(b, a);
                case 'price-low':
                    return comparePrice(a, b);
                case 'destination':
                    return compareDestination(a, b);
                default:
                    return 0;
            }
        });

        // Re-append sorted cards
        cards.forEach(card => grid.appendChild(card));
    });

    // Show toast notification
    showToast('Bookings sorted successfully', 'success');
}

function compareDates(a, b) {
    const dateA = a.querySelector('.detail-item:first-child span').textContent;
    const dateB = b.querySelector('.detail-item:first-child span').textContent;
    return dateA.localeCompare(dateB);
}

function comparePrice(a, b) {
    const priceA = parseFloat(a.querySelector('.detail-item.price span').textContent.replace(/[^0-9.]/g, ''));
    const priceB = parseFloat(b.querySelector('.detail-item.price span').textContent.replace(/[^0-9.]/g, ''));
    return priceA - priceB;
}

function compareDestination(a, b) {
    const destA = a.querySelector('.booking-header h3').textContent;
    const destB = b.querySelector('.booking-header h3').textContent;
    return destA.localeCompare(destB);
}

/* ================================
   VIEW TOGGLE
   ================================ */

function toggleView(view) {
    const viewBtns = document.querySelectorAll('.view-btn');
    const grids = document.querySelectorAll('.bookings-grid');

    // Update active button
    viewBtns.forEach(btn => {
        if (btn.dataset.view === view) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Apply view style
    if (view === 'list') {
        grids.forEach(grid => {
            grid.style.gridTemplateColumns = '1fr';
        });
    } else {
        grids.forEach(grid => {
            grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(500px, 1fr))';
        });
    }

    // Save preference
    localStorage.setItem('bookingsView', view);
}

function setupViewPreference() {
    const savedView = localStorage.getItem('bookingsView');
    if (savedView) {
        toggleView(savedView);
    }
}

/* ================================
   BOOKING ACTIONS
   ================================ */

function viewBookingDetails(bookingId) {
    console.log('Viewing booking details:', bookingId);
    showToast('Opening booking details...', 'info');

    // Simulate loading
    setTimeout(() => {
        // In real app, redirect to details page
        // window.location.href = `/bookings/${bookingId}/details`;
        showModal('Booking Details', `
            <div style="padding: 20px;">
                <h3 style="margin-bottom: 15px;">Booking ID: ${bookingId}</h3>
                <p style="color: var(--gray); margin-bottom: 20px;">This is a demo. In production, this would show full booking details.</p>
                <button class="action-btn primary" onclick="closeModal()" style="width: 100%;">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        `);
    }, 500);
}

function checkInOnline(bookingId) {
    console.log('Check-in online:', bookingId);
    showToast('Redirecting to online check-in...', 'info');

    setTimeout(() => {
        showModal('Online Check-in', `
            <div style="padding: 20px; text-align: center;">
                <i class="fas fa-plane-departure" style="font-size: 60px; color: var(--primary); margin-bottom: 20px;"></i>
                <h3 style="margin-bottom: 15px;">Online Check-in</h3>
                <p style="color: var(--gray); margin-bottom: 25px;">Check-in will be available 24 hours before your flight.</p>
                <button class="action-btn primary" onclick="closeModal()" style="width: 100%;">
                    <i class="fas fa-check"></i> Got it
                </button>
            </div>
        `);
    }, 500);
}

function downloadVoucher(bookingId) {
    console.log('Downloading voucher:', bookingId);
    showToast('Preparing your voucher for download...', 'info');

    setTimeout(() => {
        showToast('Voucher downloaded successfully!', 'success');
    }, 1500);
}

function cancelBooking(bookingId) {
    console.log('Cancel booking:', bookingId);

    showModal('Cancel Booking', `
        <div style="padding: 20px; text-align: center;">
            <i class="fas fa-exclamation-triangle" style="font-size: 60px; color: var(--danger); margin-bottom: 20px;"></i>
            <h3 style="margin-bottom: 15px;">Cancel Booking?</h3>
            <p style="color: var(--gray); margin-bottom: 25px;">
                Are you sure you want to cancel booking ${bookingId}?<br>
                Refund amount will depend on the cancellation policy.
            </p>
            <div style="display: flex; gap: 10px;">
                <button class="action-btn secondary" onclick="closeModal()" style="flex: 1;">
                    <i class="fas fa-times"></i> No, Keep it
                </button>
                <button class="action-btn danger" onclick="confirmCancellation('${bookingId}')" style="flex: 1;">
                    <i class="fas fa-check"></i> Yes, Cancel
                </button>
            </div>
        </div>
    `);
}

function confirmCancellation(bookingId) {
    closeModal();
    showToast('Booking cancelled successfully. Refund will be processed in 5-7 business days.', 'success');
}

function completePayment(bookingId) {
    console.log('Complete payment:', bookingId);
    showToast('Redirecting to payment gateway...', 'info');

    setTimeout(() => {
        showModal('Complete Payment', `
            <div style="padding: 20px; text-align: center;">
                <i class="fas fa-credit-card" style="font-size: 60px; color: var(--primary); margin-bottom: 20px;"></i>
                <h3 style="margin-bottom: 15px;">Secure Payment</h3>
                <p style="color: var(--gray); margin-bottom: 25px;">You will be redirected to our secure payment gateway to complete your booking.</p>
                <button class="action-btn primary" onclick="closeModal()" style="width: 100%;">
                    <i class="fas fa-arrow-right"></i> Proceed to Payment
                </button>
            </div>
        `);
    }, 500);
}

function viewPhotos(bookingId) {
    console.log('View photos:', bookingId);
    showToast('Loading trip photos...', 'info');
}

function bookAgain(bookingId) {
    console.log('Book again:', bookingId);
    showToast('Redirecting to booking page...', 'info');
}

function writeReview(bookingId) {
    console.log('Write review:', bookingId);

    showModal('Write a Review', `
        <div style="padding: 20px;">
            <h3 style="margin-bottom: 20px;">Share Your Experience</h3>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 10px; font-weight: 600;">Rating:</label>
                <div style="display: flex; gap: 10px; font-size: 30px;">
                    <i class="fas fa-star" style="color: #fbbf24; cursor: pointer;"></i>
                    <i class="fas fa-star" style="color: #fbbf24; cursor: pointer;"></i>
                    <i class="fas fa-star" style="color: #fbbf24; cursor: pointer;"></i>
                    <i class="fas fa-star" style="color: #fbbf24; cursor: pointer;"></i>
                    <i class="far fa-star" style="color: #d1d5db; cursor: pointer;"></i>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 10px; font-weight: 600;">Your Review:</label>
                <textarea placeholder="Tell us about your experience..." style="width: 100%; min-height: 120px; padding: 12px; border: 2px solid #e8ecf1; border-radius: 10px; font-family: 'Inter', sans-serif; resize: vertical;"></textarea>
            </div>
            
            <button class="action-btn primary" onclick="submitReview('${bookingId}')" style="width: 100%;">
                <i class="fas fa-paper-plane"></i> Submit Review
            </button>
        </div>
    `);
}

function submitReview(bookingId) {
    closeModal();
    showToast('Thank you for your review!', 'success');
}

function bookSimilar(bookingId) {
    console.log('Book similar trip:', bookingId);
    showToast('Finding similar destinations...', 'info');
}

/* ================================
   PAGINATION
   ================================ */

function changePage(page) {
    const pageButtons = document.querySelectorAll('.page-btn');

    if (page === 'prev' || page === 'next') {
        console.log('Navigate:', page);
        showToast(`Loading ${page} page...`, 'info');
        return;
    }

    // Update active page
    pageButtons.forEach(btn => {
        if (btn.textContent === page.toString()) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    showToast(`Loading page ${page}...`, 'info');
}

/* ================================
   HELPER FUNCTIONS
   ================================ */

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toast-icon');
    const toastTitle = document.getElementById('toast-title');
    const toastMessage = document.getElementById('toast-message');

    // Set icon and title based on type
    const types = {
        success: { icon: 'fa-check-circle', title: 'Success', color: '#10b981' },
        error: { icon: 'fa-times-circle', title: 'Error', color: '#ef4444' },
        info: { icon: 'fa-info-circle', title: 'Info', color: '#3b82f6' },
        warning: { icon: 'fa-exclamation-triangle', title: 'Warning', color: '#f59e0b' }
    };

    const config = types[type] || types.info;

    toastIcon.className = `fas ${config.icon} toast-icon`;
    toastIcon.style.color = config.color;
    toastTitle.textContent = config.title;
    toastMessage.textContent = message;

    // Show toast
    toast.classList.add('show');

    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showModal(title, content) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');

    modalTitle.textContent = title;
    modalBody.innerHTML = content;

    modal.classList.add('show');
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('show');
}

/* ================================
   COUNTDOWN TIMER UPDATE
   ================================ */

// Update countdown timers every hour
setInterval(() => {
    const timers = document.querySelectorAll('.countdown-timer');
    timers.forEach(timer => {
        // In real app, calculate actual days remaining
        console.log('Updating countdown timers...');
    });
}, 3600000); // Every hour

console.log('My Bookings JavaScript loaded successfully');
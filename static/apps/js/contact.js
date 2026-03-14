// ============================================
// CONTACT PAGE JAVASCRIPT
// ============================================

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeContactPage();
});

// ============================================
// INITIALIZATION
// ============================================
function initializeContactPage() {
    // Initialize animations
    initializeAOS();

    // Initialize particle background
    initializeParticles();

    // Initialize form handlers
    initializeFormHandlers();

    // Initialize character counter
    initializeCharCounter();

    // Initialize file upload
    initializeFileUpload();

    // Initialize map
    initializeMap();

    // Animate stats on scroll
    animateStatsOnScroll();

    // Initialize chat widget
    initializeChatWidget();

    console.log('Contact page initialized successfully');
}

// ============================================
// AOS ANIMATION
// ============================================
function initializeAOS() {
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            once: true,
            offset: 100
        });
    }
}

// ============================================
// PARTICLE BACKGROUND
// ============================================
function initializeParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const particleCount = 50;

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 1;
            this.speedX = Math.random() * 0.5 - 0.25;
            this.speedY = Math.random() * 0.5 - 0.25;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            if (this.x > canvas.width) this.x = 0;
            if (this.x < 0) this.x = canvas.width;
            if (this.y > canvas.height) this.y = 0;
            if (this.y < 0) this.y = canvas.height;
        }

        draw() {
            ctx.fillStyle = 'rgba(138, 43, 226, 0.5)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
        requestAnimationFrame(animateParticles);
    }

    animateParticles();

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// ============================================
// FORM HANDLERS
// ============================================
function initializeFormHandlers() {
    const form = document.getElementById('mainContactForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
}

function handleFormSubmit(event) {
    event.preventDefault();

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const spinner = submitBtn.querySelector('.loading-spinner');

    // Show loading
    submitBtn.disabled = true;
    spinner.style.display = 'inline-block';

    // Simulate form submission
    setTimeout(() => {
        submitBtn.disabled = false;
        spinner.style.display = 'none';

        // Show success modal
        showSuccessModal();

        // Clear form
        event.target.reset();
        setPriority('high');

        // Show toast from main_base.js
        if (typeof showToast === 'function') {
            showToast('Message sent successfully!', 'success');
        }
    }, 2000);
}

function clearForm() {
    const form = document.getElementById('mainContactForm');
    if (form) {
        form.reset();
        setPriority('high');
        document.getElementById('filePreview').innerHTML = '';
        document.getElementById('charCount').textContent = '0';
    }
}

// ============================================
// PRIORITY BUTTONS
// ============================================
function setPriority(priority) {
    const buttons = document.querySelectorAll('.priority-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.priority === priority) {
            btn.classList.add('active');
        }
    });
    document.getElementById('priority').value = priority;
}

// ============================================
// CHARACTER COUNTER
// ============================================
function initializeCharCounter() {
    const messageField = document.getElementById('message');
    const charCount = document.getElementById('charCount');

    if (messageField && charCount) {
        messageField.addEventListener('input', function() {
            charCount.textContent = this.value.length;

            if (this.value.length > 900) {
                charCount.style.color = 'var(--danger)';
            } else {
                charCount.style.color = 'var(--text)';
            }
        });
    }
}

// ============================================
// FILE UPLOAD
// ============================================
function initializeFileUpload() {
    const fileInput = document.getElementById('fileUpload');
    const filePreview = document.getElementById('filePreview');

    if (fileInput) {
        fileInput.addEventListener('change', function() {
            filePreview.innerHTML = '';

            Array.from(this.files).forEach(file => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.innerHTML = `
                    <i class="fas fa-file"></i>
                    <span>${file.name}</span>
                    <button type="button" onclick="removeFile(this)">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                filePreview.appendChild(fileItem);
            });
        });
    }
}

function removeFile(button) {
    button.parentElement.remove();
}

// ============================================
// CONTACT CARD ACTIONS
// ============================================
function openTelegram(type) {
    const username = type === 'bot' ? 'travelhub_bot' : 'travelhubofficial';
    window.open(`https://t.me/${username}`, '_blank');
}

function openWhatsApp() {
    window.open('https://wa.me/998901234567', '_blank');
}

function openInstagram() {
    window.open('https://instagram.com/travelhub', '_blank');
}

function openFacebook() {
    window.open('https://facebook.com/TravelHubOfficial', '_blank');
}

function scrollToForm() {
    const form = document.getElementById('contactForm');
    if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ============================================
// COPY TO CLIPBOARD
// ============================================
function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i>';
        button.style.background = 'var(--success)';

        if (typeof showToast === 'function') {
            showToast('Copied to clipboard!', 'success');
        }

        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.style.background = '';
        }, 2000);
    });
}

// ============================================
// MAP INITIALIZATION
// ============================================
function initializeMap() {
    const mapElement = document.getElementById('officeMap');
    if (!mapElement || typeof L === 'undefined') return;

    const map = L.map('officeMap').setView([41.2995, 69.2401], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    L.marker([41.2995, 69.2401]).addTo(map)
        .bindPopup('<b>TravelHub Headquarters</b><br>Tashkent, Uzbekistan')
        .openPopup();
}

function getDirections() {
    window.open('https://www.google.com/maps/dir/?api=1&destination=41.2995,69.2401', '_blank');
}

// ============================================
// FAQ SECTION
// ============================================
function toggleFAQ(button) {
    const faqItem = button.parentElement;
    const answer = faqItem.querySelector('.faq-answer');
    const icon = button.querySelector('i');

    faqItem.classList.toggle('active');

    if (faqItem.classList.contains('active')) {
        answer.style.maxHeight = answer.scrollHeight + 'px';
        icon.style.transform = 'rotate(180deg)';
    } else {
        answer.style.maxHeight = '0';
        icon.style.transform = 'rotate(0deg)';
    }
}

function searchFAQ() {
    const searchInput = document.getElementById('faqSearch');
    const filter = searchInput.value.toLowerCase();
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question span').textContent.toLowerCase();
        const answer = item.querySelector('.faq-answer p').textContent.toLowerCase();

        if (question.includes(filter) || answer.includes(filter)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// ============================================
// STATS ANIMATION
// ============================================
function animateStatsOnScroll() {
    const statNumbers = document.querySelectorAll('.stat-number');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.dataset.target);
                animateNumber(entry.target, 0, target, 2000);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    statNumbers.forEach(stat => observer.observe(stat));
}

function animateNumber(element, start, end, duration) {
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const current = Math.floor(start + (end - start) * progress);
        element.textContent = current + (end > 100 ? '' : '%');

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// ============================================
// CHAT WIDGET
// ============================================
function initializeChatWidget() {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', handleChatEnter);
    }
}

function toggleChat() {
    const chatWindow = document.getElementById('chatWindow');
    const chatBadge = document.querySelector('.chat-badge');

    if (chatWindow.style.display === 'flex') {
        chatWindow.style.display = 'none';
    } else {
        chatWindow.style.display = 'flex';
        if (chatBadge) chatBadge.style.display = 'none';
    }
}

function handleChatEnter(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const messagesContainer = document.getElementById('chatMessages');

    if (!input.value.trim()) return;

    // Add user message
    const userMessage = document.createElement('div');
    userMessage.className = 'chat-message user';
    userMessage.innerHTML = `
        <div class="message-content">
            <p>${input.value}</p>
        </div>
        <span class="message-time">Just now</span>
    `;
    messagesContainer.appendChild(userMessage);

    input.value = '';
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Simulate bot response
    setTimeout(() => {
        const botMessage = document.createElement('div');
        botMessage.className = 'chat-message bot';
        botMessage.innerHTML = `
            <div class="message-content">
                <p>Thank you for your message! Our team will respond shortly. For immediate assistance, please use one of our contact methods above.</p>
            </div>
            <span class="message-time">Just now</span>
        `;
        messagesContainer.appendChild(botMessage);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 1000);
}

// ============================================
// SUCCESS MODAL
// ============================================
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    const ticketNumber = document.getElementById('ticketNumber');

    if (modal) {
        // Generate random ticket number
        const randomNum = Math.floor(Math.random() * 9999) + 1;
        const ticketNum = `#TH-2024-${String(randomNum).padStart(4, '0')}`;
        ticketNumber.textContent = ticketNum;

        modal.style.display = 'flex';
    }
}

function closeModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close modal on outside click
window.addEventListener('click', function(event) {
    const modal = document.getElementById('successModal');
    if (event.target === modal) {
        closeModal();
    }
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================
window.addEventListener('error', function(event) {
    console.error('Error caught:', event.error);
});

console.log('Contact.js loaded successfully');
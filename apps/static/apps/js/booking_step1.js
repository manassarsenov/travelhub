document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            if (this.type === 'email') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                this.classList.toggle('valid', emailRegex.test(this.value));
            } else {
                this.classList.toggle('valid', this.value.trim().length > 1);
            }
        });
    });
});

// function proceedToPayment() {
//     const firstName = document.getElementById('first-name').value.trim();
//     const lastName = document.getElementById('last-name').value.trim();
//     const email = document.getElementById('email').value.trim();
//     const phone = document.getElementById('phone').value.trim();
//
//     if (!firstName || !lastName || !email || !phone) {
//         alert('Please fill in all required fields.');
//         return;
//     }
//
//     // Checking overlay ni ko'rsatish
//     document.getElementById('checkingOverlay').classList.add('show');
//
//     // Keyingi page urlini olish (Django `{% url %}` orqali HTML ga yashirilgan)
//     const nextUrl = document.getElementById('next-step-url').value;
//
//     setTimeout(() => {
//         window.location.href = nextUrl; // Mantiqiy to'g'ri URL ga o'tish
//     }, 2000);
// }

function proceedToPayment() {
        // Animatsiyani ko'rsatish
        document.getElementById('checkingOverlay').classList.add('show');

        // Yashirin inputdan to'g'ri manzilni o'qib olish
        const nextUrl = document.getElementById('next-step-url').value;

        // 1.5 soniyadan keyin Step 2 ga o'tkazib yuborish
        setTimeout(() => {
            window.location.href = nextUrl;
        }, 1500);
    }
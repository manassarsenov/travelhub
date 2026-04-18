let selectedPayment = 'card';

function selectPayment(el, type) {
    document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
    el.classList.add('active');
    selectedPayment = type;

    document.getElementById('card-form').style.display = type === 'card' ? 'block' : 'none';
}

// Card Formatter
document.getElementById('card-number').addEventListener('input', function (e) {
    let val = e.target.value.replace(/\D/g, '').substring(0, 16);
    e.target.value = val.replace(/(.{4})/g, '$1 ').trim();
});

document.getElementById('card-expiry').addEventListener('input', function (e) {
    let val = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (val.length >= 2) {
        val = val.substring(0,2) + ' / ' + val.substring(2);
    }
    e.target.value = val;
});

document.getElementById('card-cvc').addEventListener('input', function (e) {
    e.target.value = e.target.value.replace(/\D/g, '');
});

function completeBooking() {
    if (selectedPayment === 'card') {
        const name = document.getElementById('card-name').value.trim();
        const number = document.getElementById('card-number').value.trim();
        const expiry = document.getElementById('card-expiry').value.trim();
        const cvc = document.getElementById('card-cvc').value.trim();

        if (!name || !number || !expiry || !cvc) {
            alert('Please fill in all card details.');
            return;
        }
    }

    // Generate random booking ID
    const bookingNum = 'TH-2026-' + Math.random().toString(36).substring(2,10).toUpperCase();
    document.getElementById('booking-num').textContent = bookingNum;

    // Show success modal
    document.getElementById('successOverlay').classList.add('show');
}
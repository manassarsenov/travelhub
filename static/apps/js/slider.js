// ============================================
// IMAGE SLIDER — Global, barcha cardlar uchun
// ============================================

function slideImage(btn, direction) {
    const wrapper = btn.closest('.card-image-wrapper');
    const slider = wrapper.querySelector('.image-slider');
    const imgs = slider.querySelectorAll('img');
    const dots = wrapper.querySelectorAll('.dot');

    if (imgs.length <= 1) return;

    let current = parseInt(slider.dataset.current || 0);
    current = (current + direction + imgs.length) % imgs.length;

    slider.style.transform = `translateX(-${current * 100}%)`;
    slider.dataset.current = current;

    dots.forEach(d => d.classList.remove('active'));
    if (dots[current]) dots[current].classList.add('active');
}

function goToSlide(dot, index) {
    const wrapper = dot.closest('.card-image-wrapper');
    const slider = wrapper.querySelector('.image-slider');
    const dots = wrapper.querySelectorAll('.dot');

    slider.style.transform = `translateX(-${index * 100}%)`;
    slider.dataset.current = index;

    dots.forEach(d => d.classList.remove('active'));
    dots[index].classList.add('active');
}
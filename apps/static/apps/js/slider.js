// ============================================
// IMAGE SLIDER — Global, barcha cardlar uchun
// ============================================

function updateSliderArrows(wrapper, current, total) {
    const prevBtn = wrapper.querySelector('.slider-btn.prev');
    const nextBtn = wrapper.querySelector('.slider-btn.next');
    if (prevBtn) {
        prevBtn.classList.toggle('hidden', current === 0);
    }
    if (nextBtn) {
        nextBtn.classList.toggle('hidden', current === total - 1);
    }
}

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

    updateSliderArrows(wrapper, current, imgs.length);
}

function goToSlide(dot, index) {
    const wrapper = dot.closest('.card-image-wrapper');
    const slider = wrapper.querySelector('.image-slider');
    const dots = wrapper.querySelectorAll('.dot');
    const imgs = slider.querySelectorAll('img');

    slider.style.transform = `translateX(-${index * 100}%)`;
    slider.dataset.current = index;

    dots.forEach(d => d.classList.remove('active'));
    if (dots[index]) dots[index].classList.add('active');

    updateSliderArrows(wrapper, index, imgs.length);
}

// Initialize all sliders on page load
function initSliderArrows() {
    document.querySelectorAll('.card-image-wrapper').forEach(wrapper => {
        const slider = wrapper.querySelector('.image-slider');
        const imgs = slider.querySelectorAll('img');
        if (imgs.length > 1) {
            let current = parseInt(slider.dataset.current || 0);
            updateSliderArrows(wrapper, current, imgs.length);
        }
    });
}

document.addEventListener('DOMContentLoaded', initSliderArrows);
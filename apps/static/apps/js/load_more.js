const loadMoreState = {
    flash:    { offset: 3, loading: false },
    featured: { offset: 3, loading: false },
    trending: { offset: 3, loading: false },
};

function loadMore(section) {
    const state = loadMoreState[section];
    if (!state || state.loading) return;

    const container  = document.querySelector(`[data-section="${section}"]`);
    const grid       = container.querySelector('.destinations-grid, .packages-grid');
    const btn        = container.querySelector('.btn-load-more');
    const showingTxt = container.querySelector('.showing-text');

    if (!grid || !btn) return;

    state.loading = true;
    btn.disabled  = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + gettext('Loading...');

    fetch(`/destinations/load-more/?section=${section}&offset=${state.offset}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
    .then(res => {
        const hasMore    = res.headers.get('X-Has-More') === 'true';
        const total      = parseInt(res.headers.get('X-Total') || '0');
        const nextOffset = parseInt(res.headers.get('X-Next-Offset') || state.offset);
        return res.text().then(html => ({ html, hasMore, total, nextOffset }));
    })
    .then(({ html, hasMore, total, nextOffset }) => {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;

        Array.from(tmp.children).forEach(card => {
            card.style.opacity   = '0';
            card.style.transform = 'translateY(20px)';
            grid.appendChild(card);
            requestAnimationFrame(() => {
                card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                card.style.opacity    = '1';
                card.style.transform  = 'translateY(0)';
            });
        });

        if (typeof initFlashTimers === 'function') initFlashTimers();

        state.offset  = nextOffset;
        state.loading = false;

        if (showingTxt) {
            showingTxt.textContent = interpolate(
                gettext('Showing %(shown)s of %(total)s destinations'),
                {shown: Math.min(state.offset, total), total: total},
                true
            );
        }

        if (!hasMore) {
            btn.closest('.load-more-container').style.display = 'none';
        } else {
            btn.disabled  = false;
            btn.innerHTML = '<i class="fas fa-plus"></i> ' + gettext('Load More Destinations');
        }
    })
    .catch(err => {
        console.error('Load more xatosi:', err);
        state.loading = false;
        btn.disabled  = false;
        btn.innerHTML = '<i class="fas fa-redo"></i> ' + gettext('Error – Try Again');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    ['flash', 'featured', 'trending'].forEach(section => {
        const container = document.querySelector(`[data-section="${section}"]`);
        if (!container) return;

        const btn        = container.querySelector('.btn-load-more');
        const showingTxt = container.querySelector('.showing-text');
        if (!btn) return;

        // data-total HTML dan o'qiladi — to'g'ri jami soni
        const total = parseInt(container.dataset.total || '0');
        const shown = Math.min(3, total);

        if (showingTxt) {
            showingTxt.textContent = interpolate(
                gettext('Showing %(shown)s of %(total)s destinations'),
                {shown: shown, total: total},
                true
            );
        }

        // 3 ta yoki kam bo'lsa load more yashirish
        if (total <= 3) {
            btn.closest('.load-more-container').style.display = 'none';
        }
    });
});
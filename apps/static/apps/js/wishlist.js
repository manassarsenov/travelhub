const searchInput = document.getElementById('search-input');
const clearBtn = document.getElementById('clear-search');

if (searchInput) {
    searchInput.addEventListener('input', function () {
        clearBtn.style.display = this.value ? 'flex' : 'none';
        applyFilters();
    });
}
if (clearBtn) {
    clearBtn.addEventListener('click', function () {
        searchInput.value = '';
        this.style.display = 'none';
        applyFilters();
    });
}

let activeCategory = 'all';

function filterByCategory(cat) {
    activeCategory = cat;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.filter-tab[data-category="${cat}"]`)?.classList.add('active');
    applyFilters();
}

function sortWishlist() { applyFilters(); }

function toggleView(view) {
    const grid = document.getElementById('wishlist-grid');
    if (!grid) return;
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.view-btn[data-view="${view}"]`)?.classList.add('active');
    grid.classList.toggle('list-view', view === 'list');
}

function applyFilters() {
    const grid = document.getElementById('wishlist-grid');
    if (!grid) return;

    const query = (searchInput?.value || '').toLowerCase().trim();
    const sort = document.getElementById('sort-select')?.value || 'date-desc';
    let cards = Array.from(grid.querySelectorAll('.wishlist-card'));

    cards.forEach(card => {
        const matchCat = activeCategory === 'all' || (card.dataset.category || '') === activeCategory;
        const matchQ = !query || (card.dataset.name || '').includes(query);
        card.style.display = (matchCat && matchQ) ? '' : 'none';
    });

    const visible = cards.filter(c => c.style.display !== 'none');
    visible.sort((a, b) => {
        if (sort === 'price-high') return Number(b.dataset.price) - Number(a.dataset.price);
        if (sort === 'price-low') return Number(a.dataset.price) - Number(b.dataset.price);
        if (sort === 'name-asc') return (a.dataset.name || '').localeCompare(b.dataset.name || '');
        if (sort === 'rating') return Number(b.dataset.rating) - Number(a.dataset.rating);
        if (sort === 'date-asc') return Number(a.dataset.added) - Number(b.dataset.added);
        return Number(b.dataset.added) - Number(a.dataset.added);
    });
    visible.forEach(c => grid.appendChild(c));
    updateWishlistStats();
}

function updateWishlistStats() {
    const grid = document.getElementById('wishlist-grid');
    const allCards = grid ? Array.from(grid.querySelectorAll('.wishlist-card')) : [];
    const visibleCards = allCards.filter(c => c.style.display !== 'none');

    const count = allCards.length;
    const totalCost = allCards.reduce((s, c) => s + Number(c.dataset.price || 0), 0);
    const avg = count > 0 ? Math.round(totalCost / count) : 0;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('total-items', count);
    set('visible-count', `(${visibleCards.length})`);
    set('sidebar-count', count);
    set('sidebar-total', `$${totalCost.toLocaleString()}`);
    set('sidebar-avg', `$${avg.toLocaleString()}`);
    set('total-cost', `$${totalCost.toLocaleString()}`);
    set('average-price', `$${avg.toLocaleString()}`);

    const emptyState = document.getElementById('empty-state');
    if (emptyState) emptyState.style.display = count === 0 ? 'flex' : 'none';
    if (grid) grid.style.display = count === 0 ? 'none' : '';
}
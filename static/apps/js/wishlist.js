// Search
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

// Filter by category tab
let activeCategory = 'all';

function filterByCategory(cat) {
    activeCategory = cat;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.filter-tab[data-category="${cat}"]`)?.classList.add('active');
    applyFilters();
}

// Sort
function sortWishlist() { applyFilters(); }

// View toggle
function toggleView(view) {
    const grid = document.getElementById('wishlist-grid');
    if (!grid) return;
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.view-btn[data-view="${view}"]`)?.classList.add('active');
    grid.classList.toggle('list-view', view === 'list');
}

// Core filter + sort logic
function applyFilters() {
    const grid = document.getElementById('wishlist-grid');
    if (!grid) return;

    const query = (searchInput?.value || '').toLowerCase().trim();
    const sort = document.getElementById('sort-select')?.value || 'date-desc';

    let cards = Array.from(grid.querySelectorAll('.wishlist-card'));

    cards.forEach(card => {
        const name = (card.dataset.name || '');
        const cat = (card.dataset.category || '');
        const matchCat = activeCategory === 'all' || cat === activeCategory;
        const matchQ = !query || name.includes(query);
        card.style.display = (matchCat && matchQ) ? '' : 'none';
    });

    // Sort visible cards
    const visible = cards.filter(c => c.style.display !== 'none');
    visible.sort((a, b) => {
        if (sort === 'price-high') return Number(b.dataset.price) - Number(a.dataset.price);
        if (sort === 'price-low') return Number(a.dataset.price) - Number(b.dataset.price);
        if (sort === 'name-asc') return (a.dataset.name || '').localeCompare(b.dataset.name || '');
        if (sort === 'rating') return Number(b.dataset.rating) - Number(a.dataset.rating);
        if (sort === 'date-asc') return Number(a.dataset.added) - Number(b.dataset.added);
        return Number(b.dataset.added) - Number(a.dataset.added); // date-desc default
    });
    visible.forEach(c => grid.appendChild(c));

    updateWishlistStats();
}

// Update stats after remove/filter
function updateWishlistStats() {
    const grid = document.getElementById('wishlist-grid');
    const allCards = grid ? Array.from(grid.querySelectorAll('.wishlist-card')) : [];
    const visibleCards = allCards.filter(c => c.style.display !== 'none');

    const totalEl = document.getElementById('total-items');
    const visibleCountEl = document.getElementById('visible-count');
    const sidebarCountEl = document.getElementById('sidebar-count');
    const sidebarTotalEl = document.getElementById('sidebar-total');
    const sidebarAvgEl = document.getElementById('sidebar-avg');
    const totalCostEl = document.getElementById('total-cost');
    const avgPriceEl = document.getElementById('average-price');
    const emptyState = document.getElementById('empty-state');

    const count = allCards.length;
    const visibleCount = visibleCards.length;
    const totalCost = allCards.reduce((s, c) => s + Number(c.dataset.price || 0), 0);
    const avg = count > 0 ? Math.round(totalCost / count) : 0;

    if (totalEl) totalEl.textContent = count;
    if (visibleCountEl) visibleCountEl.textContent = `(${visibleCount})`;
    if (sidebarCountEl) sidebarCountEl.textContent = count;
    if (sidebarTotalEl) sidebarTotalEl.textContent = `$${totalCost.toLocaleString()}`;
    if (sidebarAvgEl) sidebarAvgEl.textContent = `$${avg.toLocaleString()}`;
    if (totalCostEl) totalCostEl.textContent = `$${totalCost.toLocaleString()}`;
    if (avgPriceEl) avgPriceEl.textContent = `$${avg.toLocaleString()}`;

    if (emptyState) emptyState.style.display = count === 0 ? 'flex' : 'none';
    if (grid) grid.style.display = count === 0 ? 'none' : '';
}
// ─── Search ───────────────────────────────────────────────────────────────────
const searchInput = document.getElementById('search-input');
const clearBtn    = document.getElementById('clear-search');

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

// ─── Category filter ──────────────────────────────────────────────────────────
let activeCategory = 'all';

function filterByCategory(cat) {
    activeCategory = cat;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.filter-tab[data-category="${cat}"]`)?.classList.add('active');

    const titleEl = document.getElementById('section-title');
    if (titleEl) {
        const label = cat === 'all'
            ? gettext('All Destinations')
            : (document.querySelector(`.filter-tab[data-category="${cat}"] span:not(.tab-count)`)?.textContent?.trim() || cat);
        titleEl.textContent = label;
    }
    applyFilters();
}

// ─── Sort ─────────────────────────────────────────────────────────────────────
function sortWishlist() { applyFilters(); }

// ─── View toggle ──────────────────────────────────────────────────────────────
function toggleView(view) {
    const grid = document.getElementById('wishlist-grid');
    if (!grid) return;
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.view-btn[data-view="${view}"]`)?.classList.add('active');
    grid.classList.toggle('list-view', view === 'list');
}

// ─── Core filter + sort ───────────────────────────────────────────────────────
function applyFilters() {
    const grid = document.getElementById('wishlist-grid');
    if (!grid) return;

    const query = (searchInput?.value || '').toLowerCase().trim();
    const sort  = document.getElementById('sort-select')?.value || 'date-desc';

    const cards = Array.from(grid.querySelectorAll('.wishlist-card'));

    cards.forEach(card => {
        const name     = card.dataset.name || '';
        const cat      = card.dataset.category || '';
        const price    = Number(card.dataset.price || 0);
        const matchCat = activeCategory === 'all' || cat === activeCategory;
        const matchQ   = !query || name.includes(query);
        const matchPrice = price >= activePriceMin && price <= activePriceMax;
        card.style.display = (matchCat && matchQ && matchPrice) ? '' : 'none';
    });

    // Sort visible cards
    const visible = cards.filter(c => c.style.display !== 'none');
    visible.sort((a, b) => {
        if (sort === 'price-high') return Number(b.dataset.price)  - Number(a.dataset.price);
        if (sort === 'price-low')  return Number(a.dataset.price)  - Number(b.dataset.price);
        if (sort === 'name-asc')   return (a.dataset.name || '').localeCompare(b.dataset.name || '');
        if (sort === 'rating')     return Number(b.dataset.rating) - Number(a.dataset.rating);
        if (sort === 'date-asc')   return Number(a.dataset.added)  - Number(b.dataset.added);
        return Number(b.dataset.added) - Number(a.dataset.added); // date-desc default
    });
    visible.forEach(c => grid.appendChild(c));

    updateWishlistStats();
    updateTabCounts();
}

// ─── Tab counts (update per category) ────────────────────────────────────────
function updateTabCounts() {
    const grid = document.getElementById('wishlist-grid');
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll('.wishlist-card'));
    const query = (searchInput?.value || '').toLowerCase().trim();

    // Count how many cards match the search per category
    const counts = {};
    cards.forEach(card => {
        const name   = card.dataset.name || '';
        const cat    = card.dataset.category || '';
        const matchQ = !query || name.includes(query);
        if (!matchQ) return;
        counts['all']   = (counts['all']  || 0) + 1;
        counts[cat]     = (counts[cat]    || 0) + 1;
    });

    document.querySelectorAll('.filter-tab').forEach(tab => {
        const cat      = tab.dataset.category;
        const countEl  = tab.querySelector('.tab-count');
        if (countEl) countEl.textContent = counts[cat] || 0;
    });
}

// ─── Stats panel ──────────────────────────────────────────────────────────────
function updateWishlistStats() {
    const grid = document.getElementById('wishlist-grid');
    const allCards     = grid ? Array.from(grid.querySelectorAll('.wishlist-card')) : [];
    const visibleCards = allCards.filter(c => c.style.display !== 'none');

    const totalEl       = document.getElementById('total-items');
    const visibleCountEl= document.getElementById('visible-count');
    const sidebarCountEl= document.getElementById('sidebar-count');
    const sidebarTotalEl= document.getElementById('sidebar-total');
    const sidebarAvgEl  = document.getElementById('sidebar-avg');
    const totalCostEl   = document.getElementById('total-cost');
    const avgPriceEl    = document.getElementById('average-price');
    const emptyState    = document.getElementById('empty-state');
    const emptyTitle    = document.getElementById('empty-title');
    const emptyMsg      = document.getElementById('empty-msg');

    const totalCount   = allCards.length;
    const visibleCount = visibleCards.length;

    // Stats are calculated on VISIBLE cards (respects active filter & search)
    const visibleCost = visibleCards.reduce((s, c) => s + Number(c.dataset.price || 0), 0);
    const avg = visibleCount > 0 ? Math.round(visibleCost / visibleCount) : 0;

    if (totalEl)        totalEl.textContent        = totalCount;
    if (visibleCountEl) visibleCountEl.textContent = `(${visibleCount})`;
    if (sidebarCountEl) sidebarCountEl.textContent = visibleCount;
    if (sidebarTotalEl) sidebarTotalEl.textContent = `$${visibleCost.toLocaleString()}`;
    if (sidebarAvgEl)   sidebarAvgEl.textContent   = `$${avg.toLocaleString()}`;
    if (totalCostEl)    totalCostEl.textContent     = `$${visibleCost.toLocaleString()}`;
    if (avgPriceEl)     avgPriceEl.textContent      = `$${avg.toLocaleString()}`;

    // Empty state: no items at all vs no filter results
    const noItems   = totalCount === 0;
    const noResults = totalCount > 0 && visibleCount === 0;

    if (emptyState) {
        emptyState.style.display = (noItems || noResults) ? 'block' : 'none';
    }
    if (grid) {
        grid.style.display = (noItems || noResults) ? 'none' : '';
    }
    if (emptyTitle && emptyMsg) {
        if (noResults) {
            emptyTitle.textContent = gettext('No results found');
            emptyMsg.textContent   = gettext('Try a different search or category filter.');
        } else {
            emptyTitle.textContent = gettext('Your wishlist is empty');
            emptyMsg.textContent   = gettext('Start adding your dream destinations!');
        }
    }
}

// ─── Bulk select ─────────────────────────────────────────────────────────────
let bulkMode = false;

function toggleBulkSelect() {
    bulkMode = !bulkMode;
    const checkboxes = document.querySelectorAll('.card-checkbox');
    const btn        = document.getElementById('bulk-toggle-btn');
    const actionBtns = document.getElementById('bulk-action-buttons');

    checkboxes.forEach(cb => cb.style.display = bulkMode ? 'block' : 'none');
    if (btn) {
        btn.innerHTML = bulkMode
            ? '<i class="fas fa-times"></i> ' + gettext('Cancel')
            : '<i class="fas fa-check-square"></i> ' + gettext('Select');
    }
    if (actionBtns) actionBtns.style.display = 'none';
    if (!bulkMode) {
        // uncheck all
        document.querySelectorAll('.card-checkbox input').forEach(i => i.checked = false);
        updateSelectedCount();
    }
}

function cancelBulkSelect() {
    bulkMode = false;
    document.querySelectorAll('.card-checkbox').forEach(cb => {
        cb.style.display = 'none';
        cb.querySelector('input').checked = false;
    });
    const btn = document.getElementById('bulk-toggle-btn');
    if (btn) btn.innerHTML = '<i class="fas fa-check-square"></i> ' + gettext('Select');
    const actionBtns = document.getElementById('bulk-action-buttons');
    if (actionBtns) actionBtns.style.display = 'none';
    updateSelectedCount();
}

function onCardCheck(input) {
    updateSelectedCount();
}

function updateSelectedCount() {
    const selected  = document.querySelectorAll('.card-checkbox input:checked');
    const countEl   = document.getElementById('selected-count');
    const actionBtns= document.getElementById('bulk-action-buttons');
    if (countEl) countEl.textContent = selected.length;
    if (actionBtns) actionBtns.style.display = selected.length > 0 ? 'flex' : 'none';
}

function bulkRemove() {
    const selected = Array.from(document.querySelectorAll('.card-checkbox input:checked'));
    if (!selected.length) return;

    const csrfToken = document.cookie.split(';')
        .find(c => c.trim().startsWith('csrftoken='))?.split('=')?.[1] || '';

    let done = 0;
    selected.forEach(input => {
        const slug = input.dataset.slug;
        const card = input.closest('.wishlist-card');

        fetch(WL_URLS.wishlistToggle, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': csrfToken,
            },
            body: `slug=${encodeURIComponent(slug)}`,
        })
        .then(r => r.json())
        .then(() => {
            if (card) {
                card.style.transition = 'opacity 0.3s, transform 0.3s';
                card.style.opacity   = '0';
                card.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    card.remove();
                    done++;
                    if (done === selected.length) {
                        cancelBulkSelect();
                        updateWishlistStats();
                        updateTabCounts();
                        showToast(gettext('Removed'), interpolate(gettext('%s destination(s) removed from wishlist.'), [done]), 'info');
                    }
                }, 300);
            }
        })
        .catch(() => {});
    });
}

// ─── Price Alerts (publicAPI-backed) ────────────────────────────────────────────────
const _LANG = '/' + window.location.pathname.split('/').filter(Boolean)[0] + '/';
const WL_URLS = window.WISHLIST_URLS || {
    alertToggle:    _LANG + 'api/price-alert/toggle/',
    wishlistToggle: _LANG + 'api/wishlist/toggle/',
};

function getCsrf() {
    return document.cookie.split(';')
        .find(c => c.trim().startsWith('csrftoken='))?.split('=')?.[1] || '';
}

function setAlertDom(slug, active) {
    const itemEl = document.getElementById(`alert-${slug}`);
    const iconEl = document.getElementById(`alert-icon-${slug}`);
    const btnEl  = document.getElementById(`alert-btn-${slug}`);
    if (itemEl) itemEl.classList.toggle('active', active);
    if (iconEl) iconEl.className = active ? 'fas fa-bell' : 'fas fa-bell-slash';
    if (btnEl)  btnEl.innerHTML  = active ? '<i class="fas fa-bell"></i>' : '<i class="fas fa-bell-slash"></i>';
}

function toggleAlert(slug, name) {
    fetch(WL_URLS.alertToggle, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrf(),
        },
        body: JSON.stringify({ slug }),
    })
    .then(r => r.json())
    .then(data => {
        if (data.unauthenticated) {
            showToast(gettext('Login required'), gettext('Please log in to set price alerts.'), 'error');
            return;
        }
        const active = !!data.active;
        setAlertDom(slug, active);
        if (active) {
            showToast(gettext('Alert on'), interpolate(gettext("You'll be notified when %s price drops!"), [name]), 'success');
        } else {
            showToast(gettext('Alert off'), interpolate(gettext('Price alert disabled for %s'), [name]), 'info');
        }
    })
    .catch(() => showToast(gettext('Error'), gettext('Could not update alert. Try again.'), 'error'));
}

function enableAllAlerts() {
    const items = document.querySelectorAll('[id^="alert-"]');
    const slugs = [];
    items.forEach(el => {
        const slug = el.id.replace('alert-', '');
        if (!slug || slug.includes('icon') || slug.includes('btn')) return;
        if (!el.classList.contains('active')) slugs.push(slug);
    });

    if (!slugs.length) {
        showToast(gettext('All alerts on'), gettext('All price alerts are already active!'), 'info');
        return;
    }

    let done = 0;
    slugs.forEach(slug => {
        fetch(WL_URLS.alertToggle, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrf() },
            body: JSON.stringify({ slug }),
        })
        .then(r => r.json())
        .then(data => {
            if (data.active) setAlertDom(slug, true);
            done++;
            if (done === slugs.length) {
                showToast(gettext('All alerts on'), interpolate(gettext('Price alerts enabled for %s destination(s)!'), [done]), 'success');
            }
        })
        .catch(() => {});
    });
}

function initAlerts() {
    // Initial alert state is rendered server-side via 'active_alert_slugs' context.
    // DOM already reflects correct state — nothing to do here.
}

// ─── Share wishlist ───────────────────────────────────────────────────────────
function shareWishlist() {
    const url   = window.location.href;
    const title = gettext('My TravelHub Wishlist');
    if (navigator.share) {
        navigator.share({ title, url }).catch(() => {});
    } else {
        navigator.clipboard.writeText(url).then(() => {
            showToast(gettext('Link copied!'), gettext('Wishlist link copied to clipboard.'), 'success');
        }).catch(() => {
            showToast(gettext('Share'), url, 'info');
        });
    }
}

// ─── Price Range Slider ───────────────────────────────────────────────────────
let priceMin = 0;
let priceMax = 0;
let activePriceMin = 0;
let activePriceMax = 0;

function initPriceRange() {
    const grid = document.getElementById('wishlist-grid');
    if (!grid) return;

    const prices = Array.from(grid.querySelectorAll('.wishlist-card'))
        .map(c => Number(c.dataset.price || 0))
        .filter(p => p > 0);

    if (!prices.length) return;

    priceMin = Math.floor(Math.min(...prices));
    priceMax = Math.ceil(Math.max(...prices));
    activePriceMin = priceMin;
    activePriceMax = priceMax;

    const rangeMinEl = document.getElementById('range-min');
    const rangeMaxEl = document.getElementById('range-max');

    if (rangeMinEl) { rangeMinEl.min = priceMin; rangeMinEl.max = priceMax; rangeMinEl.value = priceMin; }
    if (rangeMaxEl) { rangeMaxEl.min = priceMin; rangeMaxEl.max = priceMax; rangeMaxEl.value = priceMax; }

    // Ticks
    const tickMin = document.getElementById('tick-min');
    const tickMid = document.getElementById('tick-mid');
    const tickMax = document.getElementById('tick-max');
    if (tickMin) tickMin.textContent = `$${priceMin.toLocaleString()}`;
    if (tickMid) tickMid.textContent = `$${Math.round((priceMin + priceMax) / 2).toLocaleString()}`;
    if (tickMax) tickMax.textContent = `$${priceMax.toLocaleString()}`;

    updateRangeDisplay();
}

function onRangeInput() {
    const rangeMinEl = document.getElementById('range-min');
    const rangeMaxEl = document.getElementById('range-max');
    if (!rangeMinEl || !rangeMaxEl) return;

    let minVal = Number(rangeMinEl.value);
    let maxVal = Number(rangeMaxEl.value);

    // Prevent handles crossing — maintain at least $10 gap
    if (minVal >= maxVal - 10) {
        if (document.activeElement === rangeMinEl) {
            minVal = maxVal - 10;
            rangeMinEl.value = minVal;
        } else {
            maxVal = minVal + 10;
            rangeMaxEl.value = maxVal;
        }
    }

    activePriceMin = minVal;
    activePriceMax = maxVal;

    updateRangeDisplay();
    applyFilters();
}

function updateRangeDisplay() {
    const rangeMinEl = document.getElementById('range-min');
    const rangeMaxEl = document.getElementById('range-max');
    const fillEl     = document.getElementById('range-fill');
    const minValEl   = document.getElementById('range-min-val');
    const maxValEl   = document.getElementById('range-max-val');
    const resetBtn   = document.getElementById('price-reset-btn');

    if (!rangeMinEl || !rangeMaxEl) return;

    const min = Number(rangeMinEl.value);
    const max = Number(rangeMaxEl.value);
    const range = priceMax - priceMin || 1;

    const leftPct  = ((min - priceMin) / range) * 100;
    const rightPct = ((priceMax - max) / range) * 100;

    if (fillEl) {
        fillEl.style.left  = `${leftPct}%`;
        fillEl.style.right = `${rightPct}%`;
    }
    if (minValEl) minValEl.textContent = min.toLocaleString();
    if (maxValEl) maxValEl.textContent = max.toLocaleString();

    // Show reset button only when range is narrowed
    const isDefault = min <= priceMin && max >= priceMax;
    if (resetBtn) resetBtn.style.display = isDefault ? 'none' : 'inline-flex';
}

function resetPriceRange() {
    const rangeMinEl = document.getElementById('range-min');
    const rangeMaxEl = document.getElementById('range-max');
    if (rangeMinEl) rangeMinEl.value = priceMin;
    if (rangeMaxEl) rangeMaxEl.value = priceMax;
    activePriceMin = priceMin;
    activePriceMax = priceMax;
    updateRangeDisplay();
    applyFilters();
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initPriceRange();
    updateTabCounts();
    initAlerts();
});
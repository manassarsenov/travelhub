function initFlashTimers() {
    document.querySelectorAll('.deal-timer').forEach(timer => {
        // Agar timer allaqachon ishga tushgan bo'lsa, qayta ishga tushirmaymiz
        if (timer.dataset.timerStarted === 'true') return;
        
        const endTimeStr = timer.dataset.end;
        if (!endTimeStr) return;
        
        const endTime = new Date(endTimeStr);
        timer.dataset.timerStarted = 'true';

        const interval = setInterval(() => {
            const now = new Date();
            const diff = endTime - now;

            if (diff <= 0) {
                clearInterval(interval);
                const card = timer.closest('.destination-card') || timer.closest('.package-card');
                if (card) card.remove();
                return;
            }

            const totalHours = Math.floor(diff / 3600000);
            const mins = Math.floor((diff % 3600000) / 60000);
            const secs = Math.floor((diff % 60000) / 1000);

            const daysEl = timer.querySelector('.days');
            const dayItem = timer.querySelector('.day-item');
            const hoursEl = timer.querySelector('.hours');
            const minsEl = timer.querySelector('.minutes');
            const secsEl = timer.querySelector('.seconds');
            
            if (totalHours >= 24) {
                const days = Math.floor(totalHours / 24);
                const hours = totalHours % 24;
                if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
                if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
                if (dayItem) dayItem.style.display = 'flex';
            } else {
                if (hoursEl) hoursEl.textContent = String(totalHours).padStart(2, '0');
                if (dayItem) dayItem.style.display = 'none';
            }
            
            if (minsEl) minsEl.textContent = String(mins).padStart(2, '0');
            if (secsEl) secsEl.textContent = String(secs).padStart(2, '0');
        }, 1000);
    });
}

function loadMoreCities() {
    const btn = document.getElementById('cities-load-more-btn');
    if (!btn || btn.disabled) return;

    const countryCode = btn.dataset.country;
    const offset = parseInt(btn.dataset.offset || 0);
    const lang = getCurrentLang();
    const panel = document.getElementById('panel-' + countryCode);
    const grid = panel.querySelector('.cities-grid');

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    btn.disabled = true;

    fetch(`/${lang}/destinations/cities/by-country/${countryCode}/?offset=${offset}`)
        .then(res => res.json())
        .then(data => {
            data.cities.forEach(city => {
                grid.insertAdjacentHTML('beforeend', `
                    <div class="city-card" onclick="filterByCity('${city.slug}','${city.name}')">
                        <img src="${city.image_url}" alt="${city.name}" loading="lazy">
                        <div class="city-card-overlay"></div>
                        <div class="city-card-info">
                            <div class="city-card-name">${city.name}, ${data.country_name || ''}</div>
                            <div class="city-card-things">${city.things_to_do}+ curated things to do</div>
                        </div>
                    </div>`);
            });

            btn.dataset.offset = data.offset;
            updateLoadMoreUI(panel);
            
            if (!data.has_more) {
                btn.style.display = 'none';
            } else {
                btn.innerHTML = '<i class="fas fa-plus-circle"></i> Load More Cities';
                btn.disabled = false;
            }
        })
        .catch(() => {
            btn.innerHTML = '<i class="fas fa-redo"></i> Try Again';
            btn.disabled = false;
        });
}

document.addEventListener('DOMContentLoaded', () => {
    // Images load animation
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('load', () => img.classList.add('loaded'));
    });

    // Cities panel — initial setup
    const firstPanel = document.querySelector('.cities-panel.active');
    if (firstPanel) {
        updateLoadMoreUI(firstPanel);
    }

    // Refresh da city state tiklash
    const params = new URLSearchParams(window.location.search);
    const citySlug = params.get('city');
    const cityName = params.get('city_name');
    if (citySlug && cityName) {
        filterByCity(citySlug, cityName);
    }
    
    initFlashTimers();
});

function getCurrentLang() {
    const path = window.location.pathname;
    const parts = path.split('/');
    const supported = ['uz', 'en', 'ru'];
    if (parts.length > 1 && supported.includes(parts[1])) {
        return parts[1];
    }
    return document.documentElement.lang || 'en';
}

/* 
   UI Helper — Faqat 6 tadan ko'p bo'lsa ko'rsatish logikasi 
*/
function updateLoadMoreUI(panel) {
    const loadMoreBtn = document.getElementById('cities-load-more-btn');
    const showingText = document.getElementById('cities-showing-text');
    if (!loadMoreBtn || !showingText) return;

    const total = parseInt(panel.dataset.total || 0);
    const shown = panel.querySelectorAll('.city-card').length;
    const countryCode = panel.id.replace('panel-', '');

    // 🚀 ASOSIY MANTIQ: Jami 6 tadan ko'p bo'lsagina elementlarni ko'rsatamiz
    if (total > 6) {
        showingText.style.display = 'block';
        showingText.textContent = `Showing ${shown} of ${total} cities`;

        if (total > shown) {
            loadMoreBtn.style.display = 'inline-block';
            loadMoreBtn.dataset.country = countryCode;
            loadMoreBtn.dataset.offset = shown;
            loadMoreBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Load More Cities';
            loadMoreBtn.disabled = false;
        } else {
            loadMoreBtn.style.display = 'none';
        }
    } else {
        // 🚀 6 ta yoki kam bo'lsa — hammasini yashiramiz
        showingText.style.display = 'none';
        loadMoreBtn.style.display = 'none';
    }
}

function switchRegion(regionSlug, btn) {
    document.querySelectorAll('.region-btn').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.country-group').forEach(g => g.classList.remove('active'));
    const activeCountryGroup = document.getElementById('countries-' + regionSlug);

    if (activeCountryGroup) {
        activeCountryGroup.classList.add('active');
        const firstCountryBtn = activeCountryGroup.querySelector('.country-btn');
        if (firstCountryBtn) {
            firstCountryBtn.click();
        } else {
            document.querySelectorAll('.cities-panel').forEach(p => p.classList.remove('active'));
            const loadMoreBtn = document.getElementById('cities-load-more-btn');
            const showingText = document.getElementById('cities-showing-text');
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            if (showingText) showingText.style.display = 'none';
        }
    }
}

function switchCountry(countryCode, btn) {
    document.querySelectorAll('.country-btn').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.cities-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('panel-' + countryCode);

    if (!panel) return;
    panel.classList.add('active');

    if (panel.dataset.loaded === 'true') {
        updateLoadMoreUI(panel);
        return;
    }

    const grid = panel.querySelector('.cities-grid');
    if (grid) grid.innerHTML = '<div style="text-align:center; padding:40px; grid-column: 1/-1;"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--primary);"></i></div>';

    const lang = getCurrentLang();
    fetch(`/${lang}/destinations/cities/by-country/${countryCode}/`)
        .then(res => {
            if (!res.ok) throw new Error('Server error');
            return res.json();
        })
        .then(data => {
            grid.innerHTML = '';
            panel.dataset.loaded = 'true';
            
            data.cities.forEach(city => {
                grid.insertAdjacentHTML('beforeend', `
                    <div class="city-card" onclick="filterByCity('${city.slug}','${city.name}')">
                        <img src="${city.image_url}" alt="${city.name}" loading="lazy">
                        <div class="city-card-overlay"></div>
                        <div class="city-card-info">
                            <div class="city-card-name">${city.name}, ${data.country_name || ''}</div>
                            <div class="city-card-things">${city.things_to_do}+ curated things to do</div>
                        </div>
                    </div>`);
            });

            panel.dataset.total = data.total;
            updateLoadMoreUI(panel);
        })
        .catch(() => {
            btn.innerHTML = '<i class="fas fa-plus-circle"></i> Load More Cities';
            btn.disabled = false;
        });
}

function loadMoreDestinations() {
    const btn = document.getElementById('load-more-btn');
    if (!btn || btn.disabled) return;
    const offset = parseInt(btn.dataset.offset);
    const citySlug = btn.dataset.citySlug || '';
    const lang = getCurrentLang();
    const grid = document.getElementById('destinations-grid');

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    btn.disabled = true;

    fetch(`/${lang}/destinations/load-more/?offset=${offset}&city=${citySlug}`, {
        headers: {
            'Accept': 'application/json'
        }
    })
        .then(res => res.json())
        .then(data => {
            if (grid) grid.insertAdjacentHTML('beforeend', data.html);
            btn.dataset.offset = offset + data.count;
            
            const showingText = document.getElementById('showing-text');
            if (showingText) {
                showingText.textContent = `Showing ${offset + data.count} destinations`;
            }

            if (!data.has_more) {
                btn.style.display = 'none';
            } else {
                btn.innerHTML = '<i class="fas fa-plus-circle"></i> Load More';
                btn.disabled = false;
            }
            initFlashTimers();
        })
        .catch(() => {
            btn.innerHTML = '<i class="fas fa-plus-circle"></i> Load More';
            btn.disabled = false;
        });
}

function filterByCity(citySlug, cityName) {
    const exploreSection = document.getElementById('explore-section');
    const mainDestinations = document.getElementById('main-destinations');
    const grid = document.getElementById('destinations-grid');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const showingText = document.getElementById('showing-text');
    const lang = getCurrentLang();

    if (exploreSection) exploreSection.style.display = 'none';
    if (mainDestinations) mainDestinations.classList.add('visible');
    const badge = document.getElementById('active-city-name');
    if (badge) badge.textContent = cityName;

    const url = new URL(window.location);
    url.searchParams.set('city', citySlug);
    url.searchParams.set('city_name', cityName);
    window.history.pushState({}, '', url);

    fetch(`/${lang}/destinations/by-city/?city=${citySlug}&offset=0`)
        .then(res => {
            if (!res.ok) throw new Error('Not found');
            return res.text();
        })
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const meta = doc.getElementById('cards-meta');
            const total = parseInt(meta?.dataset.total || 0);
            const shown = parseInt(meta?.dataset.shown || 0);
            const hasMore = meta?.dataset.hasMore === 'true';

            if (grid) {
                grid.innerHTML = '';
                doc.querySelectorAll('.destination-card, .package-card').forEach(card => {
                    grid.appendChild(document.importNode(card, true));
                });
            }

            if (document.getElementById('results-count')) document.getElementById('results-count').textContent = total;
            if (showingText) showingText.textContent = `Showing ${shown} of ${total} destinations`;

            if (loadMoreBtn) {
                loadMoreBtn.dataset.offset = shown;
                loadMoreBtn.dataset.total = total;
                loadMoreBtn.dataset.citySlug = citySlug;
                loadMoreBtn.style.display = hasMore ? 'inline-block' : 'none';
                loadMoreBtn.onclick = () => loadMoreByCity(citySlug);
            }

            if (grid) {
                waitForImagesAndInit(grid);
                initFlashTimers();
            }
        })
        .catch(err => {
            console.error(err);
            if (grid) grid.innerHTML = '<p style="text-align:center; padding:40px; color:red;">Error loading destinations.</p>';
        });

    if (mainDestinations) mainDestinations.scrollIntoView({behavior: 'smooth', block: 'start'});
}

function waitForImagesAndInit(grid) {
    const allImages = grid.querySelectorAll('img');
    let loadedCount = 0;
    const total_imgs = allImages.length;
    if (total_imgs === 0) {
        if (typeof equalizeAndInit === 'function') equalizeAndInit();
        return;
    }
    allImages.forEach(img => {
        const finished = () => {
            loadedCount++;
            if (loadedCount === total_imgs && typeof equalizeAndInit === 'function') equalizeAndInit();
        };
        if (img.complete) finished();
        else {
            img.addEventListener('load', finished);
            img.addEventListener('error', finished);
        }
    });
}

function loadMoreByCity(citySlug) {
    const btn = document.getElementById('load-more-btn');
    const showingText = document.getElementById('showing-text');
    const grid = document.getElementById('destinations-grid');
    if (!btn || btn.disabled) return;

    const offset = parseInt(btn.dataset.offset);
    const total = parseInt(btn.dataset.total);
    const lang = getCurrentLang();

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    btn.disabled = true;

    fetch(`/${lang}/destinations/by-city/?city=${citySlug}&offset=${offset}`)
        .then(res => res.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const meta = doc.getElementById('cards-meta');
            const shown = parseInt(meta?.dataset.shown || 0);
            const hasMore = meta?.dataset.hasMore === 'true';

            doc.querySelectorAll('.destination-card, .package-card').forEach(card => {
                grid.appendChild(document.importNode(card, true));
            });

            btn.dataset.offset = shown;
            if (showingText) showingText.textContent = `Showing ${shown} of ${total} destinations`;
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-plus-circle"></i> Load More Destinations';
            if (!hasMore) btn.style.display = 'none';

            if (grid) {
                waitForImagesAndInit(grid);
                initFlashTimers();
            }
        })
        .catch(() => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-redo"></i> Try Again';
        });
}

function backToExplore() {
    const exploreSection = document.getElementById('explore-section');
    const mainDestinations = document.getElementById('main-destinations');
    const grid = document.getElementById('destinations-grid');
    const loadMoreBtn = document.getElementById('load-more-btn');

    const url = new URL(window.location);
    url.searchParams.delete('city');
    url.searchParams.delete('city_name');
    window.history.pushState({}, '', url);

    if (document.getElementById('active-city-name')) document.getElementById('active-city-name').textContent = 'All';
    if (mainDestinations) mainDestinations.classList.remove('visible');
    if (exploreSection) exploreSection.style.display = '';
    if (grid) grid.innerHTML = '';

    if (loadMoreBtn) {
        loadMoreBtn.style.display = 'inline-block';
        loadMoreBtn.onclick = function() {
            if (typeof loadMoreDestinations === 'function') loadMoreDestinations();
        };
    }
    if (exploreSection) exploreSection.scrollIntoView({behavior: 'smooth', block: 'start'});
}

function initExpandable() {
    document.querySelectorAll('.destination-info h3').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            el.classList.toggle('expanded');
        });
    });
    document.querySelectorAll('.card-description').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            el.classList.toggle('expanded');
        });
    });
}

function equalizeAndInit() {
    initExpandable();
    const grid = document.getElementById('destinations-grid');
    if (!grid) return;
    grid.querySelectorAll('.destination-card, .package-card').forEach(c => c.style.height = 'auto');
    requestAnimationFrame(() => {
        const cards = Array.from(grid.querySelectorAll('.destination-card, .package-card'));
        const rows = {};
        cards.forEach(c => {
            const top = c.offsetTop;
            if (!rows[top]) rows[top] = [];
            rows[top].push(c);
        });
        Object.values(rows).forEach(row => {
            const maxH = Math.max(...row.map(c => c.offsetHeight));
            row.forEach(c => c.style.height = maxH + 'px');
        });
    });
}

document.addEventListener('DOMContentLoaded', equalizeAndInit);
window.addEventListener('resize', equalizeAndInit);

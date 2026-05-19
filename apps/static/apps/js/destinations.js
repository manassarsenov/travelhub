function initFlashTimers() {
    document.querySelectorAll('.deal-timer').forEach(timer => {
        // Agar timer allaqachon ishga tushgan bo'lsa, qayta ishga tushirmaymiz
        if (timer.dataset.timerStarted === 'true') return;

        const endTimeStr = timer.dataset.end;
        if (!endTimeStr) return;

        const endTime = new Date(endTimeStr);
        if (isNaN(endTime.getTime())) return;

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

    // URL dan state tiklash
    const params      = new URLSearchParams(window.location.search);
    const citySlug    = params.get('city');
    const cityName    = params.get('city_name');
    const countrySlug = params.get('country');
    const countryName = params.get('country_name');
    const searchQuery = params.get('q');

    if (searchQuery) {
        filterByQuery(searchQuery);
    } else if (citySlug && cityName) {
        filterByCity(citySlug, cityName);
    } else if (countrySlug && countryName) {
        filterByCountry(countrySlug, countryName);
    }

    initFlashTimers();

    const minSlider = document.getElementById('min-price');
    const maxSlider = document.getElementById('max-price');
    const minVal = document.getElementById('min-price-value');
    const maxVal = document.getElementById('max-price-value');
    const filters = document.querySelectorAll('.filters-sidebar input[type="checkbox"], .filters-sidebar input[type="radio"]');

    // ==========================================
    // SLAYDER DIZAYNI (Ko'k chiziq va sonlar)
    // ==========================================
    function updateSliderTrack() {
        if (!minSlider || !maxSlider) return;
        const min = parseInt(minSlider.min);
        const max = parseInt(minSlider.max);
        const currentMin = parseInt(minSlider.value);
        const currentMax = parseInt(maxSlider.value);

        const percent1 = ((currentMin - min) / (max - min)) * 100;
        const percent2 = ((currentMax - min) / (max - min)) * 100;
        maxSlider.style.background = `linear-gradient(to right, var(--gray-200) ${percent1}%, var(--primary) ${percent1}%, var(--primary) ${percent2}%, var(--gray-200) ${percent2}%)`;
    }

    if (minSlider && maxSlider) {
        // Mishka bilan harakatlantirganda faqat yozuv o'zgaradi
        minSlider.addEventListener('input', function () {
            if (parseInt(minSlider.value) >= parseInt(maxSlider.value)) minSlider.value = parseInt(maxSlider.value) - 10;
            minVal.textContent = minSlider.value;
            updateSliderTrack();
        });

        maxSlider.addEventListener('input', function () {
            if (parseInt(maxSlider.value) <= parseInt(minSlider.value)) maxSlider.value = parseInt(minSlider.value) + 10;
            maxVal.textContent = maxSlider.value;
            updateSliderTrack();
        });

        // Birinchi yuklanganda slayder dizaynini chizish
        updateSliderTrack();

        // Mishkani qo'yib yuborganda (change) AJAX ishga tushadi
        minSlider.addEventListener('change', applyFilters);
        maxSlider.addEventListener('change', applyFilters);
    }

    // ==========================================
    // CHECKBOX VA RADIO TUGMALARGA AJAX ULASH
    // ==========================================
    filters.forEach(input => {
        input.addEventListener('change', applyFilters);
    });

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
            initCompareCheckboxes();
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
                initCompareCheckboxes();
            }
        })
        .catch(err => {
            console.error(err);
            if (grid) grid.innerHTML = '<p style="text-align:center; padding:40px; color:red;">Error loading destinations.</p>';
        });

    if (mainDestinations) mainDestinations.scrollIntoView({behavior: 'smooth', block: 'start'});
}

function filterByCountry(countrySlug, countryName) {
    const exploreSection   = document.getElementById('explore-section');
    const mainDestinations = document.getElementById('main-destinations');
    const grid             = document.getElementById('destinations-grid');
    const loadMoreBtn      = document.getElementById('load-more-btn');
    const showingText      = document.getElementById('showing-text');
    const lang             = getCurrentLang();

    if (exploreSection)   exploreSection.style.display = 'none';
    if (mainDestinations) mainDestinations.classList.add('visible');

    const badge = document.getElementById('active-city-name');
    if (badge) badge.textContent = countryName;

    const url = new URL(window.location);
    url.searchParams.set('country', countrySlug);
    url.searchParams.set('country_name', countryName);
    url.searchParams.delete('city');
    url.searchParams.delete('city_name');
    url.searchParams.delete('q');
    window.history.pushState({}, '', url);

    if (grid) grid.innerHTML =
        '<div style="grid-column:1/-1;text-align:center;padding:60px;">' +
        '<i class="fas fa-spinner fa-spin fa-2x" style="color:var(--primary);"></i></div>';

    fetch(`/${lang}/filter-destinations/?country=${countrySlug}&offset=0`)
        .then(res => { if (!res.ok) throw new Error(); return res.text(); })
        .then(html => {
            const doc     = new DOMParser().parseFromString(html, 'text/html');
            const meta    = doc.getElementById('cards-meta');
            const total   = parseInt(meta?.dataset.total   || 0);
            const shown   = parseInt(meta?.dataset.shown   || 0);
            const hasMore = meta?.dataset.hasMore === 'true';

            if (grid) {
                grid.innerHTML = '';
                doc.querySelectorAll('.destination-card, .package-card').forEach(card => {
                    grid.appendChild(document.importNode(card, true));
                });
            }

            if (document.getElementById('results-count'))
                document.getElementById('results-count').textContent = total;
            if (showingText)
                showingText.textContent = `Showing ${shown} of ${total} destinations`;

            if (loadMoreBtn) {
                loadMoreBtn.dataset.offset    = shown;
                loadMoreBtn.dataset.total     = total;
                loadMoreBtn.dataset.citySlug  = '';
                loadMoreBtn.style.display     = hasMore ? 'inline-block' : 'none';
                loadMoreBtn.onclick           = () => loadMoreByCountry(countrySlug);
            }

            if (grid) { waitForImagesAndInit(grid); initFlashTimers(); initCompareCheckboxes(); }
        })
        .catch(() => {
            if (grid) grid.innerHTML =
                '<p style="text-align:center;padding:40px;color:red;">Error loading destinations.</p>';
        });

    if (mainDestinations) mainDestinations.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function loadMoreByCountry(countrySlug) {
    const btn         = document.getElementById('load-more-btn');
    const showingText = document.getElementById('showing-text');
    const grid        = document.getElementById('destinations-grid');
    if (!btn || btn.disabled) return;

    const offset = parseInt(btn.dataset.offset || 0);
    const total  = parseInt(btn.dataset.total  || 0);
    const lang   = getCurrentLang();

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    btn.disabled  = true;

    fetch(`/${lang}/filter-destinations/?country=${countrySlug}&offset=${offset}`)
        .then(res => res.text())
        .then(html => {
            const doc     = new DOMParser().parseFromString(html, 'text/html');
            const meta    = doc.getElementById('cards-meta');
            const shown   = parseInt(meta?.dataset.shown   || 0);
            const hasMore = meta?.dataset.hasMore === 'true';

            doc.querySelectorAll('.destination-card, .package-card').forEach(card => {
                grid.appendChild(document.importNode(card, true));
            });

            btn.dataset.offset = shown;
            if (showingText) showingText.textContent = `Showing ${shown} of ${total} destinations`;
            btn.disabled  = false;
            btn.innerHTML = '<i class="fas fa-plus-circle"></i> Load More Destinations';
            if (!hasMore) btn.style.display = 'none';

            if (grid) { waitForImagesAndInit(grid); initFlashTimers(); initCompareCheckboxes(); }
        })
        .catch(() => { btn.disabled = false; btn.innerHTML = '<i class="fas fa-redo"></i> Try Again'; });
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
                initCompareCheckboxes();
            }
        })
        .catch(() => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-redo"></i> Try Again';
        });
}

// ============================================================
// GLOBAL SEARCH — query bo'yicha filter
// ============================================================

function filterByQuery(q) {
    if (!q || !q.trim()) return;
    q = q.trim();

    const exploreSection   = document.getElementById('explore-section');
    const mainDestinations = document.getElementById('main-destinations');
    const grid             = document.getElementById('destinations-grid');
    const loadMoreBtn      = document.getElementById('load-more-btn');
    const showingText      = document.getElementById('showing-text');
    const lang             = getCurrentLang();

    if (exploreSection)   exploreSection.style.display = 'none';
    if (mainDestinations) mainDestinations.classList.add('visible');

    // URL ni yangilash
    const url = new URL(window.location);
    url.searchParams.set('q', q);
    url.searchParams.delete('city');
    url.searchParams.delete('city_name');
    window.history.replaceState({}, '', url);

    // Banner ko'rsatish
    _showSearchBanner(q, null);

    // Loading holati
    if (grid) {
        grid.innerHTML =
            '<div style="grid-column:1/-1;text-align:center;padding:80px 20px;">' +
            '<div style="width:52px;height:52px;border:3px solid #e2e8f0;border-top-color:var(--primary);' +
            'border-radius:50%;animation:rotate 0.7s linear infinite;margin:0 auto 20px;"></div>' +
            '<p style="font-size:16px;color:var(--gray);font-weight:600;">Searching for "' + q + '"…</p>' +
            '</div>';
    }

    fetch('/' + lang + '/destinations/load-more/?q=' + encodeURIComponent(q) + '&offset=0', {
        headers: { 'Accept': 'application/json' }
    })
    .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
    })
    .then(data => {
        const total = data.total || 0;
        const shown = data.count || 0;

        if (grid) {
            if (data.html && data.html.trim()) {
                grid.innerHTML = data.html;
            } else {
                grid.innerHTML = _noResultsHTML(q);
            }
        }

        _showSearchBanner(q, total);
        if (showingText) showingText.textContent = total > 0
            ? 'Showing ' + shown + ' of ' + total + ' destinations'
            : '0 destinations found';

        const countEl = document.getElementById('results-count');
        if (countEl) countEl.textContent = total;

        if (loadMoreBtn) {
            loadMoreBtn.dataset.offset   = shown;
            loadMoreBtn.dataset.total    = total;
            loadMoreBtn.dataset.citySlug = '';
            loadMoreBtn.dataset.query    = q;
            loadMoreBtn.style.display    = data.has_more ? 'inline-block' : 'none';
            loadMoreBtn.onclick          = () => loadMoreByQuery(q);
            if (data.has_more) {
                loadMoreBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Load More Destinations';
            }
        }

        if (grid) {
            waitForImagesAndInit(grid);
            initFlashTimers();
            if (typeof initCompareCheckboxes === 'function') initCompareCheckboxes();
        }
    })
    .catch(err => {
        console.error('filterByQuery error:', err);
        if (grid) grid.innerHTML = _searchErrorHTML(q);
        _showSearchBanner(q, 0);
    });

    if (mainDestinations) mainDestinations.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function loadMoreByQuery(q) {
    const btn         = document.getElementById('load-more-btn');
    const showingText = document.getElementById('showing-text');
    const grid        = document.getElementById('destinations-grid');
    if (!btn || btn.disabled) return;

    const offset = parseInt(btn.dataset.offset || 0);
    const total  = parseInt(btn.dataset.total  || 0);
    const lang   = getCurrentLang();

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    btn.disabled  = true;

    fetch('/' + lang + '/destinations/load-more/?q=' + encodeURIComponent(q) + '&offset=' + offset, {
        headers: { 'Accept': 'application/json' }
    })
    .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
    })
    .then(data => {
        if (grid && data.html && data.html.trim()) {
            grid.insertAdjacentHTML('beforeend', data.html);
        }
        const newShown = offset + (data.count || 0);
        btn.dataset.offset = newShown;

        if (showingText) showingText.textContent = 'Showing ' + newShown + ' of ' + total + ' destinations';

        btn.disabled  = false;
        btn.innerHTML = '<i class="fas fa-plus-circle"></i> Load More Destinations';
        if (!data.has_more) btn.style.display = 'none';

        if (grid) {
            waitForImagesAndInit(grid);
            initFlashTimers();
            if (typeof initCompareCheckboxes === 'function') initCompareCheckboxes();
        }
    })
    .catch(err => {
        console.error('loadMoreByQuery error:', err);
        btn.disabled  = false;
        btn.innerHTML = '<i class="fas fa-redo"></i> Try Again';
    });
}

function _showSearchBanner(q, total) {
    const banner   = document.getElementById('search-results-banner');
    const qEl      = document.getElementById('srb-query');
    const countEl  = document.getElementById('srb-count');

    if (!banner) return;
    if (qEl)     qEl.textContent    = q;
    if (countEl && total !== null) countEl.textContent = total;
    banner.style.display = 'block';

    // Smooth entrance
    banner.style.opacity   = '0';
    banner.style.transform = 'translateY(-10px)';
    requestAnimationFrame(() => {
        banner.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
        banner.style.opacity    = '1';
        banner.style.transform  = 'translateY(0)';
    });
}

function _noResultsHTML(q) {
    return '<div style="grid-column:1/-1;text-align:center;padding:80px 30px;">' +
        '<div style="width:90px;height:90px;background:linear-gradient(135deg,#f1f5f9,#e2e8f0);' +
        'border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;">' +
        '<i class="fas fa-search" style="font-size:36px;color:#94a3b8;"></i></div>' +
        '<h3 style="font-size:22px;font-weight:900;color:#1e293b;margin-bottom:10px;">No results for "' + q + '"</h3>' +
        '<p style="color:#64748b;font-size:15px;margin-bottom:24px;">Try different keywords or browse all destinations</p>' +
        '<button onclick="clearSearch()" style="padding:12px 28px;background:linear-gradient(135deg,#667eea,#764ba2);' +
        'color:white;border:none;border-radius:50px;font-size:14px;font-weight:700;cursor:pointer;' +
        'font-family:Poppins,sans-serif;box-shadow:0 6px 20px rgba(102,126,234,0.4);">' +
        '<i class="fas fa-arrow-left" style="margin-right:8px;"></i>Browse All Destinations</button>' +
        '</div>';
}

function _searchErrorHTML(q) {
    return '<div style="grid-column:1/-1;text-align:center;padding:80px 30px;">' +
        '<div style="width:90px;height:90px;background:#fff0f0;border-radius:50%;' +
        'display:flex;align-items:center;justify-content:center;margin:0 auto 24px;">' +
        '<i class="fas fa-exclamation-triangle" style="font-size:36px;color:#ef4444;"></i></div>' +
        '<h3 style="font-size:20px;font-weight:900;color:#1e293b;margin-bottom:10px;">Something went wrong</h3>' +
        '<p style="color:#64748b;font-size:15px;margin-bottom:24px;">Could not load results for "' + q + '"</p>' +
        '<button onclick="filterByQuery(\'' + q.replace(/'/g, "\\'") + '\')" ' +
        'style="padding:12px 28px;background:linear-gradient(135deg,#667eea,#764ba2);' +
        'color:white;border:none;border-radius:50px;font-size:14px;font-weight:700;cursor:pointer;' +
        'font-family:Poppins,sans-serif;box-shadow:0 6px 20px rgba(102,126,234,0.4);">' +
        '<i class="fas fa-redo" style="margin-right:8px;"></i>Try Again</button>' +
        '</div>';
}

function clearSearch() {
    const banner = document.getElementById('search-results-banner');
    if (banner) banner.style.display = 'none';

    const url = new URL(window.location);
    url.searchParams.delete('q');
    window.history.replaceState({}, '', url);

    const exploreSection   = document.getElementById('explore-section');
    const mainDestinations = document.getElementById('main-destinations');

    if (mainDestinations) mainDestinations.classList.remove('visible');
    if (exploreSection)   exploreSection.style.display = '';

    exploreSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function switchView(mode) {
    const grid = document.getElementById('destinations-grid');
    if (!grid) return;

    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.view-btn[onclick*="'${mode}'"]`);
    if (activeBtn) activeBtn.classList.add('active');

    grid.classList.remove('view-grid', 'view-list', 'view-map');
    grid.classList.add('view-' + mode);

    if (mode === 'list') {
        grid.querySelectorAll('.destination-card, .package-card').forEach(c => {
            c.style.height = 'auto';
        });
    } else {
        equalizeAndInit();
    }

    localStorage.setItem('destinationsViewMode', mode);
}

// Restore saved view mode on page load
function restoreViewMode() {
    const saved = localStorage.getItem('destinationsViewMode');
    if (saved && saved !== 'grid') {
        switchView(saved);
    }
}

function backToExplore() {
    const exploreSection = document.getElementById('explore-section');
    const mainDestinations = document.getElementById('main-destinations');
    const grid = document.getElementById('destinations-grid');
    const loadMoreBtn = document.getElementById('load-more-btn');

    const url = new URL(window.location);
    url.searchParams.delete('city');
    url.searchParams.delete('city_name');
    url.searchParams.delete('q');
    window.history.pushState({}, '', url);

    const banner = document.getElementById('search-results-banner');
    if (banner) banner.style.display = 'none';

    if (document.getElementById('active-city-name')) document.getElementById('active-city-name').textContent = 'All';
    if (mainDestinations) mainDestinations.classList.remove('visible');
    if (exploreSection) exploreSection.style.display = '';
    if (grid) grid.innerHTML = '';

    if (loadMoreBtn) {
        loadMoreBtn.style.display = 'inline-block';
        loadMoreBtn.onclick = function () {
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

function initDestinationsPage() {
    equalizeAndInit();
    restoreViewMode();
}

document.addEventListener('DOMContentLoaded', initDestinationsPage);
window.addEventListener('resize', equalizeAndInit);

function applyFilters() {
    const grid = document.getElementById('destinations-grid');
    const countDisplay = document.getElementById('results-count');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const showingText = document.getElementById('showing-text');

    const params = new URLSearchParams(window.location.search);

    // Narxlarni olish
    params.set('min_price', document.getElementById('min-price')?.value || 0);
    params.set('max_price', document.getElementById('max-price')?.value || 5000);

    // Checkbox va Radiolarni yig'ish
    const getCheckedValues = (name) => {
        return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value).join(',');
    };

    ['type', 'activity', 'season', 'rating'].forEach(name => {
        const val = getCheckedValues(name);
        if (val) params.set(name, val); else params.delete(name);
    });

    const duration = document.querySelector('input[name="duration"]:checked')?.value;
    if (duration) params.set('duration', duration); else params.delete('duration');

    // Popular quick filter
    if (_activeQuickFilter === 'popular') params.set('popular', '1');
    else params.delete('popular');

    // Filtrlash boshlanganda offset doim 0 bo'ladi
    params.set('offset', 0);

    if (grid) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px;"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--primary);"></i><p>Searching...</p></div>';
    }

    const lang = getCurrentLang();
    const url = `/${lang}/filter-destinations/?${params.toString()}`;

    fetch(url)
        .then(res => res.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const meta = doc.getElementById('cards-meta');

            // 🚀 DINAMIK METADATA YANGILASH
            const total = parseInt(meta?.dataset.total || 0);
            const shown = parseInt(meta?.dataset.shown || 0);
            const hasMore = meta?.dataset.hasMore === 'true';

            if (grid) grid.innerHTML = html;

            // Natijalar sonini yangilash
            if (countDisplay) countDisplay.textContent = total;

            // "Showing X of Y" matnini yangilash
            if (showingText) {
                showingText.textContent = `Showing ${shown} of ${total} destinations`;
            }

            // "Load More" tugmasini holati
            if (loadMoreBtn) {
                loadMoreBtn.dataset.offset = shown;
                loadMoreBtn.dataset.total = total;
                loadMoreBtn.style.display = hasMore ? 'inline-block' : 'none';

                // Tugmaga yangi URL parametrlarini bog'lab qo'yamiz
                loadMoreBtn.onclick = () => loadMoreWithFilters(params);
            }

            initFlashTimers();
            initCompareCheckboxes();
            equalizeAndInit();
        });
}

// Filtrlangan holatda "Load More" funksiyasi
function loadMoreWithFilters(currentParams) {
    const btn = document.getElementById('load-more-btn');
    const grid = document.getElementById('destinations-grid');
    const showingText = document.getElementById('showing-text');

    if (!btn || btn.disabled) return;

    const offset = parseInt(btn.dataset.offset);
    currentParams.set('offset', offset);

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    btn.disabled = true;

    const lang = getCurrentLang();
    const url = `/${lang}/filter-destinations/?${currentParams.toString()}`;

    fetch(url)
        .then(res => res.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const meta = doc.getElementById('cards-meta');

            const total = parseInt(meta?.dataset.total || 0);
            const shown = parseInt(meta?.dataset.shown || 0);
            const hasMore = meta?.dataset.hasMore === 'true';

            // Kartalarni oxiriga qo'shish (Grid ichidagi mavjud HTML ni o'chirmasdan)
            doc.querySelectorAll('.destination-card, .package-card').forEach(card => {
                grid.appendChild(document.importNode(card, true));
            });

            btn.dataset.offset = shown;
            if (showingText) showingText.textContent = `Showing ${shown} of ${total} destinations`;

            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-plus-circle"></i> Load More Destinations';
            btn.style.display = hasMore ? 'inline-block' : 'none';

            initFlashTimers();
            initCompareCheckboxes();
            equalizeAndInit();
        });
}

// Filtrlarni tozalash funksiyasi
function clearAllFilters() {
    // 1. Barcha checkbox va radiolarni ochirish
    document.querySelectorAll('.filters-sidebar input[type="checkbox"], .filters-sidebar input[type="radio"]').forEach(el => {
        el.checked = false;
    });

    // 2. Slayderlarni asl holiga qaytarish
    const minSlider = document.getElementById('min-price');
    const maxSlider = document.getElementById('max-price');
    if (minSlider && maxSlider) {
        minSlider.value = minSlider.min;
        maxSlider.value = maxSlider.max;
        document.getElementById('min-price-value').textContent = minSlider.min;
        document.getElementById('max-price-value').textContent = maxSlider.max;
    }

    // 3. Restore state: if search was active, go back to search results; otherwise re-apply (empty) filters
    const currentQ = new URLSearchParams(window.location.search).get('q');
    if (currentQ) {
        filterByQuery(currentQ);
    } else {
        applyFilters();
    }
}

// ============================================================
// COMPARE FUNKSIONALLIK
// ============================================================
const COMPARE_KEY = 'travelhub_compare';
const COMPARE_MAX = 4;

function getCompareList() {
    try {
        return JSON.parse(localStorage.getItem(COMPARE_KEY)) || [];
    } catch {
        return [];
    }
}

function saveCompareList(list) {
    localStorage.setItem(COMPARE_KEY, JSON.stringify(list));
}

function updateCompareCount() {
    const list = getCompareList();
    const countEl = document.getElementById('compare-count');
    if (countEl) countEl.textContent = list.length;
    const btn = document.querySelector('.compare-btn');
    if (btn) {
        btn.style.display = list.length > 0 ? 'inline-flex' : 'none';
    }
}

function isInCompare(slug) {
    return getCompareList().some(item => item.slug === slug);
}

function addToCompare(checkbox) {
    const slug = checkbox.dataset.slug;
    const name = checkbox.dataset.name;
    const image = checkbox.dataset.image;
    const price = checkbox.dataset.price;
    const rating = checkbox.dataset.rating;

    let list = getCompareList();

    if (checkbox.checked) {
        if (isInCompare(slug)) return;
        if (list.length >= COMPARE_MAX) {
            alert(`You can only compare up to ${COMPARE_MAX} destinations.`);
            checkbox.checked = false;
            return;
        }
        list.push({ slug, name, image, price, rating });
    } else {
        list = list.filter(item => item.slug !== slug);
    }

    saveCompareList(list);
    updateCompareCount();
}

function removeFromCompare(slug) {
    let list = getCompareList().filter(item => item.slug !== slug);
    saveCompareList(list);
    updateCompareCount();
    // Modal ichidagi checkboxlarni yangilash
    document.querySelectorAll(`.compare-checkbox input[data-slug="${slug}"]`).forEach(cb => {
        cb.checked = false;
    });
    openComparison();
}

function clearCompare() {
    saveCompareList([]);
    updateCompareCount();
    document.querySelectorAll('.compare-checkbox input').forEach(cb => cb.checked = false);
    openComparison();
}

function openComparison() {
    const list = getCompareList();
    const modal = document.getElementById('comparison-modal');
    const grid = document.getElementById('comparison-grid');
    if (!modal || !grid) return;

    if (list.length === 0) {
        grid.innerHTML = `
            <div style="text-align: center; padding: 80px 60px; color: #6b7280;">
                <i class="fas fa-balance-scale" style="font-size: 3rem; margin-bottom: 20px; display: block;"></i>
                <h3 style="margin: 0 0 10px; color: #374151;">No destinations selected</h3>
                <p style="margin: 0;">Choose destinations from the list to compare them side by side.</p>
            </div>
        `;
        modal.classList.add('active');
        return;
    }

    if (list.length === 1) {
        grid.innerHTML = `
            <div style="text-align: center; padding: 80px 60px; color: #6b7280;">
                <i class="fas fa-balance-scale" style="font-size: 3rem; margin-bottom: 20px; display: block;"></i>
                <h3 style="margin: 0 0 10px; color: #374151;">Select at least 2 destinations</h3>
                <p style="margin: 0;">You have 1 destination selected. Please select one more to start comparing.</p>
            </div>
        `;
        modal.classList.add('active');
        return;
    }

    grid.innerHTML = '<div style="text-align: center; padding: 80px 60px;"><i class="fas fa-spinner fa-spin fa-2x" style="color:#4f46e5;"></i><p style="margin-top: 15px; color: #6b7280;">Loading comparison...</p></div>';
    modal.classList.add('active');

    const lang = getCurrentLang();
    const slugs = list.map(item => item.slug).join(',');

    fetch(`/${lang}/compare-destinations/?slugs=${encodeURIComponent(slugs)}`)
        .then(res => {
            if (!res.ok) throw new Error('Server error');
            return res.json();
        })
        .then(data => renderComparison(data.destinations))
        .catch(() => {
            grid.innerHTML = '<div style="text-align: center; padding: 60px; color: #dc2626;"><i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 15px; display: block;"></i><h3 style="margin: 0 0 10px;">Error loading comparison data.</h3></div>';
        });
}

function closeComparison() {
    const modal = document.getElementById('comparison-modal');
    if (modal) modal.classList.remove('active');
}

function renderComparison(destinations) {
    const grid = document.getElementById('comparison-grid');
    if (!grid) return;

    if (!destinations || destinations.length === 0) {
        grid.innerHTML = '<div style="text-align: center; padding: 60px;"><h3>No data available</h3></div>';
        return;
    }

    const n = destinations.length;
    const gridCols = `200px repeat(${n}, 1fr)`;

    const imgUrl = (d) => d.image && d.image.length > 5 && !d.image.includes('vectorstock') ? d.image : '/static/apps/img/default.avif';

    const fmtBool = (v) => v
        ? '<span class="bool-yes"><i class="fas fa-check-circle"></i> Yes</span>'
        : '<span class="bool-no"><i class="fas fa-times-circle"></i> No</span>';

    // ===== HEADER ROW =====
    let html = `<div class="compare-header-row" style="grid-template-columns: ${gridCols};">`;
    html += `<div class="compare-header-cell label-col">Destinations</div>`;

    destinations.forEach(d => {
        const priceHtml = d.discount_percentage > 0
            ? `<span class="compare-header-original">$${d.price}</span><span class="compare-header-current">$${d.discounted_price}</span>`
            : `<span class="compare-header-current">$${d.price}</span>`;

        html += `
        <div class="compare-header-cell">
            <button class="compare-header-remove" onclick="removeFromCompare('${d.slug}')" title="Remove">&times;</button>
            <div class="compare-header-img">
                <img src="${imgUrl(d)}" alt="${d.name}" onerror="this.parentElement.innerHTML='<div class=\\'no-img\\'><i class=\\'fas fa-image\\'></i> No Image</div>'">
            </div>
            <h4 class="compare-header-name">${d.name}</h4>
            <p class="compare-header-location"><i class="fas fa-map-marker-alt"></i> ${d.location || d.city || 'N/A'}</p>
            <div class="compare-header-meta">
                <span class="compare-header-rating"><i class="fas fa-star"></i> ${d.rating || 0} <small>(${d.reviews_count || 0})</small></span>
            </div>
            <div class="compare-header-price">${priceHtml}</div>
            <a href="${d.detail_url}" class="compare-header-btn">See Details <i class="fas fa-arrow-right" style="font-size:0.7em;"></i></a>
        </div>`;
    });
    html += '</div>';

    // ===== COMPARISON BODY =====
    html += '<div class="compare-body">';

    const addRow = (icon, label, values) => {
        html += `<div class="compare-row" style="grid-template-columns: ${gridCols};">`;
        html += `<div class="compare-label"><i class="fas ${icon}"></i> ${label}</div>`;
        values.forEach(v => {
            html += `<div class="compare-value">${v}</div>`;
        });
        html += `</div>`;
    };

    const addSection = (title) => {
        html += `<div class="compare-section-row" style="grid-template-columns: ${gridCols};"><div class="compare-section-label">${title}</div></div>`;
    };

    // Basic info rows
    addRow('fa-route', 'Trip Type', destinations.map(d => d.trip_type || '-'));
    addRow('fa-clock', 'Duration', destinations.map(d => d.duration || '-'));
    addRow('fa-sun', 'Season', destinations.map(d => d.season || '-'));
    addRow('fa-box', 'Package Type', destinations.map(d => d.package_type || '-'));
    addRow('fa-hotel', 'Hotels', destinations.map(d => (d.hotels_count || 0).toString()));
    addRow('fa-plane', 'Flights', destinations.map(d => fmtBool(d.has_flights)));
    addRow('fa-undo', 'Cancellation', destinations.map(d => d.is_free_cancellation
        ? '<span class="bool-yes"><i class="fas fa-check-circle"></i> Free</span>'
        : '<span class="bool-no"><i class="fas fa-times-circle"></i> Non-refundable</span>'));
    addRow('fa-tag', 'Discount', destinations.map(d => d.discount_percentage > 0
        ? `<span style="color:#dc2626;font-weight:700;">-${d.discount_percentage}%</span>`
        : '-'));

    // Flights section
    const hasFlights = destinations.some(d => d.flights && d.flights.length > 0);
    if (hasFlights) {
        addSection('<i class="fas fa-plane"></i> Available Flights');
        addRow('fa-plane', 'Flight Options', destinations.map(d => {
            if (!d.flights || d.flights.length === 0) return '<span style="color:#9ca3af;">No flights</span>';
            return d.flights.map(f => `${f.airline_name}: <strong>$${f.price_economy}</strong>`).join('<br>');
        }));
    }

    // Hotels section
    const hasHotels = destinations.some(d => d.hotels && d.hotels.length > 0);
    if (hasHotels) {
        addSection('<i class="fas fa-hotel"></i> Available Hotels');
        addRow('fa-hotel', 'Hotel Options', destinations.map(d => {
            if (!d.hotels || d.hotels.length === 0) return '<span style="color:#9ca3af;">No hotels</span>';
            return d.hotels.map(h => `${h.name}<br><small>${h.stars}⭐ · $${h.price_per_night}/night</small>`).join('<br><br>');
        }));
    }

    // Tickets section
    const hasTickets = destinations.some(d => d.ticket_types && d.ticket_types.length > 0);
    if (hasTickets) {
        addSection('<i class="fas fa-ticket-alt"></i> Ticket Types');
        addRow('fa-ticket-alt', 'Tickets', destinations.map(d => {
            if (!d.ticket_types || d.ticket_types.length === 0) return '<span style="color:#9ca3af;">No tickets</span>';
            return d.ticket_types.map(t => {
                const label = t.age_label ? `${t.name} (${t.age_label})` : t.name;
                const price = t.is_free ? '<span class="bool-yes">Free</span>' : `<strong>$${t.price}</strong>`;
                return `${label}: ${price}`;
            }).join('<br>');
        }));
    }

    html += '</div>';
    grid.innerHTML = html;
}

function initCompareCheckboxes() {
    const list = getCompareList();
    document.querySelectorAll('.compare-checkbox input').forEach(cb => {
        cb.checked = list.some(item => item.slug === cb.dataset.slug);
    });
    updateCompareCount();
}

// DOMContentLoaded da compare checkbox holatini tiklash
document.addEventListener('DOMContentLoaded', () => {
    initCompareCheckboxes();
});

// ============================================================
// HERO SEARCH — region / country / city / destination filter
// ============================================================

let _heroTimer         = null;
let _heroResults       = [];
let _heroAbort         = null;
let _activeQuickFilter = 'all';

function _heroBox()        { return document.getElementById('hero-suggestions'); }
function _heroResults_el() { return document.getElementById('hero-ls-results'); }
function _heroFooter()     { return document.getElementById('hero-ls-footer'); }

function _positionSuggestions() {
    const wrapper = document.querySelector('.hero-search-container .search-wrapper');
    const box     = _heroBox();
    if (!wrapper || !box) return;
    const rect = wrapper.getBoundingClientRect();
    box.style.top   = (rect.bottom + 10) + 'px';
    box.style.left  = rect.left + 'px';
    box.style.width = rect.width + 'px';
}

document.addEventListener('DOMContentLoaded', () => {
    const box = _heroBox();
    if (box) document.body.appendChild(box);

    window.addEventListener('resize', () => {
        if (_heroBox()?.classList.contains('show')) _positionSuggestions();
    }, { passive: true });

    window.addEventListener('scroll', () => {
        if (_heroBox()?.classList.contains('show')) _positionSuggestions();
    }, { passive: true });

    document.addEventListener('click', (e) => {
        const input   = document.getElementById('destination-search');
        const box     = _heroBox();
        const wrapper = document.querySelector('.dest-group');
        if (!input?.contains(e.target) && !box?.contains(e.target) && !wrapper?.contains(e.target)) {
            hideSuggestions();
        }
    });
});

// ── Input handler ─────────────────────────────────────────────
function onHeroSearchInput(value) {
    clearTimeout(_heroTimer);
    if (_heroAbort) { _heroAbort.abort(); _heroAbort = null; }
    const q = value.trim();
    if (q.length < 1) { hideSuggestions(); return; }
    _heroTimer = setTimeout(() => _heroFetch(q), 250);
}

async function _heroFetch(q) {
    _heroAbort = new AbortController();
    const lang = getCurrentLang();
    try {
        const res = await fetch(
            '/' + lang + '/api/global-search/?q=' + encodeURIComponent(q),
            { signal: _heroAbort.signal }
        );
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        _heroResults = data.results || [];
        _heroRender(_heroResults, q);
    } catch (err) {
        if (err.name === 'AbortError') return;
        _heroShowError();
    } finally {
        _heroAbort = null;
    }
}

function _heroShowError() {
    const box = _heroBox(), r = _heroResults_el(), f = _heroFooter();
    if (!box) return;
    if (r) r.innerHTML =
        '<div class="ls-empty">' +
        '<i class="fas fa-wifi" style="color:#ef4444"></i>' +
        '<p>Could not load results</p>' +
        '<small>Check your connection</small>' +
        '</div>';
    if (f) f.style.display = 'none';
    _positionSuggestions();
    box.classList.add('show');
}

function _hl(text, q) {
    if (!text || !q) return text || '';
    return text.replace(
        new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'),
        '<mark class="ls-highlight">$1</mark>'
    );
}

const _ICON  = { region: 'fas fa-globe-asia', country: 'fas fa-flag', city: 'fas fa-city', destination: 'fas fa-map-marker-alt' };
const _COLOR = { region: '#10b981', country: '#3b82f6', city: '#8b5cf6', destination: 'var(--primary)' };
const _LABEL = { region: 'Regions', country: 'Countries', city: 'Cities', destination: 'Destinations' };
const _ALLOWED_TYPES = ['region', 'country', 'city', 'destination'];

function _heroRender(results, q) {
    const box = _heroBox(), resDiv = _heroResults_el(), f = _heroFooter();
    if (!box || !resDiv) return;

    const filtered = (results || []).filter(r => _ALLOWED_TYPES.includes(r.type));

    if (!filtered.length) {
        resDiv.innerHTML =
            '<div class="ls-empty">' +
            '<i class="fas fa-magnifying-glass"></i>' +
            '<p>No results for "' + q + '"</p>' +
            '<small>Try a different keyword</small>' +
            '</div>';
        if (f) f.style.display = 'none';
        _positionSuggestions();
        box.classList.add('show');
        return;
    }

    const grouped = {};
    filtered.forEach(r => { (grouped[r.type] = grouped[r.type] || []).push(r); });

    let html = '';
    _ALLOWED_TYPES.forEach(type => {
        if (!grouped[type]?.length) return;
        const icon  = _ICON[type];
        const color = _COLOR[type];
        const label = _LABEL[type];

        html += '<div class="ls-section-title">'
              + '<i class="' + icon + '" style="color:' + color + '"></i>'
              + label
              + '</div>';

        grouped[type].slice(0, 3).forEach(r => {
            const thumb = r.image
                ? '<div class="ls-thumb"><img src="' + r.image + '" alt="' + r.title + '" loading="lazy"></div>'
                : '<div class="ls-thumb-icon"><i class="' + icon + '"></i></div>';

            const locationHtml = r.subtitle
                ? '<i class="fas fa-location-dot" style="font-size:10px;color:#94a3b8"></i><span>' + r.subtitle + '</span>'
                : '';

            let subInner = locationHtml;
            let meta     = '';

            if (type === 'destination') {
                const ratingHtml = r.rating > 0
                    ? '<span class="ls-rating"><i class="fas fa-star"></i>' + r.rating + '</span>'
                    : '';
                if (ratingHtml) {
                    subInner = locationHtml
                        ? locationHtml + '<span style="color:#e2e8f0">·</span>' + ratingHtml
                        : ratingHtml;
                }
                if (r.price != null) {
                    meta = '<div class="ls-meta">'
                         +   '<div class="ls-price">$' + r.price + '</div>'
                         +   '<div class="ls-price-label">per person</div>'
                         + '</div>';
                }
            } else if (r.count != null) {
                meta = '<div class="ls-meta">'
                     +   '<div class="ls-price" style="font-size:13px">' + r.count + '</div>'
                     +   '<div class="ls-price-label">' + (r.count_label || '') + '</div>'
                     + '</div>';
            }

            const idx   = filtered.indexOf(r);
            const isNav = (type === 'destination');
            const href  = isNav ? (r.url || '#') : '#';

            html += '<a class="ls-item" href="' + href + '" data-idx="' + idx + '" data-nav="' + (isNav ? '1' : '0') + '">'
                  +   thumb
                  +   '<div class="ls-info">'
                  +     '<div class="ls-title">' + _hl(r.title, q) + '</div>'
                  +     '<div class="ls-sub">' + subInner + '</div>'
                  +   '</div>'
                  +   meta
                  + '</a>';
        });
    });

    _heroResults = filtered;

    resDiv.innerHTML = html;

    const countEl = document.getElementById('hero-ls-count');
    if (countEl) countEl.textContent = String(filtered.length);
    if (f) f.style.display = 'block';

    box.onclick = (e) => {
        const btn = e.target.closest('[data-action="search-all"]');
        if (btn) { e.preventDefault(); searchDestinations(); return; }
        const item = e.target.closest('[data-idx]');
        if (!item) return;
        if (item.dataset.nav === '0') e.preventDefault();
        _heroSelect(parseInt(item.dataset.idx));
    };

    _positionSuggestions();
    box.classList.add('show');
}

// region/country/city → drill into explore-section tabs (russian-doll style)
// destination → navigate to detail page (handled natively via href)
function _heroSelect(idx) {
    const r = _heroResults[idx];
    if (!r) return;
    document.getElementById('destination-search').value = r.title;
    hideSuggestions();

    if (r.type === 'region' && r.slug) {
        _heroDrillRegion(r.slug);
    } else if (r.type === 'country' && r.code) {
        _heroDrillCountry(r.code, r.region_slug || '');
    } else if (r.type === 'city' && r.slug) {
        _heroDrillCity(r.slug, r.title, r.country_code || '', r.region_slug || '');
    } else if (r.type === 'destination' && r.url) {
        window.location.href = r.url;
    }
}

function _heroShowExplore() {
    const exploreSection   = document.getElementById('explore-section');
    const mainDestinations = document.getElementById('main-destinations');
    if (exploreSection) exploreSection.style.display = '';
    if (mainDestinations) mainDestinations.classList.remove('visible');
    return exploreSection;
}

function _heroDrillRegion(regionSlug) {
    const exploreSection = _heroShowExplore();
    const regionBtn = document.querySelector('.region-btn[data-region="' + regionSlug + '"]');
    if (regionBtn) switchRegion(regionSlug, regionBtn);
    setTimeout(() => exploreSection?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
}

function _heroDrillCountry(countryCode, regionSlug) {
    const exploreSection = _heroShowExplore();

    if (regionSlug) {
        const regionBtn = document.querySelector('.region-btn[data-region="' + regionSlug + '"]');
        if (regionBtn && !regionBtn.classList.contains('active')) {
            switchRegion(regionSlug, regionBtn);
        }
    }

    const countryBtn = document.querySelector('.country-btn[data-country="' + countryCode + '"]');
    if (countryBtn) countryBtn.click();

    setTimeout(() => exploreSection?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

function _heroDrillCity(citySlug, cityName, countryCode, regionSlug) {
    // Activate region & country tabs so the user sees the full breadcrumb,
    // then filter the destinations grid by the chosen city.
    if (regionSlug) {
        const regionBtn = document.querySelector('.region-btn[data-region="' + regionSlug + '"]');
        if (regionBtn && !regionBtn.classList.contains('active')) {
            switchRegion(regionSlug, regionBtn);
        }
    }
    if (countryCode) {
        const countryBtn = document.querySelector('.country-btn[data-country="' + countryCode + '"]');
        if (countryBtn && !countryBtn.classList.contains('active')) {
            countryBtn.click();
        }
    }
    filterByCity(citySlug, cityName);
}

function hideSuggestions() {
    const box = _heroBox();
    if (box) { box.classList.remove('show'); box.onclick = null; }
}

// ── Search button ─────────────────────────────────────────────
function searchDestinations() {
    const q = (document.getElementById('destination-search')?.value || '').trim();
    hideSuggestions();
    if (!q) return;
    window.location.href = '/' + getCurrentLang() + '/destinations/?q=' + encodeURIComponent(q);
}

// ── Quick filters ─────────────────────────────────────────────
function onQuickFilter(filter, btn) {
    document.querySelectorAll('.quick-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _activeQuickFilter = filter;

    const exploreSection   = document.getElementById('explore-section');
    const mainDestinations = document.getElementById('main-destinations');

    if (filter === 'all') {
        if (exploreSection)   exploreSection.style.display = '';
        if (mainDestinations) mainDestinations.classList.remove('visible');
        return;
    }

    if (exploreSection)   exploreSection.style.display = 'none';
    if (mainDestinations) mainDestinations.classList.add('visible');

    document.querySelectorAll('input[name="type"]').forEach(cb => { cb.checked = false; });
    if (filter !== 'popular') {
        const cb = document.querySelector('input[name="type"][value="' + filter + '"]');
        if (cb) cb.checked = true;
    }

    applyFilters();
    mainDestinations?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

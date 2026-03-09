document.addEventListener('DOMContentLoaded', () => {
    // Images load animation
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('load', () => img.classList.add('loaded'));
    });

    // Cities panel — load more button
    const firstPanel = document.querySelector('.cities-panel.active');
    if (firstPanel) {
        const total = parseInt(firstPanel.dataset.total || 0);
        const shown = firstPanel.querySelectorAll('.city-card').length;
        const loadMoreBtn = document.getElementById('cities-load-more-btn');
        const showingText = document.getElementById('cities-showing-text');
        const regionSlug = firstPanel.id.replace('panel-', '');

        showingText.textContent = `Showing ${shown} of ${total} cities`;

        if (total > 8) {
            loadMoreBtn.style.display = '';
            loadMoreBtn.dataset.region = regionSlug;
            loadMoreBtn.dataset.offset = 8;
        }
    }

    // Refresh da city state tiklash
    const params = new URLSearchParams(window.location.search);
    const citySlug = params.get('city');
    const cityName = params.get('city_name');
    if (citySlug && cityName) {
        filterByCity(citySlug, cityName);
    }
});

/* ---- Region tab almashtirish ---- */
function switchRegion(region, btn) {
    document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.cities-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('panel-' + region);
    if (panel) panel.classList.add('active');

    const loadMoreBtn = document.getElementById('cities-load-more-btn');
    const showingText = document.getElementById('cities-showing-text');

    // Allaqachon yuklangan bo'lsa — faqat showing text va load more yangilansin
    if (panel.dataset.loaded === 'true') {
        const total = parseInt(panel.dataset.total || 0);
        const shown = panel.querySelectorAll('.city-card').length;

        showingText.textContent = `Showing ${shown} of ${total} cities`;

        if (shown < total) {
            loadMoreBtn.style.display = '';
            loadMoreBtn.dataset.region = region;
            loadMoreBtn.dataset.offset = shown;
        } else {
            loadMoreBtn.style.display = 'none';
        }
        return;
    }

    // Yangi region — AJAX bilan yuklash
    const grid = panel.querySelector('.cities-grid');
    grid.innerHTML = '<div style="text-align:center;padding:40px"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
    const lang = document.documentElement.lang || 'en';

    fetch(`/${lang}/destinations/cities/${region}/`)
        .then(res => res.json())
        .then(data => {
            grid.innerHTML = '';
            data.cities.forEach(city => {
                grid.innerHTML += `
                    <div class="city-card" onclick="filterByCity('${city.name}')">
                        <img src="${city.image_url}" alt="${city.name}" loading="lazy">
                        <div class="city-card-overlay"></div>
                        <div class="city-card-info">
                            <div class="city-card-name">${city.name}</div>
                            <div class="city-card-things">${city.things_to_do} things to do</div>
                        </div>
                    </div>`;
            });

            if (data.has_more) {
                loadMoreBtn.style.display = '';
                loadMoreBtn.dataset.region = region;
                loadMoreBtn.dataset.offset = 8;
                showingText.textContent = `Showing 8 of ${data.total} cities`;
            } else {
                loadMoreBtn.style.display = 'none';
                showingText.textContent = `Showing ${data.cities.length} of ${data.total} cities`;
            }

            panel.dataset.loaded = 'true';
        })
        .catch(() => {
            grid.innerHTML = '<p>Xatolik yuz berdi</p>';
        });
}

function loadMoreCities() {
    const btn = document.getElementById('cities-load-more-btn');
    const showingText = document.getElementById('cities-showing-text');
    const region = btn.dataset.region;
    const offset = parseInt(btn.dataset.offset);
    const lang = document.documentElement.lang || 'en';

    const panel = document.getElementById('panel-' + region);
    const grid = panel.querySelector('.cities-grid');
    const total = parseInt(panel.dataset.total || 0);

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    btn.disabled = true;

    fetch(`/${lang}/destinations/cities/${region}/?offset=${offset}`)
        .then(res => res.json())
        .then(data => {
            data.cities.forEach(city => {
                grid.innerHTML += `
                    <div class="city-card" onclick="filterByCity('${city.name}')">
                        <img src="${city.image_url}" alt="${city.name}" loading="lazy">
                        <div class="city-card-overlay"></div>
                        <div class="city-card-info">
                            <div class="city-card-name">${city.name}</div>
                            <div class="city-card-things">${city.things_to_do} things to do</div>
                        </div>
                    </div>`;
            });

            const newOffset = offset + data.cities.length;
            btn.dataset.offset = newOffset;
            showingText.textContent = `Showing ${newOffset} of ${total} cities`;

            if (!data.has_more) {
                btn.style.display = 'none';
            } else {
                btn.innerHTML = '<i class="fas fa-plus-circle"></i> Load More Cities';
                btn.disabled = false;
            }
        })
        .catch(() => {
            btn.innerHTML = '<i class="fas fa-plus-circle"></i> Load More Cities';
            btn.disabled = false;
        });
}

function loadMoreDestinations() {
    const btn = document.getElementById('load-more-btn');
    const showingText = document.getElementById('showing-text');
    const offset = parseInt(btn.dataset.offset);
    const total = parseInt(btn.dataset.total);
    const lang = document.documentElement.lang || 'en';

    const grid = document.getElementById('destinations-grid');

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    btn.disabled = true;

    fetch(`/${lang}/destinations/?offset=${offset}`)
        .then(res => res.json())
        .then(data => {
            data.destinations.forEach(dest => {
                grid.innerHTML += `
                    <div class="destination-card">
                        <img src="${dest.image_url}" alt="${dest.name}" loading="lazy">
                        <div class="destination-card-info">
                            <div class="destination-card-name">${dest.name}</div>
                        </div>
                    </div>`;
            });

            const newOffset = offset + data.destinations.length;
            btn.dataset.offset = newOffset;
            showingText.textContent = `Showing ${newOffset} of ${total} destinations`;

            if (!data.has_more) {
                btn.style.display = 'none';
            } else {
                btn.innerHTML = '<i class="fas fa-plus-circle"></i> Load More Destinations';
                btn.disabled = false;
            }
        })
        .catch(() => {
            btn.innerHTML = '<i class="fas fa-plus-circle"></i> Load More Destinations';
            btn.disabled = false;
        });
}


/* ---- City card bosilganda ---- */
// function filterByCity(cityName) {
//     const exploreSection = document.getElementById('explore-section');
//     const mainDestinations = document.getElementById('main-destinations');
//     const grid = document.getElementById('destinations-grid');
//     const allCards = grid.querySelectorAll('.destination-card');
//
//     // explore section yashiriladi
//     exploreSection.style.display = 'none';
//
//     // main destinations ko'rsatiladi
//     mainDestinations.classList.add('visible');
//
//     // Badge yangilanadi
//     document.getElementById('active-city-name').textContent = cityName;
//
//     let found = false;
//
//     allCards.forEach(card => {
//         const cardCity = card.getAttribute('data-city');
//         if (cardCity && cardCity.toLowerCase() === cityName.toLowerCase()) {
//             card.style.display = '';
//             found = true;
//         } else {
//             card.style.display = 'none';
//         }
//     });
//
//     if (found) {
//         document.getElementById('results-count').textContent = '1';
//         document.getElementById('results-subtitle').textContent = 'Showing results for: ' + cityName;
//         document.getElementById('load-more-btn').style.display = 'none';
//         document.getElementById('showing-text').textContent = 'Showing 1 destination for ' + cityName;
//     } else {
//         // Bu city bizning cardlarda yo'q — barcha cardlarni ko'rsat
//         let shown = 0;
//         allCards.forEach(card => {
//             if (shown < 6) {
//                 card.style.display = '';
//                 shown++;
//             } else {
//                 card.style.display = 'none';
//                 card.classList.add('hidden-card');
//             }
//         });
//         document.getElementById('results-count').textContent = '156';
//         document.getElementById('results-subtitle').textContent = 'No exact match for "' + cityName + '" — showing all';
//         document.getElementById('load-more-btn').style.display = '';
//         document.getElementById('showing-text').textContent = 'Showing 6 of 156 destinations';
//     }
//
//     // Smooth scroll — destinations qismiga
//     mainDestinations.scrollIntoView({behavior: 'smooth', block: 'start'});
// }

function filterByCity(citySlug, cityName) {
    const exploreSection = document.getElementById('explore-section');
    const mainDestinations = document.getElementById('main-destinations');
    const grid = document.getElementById('destinations-grid');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const showingText = document.getElementById('showing-text');

    exploreSection.style.display = 'none';
    mainDestinations.classList.add('visible');
    document.getElementById('active-city-name').textContent = cityName;

    // URL ga saqlash — refresh uchun
    const url = new URL(window.location);
    url.searchParams.set('city', citySlug);
    url.searchParams.set('city_name', cityName);
    window.history.pushState({}, '', url);

    fetch(`/destinations/by-city/?city=${citySlug}&offset=0`)
        .then(res => res.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const meta = doc.getElementById('cards-meta');
            const total = parseInt(meta?.dataset.total || 0);
            const shown = parseInt(meta?.dataset.shown || 0);
            const hasMore = meta?.dataset.hasMore === 'true';

            // Faqat cardlarni olish — meta div siz
            grid.innerHTML = '';
            doc.querySelectorAll('.destination-card').forEach(card => {
                grid.appendChild(document.importNode(card, true));
            });

            document.getElementById('results-count').textContent = total;
            document.getElementById('results-subtitle').textContent = 'Showing results for: ' + cityName;
            showingText.textContent = `Showing ${shown} of ${total} destinations`;

            // Load more button
            loadMoreBtn.dataset.offset = shown;
            loadMoreBtn.dataset.total = total;

            if (hasMore) {
                loadMoreBtn.style.display = '';
                loadMoreBtn.onclick = () => loadMoreByCity(citySlug);
            } else {
                loadMoreBtn.style.display = 'none';
            }
        });

    mainDestinations.scrollIntoView({behavior: 'smooth', block: 'start'});
}

function loadMoreByCity(citySlug) {
    const btn = document.getElementById('load-more-btn');
    const showingText = document.getElementById('showing-text');
    const grid = document.getElementById('destinations-grid');
    const offset = parseInt(btn.dataset.offset);
    const total = parseInt(btn.dataset.total);

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    btn.disabled = true;

    fetch(`/destinations/by-city/?city=${citySlug}&offset=${offset}`)
        .then(res => res.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const meta = doc.getElementById('cards-meta');
            const shown = parseInt(meta?.dataset.shown || 0);
            const hasMore = meta?.dataset.hasMore === 'true';

            // Yangi cardlarni qo'shish
            doc.querySelectorAll('.destination-card').forEach(card => {
                grid.appendChild(document.importNode(card, true));
            });

            btn.dataset.offset = shown;
            showingText.textContent = `Showing ${shown} of ${total} destinations`;

            if (hasMore) {
                btn.innerHTML = '<i class="fas fa-plus-circle"></i> Load More Destinations';
                btn.disabled = false;
            } else {
                btn.style.display = 'none';
            }
        });
}

/* ---- "Back to Explore" tugmasi ---- */
function backToExplore() {
    const exploreSection = document.getElementById('explore-section');
    const mainDestinations = document.getElementById('main-destinations');
    const grid = document.getElementById('destinations-grid');
    const allCards = grid.querySelectorAll('.destination-card');
    const url = new URL(window.location);
    url.searchParams.delete('city');
    url.searchParams.delete('city_name');
    window.history.pushState({}, '', url);

    // main destinations yashiriladi
    mainDestinations.classList.remove('visible');

    // explore section qaytadi
    exploreSection.style.display = '';

    // Barcha cardlarni qaytarish
    let shown = 0;
    allCards.forEach(card => {
        if (shown < 6) {
            card.style.display = '';
            card.classList.remove('hidden-card');
            shown++;
        } else {
            card.style.display = 'none';
            card.classList.add('hidden-card');
        }
    });

    // document.getElementById('results-count').textContent = '156';
    // document.getElementById('results-subtitle').textContent = 'Based on your preferences';
    // document.getElementById('load-more-btn').style.display = '';
    // document.getElementById('showing-text').textContent = 'Showing 6 of 156 destinations';

    // Explore section ga scroll
    exploreSection.scrollIntoView({behavior: 'smooth', block: 'start'});
}


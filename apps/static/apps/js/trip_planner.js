/* ── State ────────────────────────────────────────────────────────────────── */
const state = {
    plans: [],          // full plan objects from server
    activePlanId: null,
    wishlist: [],       // all wishlist destinations
    maxDay: 1,          // highest day number in active plan
};

/* ── Boot ─────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    try {
        const plansEl  = document.getElementById('plans-data');
        const wishEl   = document.getElementById('wishlist-data');
        if (plansEl)  state.plans   = JSON.parse(plansEl.textContent || '[]');
        if (wishEl)   state.wishlist = JSON.parse(wishEl.textContent || '[]');
    } catch(e) {
        console.error('Trip planner data parse error:', e);
    }

    renderPlanList();
    if (state.plans.length) selectPlan(state.plans[0].id);
});

/* ── CSRF ─────────────────────────────────────────────────────────────────── */
function csrf() {
    return document.cookie.split(';')
        .find(c => c.trim().startsWith('csrftoken='))?.split('=')?.[1] || '';
}

const _LANG = '/' + window.location.pathname.split('/').filter(Boolean)[0] + '/';
const U = window.TRIP_URLS || {
    create: _LANG + 'api/trip-plan/create/',
    delete: id => _LANG + `api/trip-plan/${id}/delete/`,
    add:    id => _LANG + `api/trip-plan/${id}/add/`,
    remove: id => _LANG + `api/trip-plan/${id}/remove/`,
    update: id => _LANG + `api/trip-plan/${id}/update/`,
};

async function api(url, body) {
    const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf() },
        body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

/* ── Toast ────────────────────────────────────────────────────────────────── */
function toast(title, msg, type = 'success') {
    let box = document.getElementById('tp-toast-container');
    if (!box) {
        box = document.createElement('div');
        box.id = 'tp-toast-container';
        document.body.appendChild(box);
    }
    const el = document.createElement('div');
    el.className = `tp-toast ${type}`;
    el.innerHTML = `<div><strong>${title}</strong><span>${msg}</span></div>`;
    box.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

/* ── Plan list ────────────────────────────────────────────────────────────── */
function renderPlanList() {
    const list  = document.getElementById('plan-list');
    const empty = document.getElementById('plans-empty');
    const badge = document.getElementById('plan-count');

    if (badge) badge.textContent = state.plans.length;

    if (!state.plans.length) {
        if (list)  list.innerHTML  = '';
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';

    list.innerHTML = state.plans.map(p => {
        const days  = p.items.length ? Math.max(...p.items.map(i => i.day_number)) : 0;
        const total = p.items.reduce((s, i) => s + i.price, 0);
        const active = p.id === state.activePlanId ? 'active' : '';
        return `
        <div class="plan-card ${active}" onclick="selectPlan(${p.id})" id="pc-${p.id}">
            <div class="plan-card-name">${esc(p.name)}</div>
            <div class="plan-card-meta">
                <span><i class="fas fa-calendar"></i> ${days} kun</span>
                <span><i class="fas fa-map-pin"></i> ${p.items.length} joy</span>
                <span><i class="fas fa-dollar-sign"></i> ${total.toLocaleString()}</span>
            </div>
            <button class="plan-delete-btn" onclick="deletePlan(event, ${p.id})" title="O'chirish">
                <i class="fas fa-trash"></i>
            </button>
        </div>`;
    }).join('');
}

/* ── Select plan ──────────────────────────────────────────────────────────── */
function selectPlan(id) {
    state.activePlanId = id;
    document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('active'));
    const card = document.getElementById(`pc-${id}`);
    if (card) card.classList.add('active');
    renderItinerary();
}

function activePlan() {
    return state.plans.find(p => p.id === state.activePlanId) || null;
}

/* ── Itinerary ────────────────────────────────────────────────────────────── */
function renderItinerary() {
    const panel   = document.getElementById('itinerary-panel');
    const empty   = document.getElementById('itinerary-empty');
    const content = document.getElementById('itinerary-content');
    const plan    = activePlan();

    if (!plan) {
        if (empty)   empty.style.display   = 'flex';
        if (content) content.style.display = 'none';
        return;
    }
    if (empty)   empty.style.display   = 'none';
    if (content) content.style.display = 'block';

    const days  = plan.items.length ? Math.max(...plan.items.map(i => i.day_number)) : 0;
    const total = plan.items.reduce((s, i) => s + i.price, 0);
    const avg   = plan.items.length ? Math.round(total / plan.items.length) : 0;
    state.maxDay = Math.max(days, 1);

    // Header stats
    document.getElementById('i-plan-name').textContent   = plan.name;
    document.getElementById('i-plan-desc').textContent   = plan.description || (plan.start_date ? `Boshlanish: ${plan.start_date}` : '');
    document.getElementById('i-stat-days').textContent   = state.maxDay;
    document.getElementById('i-stat-dests').textContent  = plan.items.length;
    document.getElementById('i-stat-cost').textContent   = '$' + total.toLocaleString();
    document.getElementById('i-stat-avg').textContent    = '$' + avg.toLocaleString();

    // Quick-add bar
    renderQuickAdd(plan);

    // Days
    renderDays(plan);
}

function renderQuickAdd(plan) {
    const bar = document.getElementById('quick-add-scroll');
    if (!bar) return;
    const inPlanSlugs = new Set(plan.items.map(i => i.slug));

    if (!state.wishlist.length) {
        bar.innerHTML = `<span class="quick-add-empty"><i class="fas fa-heart-broken"></i> Wishlistingiz bo'sh. <a href="/wishlist/">Qo'shing</a>.</span>`;
        return;
    }

    bar.innerHTML = state.wishlist.map(d => {
        const inPlan = inPlanSlugs.has(d.slug);
        const imgTag = d.image
            ? `<img src="${d.image}" alt="${esc(d.name)}">`
            : `<span style="width:26px;height:26px;border-radius:50%;background:#667eea;display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;flex-shrink:0;">✈</span>`;
        const shortName = d.name.length > 16 ? d.name.slice(0, 14) + '…' : d.name;
        return `
        <div class="quick-add-chip ${inPlan ? 'in-plan' : ''}"
             onclick="${inPlan ? '' : `quickAdd('${d.slug}')`}"
             title="${esc(d.name)} — $${d.price}">
            ${imgTag}
            <span>${esc(shortName)}</span>
            ${inPlan
                ? '<i class="fas fa-check" style="font-size:10px;color:#22c55e;"></i>'
                : '<i class="fas fa-plus" style="font-size:10px;color:#667eea;"></i>'}
        </div>`;
    }).join('') + '<span style="min-width:32px;flex-shrink:0;display:inline-block;"></span>';
}

function renderDays(plan) {
    const container = document.getElementById('days-container');
    if (!container) return;

    const grouped = {};
    for (let d = 1; d <= state.maxDay; d++) grouped[d] = [];
    plan.items.forEach(item => {
        if (!grouped[item.day_number]) grouped[item.day_number] = [];
        grouped[item.day_number].push(item);
    });

    let html = '';
    for (let d = 1; d <= state.maxDay; d++) {
        const items = grouped[d] || [];
        const dateLabel = plan.start_date ? formatDayDate(plan.start_date, d) : '';

        html += `
        <div class="day-section" id="day-section-${d}">
            <div class="day-header">
                <span class="day-label"><i class="fas fa-calendar-day"></i> ${d}-kun</span>
                ${dateLabel ? `<span class="day-date">${dateLabel}</span>` : ''}
                <div class="day-line"></div>
            </div>
            <div class="day-dests" id="day-dests-${d}">
                ${items.length
                    ? items.map(item => renderItinCard(item)).join('')
                    : `<div class="day-empty-msg"><i class="fas fa-plus-circle"></i> Bu kunga joy qo'shing</div>`
                }
            </div>
        </div>`;
    }

    html += `<button class="add-day-btn" onclick="addDay()">
        <i class="fas fa-plus"></i> Yangi kun qo'shish
    </button>`;

    container.innerHTML = html;
}

function renderItinCard(item) {
    const imgTag = item.image
        ? `<img class="itin-thumb" src="${item.image}" alt="${esc(item.name)}">`
        : `<div class="itin-thumb-ph">🌍</div>`;

    const dayOptions = Array.from({ length: state.maxDay }, (_, i) => i + 1)
        .map(d => `<option value="${d}" ${d === item.day_number ? 'selected' : ''}>${d}-kun</option>`)
        .join('');

    return `
    <div class="itin-card" id="icard-${item.slug}">
        <a href="${item.url}" target="_blank" style="display:contents;">${imgTag}</a>
        <div class="itin-info">
            <div class="itin-name" title="${esc(item.name)}">${esc(item.name)}</div>
            ${item.location ? `<div class="itin-loc"><i class="fas fa-map-marker-alt"></i> ${esc(item.location)}</div>` : ''}
            <div class="itin-price">$${item.price.toLocaleString()}</div>
            <input class="itin-note-input" type="text"
                placeholder="Eslatma qo'shing..."
                value="${esc(item.note || '')}"
                onblur="saveNote('${item.slug}', this.value)">
        </div>
        <div class="itin-actions">
            <select class="day-select" title="Kunni o'zgartiring"
                    onchange="moveDay('${item.slug}', this.value)">
                ${dayOptions}
            </select>
            <button class="itin-remove-btn" onclick="removeItem('${item.slug}')" title="O'chirish">
                <i class="fas fa-times"></i>
            </button>
        </div>
    </div>`;
}

/* ── Quick Add ────────────────────────────────────────────────────────────── */
function quickAdd(slug) {
    const plan = activePlan();
    if (!plan) { toast('Plan yo\'q', 'Avval plan tanlang yoki yarating.', 'info'); return; }
    addItemToPlan(plan.id, slug, state.maxDay);
}

/* ── Add Day ──────────────────────────────────────────────────────────────── */
function addDay() {
    state.maxDay += 1;
    const plan = activePlan();
    if (plan) renderDays(plan);
}

/* ── Move destination to another day ─────────────────────────────────────── */
function moveDay(slug, newDay) {
    const plan = activePlan();
    if (!plan) return;
    const item = plan.items.find(i => i.slug === slug);
    if (!item) return;
    const prev = item.day_number;
    item.day_number = parseInt(newDay);
    state.maxDay = Math.max(state.maxDay, item.day_number);

    api(U.update(plan.id), { slug, day_number: item.day_number })
        .then(() => renderDays(plan))
        .catch(() => {
            item.day_number = prev;
            toast('Xatolik', 'Kun o\'zgartirilmadi.', 'error');
        });
}

/* ── Save note ────────────────────────────────────────────────────────────── */
function saveNote(slug, note) {
    const plan = activePlan();
    if (!plan) return;
    const item = plan.items.find(i => i.slug === slug);
    if (!item || item.note === note) return;
    item.note = note;
    api(U.update(plan.id), { slug, note }).catch(() => {});
}

/* ── Remove item ──────────────────────────────────────────────────────────── */
function removeItem(slug) {
    const plan = activePlan();
    if (!plan) return;
    api(U.remove(plan.id), { slug })
        .then(() => {
            plan.items = plan.items.filter(i => i.slug !== slug);
            state.maxDay = plan.items.length ? Math.max(...plan.items.map(i => i.day_number)) : 1;
            renderPlanList();
            renderItinerary();
            toast('O\'chirildi', 'Destinatsiya rejadan chiqarildi.', 'info');
        })
        .catch(() => toast('Xatolik', 'O\'chirib bo\'lmadi.', 'error'));
}

/* ── Add destination to plan ──────────────────────────────────────────────── */
function addItemToPlan(planId, slug, dayNum) {
    api(U.add(planId), { slug, day_number: dayNum })
        .then(data => {
            const plan = state.plans.find(p => p.id === planId);
            if (!plan) return;
            const existing = plan.items.find(i => i.slug === slug);
            if (existing) {
                existing.day_number = data.day_number;
            } else {
                plan.items.push(data);
            }
            state.maxDay = Math.max(...plan.items.map(i => i.day_number));
            renderPlanList();
            renderItinerary();
            toast('Qo\'shildi', `${data.name} ${data.day_number}-kunga qo'shildi.`, 'success');
        })
        .catch(() => toast('Xatolik', 'Qo\'shibbo\'lmadi.', 'error'));
}

/* ── Create plan modal ────────────────────────────────────────────────────── */
function openCreateModal() {
    document.getElementById('modal-overlay').classList.add('open');
    document.getElementById('plan-name-input').focus();
}
function closeCreateModal() {
    document.getElementById('modal-overlay').classList.remove('open');
    document.getElementById('plan-name-input').value = '';
    document.getElementById('plan-desc-input').value = '';
    document.getElementById('plan-date-input').value = '';
}
function submitCreatePlan() {
    const name = document.getElementById('plan-name-input').value.trim();
    if (!name) { toast('Ism kerak', 'Plan nomini kiriting.', 'info'); return; }
    const desc      = document.getElementById('plan-desc-input').value.trim();
    const startDate = document.getElementById('plan-date-input').value || null;

    api(U.create, { name, description: desc, start_date: startDate })
        .then(data => {
            state.plans.unshift(data);
            closeCreateModal();
            renderPlanList();
            selectPlan(data.id);
            toast('Yaratildi!', `"${data.name}" rejasi tayyor.`, 'success');
        })
        .catch(() => toast('Xatolik', 'Plan yaratilmadi.', 'error'));
}

/* ── Delete plan ──────────────────────────────────────────────────────────── */
function deletePlan(e, id) {
    e.stopPropagation();
    if (!confirm('Bu rejani o\'chirishni tasdiqlaysizmi?')) return;
    api(U.delete(id), {})
        .then(() => {
            state.plans = state.plans.filter(p => p.id !== id);
            if (state.activePlanId === id) {
                state.activePlanId = state.plans.length ? state.plans[0].id : null;
            }
            renderPlanList();
            renderItinerary();
            toast('O\'chirildi', 'Reja o\'chirildi.', 'info');
        })
        .catch(() => toast('Xatolik', 'O\'chirib bo\'lmadi.', 'error'));
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDayDate(startDate, dayNum) {
    try {
        const d = new Date(startDate);
        d.setDate(d.getDate() + dayNum - 1);
        return d.toLocaleDateString('uz-UZ', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch { return ''; }
}

/* ── Enter key on modal ───────────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeCreateModal();
});
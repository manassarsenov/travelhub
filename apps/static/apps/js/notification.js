/**
 * TravelHub — Notification Page JS
 * Funksiyalar: tab filter, category filter, mark as read, delete, search, settings
 */

// ─── CSRF Token ────────────────────────────────────────────────────────────
function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content
        || document.cookie.match(/csrftoken=([^;]+)/)?.[1] || '';
}

function apiFetch(url, method = 'POST', body = null) {
    return fetch(url, {
        method,
        headers: {
            'X-CSRFToken': getCsrfToken(),
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : null,
    }).then(r => r.json());
}

// ─── State ──────────────────────────────────────────────────────────────────
let activeTime = 'all';        // all | today | yesterday | this_week | this_month | this_year
let activeTab = 'all';         // all | unread | read
let activeCategory = 'all';    // all | bookings | promotions | security | messages | updates
let activePriority = null;     // null | high | medium | low

// ─── TAB Switching ──────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTab = btn.dataset.tab;
        applyFilters();
    });
});

// ─── TIME PERIOD Filter ───────────────────────────────────────────────────────
document.querySelectorAll('.filter-item[data-time]').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.filter-item[data-time]').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        activeTime = item.dataset.time;
        applyFilters();
    });
});

// ─── CATEGORY Filter ────────────────────────────────────────────────────────
document.querySelectorAll('.filter-item[data-category]').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.filter-item[data-category]').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        activeCategory = item.dataset.category;
        applyFilters();
    });
});

// ─── PRIORITY Filter ────────────────────────────────────────────────────────
document.querySelectorAll('.filter-item[data-priority]').forEach(item => {
    item.addEventListener('click', () => {
        const samePriority = activePriority === item.dataset.priority;
        document.querySelectorAll('.filter-item[data-priority]').forEach(i => i.classList.remove('active'));
        if (!samePriority) {
            item.classList.add('active');
            activePriority = item.dataset.priority;
        } else {
            activePriority = null;
        }
        applyFilters();
    });
});

// ─── SEARCH ─────────────────────────────────────────────────────────────────
document.getElementById('notification-search')?.addEventListener('input', function () {
    applyFilters();
});

// ─── APPLY FILTERS (client-side) ────────────────────────────────────────────
function applyFilters() {
    const searchVal = (document.getElementById('notification-search')?.value || '').toLowerCase();
    let anyVisible = false;

    document.querySelectorAll('.notification-card').forEach(card => {
        const isRead    = card.dataset.read === 'true';
        const category  = card.dataset.category;
        const priority  = card.dataset.priority;
        const text      = card.textContent.toLowerCase();

        const groupKey  = card.closest('.notification-group')?.dataset.group;

        // Tab filter
        let tabOk = true;
        if (activeTab === 'unread') tabOk = !isRead;
        if (activeTab === 'read')   tabOk = isRead;

        // Time filter
        let timeOk = true;
        if (activeTime !== 'all') {
            const timeHierarchy = {
                'today': ['today'],
                'yesterday': ['yesterday'],
                'this_week': ['today', 'yesterday', 'this_week'],
                'this_month': ['today', 'yesterday', 'this_week', 'this_month'],
                'this_year': ['today', 'yesterday', 'this_week', 'this_month', 'this_year']
            };
            timeOk = timeHierarchy[activeTime] ? timeHierarchy[activeTime].includes(groupKey) : false;
        }

        // Category filter
        const catOk = activeCategory === 'all' || category === activeCategory;

        // Priority filter
        const prioOk = !activePriority || priority === activePriority;

        // Search filter
        // Qidiruvda sarlavha, kategoriya, va guruh nomi bo'yicha ham izlaymiz
        const searchOk = !searchVal || text.includes(searchVal) || (category && category.includes(searchVal));

        const show = tabOk && timeOk && catOk && prioOk && searchOk;
        card.style.display = show ? '' : 'none';
        if (show) anyVisible = true;
    });

    // Group title ko'rsatish/yashirish
    document.querySelectorAll('.notification-group').forEach(group => {
        const hasVisible = [...group.querySelectorAll('.notification-card')]
            .some(c => c.style.display !== 'none');
        group.style.display = hasVisible ? '' : 'none';
    });

    // Empty state
    const emptyState = document.querySelector('.empty-state');
    if (emptyState) emptyState.style.display = anyVisible ? 'none' : '';
}

// ─── TOGGLE CARD MENU ────────────────────────────────────────────────────────
function toggleCardMenu(id) {
    const menu = document.getElementById(`menu-${id}`);
    if (!menu) return;
    const isOpen = menu.classList.contains('active');
    // Barcha ochiq menularni yopamiz
    document.querySelectorAll('.action-menu.active').forEach(m => m.classList.remove('active'));
    if (!isOpen) menu.classList.add('active');
}

// Tashqi click da menyuni yopish
document.addEventListener('click', (e) => {
    if (!e.target.closest('.btn-action') && !e.target.closest('.action-menu')) {
        document.querySelectorAll('.action-menu.active').forEach(m => m.classList.remove('active'));
    }
});

// ─── MARK AS READ ────────────────────────────────────────────────────────────
function markAsRead(id) {
    const card = document.querySelector(`.notification-card[data-id="${id}"]`);
    if (!card || card.dataset.read === 'true') return;

    apiFetch(`/api/notifications/${id}/read/`).then(data => {
        if (data.success) {
            // UI yangilash
            card.classList.remove('unread');
            card.classList.add('read');
            card.dataset.read = 'true';
            card.querySelector('.card-indicator')?.remove();

            // "Mark as read" tugmasini menuda o'chirish
            const readBtn = document.querySelector(`#menu-${id} button[onclick*="markAsRead"]`);
            readBtn?.remove();

            // Count yangilash
            updateCounts(-1, 0);
        }
    }).catch(console.error);
}

// ─── MARK ALL READ ───────────────────────────────────────────────────────────
document.getElementById('btn-mark-all-read')?.addEventListener('click', () => {
    apiFetch('/api/notifications/read-all/').then(data => {
        if (data.success) {
            document.querySelectorAll('.notification-card.unread').forEach(card => {
                card.classList.remove('unread');
                card.classList.add('read');
                card.dataset.read = 'true';
                card.querySelector('.card-indicator')?.remove();
            });
            // Barcha countlarni 0 qilamiz
            document.getElementById('count-unread').textContent = '0';
            showToast('success', 'Done!', 'All notifications marked as read.');
        }
    }).catch(console.error);
});

// ─── DELETE NOTIFICATION ─────────────────────────────────────────────────────
function deleteNotification(id) {
    const card = document.querySelector(`.notification-card[data-id="${id}"]`);
    if (!card) return;

    apiFetch(`/api/notifications/${id}/delete/`).then(data => {
        if (data.success) {
            const wasUnread = card.dataset.read === 'false';

            card.style.transition = 'all 0.35s ease';
            card.style.opacity = '0';
            card.style.transform = 'translateX(30px)';

            setTimeout(() => {
                const group = card.closest('.notification-group');
                card.remove();

                // Guruh bo'sh qolsa yashiramiz
                const remaining = group?.querySelectorAll('.notification-card');
                if (remaining && remaining.length === 0) group.remove();

                // Countlarni kamaytiramiz
                updateCounts(wasUnread ? -1 : 0, -1);
            }, 350);
        }
    }).catch(console.error);
}

// ─── COUNT HELPER ────────────────────────────────────────────────────────────
function updateCounts(unreadDelta, totalDelta) {
    const unreadEl = document.getElementById('count-unread');
    const totalEl  = document.getElementById('count-all');
    const readEl   = document.getElementById('count-read');

    const unread = Math.max(0, parseInt(unreadEl?.textContent || 0) + unreadDelta);
    const total  = Math.max(0, parseInt(totalEl?.textContent  || 0) + totalDelta);
    const read   = Math.max(0, total - unread);

    if (unreadEl) unreadEl.textContent = unread;
    if (totalEl)  totalEl.textContent  = total;
    if (readEl)   readEl.textContent   = read;

    // Navbar badge yangilash
    const navBadge = document.getElementById('notification-count');
    if (navBadge) navBadge.textContent = unread > 0 ? unread : '0';
}

// ─── SETTINGS MODAL ──────────────────────────────────────────────────────────
const settingsModal = document.getElementById('notification-settings-modal');

document.getElementById('btn-open-settings')?.addEventListener('click', () => {
    settingsModal?.classList.add('active');
});

document.getElementById('btn-close-settings')?.addEventListener('click', () => {
    settingsModal?.classList.remove('active');
});

document.getElementById('btn-cancel-settings')?.addEventListener('click', () => {
    settingsModal?.classList.remove('active');
});

settingsModal?.addEventListener('click', (e) => {
    if (e.target === settingsModal) settingsModal.classList.remove('active');
});

document.getElementById('btn-save-settings')?.addEventListener('click', () => {
    const body = {
        enable_email:  document.getElementById('setting-email')?.checked ?? true,
        enable_push:   document.getElementById('setting-push')?.checked  ?? true,
        enable_in_app: document.getElementById('setting-inapp')?.checked ?? true,
    };

    apiFetch('/api/notifications/settings/', 'POST', body).then(data => {
        if (data.success) {
            settingsModal?.classList.remove('active');
            showToast('success', 'Saved!', 'Notification settings updated.');
        } else {
            showToast('error', 'Error', data.message || 'Could not save settings.');
        }
    }).catch(() => showToast('error', 'Error', 'Network error.'));
});

// ─── TOAST HELPER (main_base.js dagi mavjud toast ishlatiladi) ──────────────
function showToast(type, title, message) {
    if (typeof window.showToastNotification === 'function') {
        window.showToastNotification(type, title, message);
        return;
    }
    // Fallback: main_base.js toast
    const toast   = document.getElementById('toast');
    const toastT  = document.getElementById('toast-title');
    const toastM  = document.getElementById('toast-message');
    const toastI  = document.getElementById('toast-icon');
    if (!toast) return;

    toastT.textContent = title;
    toastM.textContent = message;
    toastI.className = type === 'success'
        ? 'fas fa-check-circle toast-icon'
        : 'fas fa-exclamation-circle toast-icon';
    toast.classList.add('active');
    setTimeout(() => toast.classList.remove('active'), 3500);
}

// ─── INIT: Navbar unread badge ───────────────────────────────────────────────
(function initNavBadge() {
    const unread = parseInt(document.getElementById('count-unread')?.textContent || 0);
    const navBadge = document.getElementById('notification-count');
    if (navBadge) navBadge.textContent = unread > 0 ? unread : '0';
})();

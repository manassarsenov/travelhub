/* ============================================================
   PROFILE SETTINGS — TravelHub
   Tab navigation, AJAX saving, uploads, validation
   ============================================================ */
(function () {
    'use strict';

    // ---- Helpers ------------------------------------------------------------
    function getCsrf() {
        const input = document.querySelector('[name=csrfmiddlewaretoken]');
        if (input) return input.value;
        const c = document.cookie.split(';')
            .find(x => x.trim().startsWith('csrftoken='));
        return c ? c.split('=')[1] : '';
    }

    function toast(title, msg, type) {
        if (typeof window.showToast === 'function') {
            window.showToast(title, msg, type || 'info');
        } else {
            console.log(`[${type}] ${title}: ${msg}`);
        }
    }

    function postForm(formData) {
        return fetch(window.location.href, {
            method: 'POST',
            headers: { 'X-CSRFToken': getCsrf(), 'X-Requested-With': 'XMLHttpRequest' },
            body: formData,
        }).then(function (r) {
            if (r.redirected) {
                window.location.href = r.url;
                return null;
            }
            return r.json().catch(function () {
                return { success: false, message: 'Server javobi noto\'g\'ri.' };
            });
        });
    }

    // ---- Tab switching ------------------------------------------------------
    window.switchTab = function (event, tabId) {
        document.querySelectorAll('.tab-content').forEach(function (t) {
            t.classList.remove('active');
        });
        document.querySelectorAll('.nav-item').forEach(function (n) {
            n.classList.remove('active');
        });
        const target = document.getElementById(tabId);
        if (target) target.classList.add('active');
        if (event && event.currentTarget) {
            event.currentTarget.classList.add('active');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ---- Generic AJAX form submit ------------------------------------------
    document.querySelectorAll('form[data-ajax]').forEach(function (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const btn = form.querySelector('button[type=submit]');
            const original = btn ? btn.innerHTML : '';
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saqlanmoqda...';
            }

            postForm(new FormData(form)).then(function (data) {
                if (!data) return;
                if (data.success) {
                    toast('Saqlandi', data.message, 'success');
                    handleSuccess(form, data);
                } else {
                    toast('Xatolik', data.message || 'Xatolik yuz berdi.', 'error');
                }
            }).catch(function () {
                toast('Xatolik', 'Tarmoq xatosi. Qaytadan urinib ko\'ring.', 'error');
            }).finally(function () {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = original;
                }
            });
        });
    });

    function handleSuccess(form, data) {
        // Profile completion bar
        if (typeof data.completion !== 'undefined') {
            const pct = document.getElementById('completion-percent');
            const fill = document.getElementById('completion-fill');
            if (pct) pct.textContent = data.completion + '%';
            if (fill) fill.style.width = data.completion + '%';
        }
        // Profile form → refresh header name / username
        if (form.id === 'form-profile') {
            const fn = form.querySelector('[name=first_name]').value.trim();
            const ln = form.querySelector('[name=last_name]').value.trim();
            const un = form.querySelector('[name=username]').value.trim();
            const nameEl = document.getElementById('header-name');
            const userEl = document.getElementById('header-username');
            if (nameEl) nameEl.textContent = (fn + ' ' + ln).trim() || un;
            if (userEl) userEl.textContent = un;
        }
        // Password form → close modal & reset
        if (form.id === 'form-password') {
            closePasswordModal();
            form.reset();
            updateStrength('');
        }
    }

    // ---- Bio character counter ---------------------------------------------
    const bio = document.getElementById('bio-input');
    const bioCount = document.getElementById('bio-count');
    if (bio && bioCount) {
        bio.addEventListener('input', function () {
            bioCount.textContent = bio.value.length;
        });
    }

    // ---- Languages tag input -----------------------------------------------
    const langInput = document.getElementById('language-input');
    const langBox = document.getElementById('languages-box');
    const langHidden = document.getElementById('languages-hidden');

    function syncLanguages() {
        const tags = langBox.querySelectorAll('.tag');
        const values = Array.prototype.map.call(tags, function (t) {
            return t.getAttribute('data-lang');
        });
        langHidden.value = values.join(',');
    }

    window.removeLanguage = function (icon) {
        icon.closest('.tag').remove();
        syncLanguages();
    };

    if (langInput) {
        langInput.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ',') return;
            e.preventDefault();
            const val = langInput.value.trim().replace(/,/g, '');
            if (!val) return;
            const exists = Array.prototype.some.call(
                langBox.querySelectorAll('.tag'),
                function (t) { return t.getAttribute('data-lang').toLowerCase() === val.toLowerCase(); }
            );
            if (exists || langBox.querySelectorAll('.tag').length >= 15) {
                langInput.value = '';
                return;
            }
            const span = document.createElement('span');
            span.className = 'tag';
            span.setAttribute('data-lang', val);
            span.innerHTML = val + ' <i class="fas fa-times"></i>';
            span.querySelector('i').addEventListener('click', function () {
                span.remove();
                syncLanguages();
            });
            langBox.insertBefore(span, langInput);
            langInput.value = '';
            syncLanguages();
        });
    }

    // ---- Avatar / Cover upload ---------------------------------------------
    function uploadPhoto(fieldName, file, previewCb) {
        const fd = new FormData();
        fd.append('action', 'update_photo');
        fd.append(fieldName, file);
        fd.append('csrfmiddlewaretoken', getCsrf());

        postForm(fd).then(function (data) {
            if (!data) return;
            if (data.success) {
                toast('Saqlandi', data.message, 'success');
                if (previewCb) previewCb(data);
                if (typeof data.completion !== 'undefined') {
                    const pct = document.getElementById('completion-percent');
                    const fill = document.getElementById('completion-fill');
                    if (pct) pct.textContent = data.completion + '%';
                    if (fill) fill.style.width = data.completion + '%';
                }
            } else {
                toast('Xatolik', data.message || 'Rasm yuklanmadi.', 'error');
            }
        }).catch(function () {
            toast('Xatolik', 'Rasm yuklanmadi.', 'error');
        });
    }

    const avatarInput = document.getElementById('avatar-input');
    if (avatarInput) {
        avatarInput.addEventListener('change', function () {
            const file = avatarInput.files[0];
            if (!file) return;
            uploadPhoto('avatar', file, function (data) {
                const img = document.getElementById('avatar-image');
                if (img && data.avatar_url) img.src = data.avatar_url;
            });
        });
    }

    const coverInput = document.getElementById('cover-input');
    if (coverInput) {
        coverInput.addEventListener('change', function () {
            const file = coverInput.files[0];
            if (!file) return;
            uploadPhoto('cover_photo', file, function (data) {
                const img = document.getElementById('cover-image');
                if (img && data.cover_url) {
                    img.src = data.cover_url;
                    img.style.display = 'block';
                }
            });
        });
    }

    // ---- Password modal -----------------------------------------------------
    window.openPasswordModal = function () {
        const m = document.getElementById('password-modal');
        if (m) m.classList.add('active');
    };
    window.closePasswordModal = function () {
        const m = document.getElementById('password-modal');
        if (m) m.classList.remove('active');
    };
    const pwModal = document.getElementById('password-modal');
    if (pwModal) {
        pwModal.addEventListener('click', function (e) {
            if (e.target === pwModal) closePasswordModal();
        });
    }

    // ---- Password strength meter -------------------------------------------
    function updateStrength(value) {
        const fill = document.getElementById('strength-fill');
        const text = document.getElementById('strength-text');
        if (!fill || !text) return;
        fill.className = 'strength-fill';
        if (!value) { text.textContent = ''; return; }
        let score = 0;
        if (value.length >= 8) score++;
        if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
        if (/\d/.test(value)) score++;
        if (/[^A-Za-z0-9]/.test(value)) score++;
        if (score <= 1) { fill.classList.add('weak'); text.textContent = 'Weak'; }
        else if (score <= 3) { fill.classList.add('medium'); text.textContent = 'Medium'; }
        else { fill.classList.add('strong'); text.textContent = 'Strong'; }
    }
    const newPw = document.getElementById('new-password');
    if (newPw) {
        newPw.addEventListener('input', function () { updateStrength(newPw.value); });
    }

    // ---- Delete account -----------------------------------------------------
    window.deleteAccount = function () {
        if (!confirm('Hisobingizni o\'chirmoqchimisiz? Bu amal qaytarib bo\'lmaydi.')) return;
        const fd = new FormData();
        fd.append('action', 'delete_account');
        fd.append('csrfmiddlewaretoken', getCsrf());
        postForm(fd).then(function (data) {
            if (!data) return;
            if (data.success) {
                toast('Yuborildi', data.message, 'success');
            } else {
                toast('Xatolik', data.message || 'Xatolik yuz berdi.', 'error');
            }
        });
    };

})();

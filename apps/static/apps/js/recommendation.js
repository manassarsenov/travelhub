/* ============================================================
   recommendation.js  —  AI Recommendations sahifasi (dizayn qatlami)
   TravelHub

   Bu fayl HOZIRCHA faqat front-end o'zaro ta'sirini boshqaradi
   (filtr, sort, modal, karusel, feedback animatsiyalari).
   Backend / Gemini logikasi keyin shu hooklarga ulanadi —
   pastdagi "BACKEND HOOK" izohlariga qarang.
============================================================ */
(function () {
    "use strict";

    /* showToast() main_base.js dan keladi; bo'lmasa — zaxira */
    function toast(title, msg, type) {
        if (typeof window.showToast === "function") {
            window.showToast(title, msg, type || "info");
        } else {
            console.log("[toast]", title, msg);
        }
    }

    /* ---- backend yordamchilari (CSRF bilan POST) ---- */
    function recCsrf() {
        var ck = document.cookie.split(";").find(function (c) {
            return c.trim().indexOf("csrftoken=") === 0;
        });
        return ck ? ck.split("=")[1] : "";
    }
    function recLang() {
        return "/" + (window.location.pathname.split("/").filter(Boolean)[0] || "en") + "/";
    }
    function recPost(path, body) {
        return fetch(recLang() + path, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-CSRFToken": recCsrf()
            },
            body: body
        });
    }

    /* ========================================================
       1. SCROLL REVEAL  —  .reveal elementlari ko'rinishga kirsa
    ======================================================== */
    function initReveal() {
        var items = document.querySelectorAll(".rec-page .reveal");
        if (!items.length) return;

        if (!("IntersectionObserver" in window)) {
            items.forEach(function (el) { el.classList.add("is-in"); });
            return;
        }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) {
                    e.target.classList.add("is-in");
                    io.unobserve(e.target);
                }
            });
        }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

        items.forEach(function (el) { io.observe(el); });
    }

    /* ========================================================
       2. AI TABIIY QIDIRUV  —  hozircha taqlid (demo)
       BACKEND HOOK: recAiSearch() ichida fetch('/recommendation/ai/')
       qilib, Gemini structured filterni olib, gridni qayta render
       qiladigan kod yoziladi.
    ======================================================== */
    var AI_FACTS = [
        "Understanding your travel intent…",
        "Matching against your Taste DNA…",
        "Checking what similar travelers loved…",
        "Filtering by budget & season…",
        "Ranking the best destinations…"
    ];

    window.recAiSearch = function (event) {
        if (event) event.preventDefault();

        var input = document.getElementById("aiSearchInput");
        var query = input ? input.value.trim() : "";
        if (!query) {
            toast("Empty request", "Describe your dream trip first.", "info");
            if (input) input.focus();
            return false;
        }

        var overlay = document.getElementById("aiLoading");
        var factEl = document.getElementById("aiLoadingFact");
        var countEl = document.getElementById("aiCount");
        var bestEl = document.getElementById("aiBest");

        /* overlay + animatsiyalar (javob kelguncha aylanaveradi) */
        if (overlay) {
            overlay.hidden = false;
            void overlay.offsetWidth;
            overlay.classList.add("is-open");
        }
        var factIdx = 0;
        if (factEl) factEl.textContent = AI_FACTS[0];
        var factTimer = setInterval(function () {
            factIdx = (factIdx + 1) % AI_FACTS.length;
            if (factEl) {
                factEl.style.opacity = "0";
                setTimeout(function () {
                    factEl.textContent = AI_FACTS[factIdx];
                    factEl.style.opacity = "1";
                }, 200);
            }
        }, 620);
        var scanned = 0, best = 0;
        var countTimer = setInterval(function () {
            scanned = Math.min(scanned + Math.floor(Math.random() * 9) + 3, 120);
            best = Math.min(best + Math.floor(Math.random() * 6) + 2, 95);
            if (countEl) countEl.textContent = scanned;
            if (bestEl) bestEl.textContent = best + "%";
        }, 140);

        function stopTimers() {
            clearInterval(factTimer);
            clearInterval(countTimer);
        }
        function closeOverlay() {
            stopTimers();
            if (overlay) {
                overlay.classList.remove("is-open");
                setTimeout(function () { overlay.hidden = true; }, 320);
            }
        }

        /* CSRF tokeni */
        var csrf = "";
        var ck = document.cookie.split(";").find(function (c) {
            return c.trim().indexOf("csrftoken=") === 0;
        });
        if (ck) csrf = ck.split("=")[1];

        var lang = "/" + (window.location.pathname.split("/").filter(Boolean)[0] || "en") + "/";

        /* BACKEND: Gemini structured filter → engine → kartalar HTML */
        fetch(lang + "recommendation/ai-search/", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-CSRFToken": csrf
            },
            body: "query=" + encodeURIComponent(query)
        })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
            if (!data || typeof data.html !== "string") {
                closeOverlay();
                toast("Search failed", "Please try again.", "error");
                return;
            }
            /* loading oynasida serverdan kelgan HAQIQIY raqamlarni ko'rsatamiz */
            stopTimers();
            if (countEl) countEl.textContent = data.scanned;
            if (bestEl) bestEl.textContent = data.best + "%";

            setTimeout(function () {
                closeOverlay();
                var grid = document.getElementById("recGrid");
                if (grid) {
                    grid.innerHTML = data.html;
                    /* yangi kartalar darhol ko'rinsin (reveal kuzatuvchisi ularni ko'rmaydi) */
                    grid.querySelectorAll(".rec-card").forEach(function (c) {
                        c.classList.add("is-in");
                        c.classList.remove("is-hidden");
                        c.dataset.dismissed = "";
                    });
                }
                var rc = document.getElementById("resultsCount");
                if (rc) rc.textContent = data.count;
                /* filtrni "All" ga qaytaramiz */
                document.querySelectorAll(".rec-filter").forEach(function (b) {
                    b.classList.toggle("is-active", b.dataset.filter === "all");
                });
                var empty = document.getElementById("recEmpty");
                if (empty) empty.hidden = data.count !== 0;

                toast(data.ai ? "AI match ready" : "Results ready",
                      data.count + ' destinations for “' + query + '”.', "success");
                var picks = document.getElementById("topPicks");
                if (picks) picks.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 600);
        })
        .catch(function () {
            closeOverlay();
            toast("Search failed", "Please try again.", "error");
        });

        return false;
    };

    /* qidiruv chiplari → inputni to'ldirish */
    window.recFillSearch = function (el) {
        var input = document.getElementById("aiSearchInput");
        if (input) {
            input.value = el.textContent.trim();
            input.focus();
        }
    };

    /* ========================================================
       3. TOP PICKS  —  view / filter / sort
    ======================================================== */

    /* grid ↔ list ko'rinishi */
    window.recSetView = function (view) {
        var grid = document.getElementById("recGrid");
        if (!grid) return;
        grid.classList.toggle("is-list", view === "list");
        document.querySelectorAll(".rec-view__btn").forEach(function (b) {
            b.classList.toggle("is-active", b.dataset.view === view);
        });
    };

    /* faol bo'lmagan (dismiss qilingan) kartani hisobga olmaslik */
    function liveCards() {
        return Array.prototype.filter.call(
            document.querySelectorAll("#recGrid .rec-card"),
            function (c) { return c.dataset.dismissed !== "1"; }
        );
    }

    function refreshCount() {
        var shown = liveCards().filter(function (c) {
            return !c.classList.contains("is-hidden");
        }).length;
        var countEl = document.getElementById("resultsCount");
        if (countEl) countEl.textContent = shown;
        var empty = document.getElementById("recEmpty");
        if (empty) empty.hidden = shown !== 0;
    }

    /* teg bo'yicha filtr */
    window.recFilter = function (btn) {
        var filter = btn.dataset.filter;
        document.querySelectorAll(".rec-filter").forEach(function (b) {
            b.classList.toggle("is-active", b === btn);
        });
        liveCards().forEach(function (card) {
            var tags = (card.dataset.tags || "").split(/\s+/);
            var match = filter === "all" || tags.indexOf(filter) !== -1;
            card.classList.toggle("is-hidden", !match);
        });
        refreshCount();
    };

    /* sort menyusini ochish/yopish */
    window.recToggleSort = function () {
        var wrap = document.querySelector(".rec-sort");
        if (wrap) wrap.classList.toggle("is-open");
    };

    /* kartalarni saralash */
    window.recSort = function (key, label) {
        var grid = document.getElementById("recGrid");
        if (!grid) return;

        var num = function (c, attr) { return parseFloat(c.dataset[attr]) || 0; };
        var cards = liveCards();

        cards.sort(function (a, b) {
            switch (key) {
                case "price-asc":  return num(a, "price") - num(b, "price");
                case "price-desc": return num(b, "price") - num(a, "price");
                case "rating":     return num(b, "rating") - num(a, "rating");
                default:           return num(b, "match") - num(a, "match");  // best match
            }
        });
        cards.forEach(function (c) { grid.appendChild(c); });

        var lbl = document.getElementById("sortLabel");
        if (lbl) lbl.textContent = label;
        document.querySelectorAll(".rec-sort__menu button").forEach(function (b) {
            b.classList.toggle("is-active", b.textContent.trim() === label);
        });

        var wrap = document.querySelector(".rec-sort");
        if (wrap) wrap.classList.remove("is-open");
    };

    /* ========================================================
       4. KARTA AMALLARI  —  fav / feedback / dismiss
    ======================================================== */

    /* sevimlilarga qo'shish/olib tashlash — haqiqiy wishlist API
       (navbar soni ham yangilanadi — main_base.js bilan bir xil xulq) */
    window.recToggleFav = function (btn, event) {
        if (event) { event.stopPropagation(); event.preventDefault(); }
        var slug = btn.dataset.slug;
        if (!slug) return;
        btn.disabled = true;

        var csrf = "";
        var ck = document.cookie.split(";").find(function (c) {
            return c.trim().indexOf("csrftoken=") === 0;
        });
        if (ck) csrf = ck.split("=")[1];

        var lang = "/" + (window.location.pathname.split("/").filter(Boolean)[0] || "en") + "/";

        fetch(lang + "api/wishlist/toggle/", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-CSRFToken": csrf
            },
            body: "slug=" + encodeURIComponent(slug)
        })
        .then(function (r) {
            if (r.status === 302 || r.redirected) {
                window.location.href = "/auth/login/?next=" + window.location.pathname;
                return null;
            }
            if (r.status === 401 || r.status === 403) {
                btn.disabled = false;
                toast("Sign in", "Sign in to save destinations.", "info");
                return null;
            }
            return r.json();
        })
        .then(function (data) {
            btn.disabled = false;
            if (!data) return;
            if (data.unauthenticated) {
                toast("Sign in", "Sign in to save destinations.", "info");
                return;
            }
            var on = !!data.wishlisted;
            btn.classList.toggle("is-fav", on);
            toast(on ? "Saved" : "Removed",
                  on ? "Added to your wishlist." : "Removed from wishlist.",
                  on ? "success" : "info");
            /* navbar wishlist sonini serverdan kelgan haqiqiy songa moslaymiz */
            var countEl = document.getElementById("wishlist-count");
            if (countEl && typeof data.wishlist_count === "number") {
                countEl.textContent = data.wishlist_count;
            }
        })
        .catch(function () {
            btn.disabled = false;
            toast("Error", "Please try again.", "error");
        });
    };

    /* 👍 / 👎 feedback — RecommendationFeedback modeliga yoziladi */
    window.recFeedback = function (btn) {
        var group = btn.closest(".rec-fb");
        var fb = btn.dataset.fb;                 // "up" | "down"
        var slug = btn.dataset.slug;
        if (!slug || !group) return;

        /* up va down o'zaro istisno — bosilgani faollashadi */
        group.querySelectorAll('.rec-fb__btn[data-fb="up"], .rec-fb__btn[data-fb="down"]')
            .forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");

        recPost("recommendation/feedback/", "slug=" + encodeURIComponent(slug) + "&action=" + fb)
            .then(function (r) {
                if (r.status === 401) {
                    btn.classList.remove("is-active");
                    toast("Sign in", "Sign in to train your recommendations.", "info");
                    return;
                }
                if (fb === "up")   toast("Thanks!", "We'll show more like this.", "success");
                if (fb === "down") toast("Got it", "We'll show fewer like this next time.", "info");
            })
            .catch(function () { toast("Error", "Please try again.", "error"); });
    };

    /* "Qiziq emas" → kartani olib tashlash + RecommendationFeedback(dismiss) */
    window.recDismiss = function (btn) {
        var card = btn.closest(".rec-card");
        var slug = btn.dataset.slug;
        if (!card || !slug) return;

        recPost("recommendation/feedback/", "slug=" + encodeURIComponent(slug) + "&action=dismiss")
            .then(function (r) {
                if (r.status === 401) {
                    toast("Sign in", "Sign in to train your recommendations.", "info");
                    return;
                }
                card.classList.add("is-dismissed");
                setTimeout(function () {
                    card.dataset.dismissed = "1";
                    card.classList.add("is-hidden");
                    refreshCount();
                }, 360);
                toast("Hidden", "We won't recommend this again.", "info");
            })
            .catch(function () { toast("Error", "Please try again.", "error"); });
    };

    /* ========================================================
       5. KARUSELLAR  —  o'ngga/chapga aylantirish
    ======================================================== */
    window.recScroll = function (trackId, dir) {
        var track = document.getElementById(trackId);
        if (!track) return;
        var first = track.querySelector(".mini-card");
        var step = first ? first.offsetWidth + 20 : 280;   // 20 = gap
        track.scrollBy({ left: step * 1.5 * dir, behavior: "smooth" });
    };

    /* ========================================================
       6. QUIZ MODAL  (cold-start / Taste DNA refine)
    ======================================================== */
    var quizStep = 1;
    var QUIZ_TOTAL = 3;

    function openModal(id) {
        var m = document.getElementById(id);
        if (!m) return;
        m.hidden = false;
        void m.offsetWidth;
        m.classList.add("is-open");
        document.body.style.overflow = "hidden";
    }

    function closeModal(id) {
        var m = document.getElementById(id);
        if (!m) return;
        m.classList.remove("is-open");
        document.body.style.overflow = "";
        setTimeout(function () { m.hidden = true; }, 320);
    }

    function renderQuiz() {
        document.querySelectorAll(".quiz-step").forEach(function (s) {
            s.classList.toggle("is-active", +s.dataset.step === quizStep);
        });
        var fill = document.getElementById("quizFill");
        if (fill) fill.style.width = (quizStep / QUIZ_TOTAL * 100) + "%";
        var num = document.getElementById("quizStepNum");
        if (num) num.textContent = quizStep;

        var back = document.getElementById("quizBack");
        if (back) back.hidden = quizStep === 1;

        var next = document.getElementById("quizNext");
        if (next) {
            next.innerHTML = quizStep === QUIZ_TOTAL
                ? 'See my recommendations <i class="fas fa-wand-magic-sparkles"></i>'
                : 'Continue <i class="fas fa-arrow-right-long"></i>';
        }
    }

    window.recOpenQuiz = function () {
        quizStep = 1;
        renderQuiz();
        openModal("quizModal");
    };

    window.recCloseQuiz = function () { closeModal("quizModal"); };

    /* keyingi/oldingi qadam */
    window.recQuizStep = function (dir) {
        if (dir > 0 && quizStep === QUIZ_TOTAL) {
            /* quiz javoblarini yig'ib RecommendationProfile ga yuboramiz */
            var styles = [];
            document.querySelectorAll('.quiz-step[data-step="1"] .quiz-opt.is-picked')
                .forEach(function (o) { if (o.dataset.val) styles.push(o.dataset.val); });
            var bEl = document.querySelector('.quiz-step[data-step="2"] .quiz-opt.is-picked');
            var pEl = document.querySelector('.quiz-step[data-step="3"] .quiz-opt.is-picked');

            var body = "styles=" + encodeURIComponent(styles.join(",")) +
                       "&budget=" + encodeURIComponent(bEl ? bEl.dataset.val : "") +
                       "&party=" + encodeURIComponent(pEl ? pEl.dataset.val : "");

            recPost("recommendation/quiz/", body)
                .then(function (r) {
                    closeModal("quizModal");
                    if (r.status === 401) {
                        toast("Sign in", "Sign in to save your taste quiz.", "info");
                        return;
                    }
                    toast("Taste DNA updated", "Re-tuning your recommendations…", "success");
                    setTimeout(function () { window.location.reload(); }, 900);
                })
                .catch(function () {
                    closeModal("quizModal");
                    toast("Error", "Please try again.", "error");
                });
            return;
        }
        quizStep = Math.min(QUIZ_TOTAL, Math.max(1, quizStep + dir));
        renderQuiz();
    };

    /* ko'p tanlovli savol (1-qadam) */
    window.recQuizPick = function (el) {
        el.classList.toggle("is-picked");
    };

    /* bitta tanlovli savol (2 & 3-qadam) */
    window.recQuizPickOne = function (el) {
        var grid = el.closest(".quiz-grid");
        if (grid) {
            grid.querySelectorAll(".quiz-opt").forEach(function (o) {
                o.classList.remove("is-picked");
            });
        }
        el.classList.add("is-picked");
    };

    /* ========================================================
       7. GLOBAL HODISALAR  —  tashqi klik / Escape
    ======================================================== */
    document.addEventListener("click", function (e) {
        var sort = document.querySelector(".rec-sort");
        if (sort && sort.classList.contains("is-open") && !e.target.closest(".rec-sort")) {
            sort.classList.remove("is-open");
        }
    });

    document.addEventListener("keydown", function (e) {
        if (e.key !== "Escape") return;
        var quiz = document.getElementById("quizModal");
        if (quiz && !quiz.hidden) closeModal("quizModal");
        var loading = document.getElementById("aiLoading");
        if (loading && !loading.hidden) {
            loading.classList.remove("is-open");
            setTimeout(function () { loading.hidden = true; }, 320);
        }
    });

    /* ========================================================
       INIT
    ======================================================== */
    document.addEventListener("DOMContentLoaded", function () {
        initReveal();
        refreshCount();
    });
})();
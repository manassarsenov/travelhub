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
        if (!overlay) return false;

        /* overlayni ochish */
        overlay.hidden = false;
        void overlay.offsetWidth;            // reflow — transition uchun
        overlay.classList.add("is-open");

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

        /* hisoblagichlarni animatsiya qilish */
        var scanned = 0, best = 0;
        var countTimer = setInterval(function () {
            scanned = Math.min(scanned + Math.floor(Math.random() * 11) + 4, 128);
            best = Math.min(best + Math.floor(Math.random() * 7) + 2, 96);
            if (countEl) countEl.textContent = scanned;
            if (bestEl) bestEl.textContent = best + "%";
        }, 130);

        /* ~2.8s dan keyin yopish */
        setTimeout(function () {
            clearInterval(factTimer);
            clearInterval(countTimer);
            if (countEl) countEl.textContent = 128;
            if (bestEl) bestEl.textContent = "96%";

            overlay.classList.remove("is-open");
            setTimeout(function () { overlay.hidden = true; }, 320);

            toast("AI match ready", '6 destinations matched “' + query + '”.', "success");
            var picks = document.getElementById("topPicks");
            if (picks) picks.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 2800);

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

    /* sevimlilarga qo'shish/olib tashlash
       BACKEND HOOK: bu yerda /api/wishlist/toggle/ ga POST qilinadi */
    window.recToggleFav = function (btn) {
        var on = btn.classList.toggle("is-fav");
        toast(on ? "Saved" : "Removed",
              on ? "Added to your wishlist." : "Removed from wishlist.",
              on ? "success" : "info");
    };

    /* 👍 / 👎 feedback
       BACKEND HOOK: RecommendationFeedback modeliga POST qilinadi */
    window.recFeedback = function (btn) {
        var group = btn.closest(".rec-fb");
        var fb = btn.dataset.fb;
        var wasActive = btn.classList.contains("is-active");

        /* up va down o'zaro istisno */
        group.querySelectorAll('.rec-fb__btn[data-fb="up"], .rec-fb__btn[data-fb="down"]')
            .forEach(function (b) { b.classList.remove("is-active"); });

        if (!wasActive) {
            btn.classList.add("is-active");
            if (fb === "up")   toast("Thanks!", "We'll show more like this.", "success");
            if (fb === "down") toast("Got it", "We'll show fewer like this.", "info");
        }
    };

    /* "Qiziq emas" → kartani olib tashlash
       BACKEND HOOK: RecommendationFeedback(dismiss=true) yoziladi */
    window.recDismiss = function (btn) {
        var card = btn.closest(".rec-card");
        if (!card) return;
        card.classList.add("is-dismissed");
        setTimeout(function () {
            card.dataset.dismissed = "1";
            card.classList.add("is-hidden");
            refreshCount();
        }, 360);
        toast("Hidden", "We won't recommend this again.", "info");
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
            /* BACKEND HOOK: quiz javoblari profilga POST qilinadi */
            closeModal("quizModal");
            toast("Taste DNA updated", "Your recommendations are being re-tuned.", "success");
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
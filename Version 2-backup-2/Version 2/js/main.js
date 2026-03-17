/**
 * Finora Investment Studio — Optimized Static JS
 * Vanilla JS (no jQuery) — all interactions from original Divi export.
 */

document.addEventListener('DOMContentLoaded', () => {

    // =========================================================
    // 0. HERO SLIDER (Startseite - Leistungen-Style, 5s Auto, Pfeile)
    // =========================================================
    const heroSlider = document.getElementById('hero-slider');
    if (heroSlider) {
        const track = heroSlider.querySelector('.hero-slider-track');
        const slides = Array.from(heroSlider.querySelectorAll('.hero-slide'));
        const prevBtn = heroSlider.querySelector('.hero-slider-prev');
        const nextBtn = heroSlider.querySelector('.hero-slider-next');
        const AUTOPLAY_MS = 5000;
        let currentSlideIndex = 0;
        let autoplayTimer = null;
        let autoplayStopped = false;

        function stopAutoplay() {
            autoplayStopped = true;
            if (autoplayTimer) {
                clearInterval(autoplayTimer);
                autoplayTimer = null;
            }
        }

        function goToSlide(index) {
            const len = slides.length;
            if (len === 0) return;
            currentSlideIndex = (index + len) % len;
            slides.forEach(function (slide, i) {
                slide.classList.toggle('is-active', i === currentSlideIndex);
            });
            if (!autoplayStopped) {
                if (autoplayTimer) clearInterval(autoplayTimer);
                autoplayTimer = setInterval(nextSlide, AUTOPLAY_MS);
            }
        }

        function nextSlide() {
            goToSlide(currentSlideIndex + 1);
        }

        function prevSlide() {
            goToSlide(currentSlideIndex - 1);
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', function () {
                stopAutoplay();
                prevSlide();
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', function () {
                stopAutoplay();
                nextSlide();
            });
        }
        heroSlider.addEventListener('mouseenter', stopAutoplay);

        if (slides.length) {
            slides.forEach(function (s) { s.classList.remove('is-active'); });
            slides[0].classList.add('is-active');
        }
        if (!autoplayStopped) {
            autoplayTimer = setInterval(nextSlide, AUTOPLAY_MS);
        }
    }

    // =========================================================
    // 0B. MOUSE FOLLOWER (alle Seiten, dezent Finora-Style)
    // =========================================================
    const cursorFollower = document.getElementById('cursor-follower');
    if (cursorFollower) {
        let mouseX = 0, mouseY = 0;
        let posX = 0, posY = 0;
        let rafId = null;

        document.addEventListener('mousemove', function (e) {
            mouseX = e.clientX;
            mouseY = e.clientY;
            if (rafId == null) {
                rafId = requestAnimationFrame(animateFollower);
            }
        }, { passive: true });

        function animateFollower() {
            posX += (mouseX - posX) * 0.12;
            posY += (mouseY - posY) * 0.12;
            cursorFollower.style.left = posX + 'px';
            cursorFollower.style.top = posY + 'px';
            if (Math.abs(mouseX - posX) < 0.5 && Math.abs(mouseY - posY) < 0.5) {
                rafId = null;
                return;
            }
            rafId = requestAnimationFrame(animateFollower);
        }

        document.querySelectorAll('a, button').forEach(function (el) {
            el.addEventListener('mouseenter', function () { cursorFollower.classList.add('is-hover'); });
            el.addEventListener('mouseleave', function () { cursorFollower.classList.remove('is-hover'); });
        });
    }

    // =========================================================
    // 1. MOBILE MENU TOGGLE
    // =========================================================
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('is-open');
            menuToggle.classList.toggle('is-active');
        });
    }

    // =========================================================
    // 1A. LANGUAGE SWITCHER DROPDOWN
    // =========================================================
    const langBtn = document.querySelector('.header-lang-btn');
    const langDropdown = document.querySelector('.header-lang-dropdown');
    if (langBtn && langDropdown) {
        langBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = !langDropdown.hidden;
            langDropdown.hidden = isOpen;
            langBtn.setAttribute('aria-expanded', !isOpen);
        });
        document.addEventListener('click', () => {
            langDropdown.hidden = true;
            langBtn.setAttribute('aria-expanded', 'false');
        });
        langDropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    // =========================================================
    // 1B. HEADER SCROLL EFFECT + SUBTLE HERO PARALLAX
    // =========================================================
    const header = document.querySelector('.site-header');
    const heroSection = document.querySelector('.hero');
    const heroVideo = document.querySelector('.hero-video');
    if (header || heroSection) {
        const scrollThreshold = 50;
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const y = window.scrollY;
                    if (header) header.classList.toggle('is-scrolled', y > scrollThreshold);
                    if (heroSection && y < window.innerHeight) {
                        const parallaxY = y * 0.3;
                        const parallaxOpacity = 1 - (y / window.innerHeight) * 0.4;
                        heroSection.style.setProperty('--parallax-y', parallaxY + 'px');
                        const heroText = heroSection.querySelector('.hero-text');
                        if (heroText) {
                            heroText.style.transform = 'translateY(' + (parallaxY * 0.5) + 'px)';
                            heroText.style.opacity = Math.max(parallaxOpacity, 0);
                        }
                    }
                    const howSection = document.querySelector('.how-it-works');
                    if (howSection) {
                        const rect = howSection.getBoundingClientRect();
                        const parallaxY = rect.top * 0.35;
                        howSection.style.setProperty('--how-parallax-y', parallaxY + 'px');
                    }
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });

        const howSection = document.querySelector('.how-it-works');
        if (howSection) {
            const setHowParallax = () => {
                const rect = howSection.getBoundingClientRect();
                howSection.style.setProperty('--how-parallax-y', (rect.top * 0.35) + 'px');
            };
            setHowParallax();
            window.addEventListener('resize', setHowParallax);
        }
    }

    // =========================================================
    // 2. SCROLL ENTRANCE ANIMATIONS (IntersectionObserver)
    // =========================================================
    const allAnim = document.querySelectorAll('.anim');
    const animEls = Array.from(allAnim).filter(el => !(el.classList.contains('pillar-card') && el.closest('.pillars-grid')));

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const delay = entry.target.style.animationDelay;
                    const extraDelay = entry.target.dataset.stagger;
                    if (extraDelay) {
                        entry.target.style.animationDelay = extraDelay + 'ms';
                    }
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
        animEls.forEach(el => observer.observe(el));

        // Drei Säulen: kein Observer - Scroll-Effekt über scrollPillarCards()
    } else {
        document.querySelectorAll('.anim').forEach(el => el.classList.add('is-visible'));
    }

    // Stagger für andere Grids (testimonials, how-steps)
    document.querySelectorAll('.testimonials-grid, .how-grid').forEach(grid => {
        const children = grid.children;
        for (let i = 0; i < children.length; i++) {
            if (children[i].classList.contains('anim')) {
                children[i].style.animationDelay = (i * 150) + 'ms';
            }
        }
    });

    // =========================================================
    // 2b. DREI SÄULEN: Scroll-Effekt (0% = übereinander, 50% Scrolltiefe = Endposition)
    // =========================================================
    const PILLAR_STACK_OFFSET = 220;
    let pillarTicking = false;

    function updatePillarCards() {
        const section = document.querySelector('.pillars');
        if (!section) return;
        const grid = section.querySelector('.pillars-grid');
        if (!grid) return;
        const cards = grid.querySelectorAll('.pillar-card');
        if (cards.length < 3) return;

        const rect = section.getBoundingClientRect();
        const vh = window.innerHeight;
        const top = rect.top;

        let progress = 0;
        if (top <= vh * 0.2) {
            progress = 1;
        } else if (top < vh) {
            progress = 1 - (top - vh * 0.2) / (vh * 0.8);
        }

        const t = 1 - progress;
        const left = cards[0];
        const center = cards[1];
        const right = cards[2];
        if (left) left.style.transform = `translate(${t * PILLAR_STACK_OFFSET}px, 0)`;
        if (center) center.style.transform = 'translate(0, 0)';
        if (right) right.style.transform = `translate(${-t * PILLAR_STACK_OFFSET}px, 0)`;
    }

    function onPillarScroll() {
        if (pillarTicking) return;
        pillarTicking = true;
        requestAnimationFrame(() => {
            updatePillarCards();
            pillarTicking = false;
        });
    }

    const pillarsSection = document.querySelector('.pillars');
    if (pillarsSection) {
        updatePillarCards();
        window.addEventListener('scroll', onPillarScroll, { passive: true });
        window.addEventListener('resize', onPillarScroll);
    }

    // =========================================================
    // 3. FAQ ACCORDION
    // =========================================================
    const accordionItems = document.querySelectorAll('.accordion-item');
    accordionItems.forEach(item => {
        const title = item.querySelector('.accordion-title');
        if (!title) return;

        title.addEventListener('click', () => {
            const isOpen = item.classList.contains('is-open');

            // Close all others (optional, but typical for accordion)
            accordionItems.forEach(i => i.classList.remove('is-open'));

            // Toggle current
            if (!isOpen) {
                item.classList.add('is-open');
            }
        });
    });

    // =========================================================
    // 4. TESTIMONIAL EXPAND/COLLAPSE (nur die geklickte Kachel öffnen)
    // Inline-Styles setzen, damit garantiert nur eine Karte den vollen Text zeigt.
    // =========================================================
    /* Zugeklappt: 7 Zeilen (11.9em), Verblassen per CSS; Aufklappen: Kachel öffnet nach unten, Resttext sichtbar */
    function setTestimonialTextStyle(el, expanded) {
        var s = el.style;
        if (expanded) {
            s.overflow = 'visible';
            s.maxHeight = (el.scrollHeight + 24) + 'px';
            s.webkitLineClamp = '';
            s.display = 'block';
            s.setProperty('mask-image', 'none');
            s.setProperty('-webkit-mask-image', 'none');
        } else {
            s.overflow = 'hidden';
            s.maxHeight = '11.9em';
            s.webkitLineClamp = '';
            s.display = 'block';
            s.removeProperty('mask-image');
            s.removeProperty('-webkit-mask-image');
        }
    }

    // Beim Start alle Zitate per Inline-Style zuklappen (einheitlicher Ausgangszustand)
    (function () {
        var list = document.querySelectorAll('.testimonials .testimonial-text');
        for (var k = 0; k < list.length; k++) {
            setTestimonialTextStyle(list[k], false);
        }
    })();

    document.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest('.testimonials .lw-more-btn');
        if (!btn) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        var card = btn.closest('.testimonial-card');
        if (!card) return;
        var section = card.closest('.testimonials');
        if (!section) return;

        var textEl = card.querySelector('.testimonial-text');
        if (!textEl) return;
        var wasExpanded = textEl.style.overflow === 'visible';

        // 1. Alle Zitate in dieser Sektion zuklappen (per Inline-Style + data-expanded entfernen)
        var allCards = section.querySelectorAll('.testimonial-card');
        for (var c = 0; c < allCards.length; c++) {
            allCards[c].removeAttribute('data-expanded');
        }
        var allTexts = section.querySelectorAll('.testimonial-text');
        for (var i = 0; i < allTexts.length; i++) {
            setTestimonialTextStyle(allTexts[i], false);
        }
        var buttons = section.querySelectorAll('.lw-more-btn');
        for (i = 0; i < buttons.length; i++) {
            buttons[i].innerHTML = 'Mehr <span class="lw-arrow">&darr;</span>';
        }

        // 2. Nur diese eine Karte aufklappen - Karte wächst mit, Footer bleibt unter dem Text
        if (!wasExpanded) {
            card.setAttribute('data-expanded', 'true');
            setTestimonialTextStyle(textEl, true);
            btn.innerHTML = 'Weniger <span class="lw-arrow">&uarr;</span>';
        }
    }, true);

    // =========================================================
    // 4B. TESTIMONIALS CAROUSEL (Dots, Drag, Swipe)
    // =========================================================
    document.querySelectorAll('.testimonials').forEach(function (section) {
        var track = section.querySelector('.testimonials-track');
        if (!track) return;
        var inner = track.querySelector('.testimonials-track-inner');
        if (!inner) return;

        var grids = inner.querySelectorAll('.testimonials-grid');
        for (var g = 1; g < grids.length; g++) grids[g].remove();

        var firstGrid = inner.querySelector('.testimonials-grid');
        if (!firstGrid) return;
        var cards = Array.from(firstGrid.querySelectorAll('.testimonial-card'));
        if (!cards.length) return;

        var nav = document.createElement('div');
        nav.className = 'testimonials-nav';
        var dots = [];
        cards.forEach(function (_, idx) {
            var dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'testimonials-nav-dot';
            dot.setAttribute('aria-label', 'Karte ' + (idx + 1));
            dot.addEventListener('click', function () { scrollToCard(idx); });
            nav.appendChild(dot);
            dots.push(dot);
        });
        track.parentNode.insertBefore(nav, track.nextSibling);

        function getActiveIndex() {
            var trackRect = track.getBoundingClientRect();
            var center = trackRect.left + trackRect.width / 2;
            var closest = 0;
            var minDist = Infinity;
            cards.forEach(function (card, i) {
                var r = card.getBoundingClientRect();
                var cardCenter = r.left + r.width / 2;
                var dist = Math.abs(cardCenter - center);
                if (dist < minDist) { minDist = dist; closest = i; }
            });
            return closest;
        }

        function updateDots() {
            var active = getActiveIndex();
            dots.forEach(function (d, i) {
                d.classList.toggle('is-active', i === active);
            });
        }

        function scrollToCard(idx) {
            var card = cards[idx];
            if (!card) return;
            var cardCenter = card.offsetLeft + card.offsetWidth / 2;
            var trackCenter = track.offsetWidth / 2;
            track.scrollTo({ left: cardCenter - trackCenter, behavior: 'smooth' });
        }

        var scrollTimer = null;
        track.addEventListener('scroll', function () {
            if (scrollTimer) cancelAnimationFrame(scrollTimer);
            scrollTimer = requestAnimationFrame(updateDots);
        }, { passive: true });

        var isDragging = false, startX = 0, scrollLeft = 0;

        track.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            isDragging = true;
            startX = e.pageX - track.offsetLeft;
            scrollLeft = track.scrollLeft;
            track.classList.add('is-grabbing');
        });

        document.addEventListener('mousemove', function (e) {
            if (!isDragging) return;
            e.preventDefault();
            var x = e.pageX - track.offsetLeft;
            track.scrollLeft = scrollLeft - (x - startX);
        });

        document.addEventListener('mouseup', function () {
            if (!isDragging) return;
            isDragging = false;
            track.classList.remove('is-grabbing');
            track.style.scrollSnapType = 'x mandatory';
            var idx = getActiveIndex();
            scrollToCard(idx);
        });

        updateDots();
        scrollToCard(0);

        var autoPlayInterval = 5000;
        var autoTimer = null;

        function startAutoPlay() {
            stopAutoPlay();
            autoTimer = setInterval(function () {
                var current = getActiveIndex();
                var next = (current + 1) % cards.length;
                scrollToCard(next);
            }, autoPlayInterval);
        }

        function stopAutoPlay() {
            if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
        }

        track.addEventListener('mouseenter', stopAutoPlay);
        track.addEventListener('mouseleave', startAutoPlay);
        track.addEventListener('touchstart', stopAutoPlay, { passive: true });
        track.addEventListener('touchend', function () {
            setTimeout(startAutoPlay, 3000);
        }, { passive: true });

        startAutoPlay();
    });

    // =========================================================
    // 4C. TIMELINE CARD COLLAPSE / EXPAND
    // =========================================================
    document.querySelectorAll('.timeline.timeline--horizontal .timeline-item__card').forEach(function (card) {
        var ul = card.querySelector('ul');
        if (!ul) return;

        var detailNodes = [];
        var foundUl = false;
        var children = Array.from(card.childNodes);
        children.forEach(function (node) {
            if (node === ul) foundUl = true;
            if (foundUl && node.nodeType === 1) detailNodes.push(node);
        });

        if (!detailNodes.length) return;

        var wrapper = document.createElement('div');
        wrapper.className = 'timeline-card__details';
        card.insertBefore(wrapper, detailNodes[0]);
        detailNodes.forEach(function (n) { wrapper.appendChild(n); });

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'timeline-card__toggle';
        btn.innerHTML = '<span class="timeline-card__toggle-label">Mehr lesen</span> <span class="timeline-card__toggle-arrow">\u25BC</span>';
        btn.setAttribute('aria-expanded', 'false');
        card.appendChild(btn);

        btn.addEventListener('click', function () {
            var isOpen = card.classList.contains('is-expanded');
            if (isOpen) {
                wrapper.style.maxHeight = wrapper.scrollHeight + 'px';
                requestAnimationFrame(function () {
                    wrapper.style.maxHeight = '0';
                });
                card.classList.remove('is-expanded');
                btn.querySelector('.timeline-card__toggle-label').textContent = 'Mehr lesen';
                btn.setAttribute('aria-expanded', 'false');
            } else {
                wrapper.style.maxHeight = wrapper.scrollHeight + 'px';
                card.classList.add('is-expanded');
                btn.querySelector('.timeline-card__toggle-label').textContent = 'Weniger';
                btn.setAttribute('aria-expanded', 'true');
                wrapper.addEventListener('transitionend', function handler() {
                    if (card.classList.contains('is-expanded')) {
                        wrapper.style.maxHeight = 'none';
                    }
                    wrapper.removeEventListener('transitionend', handler);
                });
            }
        });
    });

    // =========================================================
    // 5. FINORA SERVICE SLIDER
    // =========================================================
    const root = document.querySelector('[data-finora]');
    if (root) {
        const img = root.querySelector('#fs-img');
        const cardT = root.querySelector('#fs-title');
        const cardB = root.querySelector('#fs-body');
        const items = Array.from(root.querySelectorAll('.fs-item'));
        const dotsWrap = root.querySelector('.fs-dots');
        const prevBtn = root.querySelector('.fs-prev');
        const nextBtn = root.querySelector('.fs-next');
        const currentEl = root.querySelector('#fs-current');
        const totalEl = root.querySelector('#fs-total');

        let currentIndex = 0;
        if (!items.length) return;

        // Preload images
        items.forEach(btn => {
            const u = btn.dataset.img;
            if (u) { const p = new Image(); p.src = u; }
        });

        // Mobile setup
        if (totalEl) totalEl.textContent = items.length.toString();
        if (dotsWrap) {
            items.forEach((btn, idx) => {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'fs-dot';
                dot.dataset.index = idx.toString();
                dotsWrap.appendChild(dot);
            });
        }

        const dots = dotsWrap ? Array.from(dotsWrap.querySelectorAll('.fs-dot')) : [];

        function setIndicators(index) {
            if (currentEl) currentEl.textContent = (index + 1).toString();
            if (dots.length) {
                dots.forEach((d, i) => d.classList.toggle('is-active', i === index));
            }
        }

        function activate(btn) {
            items.forEach(b => b.classList.toggle('is-active', b === btn));
            const index = items.indexOf(btn);
            if (index !== -1) currentIndex = index;

            const title = btn.dataset.title || '';
            const body = btn.dataset.body || '';
            const src = btn.dataset.img || '';

            const card = root.querySelector('.fs-card');
            const SWITCH_DURATION = 400;

            if (card) card.classList.add('fs-card--changing');

            window.setTimeout(() => {
                if (src && img) img.src = src;
                if (cardT) cardT.textContent = title;
                if (cardB) cardB.textContent = body;

                if (card) card.classList.remove('fs-card--changing');
                setIndicators(currentIndex);
            }, SWITCH_DURATION);
        }

        function go(delta) {
            const len = items.length;
            currentIndex = (currentIndex + delta + len) % len;
            activate(items[currentIndex]);
        }

        const initial = items.find(b => b.classList.contains('is-active')) || items[0];
        if (initial) activate(initial);

        // Desktop: Inhalt bei Hover wechseln
        items.forEach(btn => {
            btn.addEventListener('mouseenter', () => activate(btn));
        });

        // Klick weiterhin für Fokus/Tastatur
        root.addEventListener('click', e => {
            const b = e.target.closest('.fs-item');
            if (!b) return;
            activate(b);
        });

        // Mobile buttons
        if (prevBtn) prevBtn.addEventListener('click', () => go(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => go(1));

        // Mobile dots
        if (dotsWrap) {
            dotsWrap.addEventListener('click', e => {
                const dot = e.target.closest('.fs-dot');
                if (!dot) return;
                const idx = parseInt(dot.dataset.index, 10);
                if (!isNaN(idx)) activate(items[idx]);
            });
        }

        // Mobile swipe
        const swipeArea = root.querySelector('.fs-left');
        if (swipeArea) {
            let touchStartX = 0, touchStartY = 0, touchEndX = 0, touchEndY = 0;
            const SWIPE_THRESHOLD = 40;

            swipeArea.addEventListener('touchstart', function (e) {
                if (!e.touches || !e.touches.length) return;
                const t = e.touches[0];
                touchStartX = t.clientX;
                touchStartY = t.clientY;
                touchEndX = t.clientX;
                touchEndY = t.clientY;
            }, { passive: true });

            swipeArea.addEventListener('touchmove', function (e) {
                if (!e.touches || !e.touches.length) return;
                const t = e.touches[0];
                touchEndX = t.clientX;
                touchEndY = t.clientY;
            }, { passive: true });

            swipeArea.addEventListener('touchend', function () {
                const deltaX = touchEndX - touchStartX;
                const deltaY = touchEndY - touchStartY;
                if (Math.abs(deltaX) < Math.abs(deltaY)) return;
                if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
                if (deltaX < 0) go(1); else go(-1);
            });
        }
    }

    // =========================================================
    // 6. TABS (Altersvorsorge Favoriten)
    // =========================================================
    const tabNavs = document.querySelectorAll('.tab-nav');
    tabNavs.forEach(nav => {
        const buttons = nav.querySelectorAll('button');
        const panels = nav.parentElement.querySelectorAll('.tab-panel');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('is-active'));
                panels.forEach(p => p.classList.remove('is-active'));
                btn.classList.add('is-active');
                const target = document.getElementById(btn.dataset.tab);
                if (target) target.classList.add('is-active');
            });
        });
    });

    // =========================================================
    // 7. AUDIENCE NAV (Altersvorsorge)
    // =========================================================
    const audienceNav = document.querySelector('.audience-nav');
    if (audienceNav) {
        const links = audienceNav.querySelectorAll('a');
        const blocks = document.querySelectorAll('.audience-block');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                links.forEach(l => l.classList.remove('is-active'));
                blocks.forEach(b => b.classList.remove('is-active'));
                link.classList.add('is-active');
                const target = document.querySelector(link.getAttribute('href'));
                if (target) target.classList.add('is-active');
            });
        });
    }

    // =========================================================
    // 8. CONTACT FORM VALIDATION (Kontakt)
    // =========================================================
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = contactForm.querySelector('#contact-name');
            const email = contactForm.querySelector('#contact-email');
            const msg = contactForm.querySelector('#contact-message');
            const privacy = contactForm.querySelector('#contact-privacy');
            let valid = true;

            [name, email].forEach(f => {
                if (f && !f.value.trim()) {
                    f.style.borderColor = '#e74c3c';
                    valid = false;
                } else if (f) {
                    f.style.borderColor = '#e5e5e5';
                }
            });

            if (msg) {
                msg.style.borderColor = '#e5e5e5';
            }

            if (email && email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
                email.style.borderColor = '#e74c3c';
                valid = false;
            }

            if (privacy && !privacy.checked) {
                privacy.parentElement.style.outline = '2px solid #e74c3c';
                valid = false;
            } else if (privacy) {
                privacy.parentElement.style.outline = 'none';
            }

            if (valid) {
                alert('Vielen Dank für deine Nachricht! Wir melden uns in Kürze bei dir.');
                contactForm.reset();
            }
        });
    }

    // =========================================================
    // 6. COUNTER ANIMATION (Calc-V2 KPI Strip)
    // =========================================================
    var counterEls = document.querySelectorAll('[data-count]');
    if (counterEls.length) {
        var counted = new Set();

        function formatNumber(n) {
            return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        }

        function animateCounter(el) {
            var target = parseInt(el.getAttribute('data-count'), 10);
            if (isNaN(target)) return;
            var duration = 2000;
            var start = null;
            var prefix = el.textContent.trim().charAt(0) === '+' ? '+' : '';
            var suffix = '';
            var text = el.textContent.trim();
            if (text.indexOf('%') !== -1) suffix = ' %';
            else if (text.indexOf('x') !== -1) suffix = 'x';
            else suffix = '\u00a0\u20ac';

            function step(timestamp) {
                if (!start) start = timestamp;
                var progress = Math.min((timestamp - start) / duration, 1);
                var eased = 1 - Math.pow(1 - progress, 3);
                var current = Math.round(eased * target);
                el.textContent = prefix + formatNumber(current) + suffix;
                if (progress < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        }

        var counterObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting && !counted.has(entry.target)) {
                    counted.add(entry.target);
                    animateCounter(entry.target);
                }
            });
        }, { threshold: 0.5 });

        counterEls.forEach(function (el) {
            counterObserver.observe(el);
        });
    }

});

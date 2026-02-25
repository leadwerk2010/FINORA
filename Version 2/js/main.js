/**
 * Finora Investment Studio — Optimized Static JS
 * Vanilla JS (no jQuery) — all interactions from original Divi export.
 */

document.addEventListener('DOMContentLoaded', () => {

    // =========================================================
    // 0. HERO SLIDER (Startseite – Leistungen-Style, 5s Auto, Pfeile)
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
    // 0B. MOUSE FOLLOWER (nur Startseite, dezent Finora-Style)
    // =========================================================
    const cursorFollower = document.getElementById('cursor-follower');
    if (cursorFollower && document.body.classList.contains('page-home')) {
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

        // Drei Säulen: kein Observer – Scroll-Effekt über scrollPillarCards()
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
    // =========================================================
    document.addEventListener('click', function (e) {
        const btn = e.target && e.target.closest('.testimonials .lw-more-btn');
        if (!btn) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const card = btn.closest('.testimonial-card');
        const section = card && card.closest('.testimonials');
        if (!section || !card) return;

        const wasExpanded = card.classList.contains('is-expanded');

        // 1. Bei allen Karten in dieser Sektion is-expanded entfernen
        var cards = section.querySelectorAll('.testimonial-card');
        for (var i = 0; i < cards.length; i++) {
            cards[i].classList.remove('is-expanded');
        }
        var buttons = section.querySelectorAll('.lw-more-btn');
        for (var j = 0; j < buttons.length; j++) {
            buttons[j].innerHTML = 'Mehr <span class="lw-arrow">&darr;</span>';
        }

        // 2. Nur diese eine Karte wieder öffnen
        if (!wasExpanded) {
            card.classList.add('is-expanded');
            btn.innerHTML = 'Weniger <span class="lw-arrow">&uarr;</span>';
        }
    }, true);

    // Testimonial-Punkte: Anzahl Karten anzeigen (über dem Karussell)
    const testimonialsSection = document.querySelector('.testimonials');
    const testimonialsTrack = testimonialsSection && testimonialsSection.querySelector('.testimonials-track');
    const firstGrid = testimonialsTrack && testimonialsTrack.querySelector('.testimonials-grid');
    const cardCount = firstGrid ? firstGrid.querySelectorAll('.testimonial-card').length : 0;
    if (testimonialsSection && testimonialsTrack && cardCount > 0) {
        const dotsWrap = document.createElement('div');
        dotsWrap.className = 'testimonials-dots-wrap';
        dotsWrap.setAttribute('aria-hidden', 'true');
        const dotsEl = document.createElement('div');
        dotsEl.className = 'testimonials-dots';
        for (let i = 0; i < cardCount; i++) {
            const dot = document.createElement('span');
            dot.className = 'testimonial-dot';
            dotsEl.appendChild(dot);
        }
        dotsWrap.appendChild(dotsEl);
        testimonialsSection.insertBefore(dotsWrap, testimonialsTrack);
    }

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

});

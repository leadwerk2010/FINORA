/**
 * Finora Investment Studio V4 — Motion Engine
 * Vanilla JS: page loader, staggered scroll reveals, 3-layer parallax,
 * gradient mesh animation, card tilt, header glass, accordion, slider, tabs, form.
 */

(function () {
  'use strict';

  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesktop = () => window.innerWidth >= 981;

  // =========================================================
  // 1. PAGE LOADER
  // =========================================================
  function initPageLoader() {
    const loader = document.querySelector('.page-loader');
    if (!loader) return;

    function hideLoader() {
      loader.classList.add('is-hidden');
      document.body.classList.add('is-loaded');
    }

    if (document.readyState === 'complete') {
      setTimeout(hideLoader, 400);
    } else {
      window.addEventListener('load', () => setTimeout(hideLoader, 500));
    }
    setTimeout(hideLoader, 4000);
  }

  // =========================================================
  // 2. HEADER SCROLL GLASS EFFECT
  // =========================================================
  function initHeaderScroll() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        header.classList.toggle('is-scrolled', window.scrollY > 60);
        ticking = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // =========================================================
  // 3. STAGGERED SCROLL REVEAL
  // =========================================================
  function initScrollReveal() {
    const animEls = document.querySelectorAll('.anim');
    if (!animEls.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      animEls.forEach(el => el.classList.add('is-visible'));
      return;
    }

    const sectionMap = new Map();
    animEls.forEach(el => {
      const section = el.closest('section, .faq, .site-footer, .hero') || document.body;
      if (!sectionMap.has(section)) sectionMap.set(section, []);
      sectionMap.get(section).push(el);
    });

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const section = el.closest('section, .faq, .site-footer, .hero') || document.body;
        const siblings = sectionMap.get(section) || [el];
        const idx = siblings.indexOf(el);
        const baseDelay = parseInt(el.style.animationDelay || '0', 10);
        const totalDelay = baseDelay + idx * 100;

        el.style.transitionDelay = totalDelay + 'ms';
        el.classList.add('is-visible');
        observer.unobserve(el);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    animEls.forEach(el => observer.observe(el));
  }

  // =========================================================
  // 4. THREE-LAYER MOUSE PARALLAX
  // =========================================================
  function initMouseParallax() {
    if (isTouch || prefersReducedMotion || !isDesktop()) return;

    const layers = {
      bg: document.querySelectorAll('[data-parallax="bg"]'),
      content: document.querySelectorAll('[data-parallax-speed]'),
      accent: document.querySelectorAll('[data-parallax="accent"]')
    };

    const totalEls = layers.bg.length + layers.content.length + layers.accent.length;
    if (!totalEls) return;

    let mouseX = 0.5, mouseY = 0.5;
    let currentX = 0.5, currentY = 0.5;
    let running = false;

    document.addEventListener('mousemove', e => {
      mouseX = e.clientX / window.innerWidth;
      mouseY = e.clientY / window.innerHeight;
      if (!running) { running = true; requestAnimationFrame(update); }
    }, { passive: true });

    function update() {
      currentX += (mouseX - currentX) * 0.05;
      currentY += (mouseY - currentY) * 0.05;
      const dx = currentX - 0.5;
      const dy = currentY - 0.5;

      layers.bg.forEach(el => {
        el.style.transform = `translate3d(${dx * 0.5}%, ${dy * 0.5}%, 0)`;
      });

      layers.content.forEach(el => {
        const speed = parseFloat(el.dataset.parallaxSpeed) || 0.015;
        el.style.transform = `translate3d(${dx * speed * 100}px, ${dy * speed * 100}px, 0)`;
      });

      layers.accent.forEach(el => {
        el.style.transform = `translate3d(${dx * 2.5}%, ${dy * 2.5}%, 0)`;
      });

      if (Math.abs(mouseX - currentX) > 0.001 || Math.abs(mouseY - currentY) > 0.001) {
        requestAnimationFrame(update);
      } else {
        running = false;
      }
    }
  }

  // =========================================================
  // 5. HERO GRADIENT MESH ANIMATION
  // =========================================================
  function initGradientMesh() {
    const hero = document.querySelector('.page-home .hero');
    if (!hero || prefersReducedMotion) return;

    let time = 0;
    const speed = 0.0003;

    function animate() {
      time += speed;
      const x1 = 20 + Math.sin(time * 0.7) * 15;
      const y1 = 80 + Math.cos(time * 0.5) * 15;
      const x2 = 80 + Math.cos(time * 0.6) * 15;
      const y2 = 20 + Math.sin(time * 0.8) * 15;
      const x3 = 50 + Math.sin(time * 0.4) * 20;
      const y3 = 50 + Math.cos(time * 0.3) * 20;

      hero.style.setProperty('--mesh-x1', x1 + '%');
      hero.style.setProperty('--mesh-y1', y1 + '%');
      hero.style.setProperty('--mesh-x2', x2 + '%');
      hero.style.setProperty('--mesh-y2', y2 + '%');
      hero.style.setProperty('--mesh-x3', x3 + '%');
      hero.style.setProperty('--mesh-y3', y3 + '%');

      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  // =========================================================
  // 6. CARD 3D TILT
  // =========================================================
  function initCardTilt() {
    if (isTouch || prefersReducedMotion || !isDesktop()) return;

    const cards = document.querySelectorAll('.testimonial-card, [data-tilt]');
    if (!cards.length) return;

    cards.forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(800px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-6px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.transition = 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
        setTimeout(() => { card.style.transition = ''; }, 500);
      });
    });
  }

  // =========================================================
  // 7. MOBILE MENU
  // =========================================================
  function initMobileMenu() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const menu = document.querySelector('.mobile-menu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
      const isOpen = menu.classList.contains('is-open');
      menu.classList.toggle('is-open');
      toggle.classList.toggle('is-active');

      if (!isOpen) {
        menu.querySelectorAll('a').forEach((link, i) => {
          link.style.transitionDelay = (i * 60 + 100) + 'ms';
        });
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  // =========================================================
  // 8. FAQ ACCORDION
  // =========================================================
  function initAccordion() {
    const items = document.querySelectorAll('.accordion-item');
    if (!items.length) return;

    items.forEach(item => {
      const title = item.querySelector('.accordion-title');
      const content = item.querySelector('.accordion-content');
      if (!title || !content) return;

      if (item.classList.contains('is-open')) {
        content.style.maxHeight = content.scrollHeight + 'px';
        content.style.opacity = '1';
      }

      title.addEventListener('click', () => {
        const isOpen = item.classList.contains('is-open');
        items.forEach(i => {
          const c = i.querySelector('.accordion-content');
          if (c) { c.style.maxHeight = '0'; c.style.opacity = '0'; }
          i.classList.remove('is-open');
        });
        if (!isOpen) {
          item.classList.add('is-open');
          content.style.maxHeight = content.scrollHeight + 'px';
          content.style.opacity = '1';
        }
      });
    });
  }

  // =========================================================
  // 9. TESTIMONIAL EXPAND/COLLAPSE
  // =========================================================
  function initTestimonials() {
    document.querySelectorAll('.testimonial-card').forEach(card => {
      const textEl = card.querySelector('.testimonial-text');
      const btn = card.querySelector('.lw-more-btn');
      if (!textEl || !btn) return;

      let expanded = false;
      btn.addEventListener('click', e => {
        e.stopPropagation();
        expanded = !expanded;
        textEl.classList.toggle('is-expanded', expanded);
        btn.innerHTML = expanded
          ? 'Weniger <span class="lw-arrow">&uarr;</span>'
          : 'Mehr <span class="lw-arrow">&darr;</span>';
      });
    });
  }

  // =========================================================
  // 10. FINORA SERVICE SLIDER
  // =========================================================
  function initSlider() {
    const root = document.querySelector('[data-finora]');
    if (!root) return;

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

    items.forEach(btn => {
      const u = btn.dataset.img;
      if (u) { const p = new Image(); p.src = u; }
    });

    if (totalEl) totalEl.textContent = items.length.toString();
    if (dotsWrap) {
      items.forEach((_, idx) => {
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
      dots.forEach((d, i) => d.classList.toggle('is-active', i === index));
    }

    function activate(btn) {
      items.forEach(b => b.classList.toggle('is-active', b === btn));
      const index = items.indexOf(btn);
      if (index !== -1) currentIndex = index;

      const title = btn.dataset.title || '';
      const body = btn.dataset.body || '';
      const src = btn.dataset.img || '';

      if (img) img.style.opacity = '0';
      requestAnimationFrame(() => {
        if (src && img) img.src = src;
        if (cardT) cardT.textContent = title;
        if (cardB) cardB.textContent = body;
        if (img) img.onload = () => { img.style.opacity = '1'; };
      });
      setIndicators(currentIndex);
    }

    function go(delta) {
      currentIndex = (currentIndex + delta + items.length) % items.length;
      activate(items[currentIndex]);
    }

    const initial = items.find(b => b.classList.contains('is-active')) || items[0];
    if (initial) activate(initial);

    root.addEventListener('click', e => {
      const b = e.target.closest('.fs-item');
      if (b) activate(b);
    });

    if (prevBtn) prevBtn.addEventListener('click', () => go(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => go(1));

    if (dotsWrap) {
      dotsWrap.addEventListener('click', e => {
        const dot = e.target.closest('.fs-dot');
        if (!dot) return;
        const idx = parseInt(dot.dataset.index, 10);
        if (!isNaN(idx)) activate(items[idx]);
      });
    }

    const swipeArea = root.querySelector('.fs-left');
    if (swipeArea) {
      let touchStartX = 0, touchEndX = 0, touchStartY = 0, touchEndY = 0;
      swipeArea.addEventListener('touchstart', e => {
        if (!e.touches.length) return;
        touchStartX = touchEndX = e.touches[0].clientX;
        touchStartY = touchEndY = e.touches[0].clientY;
      }, { passive: true });
      swipeArea.addEventListener('touchmove', e => {
        if (!e.touches.length) return;
        touchEndX = e.touches[0].clientX;
        touchEndY = e.touches[0].clientY;
      }, { passive: true });
      swipeArea.addEventListener('touchend', () => {
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        if (Math.abs(dx) < Math.abs(dy) || Math.abs(dx) < 40) return;
        go(dx < 0 ? 1 : -1);
      });
    }
  }

  // =========================================================
  // 11. TABS
  // =========================================================
  function initTabs() {
    document.querySelectorAll('.tab-nav').forEach(nav => {
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
  }

  // =========================================================
  // 12. AUDIENCE NAV
  // =========================================================
  function initAudienceNav() {
    const navs = document.querySelectorAll('.audience-nav, .audience-links');
    navs.forEach(nav => {
      const links = nav.querySelectorAll('a');
      links.forEach(link => {
        link.addEventListener('click', e => {
          e.preventDefault();
          links.forEach(l => l.classList.remove('is-active'));
          link.classList.add('is-active');
          const targetId = link.getAttribute('href');
          if (targetId && targetId.startsWith('#')) {
            const target = document.querySelector(targetId);
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        });
      });
    });
  }

  // =========================================================
  // 13. CONTACT FORM VALIDATION
  // =========================================================
  function initContactForm() {
    const form = document.querySelector('.contact-form');
    if (!form) return;

    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = form.querySelector('#contact-name');
      const email = form.querySelector('#contact-email');
      const privacy = form.querySelector('#contact-privacy');
      let valid = true;

      [name, email].forEach(f => {
        if (f && !f.value.trim()) {
          f.style.borderColor = '#e74c3c';
          f.style.boxShadow = '0 0 0 3px rgba(231, 76, 60, 0.15)';
          valid = false;
        } else if (f) {
          f.style.borderColor = '';
          f.style.boxShadow = '';
        }
      });

      if (email && email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        email.style.borderColor = '#e74c3c';
        email.style.boxShadow = '0 0 0 3px rgba(231, 76, 60, 0.15)';
        valid = false;
      }

      if (privacy && !privacy.checked) {
        privacy.parentElement.style.outline = '2px solid #e74c3c';
        valid = false;
      } else if (privacy) {
        privacy.parentElement.style.outline = 'none';
      }

      if (valid) {
        alert('Vielen Dank für Ihre Nachricht! Wir melden uns in Kürze bei Ihnen.');
        form.reset();
      }
    });
  }

  // =========================================================
  // 14. SECTION SCROLL PROGRESS
  // =========================================================
  function initSectionProgress() {
    const sections = document.querySelectorAll('section');
    if (!sections.length) return;

    let ticking = false;
    function updateProgress() {
      const vh = window.innerHeight;
      sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, 1 - rect.top / vh));
        section.style.setProperty('--scroll-progress', progress.toFixed(3));
      });
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(updateProgress); }
    }, { passive: true });
  }

  // =========================================================
  // INIT
  // =========================================================
  function init() {
    initPageLoader();
    initHeaderScroll();
    initScrollReveal();
    initMouseParallax();
    initGradientMesh();
    initCardTilt();
    initMobileMenu();
    initAccordion();
    initTestimonials();
    initSlider();
    initTabs();
    initAudienceNav();
    initContactForm();
    initSectionProgress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

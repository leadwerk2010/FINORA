/**
 * Finora Investment Studio — Awwwards-Level Motion Engine
 * Vanilla JS: page loader, staggered scroll reveals, mouse parallax,
 * header glass transition, accordion animation, slider, tabs, form.
 */

(function () {
  'use strict';

  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
      setTimeout(hideLoader, 300);
    } else {
      window.addEventListener('load', function () {
        setTimeout(hideLoader, 400);
      });
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
      requestAnimationFrame(function () {
        if (window.scrollY > 60) {
          header.classList.add('is-scrolled');
        } else {
          header.classList.remove('is-scrolled');
        }
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

    if (prefersReducedMotion) {
      animEls.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    if (!('IntersectionObserver' in window)) {
      animEls.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var sectionMap = new Map();
    animEls.forEach(function (el) {
      var section = el.closest('section, .faq, .site-footer, .hero');
      if (!section) section = document.body;
      if (!sectionMap.has(section)) {
        sectionMap.set(section, []);
      }
      sectionMap.get(section).push(el);
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var section = el.closest('section, .faq, .site-footer, .hero') || document.body;
        var siblings = sectionMap.get(section) || [el];
        var idx = siblings.indexOf(el);
        var baseDelay = parseInt(el.style.animationDelay || '0', 10);
        var staggerDelay = idx * 80;
        var totalDelay = baseDelay + staggerDelay;

        el.style.transitionDelay = totalDelay + 'ms';
        el.classList.add('is-visible');
        observer.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    animEls.forEach(function (el) { observer.observe(el); });
  }

  // =========================================================
  // 4. MOUSE PARALLAX
  // =========================================================
  function initMouseParallax() {
    if (isTouch || prefersReducedMotion) return;
    if (window.innerWidth < 981) return;

    var parallaxEls = document.querySelectorAll('[data-parallax-speed]');
    if (!parallaxEls.length) return;

    var mouseX = 0.5;
    var mouseY = 0.5;
    var currentX = 0.5;
    var currentY = 0.5;
    var running = false;

    document.addEventListener('mousemove', function (e) {
      mouseX = e.clientX / window.innerWidth;
      mouseY = e.clientY / window.innerHeight;
      if (!running) {
        running = true;
        requestAnimationFrame(updateParallax);
      }
    }, { passive: true });

    function updateParallax() {
      currentX += (mouseX - currentX) * 0.06;
      currentY += (mouseY - currentY) * 0.06;

      var dx = (currentX - 0.5);
      var dy = (currentY - 0.5);

      parallaxEls.forEach(function (el) {
        var speed = parseFloat(el.dataset.parallaxSpeed) || 0.02;
        var x = dx * speed * 100;
        var y = dy * speed * 100;
        el.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0)';
      });

      if (Math.abs(mouseX - currentX) > 0.001 || Math.abs(mouseY - currentY) > 0.001) {
        requestAnimationFrame(updateParallax);
      } else {
        running = false;
      }
    }
  }

  // =========================================================
  // 5. MOBILE MENU (Full-screen overlay)
  // =========================================================
  function initMobileMenu() {
    var toggle = document.querySelector('.mobile-menu-toggle');
    var menu = document.querySelector('.mobile-menu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', function () {
      var isOpen = menu.classList.contains('is-open');
      menu.classList.toggle('is-open');
      toggle.classList.toggle('is-active');

      if (!isOpen) {
        var links = menu.querySelectorAll('a');
        links.forEach(function (link, i) {
          link.style.transitionDelay = (i * 60 + 100) + 'ms';
        });
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  // =========================================================
  // 6. FAQ ACCORDION (animated max-height)
  // =========================================================
  function initAccordion() {
    var items = document.querySelectorAll('.accordion-item');
    if (!items.length) return;

    items.forEach(function (item) {
      var title = item.querySelector('.accordion-title');
      var content = item.querySelector('.accordion-content');
      if (!title || !content) return;

      if (item.classList.contains('is-open')) {
        content.style.maxHeight = content.scrollHeight + 'px';
        content.style.opacity = '1';
        content.style.paddingTop = '';
      }

      title.addEventListener('click', function () {
        var isOpen = item.classList.contains('is-open');

        items.forEach(function (i) {
          var c = i.querySelector('.accordion-content');
          if (c) {
            c.style.maxHeight = '0';
            c.style.opacity = '0';
          }
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
  // 7. TESTIMONIAL EXPAND/COLLAPSE
  // =========================================================
  function initTestimonials() {
    document.querySelectorAll('.testimonial-card').forEach(function (card) {
      var textEl = card.querySelector('.testimonial-text');
      var btn = card.querySelector('.lw-more-btn');
      if (!textEl || !btn) return;

      var expanded = false;
      btn.addEventListener('click', function (e) {
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
  // 8. FINORA SERVICE SLIDER
  // =========================================================
  function initSlider() {
    var root = document.querySelector('[data-finora]');
    if (!root) return;

    var img = root.querySelector('#fs-img');
    var cardT = root.querySelector('#fs-title');
    var cardB = root.querySelector('#fs-body');
    var items = Array.from(root.querySelectorAll('.fs-item'));
    var dotsWrap = root.querySelector('.fs-dots');
    var prevBtn = root.querySelector('.fs-prev');
    var nextBtn = root.querySelector('.fs-next');
    var currentEl = root.querySelector('#fs-current');
    var totalEl = root.querySelector('#fs-total');

    var currentIndex = 0;
    if (!items.length) return;

    items.forEach(function (btn) {
      var u = btn.dataset.img;
      if (u) { var p = new Image(); p.src = u; }
    });

    if (totalEl) totalEl.textContent = items.length.toString();
    if (dotsWrap) {
      items.forEach(function (btn, idx) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'fs-dot';
        dot.dataset.index = idx.toString();
        dotsWrap.appendChild(dot);
      });
    }

    var dots = dotsWrap ? Array.from(dotsWrap.querySelectorAll('.fs-dot')) : [];

    function setIndicators(index) {
      if (currentEl) currentEl.textContent = (index + 1).toString();
      if (dots.length) {
        dots.forEach(function (d, i) { d.classList.toggle('is-active', i === index); });
      }
    }

    function activate(btn) {
      items.forEach(function (b) { b.classList.toggle('is-active', b === btn); });
      var index = items.indexOf(btn);
      if (index !== -1) currentIndex = index;

      var title = btn.dataset.title || '';
      var body = btn.dataset.body || '';
      var src = btn.dataset.img || '';

      if (img) img.style.opacity = '0';
      requestAnimationFrame(function () {
        if (src && img) img.src = src;
        if (cardT) cardT.textContent = title;
        if (cardB) cardB.textContent = body;
        if (img) img.onload = function () { img.style.opacity = '1'; };
      });

      setIndicators(currentIndex);
    }

    function go(delta) {
      var len = items.length;
      currentIndex = (currentIndex + delta + len) % len;
      activate(items[currentIndex]);
    }

    var initial = items.find(function (b) { return b.classList.contains('is-active'); }) || items[0];
    if (initial) activate(initial);

    root.addEventListener('click', function (e) {
      var b = e.target.closest('.fs-item');
      if (!b) return;
      activate(b);
    });

    if (prevBtn) prevBtn.addEventListener('click', function () { go(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { go(1); });

    if (dotsWrap) {
      dotsWrap.addEventListener('click', function (e) {
        var dot = e.target.closest('.fs-dot');
        if (!dot) return;
        var idx = parseInt(dot.dataset.index, 10);
        if (!isNaN(idx)) activate(items[idx]);
      });
    }

    var swipeArea = root.querySelector('.fs-left');
    if (swipeArea) {
      var touchStartX = 0, touchStartY = 0, touchEndX = 0, touchEndY = 0;
      var SWIPE_THRESHOLD = 40;

      swipeArea.addEventListener('touchstart', function (e) {
        if (!e.touches || !e.touches.length) return;
        var t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchEndX = t.clientX;
        touchEndY = t.clientY;
      }, { passive: true });

      swipeArea.addEventListener('touchmove', function (e) {
        if (!e.touches || !e.touches.length) return;
        var t = e.touches[0];
        touchEndX = t.clientX;
        touchEndY = t.clientY;
      }, { passive: true });

      swipeArea.addEventListener('touchend', function () {
        var deltaX = touchEndX - touchStartX;
        var deltaY = touchEndY - touchStartY;
        if (Math.abs(deltaX) < Math.abs(deltaY)) return;
        if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
        if (deltaX < 0) go(1); else go(-1);
      });
    }
  }

  // =========================================================
  // 9. TABS
  // =========================================================
  function initTabs() {
    document.querySelectorAll('.tab-nav').forEach(function (nav) {
      var buttons = nav.querySelectorAll('button');
      var panels = nav.parentElement.querySelectorAll('.tab-panel');
      buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          buttons.forEach(function (b) { b.classList.remove('is-active'); });
          panels.forEach(function (p) { p.classList.remove('is-active'); });
          btn.classList.add('is-active');
          var target = document.getElementById(btn.dataset.tab);
          if (target) target.classList.add('is-active');
        });
      });
    });
  }

  // =========================================================
  // 10. AUDIENCE NAV
  // =========================================================
  function initAudienceNav() {
    var audienceNav = document.querySelector('.audience-nav');
    if (!audienceNav) return;

    var links = audienceNav.querySelectorAll('a');
    var blocks = document.querySelectorAll('.audience-block');
    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        links.forEach(function (l) { l.classList.remove('is-active'); });
        blocks.forEach(function (b) { b.classList.remove('is-active'); });
        link.classList.add('is-active');
        var target = document.querySelector(link.getAttribute('href'));
        if (target) target.classList.add('is-active');
      });
    });
  }

  // =========================================================
  // 11. CONTACT FORM VALIDATION
  // =========================================================
  function initContactForm() {
    var form = document.querySelector('.contact-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.querySelector('#contact-name');
      var email = form.querySelector('#contact-email');
      var privacy = form.querySelector('#contact-privacy');
      var valid = true;

      [name, email].forEach(function (f) {
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
  // 12. SMOOTH SCROLL POSITION TRACKER
  // =========================================================
  function initSectionProgress() {
    var sections = document.querySelectorAll('section');
    if (!sections.length) return;

    var ticking = false;

    function updateProgress() {
      var vh = window.innerHeight;
      sections.forEach(function (section) {
        var rect = section.getBoundingClientRect();
        var progress = 1 - (rect.top / vh);
        progress = Math.max(0, Math.min(1, progress));
        section.style.setProperty('--scroll-progress', progress.toFixed(3));
      });
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateProgress);
      }
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

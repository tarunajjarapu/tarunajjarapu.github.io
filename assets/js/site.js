(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    const targets = [...document.querySelectorAll('.section-heading, .about-story, .experience-row, .project-card, .education-section, .launch-screen, .launch-description > div, .video-topics article')];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.dataset.reveal = 'visible';
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    targets.forEach(target => {
      if (target.getBoundingClientRect().top < window.innerHeight - 24) return;
      target.dataset.reveal = 'pending';
      observer.observe(target);
    });
    const showAll = () => {
      targets.forEach(target => { target.dataset.reveal = 'visible'; });
      observer.disconnect();
    };
    reducedMotion.addEventListener('change', event => { if (event.matches) showAll(); });
    document.addEventListener('focusin', event => {
      const target = event.target.closest('[data-reveal]');
      if (target) target.dataset.reveal = 'visible';
    });
    window.addEventListener('beforeprint', showAll);
  }

  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.mobile-nav');
  if (menu && nav) {
    const closeMenu = () => {
      menu.setAttribute('aria-expanded', 'false');
      nav.hidden = true;
    };
    menu.addEventListener('click', () => {
      const expanded = menu.getAttribute('aria-expanded') === 'true';
      menu.setAttribute('aria-expanded', String(!expanded));
      nav.hidden = expanded;
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !nav.hidden) {
        closeMenu();
        menu.focus();
      }
    });
    document.addEventListener('click', event => {
      if (!nav.hidden && !nav.contains(event.target) && !menu.contains(event.target)) closeMenu();
    });
    nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
    window.matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
  }
})();

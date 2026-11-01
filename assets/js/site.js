(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    const targets = [...document.querySelectorAll('.section-heading, .notebook-cover, .topic-row, .video-feature, .more-than-code > div, .about-story, .experience-row, .project-card, .education-section, .launch-screen, .launch-description > div, .video-topics article, .writing-empty, .writing-footnote')];
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

  const filters = [...document.querySelectorAll('[data-topic]')];
  if (!filters.length) return;
  const posts = [...document.querySelectorAll('[data-category]')];
  const empty = document.querySelector('.writing-empty');
  const status = document.querySelector('.filter-status');
  const descriptions = {
    Systems: 'Notes on operating systems, memory, concurrency, and distributed systems will live here.',
    ML: 'Notes on inference, reinforcement learning, and the systems behind ML will live here.',
    Notes: 'Code experiments, benchmarks, and implementation notes will live here.'
  };
  function applyFilter(topic, updateUrl = false) {
    if (!filters.some(button => button.dataset.topic === topic)) topic = 'All';
    filters.forEach(button => {
      const selected = button.dataset.topic === topic;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    let count = 0;
    posts.forEach(post => {
      const visible = topic === 'All' || post.dataset.category === topic;
      post.hidden = !visible;
      if (visible) count += 1;
      if (visible && updateUrl && !reducedMotion.matches) {
        post.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 250, easing: 'ease-out' });
      }
    });
    empty.hidden = count > 0;
    empty.querySelector('[data-empty-title]').textContent = topic === 'All' ? 'No published notes yet.' : `No published notes in ${topic}.`;
    empty.querySelector('[data-empty-description]').textContent = descriptions[topic] || 'Upcoming: systems programming, ML infrastructure, and implementation notes.';
    status.textContent = `${count} ${count === 1 ? 'note' : 'notes'}${topic === 'All' ? '' : ` in ${topic}`}.`;
    if (updateUrl) {
      const url = new URL(window.location.href);
      if (topic === 'All') url.searchParams.delete('topic');
      else url.searchParams.set('topic', topic);
      window.history.pushState({}, '', url);
    }
  }
  filters.forEach(button => button.addEventListener('click', () => applyFilter(button.dataset.topic, true)));
  window.addEventListener('popstate', () => applyFilter(new URLSearchParams(window.location.search).get('topic') || 'All'));
  applyFilter(new URLSearchParams(window.location.search).get('topic') || 'All');
})();

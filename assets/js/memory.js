// Illustrative 4 KiB pages: translate the page number, preserve the 12-bit offset.
// https://cdn.kernel.org/doc/html/latest/admin-guide/mm/concepts.html
(() => {
  const panel = document.querySelector('#memory');
  if (!panel) return;
  const mappings = [
    { name: 'home', path: '/', frame: 3 },
    { name: 'writing', path: '/writing/', frame: 0 },
    { name: 'about', path: '/about/', frame: 5 },
    { name: 'videos', path: '/videos/', frame: 2 }
  ];
  const buttons = [...panel.querySelectorAll('[data-page]')];
  const frames = [...panel.querySelectorAll('[data-frame]')];
  const board = panel.querySelector('.memory-board');
  const table = panel.querySelector('.memory-pte');
  const svg = panel.querySelector('.memory-wires');
  const wires = [...svg.querySelectorAll('path')];
  const slider = panel.querySelector('#memory-offset');
  const toggle = panel.querySelector('.memory-motion');
  const destination = panel.querySelector('.memory-destination');
  const status = panel.querySelector('#memory-status');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let selected = 2;
  let offset = Number(slider.value);
  let paused = false;
  let hovered = false;
  let visible = !('IntersectionObserver' in window);
  let timer;
  let animations = [];
  const hex = (value, length) => value.toString(16).toUpperCase().padStart(length, '0');

  function cancelMotion() {
    animations.forEach(animation => animation.cancel());
    animations = [];
  }
  function drawWires() {
    const bounds = board.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
    const page = buttons[selected].getBoundingClientRect();
    const frame = frames[mappings[selected].frame].getBoundingClientRect();
    const entry = table.getBoundingClientRect();
    const source = [page.right - bounds.left, page.top + page.height / 2 - bounds.top];
    const left = [entry.left - bounds.left, entry.top + entry.height / 2 - bounds.top];
    const right = [entry.right - bounds.left, left[1]];
    const target = [frame.left - bounds.left, frame.top + frame.height / 2 - bounds.top];
    function curve(a, b) {
      const middle = (a[0] + b[0]) / 2;
      return `M ${a[0]} ${a[1]} C ${middle} ${a[1]}, ${middle} ${b[1]}, ${b[0]} ${b[1]}`;
    }
    wires[0].setAttribute('d', curve(source, left));
    wires[1].setAttribute('d', curve(right, target));
    wires.forEach(wire => { wire.style.strokeDasharray = 'none'; });
  }
  function translate(animate = false, announce = false) {
    cancelMotion();
    const mapping = mappings[selected];
    buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === selected)));
    frames.forEach((frame, index) => frame.classList.toggle('is-active', index === mapping.frame));
    panel.querySelector('[data-vpn]').textContent = hex(selected, 2);
    panel.querySelector('[data-pfn]').textContent = hex(mapping.frame, 2);
    panel.querySelector('[data-va-page]').textContent = hex(selected, 5);
    panel.querySelector('[data-pa-page]').textContent = hex(mapping.frame, 5);
    panel.querySelectorAll('[data-offset-bits]').forEach(span => { span.textContent = hex(offset, 3); });
    panel.querySelector('[data-offset-value]').textContent = `+0x${hex(offset, 3)}`;
    slider.setAttribute('aria-valuetext', `${offset} ${offset === 1 ? 'byte' : 'bytes'}, hexadecimal ${hex(offset, 3)}`);
    destination.href = mapping.path;
    destination.firstChild.textContent = `Open /${mapping.name} `;
    drawWires();
    if (animate && !reduced.matches && visible && !document.hidden) {
      wires.forEach((wire, index) => {
        const length = wire.getTotalLength();
        wire.style.strokeDasharray = String(length);
        animations.push(wire.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], {
          duration: 550, delay: index * 350, easing: 'ease-in-out', fill: 'backwards'
        }));
      });
      animations.push(frames[mapping.frame].animate([
        { opacity: .3, transform: 'translateX(-3px)' }, { opacity: 1, transform: 'translateX(0)' }
      ], { duration: 600, delay: 500, easing: 'ease-out', fill: 'backwards' }));
      animations.push(panel.querySelector('[data-pa-page]').animate([
        { opacity: .15 }, { opacity: 1 }
      ], { duration: 450, delay: 650, fill: 'backwards' }));
    }
    if (announce) {
      status.textContent = `/${mapping.name}: virtual page ${hex(selected, 2)} maps to physical frame ${hex(mapping.frame, 2)}. Offset ${offset} ${offset === 1 ? 'byte' : 'bytes'} is unchanged.`;
    }
  }
  function sync() {
    clearTimeout(timer);
    const focused = panel.contains(document.activeElement) && document.activeElement !== toggle;
    const stopped = paused || reduced.matches;
    toggle.dataset.paused = String(stopped);
    toggle.disabled = reduced.matches;
    const label = reduced.matches ? 'Reduced motion enabled' : paused ? 'Resume memory animation' : 'Pause memory animation';
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
    panel.querySelector('.memory-mode').textContent = reduced.matches ? 'STATIC' : paused ? 'PAUSED' : hovered || focused ? 'HOLD' : 'AUTO';
    if (stopped || !visible || document.hidden) cancelMotion();
    if (!stopped && visible && !document.hidden && !hovered && !focused) {
      timer = setTimeout(() => {
        selected = (selected + 1) % mappings.length;
        translate(true);
        sync();
      }, 4600);
    }
  }

  buttons.forEach((button, index) => button.addEventListener('click', () => {
    selected = index;
    paused = true;
    sync();
    translate(true, true);
  }));
  slider.addEventListener('input', () => {
    offset = Number(slider.value);
    paused = true;
    sync();
    translate();
  });
  slider.addEventListener('change', () => translate(false, true));
  toggle.hidden = false;
  toggle.addEventListener('click', () => { paused = !paused; sync(); });
  panel.addEventListener('pointerover', event => {
    hovered = Boolean(event.target.closest('.memory-page,.memory-destination,.memory-offset-control'));
    sync();
  });
  panel.addEventListener('pointerleave', () => { hovered = false; sync(); });
  panel.addEventListener('focusin', sync);
  panel.addEventListener('focusout', () => queueMicrotask(sync));
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold: .15 }).observe(panel);
  }
  new ResizeObserver(() => { cancelMotion(); drawWires(); }).observe(board);
  window.addEventListener('pagehide', () => { clearTimeout(timer); cancelMotion(); });
  window.addEventListener('pageshow', () => { drawWires(); sync(); });
  window.addEventListener('beforeprint', () => { clearTimeout(timer); cancelMotion(); });
  window.addEventListener('afterprint', sync);
  translate();
  sync();
})();

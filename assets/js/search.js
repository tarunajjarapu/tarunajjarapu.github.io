(() => {
  let indexPromise;
  const normalize = value => String(value || '').toLowerCase();
  const fields = post => [post.title, post.description, post.category, post.text];
  const matches = (post, query) => fields(post).some(value => normalize(value).includes(normalize(query).trim()));
  function index() {
    if (!indexPromise) {
      indexPromise = fetch('/site-index.json').then(response => {
        if (!response.ok) throw new Error('Index unavailable');
        return response.json();
      }).then(data => {
        if (!Array.isArray(data.posts)) throw new Error('Invalid index');
        return data.posts.filter(post => typeof post.title === 'string' && typeof post.description === 'string' && /^\/writing\/[a-z0-9-]+\/$/.test(post.path));
      }).catch(error => { indexPromise = null; throw error; });
    }
    return indexPromise;
  }
  function excerpt(text, query) {
    const position = normalize(text).indexOf(normalize(query).trim());
    if (position < 0) return '';
    const start = Math.max(0, position - 55);
    const end = Math.min(text.length, Math.max(start + 180, position + query.length + 55));
    return `${start ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
  }
  function highlight(element, text, query) {
    element.replaceChildren();
    if (!query) { element.textContent = text; return; }
    // Escaping makes every query literal, including code punctuation such as [ or *.
    const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    let end = 0;
    for (const match of text.matchAll(pattern)) {
      element.append(document.createTextNode(text.slice(end, match.index)));
      const mark = document.createElement('mark');
      mark.textContent = match[0];
      element.append(mark);
      end = match.index + match[0].length;
    }
    element.append(document.createTextNode(text.slice(end)));
  }
  window.BlogSearch = { index, matches, excerpt, highlight };

  const root = document.querySelector('[data-blog-index]');
  if (!root) return;
  const form = root.querySelector('.blog-search');
  const input = root.querySelector('#blog-query');
  const clear = root.querySelector('.search-clear');
  const reset = root.querySelector('.reset-search');
  const filters = [...root.querySelectorAll('[data-topic]')];
  const status = root.querySelector('.search-count');
  const empty = root.querySelector('.blog-empty');
  const hint = root.querySelector('.search-hint');
  const defaultHint = hint.textContent;
  const rows = [...root.querySelectorAll('.post-row')].map(element => ({
    element, path: element.getAttribute('href'), title: element.querySelector('h2').textContent,
    description: element.querySelector('p').textContent, category: element.dataset.category, text: ''
  }));
  let topic = 'All';
  let fullTextReady = rows.length === 0;
  let revision = 0;
  form.hidden = false;
  hint.hidden = false;
  root.querySelector('.filters').hidden = false;

  function syncUrl(mode) {
    const url = new URL(window.location.href);
    const query = input.value.trim();
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    if (topic !== 'All') url.searchParams.set('topic', topic);
    else url.searchParams.delete('topic');
    if (url.href !== window.location.href) window.history[mode === 'push' ? 'pushState' : 'replaceState']({}, '', url);
  }
  async function apply(mode) {
    const currentRevision = ++revision;
    const query = input.value.trim();
    if (mode) syncUrl(mode);
    clear.hidden = !input.value;
    root.querySelector('.search-shortcut').hidden = Boolean(input.value);
    filters.forEach(button => {
      const selected = button.dataset.topic === topic;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    if (query && !fullTextReady) {
      status.textContent = 'Searching…';
      root.setAttribute('aria-busy', 'true');
      try {
        const posts = await index();
        rows.forEach(row => { row.text = posts.find(post => post.path === row.path)?.text || ''; });
        fullTextReady = true;
        hint.textContent = defaultHint;
        hint.classList.add('sr-only');
      } catch {
        hint.textContent = 'Full-text search is unavailable. Searching titles and descriptions; type again to retry.';
        hint.classList.remove('sr-only');
      }
    }
    if (currentRevision !== revision) return;
    root.removeAttribute('aria-busy');
    let count = 0;
    rows.forEach(row => {
      const visible = (topic === 'All' || row.category === topic) && (!query || matches(row, query));
      row.element.hidden = !visible;
      if (!visible) return;
      count += 1;
      highlight(row.element.querySelector('h2'), row.title, query);
      highlight(row.element.querySelector('p'), row.description, query);
      const context = query && !normalize(row.description).includes(normalize(query)) ? excerpt(row.text, query) : '';
      const snippet = row.element.querySelector('.post-match');
      snippet.hidden = !context;
      highlight(snippet, context, query);
    });
    const noun = query ? (count === 1 ? 'match' : 'matches') : (count === 1 ? 'post' : 'posts');
    status.textContent = `${count} ${noun}${topic === 'All' ? '' : ` in ${topic}`}`;
    empty.hidden = count > 0;
    const hasFilter = Boolean(query) || topic !== 'All';
    reset.hidden = !hasFilter;
    if (!rows.length) {
      empty.querySelector('[data-empty-title]').textContent = 'No posts published yet.';
      empty.querySelector('[data-empty-description]').textContent = 'New posts will appear here. Follow via RSS to keep up.';
    } else {
      empty.querySelector('[data-empty-title]').textContent = query ? `No matches for “${query}”.` : `No posts in ${topic} yet.`;
      empty.querySelector('[data-empty-description]').textContent = 'Try another search or clear the filters.';
    }
  }
  function fromUrl() {
    const params = new URLSearchParams(window.location.search);
    input.value = (params.get('q') || '').slice(0, 160);
    topic = filters.some(button => button.dataset.topic === params.get('topic')) ? params.get('topic') : 'All';
    apply();
  }
  input.addEventListener('input', () => apply('replace'));
  form.addEventListener('submit', event => { event.preventDefault(); apply('replace'); });
  filters.forEach(button => button.addEventListener('click', () => { topic = button.dataset.topic; apply('push'); }));
  clear.addEventListener('click', () => { input.value = ''; apply('replace'); input.focus({ preventScroll: true }); });
  reset.addEventListener('click', () => { input.value = ''; topic = 'All'; apply('push'); input.focus({ preventScroll: true }); });
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape' && input.value) { event.preventDefault(); input.value = ''; apply('replace'); }
  });
  document.addEventListener('keydown', event => {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return;
    if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault();
    input.focus();
  });
  window.addEventListener('popstate', fromUrl);
  fromUrl();
})();

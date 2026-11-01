(() => {
  const pages = [
    { name: 'home', path: '/', description: 'Overview' },
    { name: 'about', path: '/about/', description: 'Background & experience' },
    { name: 'writing', path: '/writing/', description: 'Systems, ML & technical notes' },
    { name: 'videos', path: '/videos/', description: 'Technical breakdowns' },
    { name: 'projects', path: '/about/#projects', description: 'Rust, operating systems & memory' },
    { name: 'experience', path: '/about/#experience', description: 'Judgment Labs, Databricks, Stripe & more' }
  ];
  const aliases = { blog: 'writing', youtube: 'videos', '~': 'home', '..': 'home', signal: 'memory' };
  const commands = ['help', 'ls', 'home', 'about', 'writing', 'videos', 'projects', 'experience', 'whoami', 'contact', 'search', 'open', 'cd', 'theme', 'memory', 'clear'];
  const topics = ['Systems', 'ML', 'Notes'];
  const dock = document.querySelector('#terminal-dock');
  if (!dock) return;
  const outputPanel = dock.querySelector('.terminal-output-panel');
  const expandButton = dock.querySelector('.terminal-expand');
  const dockInput = dock.querySelector('input');
  const launcher = document.querySelector('.terminal-launch');
  const focusKey = 'tarun-terminal-next-focus';
  let indexPromise;
  let publishedPosts = [];
  let commandHistory = [];
  let previousFocus;
  try {
    const saved = JSON.parse(sessionStorage.getItem('tarun-commands') || '[]');
    if (Array.isArray(saved)) commandHistory = saved.filter(item => typeof item === 'string' && item.length <= 160).slice(-50);
  } catch { /* History still works for this page without browser storage. */ }

  function index() {
    if (!indexPromise) {
      indexPromise = fetch('/site-index.json').then(response => {
        if (!response.ok) throw new Error('Index unavailable');
        return response.json();
      }).then(data => {
        publishedPosts = data.posts.filter(post => /^\/writing\/[a-z0-9-]+\/$/.test(post.path));
        return publishedPosts;
      }).catch(error => { indexPromise = null; throw error; });
    }
    return indexPromise;
  }

  function setExpanded(expanded) {
    if (!expanded && outputPanel.contains(document.activeElement)) dockInput.focus({ preventScroll: true });
    outputPanel.hidden = !expanded;
    dock.dataset.expanded = String(expanded);
    expandButton.setAttribute('aria-expanded', String(expanded));
    expandButton.setAttribute('aria-label', expanded ? 'Minimize terminal output' : 'Expand terminal output');
    expandButton.querySelector('.terminal-expand-label').textContent = expanded ? 'Minimize' : 'Index';
    try { sessionStorage.setItem('tarun-terminal-expanded', String(expanded)); } catch { /* Optional. */ }
  }
  function focusTerminal() {
    if (!dock.contains(document.activeElement)) previousFocus = document.activeElement;
    const menu = document.querySelector('.menu-toggle[aria-expanded="true"]');
    if (menu) menu.click();
    setExpanded(true);
    dockInput.focus({ preventScroll: true });
  }
  function showMemory() {
    setExpanded(false);
    const memory = document.querySelector('#memory');
    if (!memory) { navigate('/#memory'); return; }
    memory.scrollIntoView({ block: 'center' });
    dockInput.focus({ preventScroll: true });
  }
  function updatePath() {
    const path = window.location.pathname.replace(/\/$/, '') + window.location.hash;
    dock.querySelector('.terminal-path').textContent = `~${path}`;
    dock.querySelector('.terminal-path').title = `~${path}`;
  }
  function navigate(path) {
    const target = new URL(path, window.location.href);
    if (target.pathname === window.location.pathname && target.search === window.location.search) {
      // Native fragment navigation moves focus out of the command line.
      if (target.href !== window.location.href) window.history.pushState({}, '', target.href);
      updatePath();
      if (target.hash) document.getElementById(decodeURIComponent(target.hash.slice(1)))?.scrollIntoView({ block: 'start' });
      else window.scrollTo({ top: 0 });
      dockInput.focus({ preventScroll: true });
      return;
    }
    // A one-use handoff restores command focus after a full page navigation.
    try { sessionStorage.setItem(focusKey, JSON.stringify({ href: target.href, time: Date.now() })); } catch { /* Storage is optional. */ }
    window.location.assign(target.href);
  }
  window.addEventListener('pageshow', () => {
    let pending;
    try {
      pending = JSON.parse(sessionStorage.getItem(focusKey));
      sessionStorage.removeItem(focusKey);
    } catch { return; }
    if (pending?.href === window.location.href && Date.now() - pending.time < 60000) {
      dockInput.focus({ preventScroll: true });
    }
  });
  updatePath();
  window.addEventListener('hashchange', updatePath);
  window.addEventListener('popstate', updatePath);
  let expanded = false;
  try { expanded = sessionStorage.getItem('tarun-terminal-expanded') === 'true'; } catch { /* Start compact. */ }
  setExpanded(expanded);
  dock.hidden = false;
  launcher.hidden = false;
  launcher.addEventListener('click', focusTerminal);
  expandButton.addEventListener('click', () => setExpanded(outputPanel.hidden));
  // Reserve space so the fixed terminal never prevents reaching the page footer.
  const reserveSpace = () => document.documentElement.style.setProperty('--terminal-height', `${dock.offsetHeight}px`);
  reserveSpace();
  new ResizeObserver(reserveSpace).observe(dock);
  document.addEventListener('focusin', event => {
    if (dock.contains(event.target) || !(event.target instanceof HTMLElement)) return;
    if (event.target.getBoundingClientRect().bottom > dock.getBoundingClientRect().top) {
      event.target.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  });
  if (window.visualViewport) {
    const fitViewport = () => {
      const viewport = window.visualViewport;
      const keyboardOffset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      dock.style.bottom = `${keyboardOffset}px`;
      dock.style.setProperty('--terminal-viewport', `${viewport.height}px`);
    };
    window.visualViewport.addEventListener('resize', fitViewport);
    window.visualViewport.addEventListener('scroll', fitViewport);
    fitViewport();
  }
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      focusTerminal();
    }
    if (event.key === 'Escape' && dock.contains(document.activeElement)) {
      event.preventDefault();
      setExpanded(false);
      if (previousFocus?.isConnected && !dock.contains(previousFocus)) previousFocus.focus({ preventScroll: true });
      else expandButton.focus({ preventScroll: true });
    }
  });

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function line(parent, text, muted = false) {
    parent.append(node('p', muted ? 'terminal-line terminal-muted' : 'terminal-line', text));
  }
  function directory(parent, entries) {
    const list = node('div', 'terminal-directory');
    entries.forEach(entry => {
      const link = node('a', entry.title ? 'terminal-post' : '');
      link.href = entry.path;
      if (/^https:\/\//.test(entry.path)) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
      link.append(node('span', '', entry.name || entry.title), node('span', '', entry.description));
      const arrow = node('i', '', '↗');
      arrow.setAttribute('aria-hidden', 'true');
      link.append(arrow);
      list.append(link);
    });
    parent.append(list);
  }
  function findPage(value) {
    value = aliases[value] || value;
    return pages.find(page => page.name === value || page.path === value || (page.path !== '/' && page.path.replace(/\/$/, '') === value));
  }
  function listCurrentPage(parent) {
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    if (path === '/') { directory(parent, pages); return; }

    const main = document.querySelector('main');
    if (path === '/writing') {
      const posts = [...main.querySelectorAll('.post-row:not([hidden])')].map(post => ({
        title: post.querySelector('h2').textContent,
        description: post.querySelector('p').textContent,
        path: post.getAttribute('href')
      }));
      if (posts.length) directory(parent, posts);
      else line(parent, main.querySelector('[data-empty-title]').textContent, true);
      return;
    }

    if (path === '/videos') {
      const videos = [...main.querySelectorAll('.published-video')].map(video => ({
        title: video.querySelector('h3').textContent,
        description: video.querySelector('p').textContent,
        path: video.getAttribute('href')
      }));
      if (videos.length) directory(parent, videos);
      else line(parent, 'No published videos yet.', true);
    }

    // Sections on a page, or heading anchors inside a published article.
    const sections = [...main.querySelectorAll('section[id], .prose h2[id], .prose h3[id]')]
      .filter(section => section.id !== 'episodes')
      .map(section => ({
        name: section.id === 'rabbit-holes' ? 'planned topics' : section.id,
        description: section.querySelector('h2')?.textContent || section.textContent,
        path: `${window.location.pathname}#${section.id}`
      }));
    if (sections.length) directory(parent, sections);
    else if (path !== '/videos') line(parent, 'No entries on this page. Use ls / for the site index.', true);
  }
  function remember(command) {
    if (commandHistory.at(-1) !== command) commandHistory.push(command);
    commandHistory = commandHistory.slice(-50);
    try { sessionStorage.setItem('tarun-commands', JSON.stringify(commandHistory)); } catch { /* Optional. */ }
  }

  document.querySelectorAll('[data-terminal]').forEach(terminal => {
    const output = terminal.querySelector('.terminal-output');
    const form = terminal.querySelector('form');
    const input = terminal.querySelector('input');
    const hint = terminal.querySelector('.terminal-hint');
    const defaultHint = hint.textContent;
    let historyPosition = commandHistory.length;
    let unfinished = '';
    let completion = null;

    function commandEntry(text, initial = false) {
      const entry = node('div', initial ? 'terminal-entry terminal-initial' : 'terminal-entry');
      const echo = node('p', 'terminal-echo');
      const prompt = node('span', '', `${dock.querySelector('.terminal-path').textContent} ❯`);
      prompt.setAttribute('aria-hidden', 'true');
      echo.append(prompt, document.createTextNode(` ${text}`));
      entry.append(echo);
      return entry;
    }
    const initialEntry = commandEntry('ls', true);
    listCurrentPage(initialEntry);
    output.replaceChildren(initialEntry);

    async function run(raw) {
      const text = raw.trim();
      if (!text) return;
      setExpanded(true);
      const [rawCommand, ...args] = text.split(/\s+/);
      const command = aliases[rawCommand.toLowerCase()] || rawCommand.toLowerCase();
      const argument = args.join(' ').toLowerCase();
      if (commands.includes(command)) remember(text);
      historyPosition = commandHistory.length;
      unfinished = '';
      completion = null;
      hint.textContent = defaultHint;
      input.value = '';
      if (command === 'clear') { output.replaceChildren(); return; }

      const entry = commandEntry(text);
      output.append(entry);
      while (output.children.length > 30) output.firstElementChild.remove();
      const scroll = () => { if (entry.isConnected) output.scrollTop = output.scrollHeight; };
      if (findPage(command) && !args.length) navigate(findPage(command).path);
      else if (command === 'writing' && topics.some(topic => topic.toLowerCase() === argument)) {
        navigate(`/writing/?topic=${topics.find(topic => topic.toLowerCase() === argument)}`);
      } else if (command === 'help') {
        const help = node('div', 'terminal-help');
        [
          ['about · writing · videos', 'Go straight to a page'],
          ['ls / ls .', 'List contents of the current page'],
          ['ls /', 'List the full site index'],
          ['ls writing', 'List all published notes'],
          ['open <page or post>', 'Open a destination; cd works too'],
          ['search <words>', 'Find pages and published notes'],
          ['whoami / contact', 'Background & links'],
          ['theme [light|dark]', 'Set the color theme'],
          ['memory / clear', 'View the memory map / clear output']
        ].forEach(([usage, description]) => {
          const row = node('div');
          row.append(node('code', '', usage), node('span', '', description));
          help.append(row);
        });
        entry.append(help);
        line(entry, 'Tip: ↑↓ recalls commands. Tab completes them.', true);
      } else if (command === 'ls' && (!argument || argument === '.')) {
        listCurrentPage(entry);
      } else if (command === 'ls' && (argument === '/' || argument === '~')) {
        directory(entry, pages);
      } else if (command === 'whoami') {
        line(entry, 'Tarun Ajjarapu — ML systems engineer.');
        line(entry, 'Member of Technical Staff at Judgment Labs, working on infrastructure and agents.');
        line(entry, 'Previously: Databricks infrastructure, Stripe payments. UT Austin CS.', true);
        directory(entry, [pages.find(page => page.name === 'about')]);
      } else if (command === 'contact') {
        directory(entry, [
          { name: 'LinkedIn', path: terminal.dataset.linkedin, description: 'Contact' },
          { name: 'GitHub', path: terminal.dataset.github, description: 'Source code & projects' }
        ]);
      } else if (command === 'theme') {
        if (argument && !['light', 'dark'].includes(argument)) line(entry, 'Try theme, theme light, or theme dark.', true);
        else {
          if (!argument || document.documentElement.dataset.theme !== argument) document.querySelector('.theme-toggle').click();
          line(entry, `theme: ${document.documentElement.dataset.theme}`);
        }
      } else if (command === 'memory') showMemory();
      else if (['search', 'open', 'cd'].includes(command) || (command === 'ls' && argument === 'writing')) {
        if (!argument) line(entry, command === 'search' ? 'Try search systems or search projects.' : `Try ${command} about or ${command} writing.`, true);
        else if (command !== 'search' && findPage(argument)) {
          if (command === 'ls') {
            const loading = node('p', 'terminal-muted', 'Loading published notes…');
            entry.append(loading);
            scroll();
            try {
              const posts = await index();
              if (!entry.isConnected) return;
              loading.remove();
              if (posts.length) directory(entry, posts);
              else line(entry, 'No published notes yet.', true);
            } catch { loading.textContent = 'The index couldn’t load. Try again, or visit Writing.'; }
          } else navigate(findPage(argument).path);
        } else {
          const loading = node('p', 'terminal-muted', 'Searching the index…');
          entry.append(loading);
          scroll();
          let posts = [];
          let available = true;
          try { posts = await index(); } catch { available = false; }
          if (!entry.isConnected) return;
          loading.remove();
          if (command === 'search') {
            const words = argument.split(/\s+/);
            const matches = [...pages, ...posts].filter(item => words.every(word => `${item.name || item.title} ${item.description} ${item.category || ''}`.toLowerCase().includes(word)));
            if (matches.length) directory(entry, matches);
            else line(entry, `No results for “${args.join(' ')}”. Try ls / for the site index.`, true);
            if (!available) line(entry, 'Published notes couldn’t load. Page search is still available.', true);
          } else {
            const post = posts.find(item => item.slug === argument || item.path === argument || item.path.replace(/\/$/, '') === argument);
            if (post) navigate(post.path);
            else line(entry, available ? `No destination called “${args.join(' ')}”. Try ls or search.` : 'The post index couldn’t load. Try again, or open writing.', true);
          }
        }
      } else {
        line(entry, commands.includes(command) ? `Try help for ${command} usage.` : `Command not found: ${rawCommand}. Try help or ls.`, true);
      }
      scroll();
    }
    form.addEventListener('submit', event => {
      event.preventDefault();
      input.focus({ preventScroll: true });
      run(input.value);
    });
    terminal.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => {
      run(button.dataset.command);
      input.focus({ preventScroll: true });
    }));
    input.addEventListener('input', () => { completion = null; hint.textContent = defaultHint; });
    input.addEventListener('focus', () => { historyPosition = commandHistory.length; completion = null; });
    input.addEventListener('keydown', event => {
      if (event.isComposing) return;
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        if (!commandHistory.length) return;
        event.preventDefault();
        if (historyPosition === commandHistory.length) unfinished = input.value;
        historyPosition = Math.max(0, Math.min(commandHistory.length, historyPosition + (event.key === 'ArrowUp' ? -1 : 1)));
        input.value = historyPosition === commandHistory.length ? unfinished : commandHistory[historyPosition];
        input.setSelectionRange(input.value.length, input.value.length);
        completion = null;
      }
      if (event.key !== 'Tab' || event.shiftKey || !input.value.trim()) return;
      if (completion?.matches.length === 1) { completion = null; return; }
      if (!completion) {
        const candidates = [...commands, 'ls .', 'ls /', 'ls writing', 'theme light', 'theme dark', ...topics.map(topic => `writing ${topic.toLowerCase()}`), ...['open', 'cd'].flatMap(cmd => [...pages.map(page => page.name), ...publishedPosts.map(post => post.slug)].map(name => `${cmd} ${name}`))];
        const matches = candidates.filter(candidate => candidate.startsWith(input.value.toLowerCase()) && candidate !== input.value.toLowerCase());
        if (!matches.length) return;
        completion = { matches, position: -1 };
      }
      event.preventDefault();
      completion.position = (completion.position + 1) % completion.matches.length;
      input.value = completion.matches[completion.position];
      hint.textContent = completion.matches.length > 1 ? 'Tab for next match · Enter to run' : defaultHint;
    });
  });
})();

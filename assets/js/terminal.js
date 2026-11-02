(() => {
  const pages = [
    { name: 'home', path: '/', description: 'Search & browse writing' },
    { name: 'about', path: '/about/', description: 'Background & experience' },
    { name: 'writing', path: '/writing/', description: 'Systems, ML & technical notes' },
    { name: 'videos', path: '/videos/', description: 'Technical breakdowns' },
    { name: 'projects', path: '/about/#projects', description: 'Rust, operating systems & memory' },
    { name: 'experience', path: '/about/#experience', description: 'Judgment Labs, Databricks, Stripe & more' }
  ];
  const aliases = { blog: 'writing', youtube: 'videos', '~': 'home' };
  const commands = ['help', 'ls', 'pwd', 'home', 'about', 'writing', 'videos', 'projects', 'experience', 'whoami', 'contact', 'search', 'grep', 'open', 'cd', 'theme', 'clear'];
  const rootPages = ['writing', 'about', 'videos'].map(name => ({
    ...pages.find(page => page.name === name), name: `${name}/`
  }));
  const topics = ['Systems', 'ML', 'Notes'];
  const dock = document.querySelector('#terminal-dock');
  if (!dock) return;
  const outputPanel = dock.querySelector('.terminal-output-panel');
  const expandButton = dock.querySelector('.terminal-expand');
  const dockInput = dock.querySelector('input');
  const launcher = document.querySelector('.terminal-launch');
  const focusKey = 'tarun-terminal-next-focus';
  const expandedKey = 'tarun-terminal-disclosure';
  let publishedPosts = [];
  let commandHistory = [];
  let previousFocus;
  try {
    const saved = JSON.parse(sessionStorage.getItem('tarun-commands') || '[]');
    if (Array.isArray(saved)) commandHistory = saved.filter(item => typeof item === 'string' && item.length <= 160).slice(-50);
  } catch { /* History still works for this page without browser storage. */ }

  async function index() {
    publishedPosts = await window.BlogSearch.index();
    return publishedPosts;
  }

  function setExpanded(expanded, remember = true) {
    if (!expanded && outputPanel.contains(document.activeElement)) dockInput.focus({ preventScroll: true });
    outputPanel.hidden = !expanded;
    dock.dataset.expanded = String(expanded);
    expandButton.setAttribute('aria-expanded', String(expanded));
    expandButton.setAttribute('aria-label', expanded ? 'Minimize terminal output' : 'Expand terminal output');
    expandButton.querySelector('.terminal-expand-label').textContent = expanded ? 'Minimize' : 'Index';
    if (remember) {
      try { sessionStorage.setItem(expandedKey, String(expanded)); } catch { /* Optional. */ }
    }
  }
  function focusTerminal() {
    if (!dock.contains(document.activeElement)) previousFocus = document.activeElement;
    const menu = document.querySelector('.menu-toggle[aria-expanded="true"]');
    if (menu) menu.click();
    setExpanded(true);
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
  // Introduce the terminal on arrival, then respect an explicit minimize choice.
  let expanded = true;
  try { expanded = sessionStorage.getItem(expandedKey) !== 'false'; } catch { /* Start open. */ }
  setExpanded(expanded, false);
  dock.dataset.welcome = 'true';
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
  function directory(parent, entries, heading) {
    if (heading) parent.append(node('p', 'terminal-group-label', heading));
    const list = node('div', 'terminal-directory');
    entries.forEach(entry => {
      const link = node('a');
      link.href = entry.path;
      const target = new URL(entry.path, window.location.href);
      const external = target.origin !== window.location.origin;
      const samePage = target.pathname === window.location.pathname;
      const kind = external ? 'new tab ↗' : samePage && target.hash ? 'section ↓' : samePage ? 'current page' : entry.title ? 'post →' : 'page →';
      if (external) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
      else link.addEventListener('click', event => {
        if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigate(entry.path);
      });
      link.append(node('span', '', entry.name || entry.title), node('span', '', entry.description));
      link.append(node('small', 'terminal-entry-kind', kind));
      list.append(link);
    });
    parent.append(list);
  }
  function destinationPath(value) {
    value = aliases[value] || value;
    const shortcut = pages.find(page => page.name === value);
    if (shortcut) return shortcut.path;
    let target;
    try { target = new URL(value.startsWith('~/') ? value.slice(1) : value, window.location.href); } catch { return null; }
    if (target.origin !== window.location.origin) return null;
    let path = target.pathname;
    if (!path.endsWith('/') && !path.split('/').at(-1).includes('.')) path += '/';
    return path + target.hash;
  }
  function findPage(value) {
    return pages.find(page => page.path === destinationPath(value));
  }
  function listCurrentPage(parent) {
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    const main = document.querySelector('main');
    if (path === '/') directory(parent, rootPages, 'Pages in ~');
    else directory(parent, [{ name: '../', path: destinationPath('..'), description: `Back to ~${destinationPath('..').replace(/\/$/, '')}` }], 'Parent directory');

    if (path === '/writing') {
      const posts = [...main.querySelectorAll('.post-row:not([hidden])')].map(post => ({
        title: post.querySelector('h2').textContent,
        description: post.querySelector('p').textContent,
        path: post.getAttribute('href')
      }));
      if (posts.length) directory(parent, posts, 'Posts in ~/writing · current filters');
      else line(parent, main.querySelector('[data-empty-title]').textContent, true);
      return;
    }

    if (path === '/videos') {
      const videos = [...main.querySelectorAll('.published-video')].map(video => ({
        title: video.querySelector('h3').textContent,
        description: video.querySelector('p').textContent,
        path: video.getAttribute('href')
      }));
      if (videos.length) directory(parent, videos, 'Videos · open in a new tab');
      else line(parent, 'No published videos yet.', true);
    }

    // Sections on a page, or heading anchors inside a published article.
    const sections = [...main.querySelectorAll('section[id], .prose h2[id], .prose h3[id]')]
      .filter(section => section.id !== 'episodes')
      .map(section => ({
        name: `#${section.id}`,
        description: section.querySelector('h2')?.textContent || section.textContent,
        path: `${window.location.pathname}#${section.id}`
      }));
    if (sections.length) directory(parent, sections, 'On this page · section jumps');
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

    function commandEntry(text) {
      const entry = node('div', 'terminal-entry');
      const echo = node('p', 'terminal-echo');
      const prompt = node('span', '', `${dock.querySelector('.terminal-path').textContent} ❯`);
      prompt.setAttribute('aria-hidden', 'true');
      echo.append(prompt, document.createTextNode(` ${text}`));
      entry.append(echo);
      return entry;
    }
    async function run(raw) {
      const text = raw.trim();
      if (!text) return;
      dock.dataset.welcome = 'false';
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
      // Start at the new command so long listings keep their first entries visible.
      const scroll = () => {
        if (entry.isConnected) output.scrollTop += entry.getBoundingClientRect().top - output.getBoundingClientRect().top;
      };
      if (findPage(command) && !args.length) navigate(findPage(command).path);
      else if (command === 'writing' && topics.some(topic => topic.toLowerCase() === argument)) {
        navigate(`/writing/?topic=${topics.find(topic => topic.toLowerCase() === argument)}`);
      } else if (command === 'help') {
        const help = node('div', 'terminal-help');
        [
          ['about · writing · videos', 'Go straight to a page'],
          ['ls / ls .', 'List this directory and its page sections'],
          ['ls ~ / ls writing', 'List site pages / all published posts'],
          ['cd writing / cd ..', 'Open a page / go to its parent'],
          ['open #section', 'Jump to a heading on this page'],
          ['open <post-slug>', 'Read a published post'],
          ['pwd', 'Show the current directory'],
          ['search <words>', 'Find pages and published notes'],
          ['grep <text>', 'Search full posts & code (case-insensitive text)'],
          ['whoami / contact', 'Background & links'],
          ['theme [light|dark]', 'Set the color theme'],
          ['clear', 'Clear terminal output']
        ].forEach(([usage, description]) => {
          const row = node('div');
          row.append(node('code', '', usage), node('span', '', description));
          help.append(row);
        });
        entry.append(help);
        line(entry, 'Tip: ↑↓ recalls commands. Tab completes them.', true);
      } else if (command === 'ls' && (!argument || argument === '.')) {
        listCurrentPage(entry);
      } else if (command === 'ls') {
        const path = destinationPath(argument);
        if (path === window.location.pathname && path !== '/writing/') listCurrentPage(entry);
        else if (path === '/') directory(entry, rootPages, 'Pages in ~');
        else if (path === '/writing/') {
          const loading = node('p', 'terminal-muted', 'Loading published posts…');
          entry.append(loading);
          scroll();
          try {
            const posts = await index();
            if (!entry.isConnected) return;
            loading.remove();
            if (posts.length) directory(entry, posts, 'Posts in ~/writing');
            else line(entry, 'No published posts yet.', true);
          } catch { loading.textContent = 'The post index couldn’t load. Try again, or open writing.'; }
        } else line(entry, findPage(argument) ? `Use cd ${argument}, then ls to explore that page.` : 'Directory not found. Try ls ~ or ls writing.', true);
      } else if (command === 'pwd') {
        line(entry, `~${window.location.pathname.replace(/\/$/, '')}`);
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
      } else if (command === 'grep') {
        const query = args.join(' ').replace(/^-(?:iF|Fi|i|F)\s+/, '').replace(/^(['"])([\s\S]*)\1$/, '$2').trim();
        if (!query) line(entry, 'Try grep inference or grep -iF "page table". Searches published posts and code as literal text.', true);
        else {
          const loading = node('p', 'terminal-muted', 'Searching published posts…');
          entry.append(loading);
          scroll();
          try {
            const posts = await index();
            if (!entry.isConnected) return;
            loading.remove();
            const matches = posts.filter(post => window.BlogSearch.matches(post, query));
            line(entry, `${matches.length} ${matches.length === 1 ? 'match' : 'matches'} for “${query}”.`, true);
            directory(entry, matches.map(post => ({ ...post, description: window.BlogSearch.excerpt(post.text || '', query) || post.description })));
            if (!posts.length) line(entry, 'No posts published yet.', true);
            else if (!matches.length) line(entry, 'Try another phrase, or ls writing to browse all posts.', true);
          } catch { loading.textContent = 'The post index couldn’t load. Try again, or open writing.'; }
        }
      } else if (['search', 'open', 'cd'].includes(command)) {
        if (!argument) line(entry, command === 'search' ? 'Try search systems or search projects.' : `Try ${command} about or ${command} writing.`, true);
        else if (command !== 'search' && (argument === '.' || argument.startsWith('#'))) {
          let section;
          try { section = document.getElementById(decodeURIComponent(argument.slice(1))); } catch { /* Invalid fragment. */ }
          if (argument === '.' || section) navigate(argument);
          else line(entry, 'Section not found on this page. Run ls to see its headings.', true);
        }
        else if (command !== 'search' && findPage(argument)) {
          navigate(findPage(argument).path);
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
            const matches = [...pages, ...posts].filter(item => words.every(word => `${item.name || item.title} ${item.description} ${item.category || ''} ${item.text || ''}`.toLowerCase().includes(word)));
            if (matches.length) directory(entry, matches);
            else line(entry, `No results for “${args.join(' ')}”. Try ls / for the site index.`, true);
            if (!available) line(entry, 'Published notes couldn’t load. Page search is still available.', true);
          } else {
            const post = posts.find(item => item.slug === argument || item.path === destinationPath(argument));
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
        const sections = [...document.querySelectorAll('main section[id], .prose h2[id], .prose h3[id]')].map(section => `open #${section.id}`);
        const candidates = [...commands, 'ls .', 'ls ~', 'ls /', 'ls writing', 'cd ..', 'cd ~', 'cd ~/writing/', 'theme light', 'theme dark', ...sections, ...topics.map(topic => `writing ${topic.toLowerCase()}`), ...['open', 'cd'].flatMap(cmd => [...pages.map(page => page.name), ...publishedPosts.map(post => post.slug)].map(name => `${cmd} ${name}`))];
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

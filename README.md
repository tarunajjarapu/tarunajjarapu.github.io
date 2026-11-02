# Tarun Ajjarapu’s website

A personal website and notebook, designed for GitHub Pages. The site serves plain HTML, CSS, and JavaScript, with locally hosted fonts and no runtime framework or external analytics.

The video channel is **Tarun Has No Life**: “I need to touch grass...” The personal site stays under Tarun Ajjarapu’s name, with the channel at `/videos/`. Its name, tagline, and footer line live in `site/config.json`. The channel page has a clearly labeled pre-launch state and planned topics, starting with NixOS; these are topic ideas, not published episodes.

The homepage is a personal blog: a short introduction, an editorial list of dated posts, topic filters, and a compact search field. Its warm paper and charcoal themes pair Instrument Serif headings with DM Sans controls. Blog articles use serif body text for longer reading. `/writing/` presents the same index so existing links keep working. Search matches literal text without case sensitivity across titles, descriptions, topics, full post text, and code. Results highlight matches and show a body excerpt when useful. `/` focuses search; Escape or the clear button clears the query. The query and topic are stored in the URL for sharing and browser navigation. With JavaScript disabled, all published posts remain linked.

The sun/moon control switches between light and dark themes. The initial theme follows the visitor’s system preference; a manual choice is saved in their browser and applied before the page paints. Theme behavior lives in `assets/js/theme.js`. Entrance, scroll, and hover animations respect the visitor’s reduced-motion setting.

A fixed terminal command bar is available on every page, including articles and the 404 page. It opens with a compact welcome and example commands on arrival, without stealing focus or opening a phone keyboard. Running a command reveals the larger scrollback area. Its prompt remains visible while scrolling; Minimize or Escape collapses output while keeping the prompt accessible. An explicit expand/minimize choice is remembered for the browser session, including across page navigation and reloads. The page remains interactive, with space reserved so the footer stays reachable. The last 50 recognized commands also persist for the browser session. ⌘K / Ctrl+K or the header’s `>_` button focuses the terminal. Submitting a command keeps the input focused, including section jumps and page navigation; ordinary navigation does not autofocus the terminal.

Use `about`, `writing`, `videos`, `projects`, or `experience` to navigate; `help` lists the commands. At `~`, `ls` shows the child pages `writing/`, `about/`, and `videos/`, followed by section links on the homepage. Elsewhere, `ls` (or `ls .`) shows the parent directory and current page contents: filtered posts on Writing, headings inside an article, or sections on About. Labels distinguish `page →`, `post →`, `section ↓` on the current page, and external links that open in a `new tab ↗`. Internal links stay in the same browser tab.

`ls /` (or `ls ~`) returns the site index, and `ls writing` lists all published posts regardless of current filters. `cd ~/writing/` opens Writing; `cd ..` moves an article up to Writing and a top-level page up to Home. `pwd` prints the current directory. `open #section-id` jumps to a heading on this page and supports Tab completion. `grep <text>` searches full posts and code using literal, case-insensitive matching; quoted phrases and optional `-i`, `-F`, or `-iF` are supported. For example, `grep -iF "page table"`. `search <words>` also finds site pages, and `open <post-slug>` opens a post. `whoami`, `contact`, `theme [light|dark]`, and `clear` provide shortcuts. Tab completes commands and ↑/↓ recalls history. These are site commands, with no shell or server execution.

The shared search code lives in `assets/js/search.js`; terminal behavior is in `assets/js/terminal.js`. Each build regenerates `site-index.json` from published posts only, including plain text extracted from rendered prose and code. Drafts and future-dated posts never enter that index. If full-text loading fails, the page still searches the already rendered titles and descriptions and displays a retry hint.

## Preview

The generated site is checked in, so previewing it does not require installing dependencies:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000. The homepage is Writing; Videos and About remain separate pages.

## Make changes

Page source lives in `site/templates/`. Edit these templates rather than the generated root HTML files. Shared styles and behavior are in `assets/css/site.css` and `assets/js/site.js`. Links and site metadata are in `site/config.json`.

Set up the small Markdown build dependency once:

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

After changing a template, configuration, or post, rebuild:

```sh
.venv/bin/python scripts/build.py
```

The build updates every page, the writing index, the homepage’s post list, full-text search index, RSS, and the sitemap. Generated files are committed with the source. GitHub Pages can continue to serve the repository root; `.nojekyll` prevents a second template-processing step. No build service is required. Push through your existing GitHub Pages deployment when ready.

Check the publishing workflow and internal links with:

```sh
.venv/bin/python -m unittest discover -s tests -v
```

## Publish a blog post

Copy `site/posts/_template.md` to a new `.md` file. Keep the original template as a draft. The complete example is `site/posts/inside-an-inference-runtime.md`, a technical blog about vLLM with linked sources, a table of contents, a pipeline diagram, code, and tables.

For a new post, update the copy’s metadata, replace the placeholder content, and change `draft` to `false` when it is ready to appear in your local preview:

```md
---
title: The title of your post
description: A one-sentence description for readers and search results.
date: 2026-11-01
category: Systems
slug: your-post-title
draft: false
---

Write your post in Markdown here.
```

Categories are `Systems`, `ML`, and `Notes`. Slugs use lowercase words and hyphens. Supported Markdown includes headings, links, lists, blockquotes, fenced code blocks, and tables. `[TOC]` adds a styled table of contents from level-two headings; headings also appear in the terminal’s `ls` output. The optional `article-flow` figure in the template provides a responsive three-step diagram using the current light or dark theme. Remove any example sections you do not need. Store post images in `images/` and reference them with root-relative paths, such as `/images/my-diagram.png`.

Run the build and preview before committing. Draft and future-dated posts are excluded from all generated pages, RSS, and the sitemap. Future posts appear only after you run a build on or after their date; there is no scheduled publisher. Removing a post or returning it to draft removes its generated article on the next build.

**Drafts are not confidential:** Markdown source committed to a public repository can be read on GitHub and may be served by root-based hosting. Keep sensitive drafts outside this repository until ready to share them.

## Connect YouTube

When the channel exists, set `youtube` in `site/config.json` to its actual full `https://www.youtube.com/@...` URL and rebuild. The Videos page will show the channel link, the footer will gain a YouTube link. The display name does not reserve a YouTube handle.

## Publish a video on the site

Add an entry to the array in `site/videos.json`:

```json
{
  "title": "Your video title",
  "description": "The question this video explores.",
  "date": "2026-11-01",
  "category": "Systems",
  "youtube_id": "VIDEO_ID_11",
  "draft": true
}
```

Replace `VIDEO_ID_11` with the 11-character ID from the real video's YouTube URL. Use `Systems`, `ML`, or `Notes` for the category. Set the publication date and change `draft` to `false` when the video is public, then run the build. Published videos appear newest first with direct watch links. Draft and future-dated entries stay out of the generated page; future dates require a later rebuild. Return an entry to draft or remove it to retract its listing.

The planned topic list is edited separately in `site/templates/videos.html`, so an idea is never automatically presented as a released video. The notebook keeps its own RSS feed; companion notes can link to each video from their Markdown body.

## Content notes

- Judgment Labs is the current role, starting September 2026, based on the supplied update.
- Databricks is listed as a previous role starting February 2026; an exact departure month has not been assumed.
- The inference-runtime blog was requested as the first example post. Its technical claims link to primary sources; its scheduling and memory examples are illustrative, not benchmarks or claims about work at Judgment Labs. `_template.md` remains an unpublished authoring template. No videos have been published.
- Contact currently goes through LinkedIn. The supplied résumé email used `gmail.edu`, so it has not been used as a working address.
- Typography: Instrument Serif for editorial headings, Georgia for article body text, DM Sans for controls, and system monospace for the terminal. Font licenses are included in `assets/fonts/`.
- The updated portrait is `images/profile-portrait.png`, prepared from the supplied group photo with built-in ImageGen. See `site/portrait-edit.txt` for the edit prompt. The old portrait is retained as an unused source asset.

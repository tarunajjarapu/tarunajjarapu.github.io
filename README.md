# Tarun Ajjarapu’s website

A personal website and notebook, designed for GitHub Pages. The site serves plain HTML, CSS, and JavaScript, with locally hosted fonts and no runtime framework or external analytics.

The video channel is **Tarun Has No Life**: “I need to touch grass...” The personal site stays under Tarun Ajjarapu’s name, with the channel at `/videos/`. Its name, tagline, and footer line live in `site/config.json`. The channel page has a clearly labeled pre-launch state and planned topics, starting with NixOS; these are topic ideas, not published episodes.

The sun/moon control switches between light and dark themes. The initial theme follows the visitor’s system preference; a manual choice is saved in their browser and applied before the page paints. Theme behavior lives in `assets/js/theme.js`. Entrance, scroll, and hover animations respect the visitor’s reduced-motion setting. The homepage’s virtual-memory site map (`assets/js/memory.js`) maps four virtual pages to non-contiguous physical frames. Selecting a page animates its page-table lookup and updates a real navigation link. The offset slider preserves the lower 12 bits in both displayed addresses. It is a simplified 4 KiB-page model, not a display of browser memory. The automatic cycle has a pause control, holds while interacting, and stops offscreen, in background tabs, or for reduced-motion preferences. The mapping follows the [Linux memory-management overview](https://cdn.kernel.org/doc/html/latest/admin-guide/mm/concepts.html).

A fixed terminal command bar is available on every page, including articles and the 404 page. Its prompt remains visible while scrolling. Index expands the current page’s contents and output; Minimize or Escape collapses output while keeping the prompt accessible. The page remains interactive, with space reserved so the footer stays reachable. The expanded state and the last 50 recognized commands persist for the browser session. ⌘K / Ctrl+K or the header’s `>_` button focuses the terminal. Submitting a command keeps the input focused, including section jumps and page navigation; ordinary navigation does not autofocus the terminal.

Use `about`, `writing`, `videos`, `projects`, or `experience` to navigate; `help` lists the commands. `ls` (or `ls .`) lists the current page’s contents: About sections, visible Writing posts, Videos and planned topics, or article headings. `ls /` (or `ls ~`) always lists the full site index. The initial terminal listing also follows the current page. `search <words>` searches pages and published post titles/descriptions, `ls writing` lists published posts, and `open <post-slug>` opens a note. `whoami`, `contact`, `theme [light|dark]`, `memory`, and `clear` provide shortcuts. Tab completes commands and ↑/↓ recalls history. `memory` jumps to the homepage’s memory map. The old `signal` command is retained as an alias. These are site commands, with no shell or server execution. Behavior lives in `assets/js/terminal.js`, and each build regenerates `site-index.json` from published posts only.

## Preview

The generated site is checked in, so previewing it does not require installing dependencies:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000. The main pages are Home, Writing, Videos, and About.

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

The build updates every page, the writing index, the homepage’s featured note, RSS, and the sitemap. Generated files are committed with the source. GitHub Pages can continue to serve the repository root; `.nojekyll` prevents a second template-processing step. No build service is required. Push through your existing GitHub Pages deployment when ready.

Check the publishing workflow and internal links with:

```sh
.venv/bin/python -m unittest discover -s tests -v
```

## Publish a blog post

Copy `site/posts/first-note.md` to a new `.md` file. Update its metadata, write the post, and change `draft` to `false`:

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

Categories are `Systems`, `ML`, and `Notes`. Slugs use lowercase words and hyphens. Supported Markdown includes headings, links, lists, blockquotes, fenced code blocks, and tables. Store post images in `images/` and reference them with root-relative paths, such as `/images/my-diagram.png`.

Run the build and preview before committing. Draft and future-dated posts are excluded from all generated pages, RSS, and the sitemap. Future posts appear only after you run a build on or after their date; there is no scheduled publisher. Removing a post or returning it to draft removes its generated article on the next build.

**Drafts are not confidential:** Markdown source committed to a public repository can be read on GitHub and may be served by root-based hosting. Keep sensitive drafts outside this repository until ready to share them.

## Connect YouTube

When the channel exists, set `youtube` in `site/config.json` to its actual full `https://www.youtube.com/@...` URL and rebuild. The Videos page will show the channel link, the footer will gain a YouTube link, and the homepage’s coming-soon label will update. The display name does not reserve a YouTube handle.

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
- No blog posts or videos have been invented or published. The first-note file is an unpublished authoring example.
- Contact currently goes through LinkedIn. The supplied résumé email used `gmail.edu`, so it has not been used as a working address.
- Typography: DM Sans with system monospace labels. The DM Sans SIL Open Font License is included in `assets/fonts/`.
- The updated portrait is `images/profile-portrait.png`, prepared from the supplied group photo with built-in ImageGen. See `site/portrait-edit.txt` for the edit prompt. The old portrait is retained as an unused source asset.

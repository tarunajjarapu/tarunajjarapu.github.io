"""Exercise the authoring workflow without changing the real website or posts."""

from contextlib import redirect_stdout
from datetime import date
from html.parser import HTMLParser
import importlib.util
import io
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("site_build", ROOT / "scripts/build.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.links.extend(attrs[key] for key in ("href", "src") if attrs.get(key))
        if "id" in attrs:
            self.ids.add(attrs["id"])


class PublishingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.source = Path(self.temp.name) / "source"
        self.output = Path(self.temp.name) / "public"
        shutil.copytree(ROOT / "site", self.source)
        # Publishing fixtures stay independent of the real blog's growing catalog.
        # Keep the reusable draft so every build exercises its exclusion.
        for post in (self.source / "posts").glob("*.md"):
            if post.name != "_template.md":
                post.unlink()
        source_patch = patch.object(builder, "SOURCE", self.source)
        source_patch.start()
        self.addCleanup(source_patch.stop)

    def build(self):
        with redirect_stdout(io.StringIO()):
            builder.build(self.output, date(2026, 11, 1))

    def post(self, slug, *, draft="false", published="2026-11-01", category="Systems"):
        path = self.source / "posts" / f"{slug}.md"
        path.write_text(f"""---
title: A & B <systems>
description: Testing a real publishing lifecycle.
date: {published}
category: {category}
slug: {slug}
draft: {draft}
---

## A heading

A **useful** note with [a link](/about/).

```rust
let answer = 42;
```
""")
        return path

    def test_launch_site_has_no_fake_posts_and_all_internal_links_resolve(self):
        self.post("future-note", published="2027-01-01")
        self.build()
        self.assertEqual([], ET.parse(self.output / "feed.xml").findall("channel/item"))
        self.assertFalse((self.output / "writing/your-next-post/index.html").exists())
        self.assertFalse((self.output / "writing/future-note/index.html").exists())
        self.assertEqual({"posts": []}, json.loads((self.output / "site-index.json").read_text()))
        self.assert_internal_links_resolve()

    def assert_internal_links_resolve(self):
        for path in self.output.rglob("*.html"):
            document = Links()
            document.feed(path.read_text())
            for link in document.links:
                url = urlsplit(link)
                if url.scheme or url.netloc:
                    continue
                target = self.output / unquote(url.path).lstrip("/") if url.path else path
                if target.is_dir():
                    target /= "index.html"
                self.assertTrue(target.is_file(), f"{path.name}: missing {link}")
                if url.fragment and target.suffix == ".html":
                    linked = Links()
                    linked.feed(target.read_text())
                    self.assertIn(url.fragment, linked.ids, f"{path.name}: broken anchor {link}")

    def test_inference_post_and_reusable_template_publishing_workflow(self):
        shutil.copy(ROOT / "site/posts/inside-an-inference-runtime.md", self.source / "posts")
        self.build()
        article = self.output / "writing/inside-an-inference-runtime/index.html"
        self.assertTrue(article.is_file())
        self.assertIn('class="toc"', article.read_text())
        self.assertIn('class="article-flow"', article.read_text())
        self.assert_internal_links_resolve()
        posts = json.loads((self.output / "site-index.json").read_text())["posts"]
        self.assertEqual(["inside-an-inference-runtime"], [post["slug"] for post in posts])
        self.assertIn("PagedAttention", posts[0]["text"])
        self.assertEqual(1, posts[0]["text"].count("Give the KV cache a page table"))
        self.assertNotIn("In this post", posts[0]["text"])
        self.assertNotIn("your-next-post", (self.output / "sitemap.xml").read_text())

        # An unchanged copy is still a draft; publishing the copy gives it the theme
        # and all indexes without exposing the original template.
        template = self.source / "posts/_template.md"
        copy = self.source / "posts/second-post.md"
        copy.write_text(template.read_text().replace("slug: your-next-post", "slug: second-post"))
        self.build()
        self.assertFalse((self.output / "writing/second-post/index.html").exists())
        copy.write_text(copy.read_text().replace("draft: true", "draft: false"))
        self.build()
        self.assertTrue((self.output / "writing/second-post/index.html").is_file())
        self.assertFalse((self.output / "writing/your-next-post/index.html").exists())
        self.assert_internal_links_resolve()

    def test_publish_and_retract_updates_article_home_index_rss_and_sitemap(self):
        source = self.post("a-real-note")
        self.build()
        article = self.output / "writing/a-real-note/index.html"
        self.assertIn('<h2 id="a-heading">A heading</h2>', article.read_text())
        self.assertIn('<code class="language-rust">', article.read_text())
        self.assertIn("A &amp; B &lt;systems&gt;", article.read_text())
        self.assertIn('class="post-row" href="/writing/a-real-note/"', (self.output / "index.html").read_text())
        self.assertIn('data-category="Systems"', (self.output / "writing/index.html").read_text())
        self.assertEqual("A & B <systems>", ET.parse(self.output / "feed.xml").findtext("channel/item/title"))
        self.assertIn("/writing/a-real-note/", (self.output / "sitemap.xml").read_text())
        indexed = json.loads((self.output / "site-index.json").read_text())["posts"]
        self.assertEqual(["/writing/a-real-note/"], [post["path"] for post in indexed])
        self.assertEqual("A & B <systems>", indexed[0]["title"])
        self.assertIn("A useful note with a link.", indexed[0]["text"])
        self.assertIn("let answer = 42;", indexed[0]["text"])
        self.assertNotIn("<code", indexed[0]["text"])
        source.write_text(source.read_text().replace("draft: false", "draft: true"))
        self.build()
        self.assertFalse(article.exists())
        self.assertNotIn("/writing/a-real-note/", (self.output / "index.html").read_text())
        self.assertNotIn("/writing/a-real-note/", (self.output / "writing/index.html").read_text())
        self.assertEqual([], ET.parse(self.output / "feed.xml").findall("channel/item"))
        self.assertNotIn("/writing/a-real-note/", (self.output / "sitemap.xml").read_text())
        self.assertEqual({"posts": []}, json.loads((self.output / "site-index.json").read_text()))

    def test_search_indexes_published_prose_and_code_without_drafts_or_hidden_markup(self):
        post = self.post("searchable-note")
        post.write_text(post.read_text() + '\nA cache &amp; queue.\n\n```cpp\nvector<int> values[3];\n```\n\n<script>hidden_script_text</script><style>hidden_style_text</style>\n')
        draft = self.post("private-draft", draft="true")
        draft.write_text(draft.read_text() + '\nDRAFT_ONLY_SENTINEL\n')
        future = self.post("future-note", published="2027-01-01")
        future.write_text(future.read_text() + '\nFUTURE_ONLY_SENTINEL\n')
        self.build()
        raw_index = (self.output / "site-index.json").read_text()
        posts = json.loads(raw_index)["posts"]
        self.assertEqual(["searchable-note"], [item["slug"] for item in posts])
        self.assertIn("A cache & queue.", posts[0]["text"])
        self.assertIn("vector<int> values[3];", posts[0]["text"])
        for hidden in ("hidden_script_text", "hidden_style_text", "DRAFT_ONLY_SENTINEL", "FUTURE_ONLY_SENTINEL"):
            self.assertNotIn(hidden, raw_index)
        for page in ("index.html", "writing/index.html"):
            html = (self.output / page).read_text()
            self.assertIn('href="/writing/searchable-note/"', html)
            self.assertIn('id="blog-query"', html)
            self.assertNotIn('id="memory"', html)
            self.assertNotIn('class="hero wrap"', html)

    def test_youtube_launch_switch_and_invalid_post_metadata(self):
        self.build()
        self.assertIn("The channel hasn’t launched yet.", (self.output / "videos/index.html").read_text())
        config_path = self.source / "config.json"
        config = json.loads(config_path.read_text())
        config["youtube"] = "https://www.youtube.com/@example-test-channel"
        config_path.write_text(json.dumps(config))
        self.build()
        self.assertIn('href="https://www.youtube.com/@example-test-channel"', (self.output / "videos/index.html").read_text())
        self.assertNotIn("COMING SOON TO YOUTUBE", (self.output / "index.html").read_text())
        self.post("invalid-category", category="Typo")
        with self.assertRaisesRegex(ValueError, "category must be"):
            self.build()

    def test_video_publish_and_retract_without_exposing_drafts_or_future_videos(self):
        registry = self.source / "videos.json"
        video = {"title": "A & B <systems>", "description": "A real explanation.",
                 "date": "2026-11-01", "category": "Systems",
                 "youtube_id": "abcdefghijk", "draft": False}
        registry.write_text(json.dumps([
            video,
            {**video, "youtube_id": "draft123456", "draft": True},
            {**video, "youtube_id": "future12345", "date": "2027-01-01"},
        ]))
        self.build()
        page = (self.output / "videos/index.html").read_text()
        self.assertIn('href="https://www.youtube.com/watch?v=abcdefghijk"', page)
        self.assertIn('href="#episodes"', page)
        self.assertIn("A &amp; B &lt;systems&gt;", page)
        self.assertNotIn("draft123456", page)
        self.assertNotIn("future12345", page)
        self.assertNotIn("hasn’t launched", page)
        registry.write_text(json.dumps([{**video, "draft": True}]))
        self.build()
        page = (self.output / "videos/index.html").read_text()
        self.assertNotIn("abcdefghijk", page)
        self.assertNotIn('id="episodes"', page)
        self.assertIn('href="#rabbit-holes"', page)

    def test_invalid_video_does_not_replace_the_previous_build(self):
        self.build()
        page = self.output / "videos/index.html"
        original = page.read_text()
        (self.source / "videos.json").write_text(json.dumps([{
            "title": "Bad ID", "description": "Invalid video URL input.",
            "date": "2026-11-01", "category": "ML", "draft": False,
            "youtube_id": 'bad\" onclick=\"alert(1)',
        }]))
        with self.assertRaisesRegex(ValueError, "youtube_id must"):
            self.build()
        self.assertEqual(original, page.read_text())


if __name__ == "__main__":
    unittest.main()

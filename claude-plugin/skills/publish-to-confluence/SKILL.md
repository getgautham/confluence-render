---
name: publish-to-confluence
description: Put a document, report, plan, notes or HTML page on Confluence. Use when the person asks to publish, post, share, save or upload something to Confluence or a Confluence space/page, or to update a page made this way.
---

Publish with the `publish_file` tool from this plugin's `confluence` server. It uploads one .md or .html file and shows it in full on the page.

1. Write the content to a file first: Markdown (`.md`) for text, tables and lists; HTML (`.html`) when layout, colour or charts matter.
2. HTML must be self-contained. Inline all CSS and JS, and load nothing from the internet (CDNs, web fonts, remote images). Confluence blocks outside requests, so they would show up broken.
   Images (charts, screenshots, diagrams): save each one in the same folder as the file and point to it by relative path, `![Revenue by month](revenue.png)` or `<img src="revenue.png">`. The tool uploads them with the file. PNG, JPG, GIF, WebP or SVG, 3 MB each. Always write alt text.
   The page title already shows above the file: don't open the file with a heading that repeats it.
3. Set `run_scripts: true` only when the HTML needs JavaScript to work (charts, tabs, filters). Static HTML stays without it.
4. Need a space key? Call `list_spaces`. Updating an earlier page? Pass its `page_id`; the same file name replaces the old version.
5. Reply with the page link the tool returns. If it errors, say what it said and what the person should do next. Don't retry a permission error.

The tool can only read .md and .html files up to 2 MB, and it never deletes anything.

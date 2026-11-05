# Marketplace listing kit

Everything the Atlassian Marketplace form asks for. Copy each field as is; the images are in this folder (`./render.sh` rebuilds them).

## Before you submit

1. **Install links stop working once you submit.** Anyone who needs the current link should install first.
2. In the [developer console](https://developer.atlassian.com/console/myapps/), open the **Synchronise** developer space, then **Settings**:
   - Name it **Synchronise AI**. It becomes the public partner name, and the banner shows it.
   - Set up billing. Atlassian requires it to publish a developer space.
   - **Make public on Marketplace** → accept the Marketplace Partner Agreement.
3. Sign in once at [community.developer.atlassian.com](https://community.developer.atlassian.com). The partner profile needs one contact there.
4. Go to [marketplace.atlassian.com/manage/apps/create](https://marketplace.atlassian.com/manage/apps/create), pick the vendor, pick the Forge app **Markdown and HTML file**, choose **Free**, and fill in the fields below.
5. Atlassian reviews in about 1 to 3 weeks. Once it's live, replace the install link in the README with the Marketplace link.

## Listing

**App name** (60 max)
Markdown & HTML for Confluence

**Tagline** (130 max)
Show Markdown and HTML files in full on any Confluence page. Let Claude write and publish them for you.

**Summary** (250 max)
Attach a .md or .html file to a page and the macro shows it in full: tables, code, checklists, images and your own layouts. Interactive HTML runs in a locked sandbox, only when an editor allows it.

**More details** (1000 max)
Teams write in Markdown and build reports in HTML. This macro shows those files in Confluence the way they were meant to look.

Drag a .md or .html file onto a page, add the Markdown & HTML file macro, and publish. Markdown gets clean, Confluence-styled tables, code, quotes, checklists and images. HTML keeps its own fonts, colours and layout, and the frame sizes itself to the content.

Charts, tabs and filters can run too. Scripts are off until an editor allows them, and the approval holds only for that exact upload. They run in a sandbox with no access to Confluence, the page or anyone's login.

The app only reads, as the person viewing the page. It makes no outside calls and stores nothing.

Optional: the free, open-source Claude Code plugin writes the file and publishes it for you.

**Highlight 1** (`highlight-1-markdown.png`, crop `highlight-1-markdown-crop.png`)
- Title: Markdown, fully rendered
- Summary: Headings, tables, code, quotes, checklists and images look like a real page, styled to match Confluence.
- Caption: A Markdown playbook with a chart image, shown in full.

**Highlight 2** (`highlight-2-dashboard.png`, crop `highlight-2-dashboard-crop.png`)
- Title: Interactive HTML, safely
- Summary: Charts, tabs and filters work. Scripts run only when an editor allows them, in a sandbox with no access to Confluence or anyone's login.
- Caption: An HTML dashboard with live tabs and hover details.

**Highlight 3** (`highlight-3-onepager.png`, crop `highlight-3-onepager-crop.png`)
- Title: Your layout, your styles
- Summary: Designed HTML pages keep their own fonts, colours and layout. The frame fits the content, with no inner scrollbars.
- Caption: A static HTML one-pager, exactly as designed.

**Logo:** `logo-144.png` · **Banner:** `banner-1120x548.png`

**Release summary** (80 max)
First release: Markdown and HTML files, images, sandboxed scripts.

## Links

| Field | Value |
| --- | --- |
| Documentation | https://github.com/getgautham/confluence-render#readme |
| Privacy policy | https://github.com/getgautham/confluence-render/blob/main/PRIVACY.md |
| Support | https://github.com/getgautham/confluence-render/issues |
| Source code | https://github.com/getgautham/confluence-render |
| End user terms | Use Atlassian's standard customer agreement |

## Reviewer details

**Scopes and why**
- `read:page:confluence`: list the attachments of the page the macro is on.
- `read:attachment:confluence`: read each attachment's name, size and version, to pick the file.
- `readonly:content.attachment:confluence`: download the chosen file and its images to show them.

All calls run as the viewing user (`asUser`), so the app sees only what that person can already open.

**Remote hosts:** none. The app makes no requests outside Atlassian. It stores nothing and logs only error status codes, never file content.

**Content permissions (`unsafe-inline` styles and scripts):** the file is shown in a sandboxed `srcdoc` iframe. Markdown is sanitised with DOMPurify, and scripts can't run. HTML scripts run only when an editor ticks "Let this HTML run its scripts". The approval is pinned to that attachment's id and version, and the iframe has no `allow-same-origin`, so the code can't reach Confluence, the macro or the user's session. Inline scripts need `unsafe-inline` because the author's HTML is shown as written.

## Privacy and Security tab

| Question | Answer |
| --- | --- |
| Does the app store End User Data? | No. Nothing is stored. |
| Does the app process personal data? | Only to display it: attachment content is fetched as the viewer and shown in their browser. It isn't stored, logged or sent anywhere. |
| Does the app send data outside Atlassian? | No. |
| Third-party subprocessors | None. |
| Data residency | Not applicable: no data is stored. |
| Logging | Error status codes only (for example `404`), no content or user data. |
| Authentication | Forge `asUser`. No secrets, no external auth. |
| Runs on Atlassian | Eligible (Forge reports this on deploy). |
| Security contact | GitHub's private vulnerability reporting on the repo (see SECURITY.md). |

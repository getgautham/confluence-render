# confluence-render

Show Markdown and HTML files in Confluence Cloud, in full. And let Claude publish them for you.

Two parts, both open source (MIT):

| Part | What it does | Folder |
| --- | --- | --- |
| Confluence app | A **Markdown & HTML file** macro. Attach a `.md` or `.html` file to a page and the macro shows it. | [`forge-app/`](forge-app) |
| Claude plugin | Claude writes the doc, then puts it on a Confluence page with the macro. You get the link. | [`claude-plugin/`](claude-plugin) |

You can use the Confluence app on its own. The Claude plugin needs the app.

## Why it's safe

**The Confluence app**

- Runs on Atlassian's own platform (Forge). No server of ours, no outside network calls, nothing stored.
- Reads files **as the person viewing the page**. If they can't open the attachment in Confluence, they can't see it here.
- Asks for read-only access: pages and attachments. It can't edit or delete anything.
- Every file is shown inside a sandboxed frame. Markdown is cleaned (DOMPurify) and can't run code. HTML can't run code either, unless the page author ticks **Let this HTML run its scripts**. Even then the code runs in a locked box: it can't see Confluence, the page around it, or anyone's login. And scripts run only on the exact file version an editor allowed. If anyone uploads a new version, it shows with scripts off until an editor allows them again.

**The Claude plugin**

- Under 300 lines, no dependencies. Easy to read before you trust it.
- Your API token lives in your system keychain, not in a file.
- Acts as you, with your Confluence permissions. Use a scoped token so it can do only what it needs (below).
- Talks only to your `*.atlassian.net` site (or Atlassian's API gateway for scoped tokens).
- Reads only `.md`, `.markdown`, `.html` and `.htm` files under 2 MB, and checks where symlinks really point.
- Two tools: list spaces, publish a file. It never deletes.

See [SECURITY.md](SECURITY.md) to report a problem.

## 1. Install the Confluence app (site admin, once)

You need Node 22 or 24 and an Atlassian account that can install apps on your site.

```bash
npm install -g @forge/cli
forge login

cd forge-app
npm install
forge register          # gives the app your own id (edits manifest.yml)
npm run deploy          # builds and deploys to production
forge install -e production --product confluence --site yourcompany.atlassian.net
```

**Use it:** drag a `.md` or `.html` file onto a page, type `/Markdown & HTML file`, pick the file in the settings, publish. With no file picked, it shows the newest `.md` or `.html` on the page.

Tip: make HTML files self-contained (inline CSS and JS, images as `data:` URIs). The app makes no outside calls, so CDN scripts, web fonts and remote images won't load.

## 2. Install the Claude plugin (each person, or pushed by an admin)

In Claude Code:

```
/plugin marketplace add getgautham/confluence-render
/plugin install confluence-render@confluence-render
```

Claude asks for these settings:

| Setting | Where to get it |
| --- | --- |
| Confluence site | `yourcompany.atlassian.net` |
| Atlassian email | The email you log in with |
| API token | [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens). Pick **Create API token with scopes**, app **Confluence**, and only these scopes: `read:space:confluence`, `read:page:confluence`, `write:page:confluence`, `read:content-details:confluence`, `write:attachment:confluence` |
| Macro key | Already filled in. Change it only if you deployed your own copy of the app: open any **Markdown & HTML file** macro's settings in Confluence, expand **Key for the Claude plugin**, copy it. |

Then just ask: *"Write up the Q3 launch notes and put them in the ENG space."* Claude writes the file and publishes it.

**Claude Enterprise / Team:** an admin can add this repo as a plugin marketplace and turn the plugin on for the whole org, so people only enter their own token. See [Distribute plugins to your organization](https://claude.com/docs/plugins/org-sync).

## Develop

```bash
cd forge-app && npm test && npm run preview      # open http://localhost:8765/render/index.html?file=sample.md
cd claude-plugin && npm test                     # runs the MCP server against a fake Confluence
claude plugin validate ./claude-plugin
```

`npm run preview` adds `&scripts=1` and `&dark=1` options to try HTML scripts and dark mode.

## Limits

- Confluence Cloud only (Forge). Not Server or Data Center.
- Files up to 2 MB.
- Text inside the macro isn't found by Confluence search. The file itself still is, as an attachment.
- The Claude plugin starts a small local Node program, so it needs Claude Code (or a Claude app that runs local plugins), not claude.ai in a browser.

## License

MIT

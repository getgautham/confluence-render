# Render MD & HTML for Confluence

Ask Claude for a doc, report or dashboard. It publishes it to Confluence, and your team sees it in full: tables, charts, images, even working tabs and buttons.

Open source (MIT). Two parts:

- **Confluence app.** A macro that shows a `.md` or `.html` file attached to a page.
- **Claude Code plugin.** Claude writes the file, puts it on a page with the macro, and sends you the link.

## Set up (5 minutes)

### 1. Add the app to Confluence

A site admin does this once per site.

**[Install on your Confluence site →](https://developer.atlassian.com/console/install/8b606c36-7aa8-46c6-bb64-c23c0f0cfe6e?signature=AYABeEq8f1rfdfr1LS6%2Fr1Ltq2sAAAADAAdhd3Mta21zAEthcm46YXdzOmttczp1cy13ZXN0LTI6NzA5NTg3ODM1MjQzOmtleS83MDVlZDY3MC1mNTdjLTQxYjUtOWY5Yi1lM2YyZGNjMTQ2ZTcAuAECAQB4CxqLTo9l4lqXuFjNim1xJM%2Bp%2F3TVP9xHS2BrU5DRRucBX8t4A9K2D79tH5GXmOIMdwAAAH4wfAYJKoZIhvcNAQcGoG8wbQIBADBoBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDMphVUmQqGjdF4Pu7QIBEIA7rO%2FmQRetVyjMxR4JuBZG9npTmej75LN51jvhlJ8ztIUTe5C%2FMZlg%2F31Egwl69W8s5ArZ5P9uXUnUn3gAB2F3cy1rbXMAS2Fybjphd3M6a21zOmV1LXdlc3QtMTo3MDk1ODc4MzUyNDM6a2V5LzQ2MzBjZTZiLTAwYzMtNGRlMi04NzdiLTYyN2UyMDYwZTVjYwC4AQICAHi9bVMAkme4qVQX1fQHo6ePw3H40A7cGfz7yrmSfBWMXgHV9WHDrqIja%2BMQ%2BRAFo%2F0cAAAAfjB8BgkqhkiG9w0BBwagbzBtAgEAMGgGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMrijNcn%2BTQBTPDYEEAgEQgDvuw%2FjEeAUP0XBtvhbQ6IS1X9VbiRwh5VcG00B8lOL2f1hhj87iZIFF7JLQePDRhoeAI1YJuhnMa6Ci0QAHYXdzLWttcwBLYXJuOmF3czprbXM6dXMtZWFzdC0xOjcwOTU4NzgzNTI0MzprZXkvNmMxMjBiYTAtNGNkNS00OTg1LWI4MmUtNDBhMDQ5NTJjYzU3ALgBAgIAeDYASx0XCjkny4iLV6vz%2BKtEGSGT6kdt0QRpkn6D%2FlVEAQySa0raapt8Rc05aAmWySQAAAB%2BMHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAwjn0tIEvM5jNVqXg8CARCAO3nzsf5ii0WnOu0j1aGterPDC2oy1WfIGZTd9RDwiWblJoPu7Vmr8KJFw51vVaI3WBrPqzykB37L4SVIAgAAAAAMAAAQAAAAAAAAAAAAAAAAAP1fR52Ii1B%2FX7PzZWxmgcf%2F%2F%2F%2F%2FAAAAAQAAAAAAAAAAAAAAAQAAADLLsbiWmueTTq4dYMfWVJfe76fUxDY4jjnqw4A5xn%2FyXFZpSTp%2BNp%2FXGzHnb2tOhgGGcFM1p4NEYv8A0NXSKoGh60E%3D&product=confluence)**

Pick your site, then Install. It asks only to read pages and attachments.

Already done? In any Confluence page, type `/Render`. If you see **Render MD & HTML**, skip this step.

### 2. Add the plugin to Claude Code

Each person does this once. In a terminal:

```bash
claude plugin marketplace add getgautham/confluence-render
claude plugin install confluence-render@confluence-render
```

Then in Claude Code:

```
/plugin configure confluence-render@confluence-render
```

| Setting | What to enter |
| --- | --- |
| Confluence site | `yourcompany.atlassian.net` |
| Atlassian email | The email you log in to Confluence with |
| API token | Make one at [id.atlassian.com → API tokens](https://id.atlassian.com/manage-profile/security/api-tokens). It's saved in your system keychain. |
| Macro key | Leave empty |

Restart Claude Code.

### 3. Use it

Ask Claude:

> Write a one-page Q3 summary with a revenue chart and publish it to the ENG space.

Claude writes the file, publishes it and sends you the link. To change it later, ask: *"Add September to that page."*

No Claude? Drag a `.md` or `.html` file onto a page, type `/Render MD & HTML`, then publish.

## What shows

- **Markdown:** headings, tables, code, quotes, checklists, images.
- **HTML:** the page's own layout and styles. Scripts (charts, tabs, filters) run only if the author allows them.
- **Images:** keep them next to the file and link by name, `![Revenue](revenue.png)`. The plugin uploads them with the file. PNG, JPG, GIF, WebP, SVG.

Try [`examples/`](examples): a Markdown playbook with a chart, a static HTML one-pager and an interactive dashboard.

## Safety

- **The app only reads, and reads as the person viewing.** If you can't open the attachment in Confluence, you can't see it in the macro.
- **No outside calls.** Nothing is stored, and there's no server of ours. It runs on Atlassian (Forge) and is eligible for Runs on Atlassian.
- **Every file shows in a sandbox** (a locked frame that can't touch Confluence or your login).
  - Markdown is cleaned and can't run code.
  - HTML scripts are off unless an editor allows them, and only for that exact upload. A new upload runs with scripts off until someone allows them again.
- **The plugin is small:** about 350 lines, no dependencies.
  - Your token stays in your keychain and goes only to your Atlassian site.
  - It reads only the file you publish and the images in its folder.
  - It never deletes anything.

More: [PRIVACY.md](PRIVACY.md) · [SECURITY.md](SECURITY.md) (report problems here)

## Limits

- Confluence Cloud only, not Server or Data Center.
- Files up to 2 MB, images up to 3 MB each.
- Keep HTML self-contained. Web images, fonts and CDN scripts don't load.
- On a brand-new page, the file shows after the first publish.
- Confluence search doesn't find text inside the macro. It does find the attached file.
- The plugin runs on your computer, so it needs Claude Code. It doesn't work in claude.ai in a browser.
- Tested with a classic API token. Scoped tokens should work with `read:space:confluence`, `read:page:confluence`, `write:page:confluence`, `read:content-details:confluence` and `write:attachment:confluence`. Open an issue if one is missing.

## For admins

- **Claude Enterprise / Team:** add this repo as a plugin marketplace for your org, so people only enter their own token. See [plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces).
- **Run your own copy of the app** (Node 22 or 24):

  ```bash
  npm install -g @forge/cli && forge login
  cd forge-app && npm install
  forge register && npm run deploy
  forge install -e production --product confluence --site yourcompany.atlassian.net
  ```

  Then give each person your macro key. To find it, open the macro's settings in Confluence and expand **Key for the Claude plugin**.

## Develop

```bash
cd forge-app && npm test && npm run preview   # http://localhost:8765/render/index.html?file=sample.md
cd claude-plugin && npm test                  # runs the plugin against a fake Confluence
claude plugin validate ./claude-plugin
```

## License

MIT

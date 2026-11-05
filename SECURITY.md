# Security

Found a way for a file to break out of the macro's sandbox, read something it shouldn't, or make the plugin send data anywhere but your Confluence site? Please don't open a public issue. Use GitHub's **Report a vulnerability** button on this repo (Security tab), with steps to reproduce. We'll reply within a week.

## What we promise

- The Confluence app makes no network calls outside Atlassian and stores nothing.
- The app only reads, and only as the person viewing the page.
- File content is only ever shown inside a sandboxed iframe, never in the app's own page.
- The Claude plugin sends your token only to your `*.atlassian.net` site or `api.atlassian.com`, and never logs it.
- The plugin only reads `.md` / `.html` files (after resolving symlinks) and never deletes anything.

If the code doesn't keep one of these, that's a bug worth reporting.

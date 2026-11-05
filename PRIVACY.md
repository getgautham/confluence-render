# Privacy

**The Confluence app** (Render MD & HTML macro)

- Stores nothing. No database, no logs of your content, no cookies.
- Sends nothing outside Atlassian. It runs on Atlassian's own platform (Forge, "Runs on Atlassian" eligible) and makes no outside network calls.
- Reads page attachments only while someone views the page, and only as that person, with their Confluence permissions.

**The Claude plugin**

- Runs on your own computer. It talks only to your Confluence site (or Atlassian's API gateway) using your own API token, kept in your system keychain.
- Sends only the file you ask it to publish. The maintainers never see your data.

Questions: [open an issue](https://github.com/getgautham/confluence-render/issues).

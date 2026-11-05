# Q3 launch notes

Written in **Markdown**, shown in Confluence. Links like https://example.com open in a new tab.

## What shipped

| Feature | Owner | Status |
| --- | --- | --- |
| Search | Ana | Live |
| Export | Raj | Beta |

- One
- Two
  - Nested

> A quote from the customer call.

```js
const total = items.reduce((sum, i) => sum + i.price, 0);
```

Inline `code`, ~~struck~~, and a rule:

## Checklist

- [x] Done item
- [ ] Open item

---

<p id="xss-check">Safe raw HTML stays.</p>
<img src="x" onerror="document.body.dataset.pwned = 'yes'">
<script>document.body.dataset.pwned = 'yes'</script>

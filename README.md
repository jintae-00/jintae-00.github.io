# jintae-00.github.io

Personal site of Jintae Park (KAIST AI). Static HTML, no build step.

- `index.html` — the page (content lives here)
- `styles.css` — styling; three design variants selectable with `?design=a|b|c` (`a` is the default)
- `main.js` — flip-book portrait, live GitHub star count, play-when-visible videos
- `assets/` — photos, logos, figures, and the demo videos (robot runs are 4× speed re-encodes)

## Updating

- Star count: fetched live from the GitHub API; the number in `index.html` (`#gh-stars`) is only the fallback.
- Dataset downloads: static number in `index.html` next to the Dataset button; update by hand.
- Publications: each `<article class="pub">` is self-contained (header, links, media).

## Deploy

GitHub Pages serves the `main` branch root of the `jintae-00.github.io` repository. Push and it is live at
https://jintae-00.github.io/ within a minute or two.

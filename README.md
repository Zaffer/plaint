# Plaint

A plain painting web app.

Plaint runs in the browser. You can install it on a phone as an app. It works without a network. Colours mix like real paint.

## Use the app

Draw with a finger, a pen, or the mouse. Many fingers can draw at the same time.

- Tap a colour to select it. New paint mixes with the paint below it.
- Drag the slider to set the pen size.
- Pull the toolbar down to show the mixing palette behind it.
- Use the menu (top left) to set the colours, the theme, and the pages.
- Push the space bar to show or hide the toolbar.
- Push Ctrl and the space bar to show or hide the mixing palette.
- Put a name at the end of the address to make a new page. Example: `/house`.
  The app keeps the picture for each page.

## Run the app on your computer

    python3 serve.py

Then open <http://localhost:8765/>. Do not use `python3 -m http.server`. It cannot serve the page addresses.

## Files

- `index.html` — the page.
- `style.css` — the styles.
- `app.js` — the app. All the code is in this one file.
- `mixbox.js`, `spectral.js` — the pigment mixing engines. See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
- `manifest.webmanifest`, `sw.js`, `icons/` — these make the app installable and let it work without a network.
- `404.html` — a generated copy of `index.html` for GitHub Pages. Do not edit it. Run `python3 make404.py` after each change to `index.html`.
- `makeicons.mjs` — makes the icons. Run `node makeicons.mjs` after each change to the logo.

## License

The code is MIT. See [LICENSE](LICENSE). But `mixbox.js` is CC BY-NC, and it limits the app to non-commercial use. Delete `mixbox.js` to make the app fully MIT. The app then mixes with `spectral.js`.

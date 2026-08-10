#!/usr/bin/env python3
"""Rebuild 404.html from index.html.

GitHub Pages has no rewrite rules: a request for /house, which is a page in
this app and not a file, gets 404.html. So 404.html has to *be* the app. It is
index.html with one extra script in the head, and this regenerates it.

Run it after any edit to index.html:

    python3 make404.py

Not a build step for the app itself — index.html is still the file the browser
loads, still hand-written, still free of tooling. This only exists because one
static host needs the same page under two names.
"""

import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent

PREAMBLE = '''<head>
  <!-- ===== GENERATED: this file is index.html plus the script below. =====
       GitHub Pages serves 404.html for any address with no file behind it,
       which is how /house can be a page without /house.html existing. Rebuild
       it after editing index.html:

           python3 make404.py

       Nothing else in here should be edited by hand. -->
  <script>
    // Served for an address that has no file, so the last segment is a page
    // name rather than a folder. A trailing slash would make every relative
    // asset below resolve one level too deep and the app would arrive with no
    // stylesheet and no script — so drop it before the browser starts fetching.
    if (location.pathname.length > 1 && location.pathname.endsWith("/")) {
      location.replace(
        location.pathname.slice(0, -1) + location.search + location.hash
      );
    }
  </script>
'''


def build() -> str:
    src = (HERE / "index.html").read_text(encoding="utf-8")
    out = src.replace("<head>\n", PREAMBLE, 1)
    if out == src:
        sys.exit("make404: no <head> line found in index.html")
    return out


if __name__ == "__main__":
    target = HERE / "404.html"
    fresh = build()
    if target.exists() and target.read_text(encoding="utf-8") == fresh:
        print("404.html already up to date")
    else:
        target.write_text(fresh, encoding="utf-8")
        print(f"404.html rebuilt from index.html ({len(fresh)} bytes)")

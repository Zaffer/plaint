#!/usr/bin/env python3
"""Local server for the app.

    python3 serve.py [port]        # default 8765

`python3 -m http.server` cannot serve this any more: /house is a page, not a
file, and it would 404. GitHub Pages answers that with 404.html; this answers it
with index.html, which is the same page. Use it instead of http.server so what
you see locally is what the published site does.
"""

import http.server
import os
import posixpath
import socketserver
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def send_head(self):
        path = urllib.parse.urlsplit(self.path).path
        if not os.path.exists(self.translate_path(self.path)):
            # No file there. Anything without an extension is a page name — the
            # app reads it straight off the address — and anything with one is a
            # genuinely missing asset, which should still 404 loudly.
            if not posixpath.splitext(path)[1]:
                if len(path) > 1 and path.endswith("/"):
                    # Relative assets in the shell would resolve a level too
                    # deep. Same normalisation the published 404.html does.
                    self.send_response(301)
                    self.send_header("Location", path.rstrip("/"))
                    self.send_header("Content-Length", "0")
                    self.end_headers()
                    return None
                self.path = "/index.html"
        return super().send_head()

    def end_headers(self):
        # A drawing toy being edited: never serve yesterday's app.js.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"colour → http://localhost:{PORT}/")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print()

"""Serves web/ with the headers a page of threads needs.

A page whose WebAssembly shares memory between threads must be
cross-origin isolated: these two headers, which GitHub Pages cannot send,
are what the service worker sends there instead.
"""

import functools
import http.server
import sys


class Isolated(http.server.SimpleHTTPRequestHandler):
    """A file server whose every answer is cross-origin isolated."""

    def end_headers(self):
        """Adds the isolation headers to every answer."""
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        super().end_headers()


def main():
    """Serves web/ on the port given, 8000 by default."""
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = functools.partial(Isolated, directory="web")
    http.server.ThreadingHTTPServer(("127.0.0.1", port), handler).serve_forever()


if __name__ == "__main__":
    main()

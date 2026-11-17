# static server with a strict content-security policy like an artifact host: python3 cspserve.py PORT DIR
# /pavillon-ton/… goes through to the sound repository (https://mynametouse.github.io/pavillon-ton/, Grenzland 17.11.2026): the game then
# takes those files from its own origin, as on GitHub Pages, and the tests can play them (GLTON_BASE = location.origin + '/pavillon-ton/')
import sys, http.server, functools, shutil, urllib.request, urllib.error
TON = 'https://mynametouse.github.io/pavillon-ton/'
CSP = ("default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://cdnjs.cloudflare.com; "
       "img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
       "font-src 'self' data: https://fonts.gstatic.com; worker-src 'self' blob:")
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Content-Security-Policy', CSP); super().end_headers()
    def log_message(self, *a): pass
    def _ton(self, head):
        rq = urllib.request.Request(TON + self.path[len('/pavillon-ton/'):], method='HEAD' if head else 'GET')
        if self.headers.get('Range'): rq.add_header('Range', self.headers['Range'])
        try:
            r = urllib.request.urlopen(rq, timeout=30)
        except urllib.error.HTTPError as e:
            r = e
        except Exception:
            self.send_error(502); return
        self.send_response(r.status if hasattr(r, 'status') else r.code)
        for k in ('Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges', 'Last-Modified', 'ETag'):
            if r.headers.get(k): self.send_header(k, r.headers.get(k))
        self.end_headers()
        if not head:
            try: shutil.copyfileobj(r, self.wfile)
            except Exception: pass
    def do_GET(self):
        if self.path.startswith('/pavillon-ton/'): return self._ton(False)
        return super().do_GET()
    def do_HEAD(self):
        if self.path.startswith('/pavillon-ton/'): return self._ton(True)
        return super().do_HEAD()
http.server.ThreadingHTTPServer(('', int(sys.argv[1])), functools.partial(H, directory=sys.argv[2])).serve_forever()

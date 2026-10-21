# static server with a strict content-security policy like an artifact host: python3 cspserve.py PORT DIR
import sys, http.server, functools
CSP = ("default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://cdnjs.cloudflare.com; "
       "img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
       "font-src 'self' data: https://fonts.gstatic.com; worker-src 'self' blob:")
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Content-Security-Policy', CSP); super().end_headers()
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(('', int(sys.argv[1])), functools.partial(H, directory=sys.argv[2])).serve_forever()

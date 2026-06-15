#!/usr/bin/env python3
import http.server, os, sys

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8082

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)
        if not os.path.exists(path):
            self.path = '/'
        return super().send_head()

os.chdir(os.path.join(os.path.dirname(__file__), 'dist'))
httpd = http.server.HTTPServer(('', port), SPAHandler)
print(f'Serving Element Call (embedded) on http://localhost:{port}')
httpd.serve_forever()

"""Servidor estático que además recibe el resultado de tests/tests.html (POST /__results)."""
import http.server, os, sys, threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, '.superpowers', 'test-results.txt')
OFFLINE = len(sys.argv) > 3 and sys.argv[3] == 'offline'  # simula servidor caído: todo GET responde 503


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def log_message(self, *a):
        pass

    def do_GET(self):
        if OFFLINE:
            self.send_error(503)
            return
        super().do_GET()

    def do_POST(self):
        if self.path != '/__results':
            self.send_error(404)
            return
        body = self.rfile.read(int(self.headers.get('Content-Length', 0))).decode('utf-8')
        with open(OUT, 'w', encoding='utf-8') as fh:
            fh.write(body)
        self.send_response(204)
        self.end_headers()
        threading.Thread(target=self.server.shutdown, daemon=True).start()


if __name__ == '__main__':
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    if os.path.exists(OUT):
        os.remove(OUT)
    http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()

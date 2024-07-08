from http.server import SimpleHTTPRequestHandler, HTTPServer
import os

class CustomHTTPRequestHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        return super().do_GET()

    def end_headers(self):
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        super().end_headers()

def run(server_class=HTTPServer, handler_class=CustomHTTPRequestHandler, port=3003):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f'Starting httpd server on port {port}')
    httpd.serve_forever()

if __name__ == "__main__":
    run()
"""Servidor local para probar Calmo en la red de la casa, sin caché.

Uso: python3 serve.py   (luego abre en el iPhone la dirección que imprime)
"""
import http.server
import os
import socket
import socketserver

PORT = 8080


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        return s.getsockname()[0]
    except OSError:
        return '127.0.0.1'
    finally:
        s.close()


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(('0.0.0.0', PORT), NoCache) as httpd:
        print(f'Calmo listo en http://{lan_ip()}:{PORT}  (en esta Mac: http://localhost:{PORT})', flush=True)
        httpd.serve_forever()

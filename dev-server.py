#!/usr/bin/env python3
"""
Simple development server with auto-reload functionality
Serves the public directory on port 3000 with live reload
"""

import http.server
import socketserver
import os
import time
import threading
import json
from pathlib import Path

class LiveReloadHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory="public", **kwargs)
    
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        
        # Add live reload script to HTML files
        if self.path.endswith('.html') or self.path == '/':
            self.send_header('Content-Type', 'text/html; charset=utf-8')
        
        super().end_headers()
    
    def do_GET(self):
        if self.path == '/':
            self.path = '/etf_savings.html'
        
        # Handle live reload endpoint
        if self.path == '/live-reload-check':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            # Get file modification times
            file_times = {}
            for root, dirs, files in os.walk('public'):
                for file in files:
                    if file.endswith(('.html', '.js', '.css')):
                        filepath = os.path.join(root, file)
                        file_times[filepath] = os.path.getmtime(filepath)
            
            self.wfile.write(json.dumps(file_times).encode())
            return
        
        # Serve files normally
        super().do_GET()
        
        # Inject live reload script into HTML files
        if self.path.endswith('.html') or self.path == '/etf_savings.html':
            # Read the file content that was just served
            try:
                file_path = os.path.join('public', self.path.lstrip('/'))
                if os.path.exists(file_path):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Inject live reload script before closing body tag
                    live_reload_script = '''
<script>
(function() {
    let lastFileStates = {};
    
    function checkForChanges() {
        fetch('/live-reload-check')
            .then(response => response.json())
            .then(fileStates => {
                if (Object.keys(lastFileStates).length === 0) {
                    lastFileStates = fileStates;
                    return;
                }
                
                // Check if any files have changed
                for (const [file, mtime] of Object.entries(fileStates)) {
                    if (lastFileStates[file] !== mtime) {
                        console.log('File changed:', file, 'Reloading...');
                        window.location.reload();
                        return;
                    }
                }
                
                lastFileStates = fileStates;
            })
            .catch(error => {
                console.log('Live reload check failed:', error);
            });
    }
    
    // Check every 1 second for file changes
    setInterval(checkForChanges, 1000);
    console.log('🔄 Live reload enabled - files will auto-refresh when changed');
})();
</script>'''
                    
                    if '</body>' in content:
                        content = content.replace('</body>', live_reload_script + '</body>')
                    elif '</html>' in content:
                        content = content.replace('</html>', live_reload_script + '</html>')
                    else:
                        content += live_reload_script
                    
                    # Override the response
                    self.send_response(200)
                    self.send_header('Content-Type', 'text/html; charset=utf-8')
                    self.send_header('Content-Length', str(len(content.encode('utf-8'))))
                    self.end_headers()
                    self.wfile.write(content.encode('utf-8'))
                    return
            except Exception as e:
                print(f"Error injecting live reload: {e}")

class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True

def start_server():
    PORT = 3001
    
    # Change to the project directory
    os.chdir('/Users/nicolasschneider/MeineDokumente/Privat/Programmieren/german-financial-planner')
    
    with ThreadedTCPServer(("", PORT), LiveReloadHandler) as httpd:
        print(f"🚀 Development server running at http://localhost:{PORT}")
        print(f"📂 Serving files from: {os.path.abspath('public')}")
        print(f"🔄 Live reload enabled - changes will auto-refresh")
        print(f"📄 Direct link: http://localhost:{PORT}/etf_savings.html")
        print("\nPress Ctrl+C to stop the server")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped")

if __name__ == "__main__":
    start_server()
package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func main() {
	port := env("PORT", "8080")
	publicDir := env("PUBLIC_DIR", "./public")

	handler := spaHandler(publicDir)
	server := &http.Server{
		Addr:              ":" + port,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("quiphuts listening on :%s (public dir: %s)", port, publicDir)
	log.Fatal(server.ListenAndServe())
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func spaHandler(publicDir string) http.Handler {
	fs := http.Dir(publicDir)
	fileServer := http.FileServer(fs)
	indexPath := filepath.Join(publicDir, "index.html")

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		if r.URL.Path == "/healthz" {
			w.Header().Set("Content-Type", "text/plain; charset=utf-8")
			w.Header().Set("Cache-Control", "no-store")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte("ok\n"))
			return
		}

		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		path := strings.TrimPrefix(r.URL.Path, "/")
		if path != "" {
			if info, err := fs.Open(path); err == nil {
				_ = info.Close()
				setCacheHeaders(w, path)
				fileServer.ServeHTTP(w, r)
				return
			}

			// Do not serve the SPA for a missing asset file.
			if strings.Contains(filepath.Base(path), ".") {
				http.NotFound(w, r)
				return
			}
		}

		w.Header().Set("Cache-Control", "no-cache")
		http.ServeFile(w, r, indexPath)
	})
}

func setCacheHeaders(w http.ResponseWriter, path string) {
	if strings.HasPrefix(path, "assets/") || strings.HasPrefix(path, "audio/") {
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		return
	}
	w.Header().Set("Cache-Control", "no-cache")
}

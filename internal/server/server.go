package server

import (
	"embed"
	"html/template"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/ryanbastic/digitalpalireader/internal/cache"
	"github.com/ryanbastic/digitalpalireader/internal/handlers"
	"github.com/ryanbastic/digitalpalireader/internal/search"
	"github.com/ryanbastic/digitalpalireader/internal/xml"
)

// Config holds server configuration
type Config struct {
	Port      string
	DataPath  string
	Templates fs.FS
	Static    fs.FS
}

// Server represents the HTTP server
type Server struct {
	config       Config
	templates    *template.Template
	mux          *http.ServeMux
	cache        *cache.Cache
	parser       *xml.TipitakaParser
	dictParser   *xml.DictionaryParser
	searchEngine *search.Engine
}

// New creates a new server instance
func New(config Config) *Server {
	s := &Server{
		config: config,
		mux:    http.NewServeMux(),
		cache:  cache.New(1 * time.Hour),
	}

	s.parser = xml.NewTipitakaParser(config.DataPath, s.cache)
	s.dictParser = xml.NewDictionaryParser(config.DataPath, s.cache)
	s.searchEngine = search.NewEngine(config.DataPath, s.cache)

	return s
}

// LoadTemplates loads HTML templates
func (s *Server) LoadTemplates(templatesFS embed.FS) error {
	var err error
	s.templates, err = template.ParseFS(templatesFS, "web/templates/**/*.html")
	return err
}

// SetupRoutes configures all HTTP routes
func (s *Server) SetupRoutes() {
	// Create handlers
	navHandler := handlers.NewNavigationHandler(s.parser)
	textHandler := handlers.NewTextHandler(s.parser)
	dictHandler := handlers.NewDictionaryHandler(s.dictParser)
	searchHandler := handlers.NewSearchHandler(s.searchEngine)

	// API routes - Navigation
	s.mux.HandleFunc("GET /api/v1/hierarchy", navHandler.GetHierarchy)
	s.mux.HandleFunc("GET /api/v1/hierarchy/{set}", navHandler.GetSetHierarchy)
	s.mux.HandleFunc("GET /api/v1/hierarchy/{set}/{book}", navHandler.GetBookHierarchy)

	// API routes - Text
	s.mux.HandleFunc("GET /api/v1/text/{set}/{book}/{meta}/{volume}/{vagga}/{sutta}/{section}", textHandler.GetSection)
	s.mux.HandleFunc("GET /api/v1/text", textHandler.GetTextHTML)

	// API routes - Dictionary
	s.mux.HandleFunc("GET /api/v1/dictionary/lookup", dictHandler.Lookup)
	s.mux.HandleFunc("GET /api/v1/dictionary/entry/{dict}/{id...}", dictHandler.GetEntry)

	// API routes - Search
	s.mux.HandleFunc("POST /api/v1/search", searchHandler.Search)
	s.mux.HandleFunc("GET /api/v1/search/quick", searchHandler.QuickSearch)

	// Serve static files with proper MIME types
	s.mux.HandleFunc("GET /static/", s.handleStatic)

	// Serve data files (tipitaka XML, dictionaries)
	dataFS := http.Dir(s.config.DataPath)
	s.mux.Handle("GET /data/", http.StripPrefix("/data/", http.FileServer(dataFS)))

	// Main page route
	s.mux.HandleFunc("GET /", s.handleIndex)
}

// handleIndex serves the main page
func (s *Server) handleIndex(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	if s.templates != nil {
		err := s.templates.ExecuteTemplate(w, "base", nil)
		if err != nil {
			log.Printf("Template error: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
		}
		return
	}

	// Fallback: serve a basic HTML page
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(defaultHTML))
}

// handleStatic serves static files with proper MIME types
func (s *Server) handleStatic(w http.ResponseWriter, r *http.Request) {
	// Get the file path relative to /static/
	path := strings.TrimPrefix(r.URL.Path, "/static/")
	if path == "" || strings.Contains(path, "..") {
		http.NotFound(w, r)
		return
	}

	// Try to find file in web/static directory relative to current dir
	// or relative to the data path
	var filePath string
	candidates := []string{
		filepath.Join("web", "static", path),
		filepath.Join(s.config.DataPath, "..", "web", "static", path),
	}

	for _, candidate := range candidates {
		if _, err := os.Stat(candidate); err == nil {
			filePath = candidate
			break
		}
	}

	if filePath == "" {
		http.NotFound(w, r)
		return
	}

	// Set Content-Type based on extension
	ext := strings.ToLower(filepath.Ext(path))
	contentType := getMIMEType(ext)
	if contentType != "" {
		w.Header().Set("Content-Type", contentType)
	}

	http.ServeFile(w, r, filePath)
}

// getMIMEType returns the MIME type for a file extension
func getMIMEType(ext string) string {
	mimeTypes := map[string]string{
		".css":  "text/css; charset=utf-8",
		".js":   "application/javascript; charset=utf-8",
		".json": "application/json; charset=utf-8",
		".html": "text/html; charset=utf-8",
		".htm":  "text/html; charset=utf-8",
		".xml":  "application/xml; charset=utf-8",
		".svg":  "image/svg+xml",
		".png":  "image/png",
		".jpg":  "image/jpeg",
		".jpeg": "image/jpeg",
		".gif":  "image/gif",
		".ico":  "image/x-icon",
		".woff": "font/woff",
		".woff2": "font/woff2",
		".ttf":  "font/ttf",
		".eot":  "application/vnd.ms-fontobject",
	}
	return mimeTypes[ext]
}

// Handler returns the HTTP handler
func (s *Server) Handler() http.Handler {
	return s.loggingMiddleware(s.corsMiddleware(s.mux))
}

// loggingMiddleware logs all requests
func (s *Server) loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
	})
}

// corsMiddleware adds CORS headers
func (s *Server) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

const defaultHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Digital Pāli Reader</title>
    <link rel="stylesheet" href="/static/css/variables.css">
    <link rel="stylesheet" href="/static/css/main.css">
    <link rel="stylesheet" href="/static/css/text.css">
    <link rel="stylesheet" href="/static/css/navigation.css">
    <link rel="stylesheet" href="/static/css/dictionary.css">
    <link rel="stylesheet" href="/static/css/search.css">
</head>
<body>
    <div id="app">
        <aside id="sidebar" class="sidebar">
            <nav class="nav-tabs">
                <ul class="tab-list">
                    <li><button data-tab="navigate" class="tab-btn active">Navigation</button></li>
                    <li><button data-tab="search" class="tab-btn">Search</button></li>
                    <li><button data-tab="dictionary" class="tab-btn">Dictionary</button></li>
                </ul>

                <div id="navigate-panel" class="tab-panel active">
                    <div class="nav-hierarchy">
                        <label for="nav-set">Collection:</label>
                        <select id="nav-set" name="set"></select>

                        <label for="nav-book">Book:</label>
                        <select id="nav-book" name="book"></select>

                        <label for="nav-hier">Type:</label>
                        <select id="nav-hier" name="hier">
                            <option value="m">Mūla</option>
                            <option value="a">Aṭṭhakathā</option>
                            <option value="t">Ṭīkā</option>
                        </select>

                        <button id="nav-go" class="btn btn-primary">Go</button>
                    </div>

                    <div id="nav-tree"></div>
                </div>

                <div id="search-panel" class="tab-panel">
                    <div class="search-form">
                        <label for="search-query">Search Tipitaka:</label>
                        <input type="search" id="search-query" name="query" placeholder="Enter Pali text...">

                        <label for="search-set">Scope:</label>
                        <select id="search-set" name="set">
                            <option value="">All Nikāyas</option>
                            <option value="d">Dīgha Nikāya</option>
                            <option value="m">Majjhima Nikāya</option>
                            <option value="s">Saṃyutta Nikāya</option>
                            <option value="a">Aṅguttara Nikāya</option>
                            <option value="k">Khuddaka Nikāya</option>
                            <option value="v">Vinaya</option>
                            <option value="y">Abhidhamma</option>
                        </select>

                        <label for="search-hier">Text Type:</label>
                        <select id="search-hier" name="hier">
                            <option value="m">Mūla</option>
                            <option value="a">Aṭṭhakathā</option>
                            <option value="t">Ṭīkā</option>
                        </select>

                        <div class="search-options">
                            <label class="checkbox-label">
                                <input type="checkbox" id="search-regex" name="regex">
                                <span>Use regex</span>
                            </label>
                        </div>

                        <button id="search-btn" class="btn btn-primary">Search</button>
                    </div>

                    <div id="search-results"></div>
                </div>

                <div id="dictionary-panel" class="tab-panel">
                    <div class="dict-search">
                        <label for="dict-query">Look up word:</label>
                        <input type="search" id="dict-query" name="query" placeholder="Enter Pali word...">

                        <label for="dict-type">Dictionary:</label>
                        <select id="dict-type" name="dict">
                            <option value="PED">PED (Pali-English)</option>
                            <option value="DPPN">DPPN (Proper Names)</option>
                            <option value="MULTI">All Dictionaries</option>
                        </select>

                        <button id="dict-search-btn" class="btn btn-primary">Search</button>
                    </div>

                    <div id="dict-results"></div>
                </div>
            </nav>
        </aside>

        <main id="main-content">
            <header id="text-header">
                <nav id="breadcrumb"></nav>
                <h1 id="text-title">Welcome to Digital Pāli Reader</h1>
            </header>
            <article id="text-content">
                <p>Select a text from the navigation panel to begin reading.</p>
            </article>
        </main>
    </div>
    <script type="module" src="/static/js/main.js"></script>
</body>
</html>
`

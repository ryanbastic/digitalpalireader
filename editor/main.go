package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

const tipitakaDir = "../public/tipitaka"

type FileInfo struct {
	Name  string `json:"name"`
	Path  string `json:"path"`
	IsDir bool   `json:"isDir"`
}

type FileContent struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

func main() {
	// Serve static files (HTML, CSS, JS)
	http.HandleFunc("/", serveIndex)
	http.HandleFunc("/style.css", serveCSS)

	// API endpoints
	http.HandleFunc("/api/files", listFiles)
	http.HandleFunc("/api/file", handleFile)

	port := ":9000"
	fmt.Printf("Pali XML Editor running at http://localhost%s\n", port)
	log.Fatal(http.ListenAndServe(port, nil))
}

func serveIndex(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	http.ServeFile(w, r, "index.html")
}

func serveCSS(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/css")
	http.ServeFile(w, r, "style.css")
}

func listFiles(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	dir := r.URL.Query().Get("dir")
	if dir == "" {
		dir = ""
	}

	// Security: prevent directory traversal
	if strings.Contains(dir, "..") {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	fullPath := filepath.Join(tipitakaDir, dir)

	entries, err := os.ReadDir(fullPath)
	if err != nil {
		http.Error(w, "Failed to read directory: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var files []FileInfo
	for _, entry := range entries {
		// Only show directories and XML files
		if entry.IsDir() || strings.HasSuffix(entry.Name(), ".xml") {
			files = append(files, FileInfo{
				Name:  entry.Name(),
				Path:  filepath.Join(dir, entry.Name()),
				IsDir: entry.IsDir(),
			})
		}
	}

	// Sort: directories first, then files alphabetically
	sort.Slice(files, func(i, j int) bool {
		if files[i].IsDir != files[j].IsDir {
			return files[i].IsDir
		}
		return files[i].Name < files[j].Name
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(files)
}

func handleFile(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		getFile(w, r)
	case http.MethodPut:
		saveFile(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func getFile(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	if path == "" {
		http.Error(w, "Path required", http.StatusBadRequest)
		return
	}

	// Security: prevent directory traversal
	if strings.Contains(path, "..") {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	// Only allow XML files
	if !strings.HasSuffix(path, ".xml") {
		http.Error(w, "Only XML files allowed", http.StatusBadRequest)
		return
	}

	fullPath := filepath.Join(tipitakaDir, path)

	content, err := os.ReadFile(fullPath)
	if err != nil {
		http.Error(w, "Failed to read file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(FileContent{
		Path:    path,
		Content: string(content),
	})
}

func saveFile(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var fc FileContent
	if err := json.Unmarshal(body, &fc); err != nil {
		http.Error(w, "Invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Security: prevent directory traversal
	if strings.Contains(fc.Path, "..") {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	// Only allow XML files
	if !strings.HasSuffix(fc.Path, ".xml") {
		http.Error(w, "Only XML files allowed", http.StatusBadRequest)
		return
	}

	fullPath := filepath.Join(tipitakaDir, fc.Path)

	// Check if file exists (don't create new files)
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		http.Error(w, "File does not exist", http.StatusNotFound)
		return
	}

	if err := os.WriteFile(fullPath, []byte(fc.Content), 0644); err != nil {
		http.Error(w, "Failed to save file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "saved", "path": fc.Path})
}

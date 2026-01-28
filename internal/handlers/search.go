package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/ryanbastic/digitalpalireader/internal/models"
	"github.com/ryanbastic/digitalpalireader/internal/search"
)

// SearchHandler handles search-related API endpoints
type SearchHandler struct {
	engine *search.Engine
}

// NewSearchHandler creates a new search handler
func NewSearchHandler(engine *search.Engine) *SearchHandler {
	return &SearchHandler{engine: engine}
}

// Search handles POST /api/v1/search
func (h *SearchHandler) Search(w http.ResponseWriter, r *http.Request) {
	var req models.SearchRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	if req.Query == "" {
		http.Error(w, "Missing query parameter", http.StatusBadRequest)
		return
	}

	response, err := h.engine.Search(req)
	if err != nil {
		http.Error(w, "Search error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// QuickSearch handles GET /api/v1/search/quick for simpler searches
func (h *SearchHandler) QuickSearch(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "Missing query parameter 'q'", http.StatusBadRequest)
		return
	}

	set := r.URL.Query().Get("set")
	hier := r.URL.Query().Get("hier")
	if hier == "" {
		hier = "m"
	}

	// Build search request
	req := models.SearchRequest{
		Query: query,
		Hier:  hier,
		Limit: 50,
	}

	if set != "" {
		req.Type = models.SearchBooksInSet
		req.Set = set
	} else {
		req.Type = models.SearchPartial // Limited search for quick results
	}

	response, err := h.engine.Search(req)
	if err != nil {
		http.Error(w, "Search error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

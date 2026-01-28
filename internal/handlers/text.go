package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/ryanbastic/digitalpalireader/internal/models"
	"github.com/ryanbastic/digitalpalireader/internal/xml"
)

// TextHandler handles text content API endpoints
type TextHandler struct {
	parser *xml.TipitakaParser
}

// NewTextHandler creates a new text handler
func NewTextHandler(parser *xml.TipitakaParser) *TextHandler {
	return &TextHandler{parser: parser}
}

// GetSection returns the text content for a specific section
func (h *TextHandler) GetSection(w http.ResponseWriter, r *http.Request) {
	// Parse path parameters
	place := models.Place{
		Set:     r.PathValue("set"),
		Book:    parseInt(r.PathValue("book")),
		Meta:    parseInt(r.PathValue("meta")),
		Volume:  parseInt(r.PathValue("volume")),
		Vagga:   parseInt(r.PathValue("vagga")),
		Sutta:   parseInt(r.PathValue("sutta")),
		Section: parseInt(r.PathValue("section")),
	}

	// Parse query parameters
	hier := r.URL.Query().Get("mat")
	if hier == "" {
		hier = "m"
	}
	place.Hier = hier

	script := r.URL.Query().Get("script")
	if script == "" {
		script = "my"
	}
	place.Script = script

	// Load the section
	section, err := h.parser.LoadSection(place)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(section)
}

// GetTextHTML returns formatted HTML for a section (for direct rendering)
func (h *TextHandler) GetTextHTML(w http.ResponseWriter, r *http.Request) {
	// Parse location from query param
	loc := r.URL.Query().Get("loc")
	if loc == "" {
		http.Error(w, "Missing loc parameter", http.StatusBadRequest)
		return
	}

	place := models.ParseLocation(loc)

	script := r.URL.Query().Get("script")
	if script != "" {
		place.Script = script
	}

	section, err := h.parser.LoadSection(place)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(section.Content))
}

package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/ryanbastic/digitalpalireader/internal/models"
	"github.com/ryanbastic/digitalpalireader/internal/xml"
)

// DictionaryHandler handles dictionary-related API endpoints
type DictionaryHandler struct {
	parser *xml.DictionaryParser
}

// NewDictionaryHandler creates a new dictionary handler
func NewDictionaryHandler(parser *xml.DictionaryParser) *DictionaryHandler {
	return &DictionaryHandler{parser: parser}
}

// Lookup handles dictionary word lookup
func (h *DictionaryHandler) Lookup(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "Missing query parameter 'q'", http.StatusBadRequest)
		return
	}

	dictType := r.URL.Query().Get("dict")
	if dictType == "" {
		dictType = "PED"
	}

	response := models.DictLookupResponse{
		Query:   query,
		Results: []models.DictEntry{},
	}

	var err error

	switch models.DictType(dictType) {
	case models.DictPED:
		response.Results, err = h.parser.LookupPED(query)
	case models.DictDPPN:
		response.Results, err = h.parser.LookupDPPN(query)
	case models.DictMulti:
		// Search all dictionaries
		pedResults, pedErr := h.parser.LookupPED(query)
		if pedErr == nil {
			response.Results = append(response.Results, pedResults...)
		}
		dppnResults, dppnErr := h.parser.LookupDPPN(query)
		if dppnErr == nil {
			response.Results = append(response.Results, dppnResults...)
		}
	default:
		response.Results, err = h.parser.LookupPED(query)
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetEntry retrieves a specific dictionary entry by ID
func (h *DictionaryHandler) GetEntry(w http.ResponseWriter, r *http.Request) {
	dictType := r.PathValue("dict")
	id := r.PathValue("id")

	if dictType == "" || id == "" {
		http.Error(w, "Missing dict or id parameter", http.StatusBadRequest)
		return
	}

	var entry *models.DictEntry
	var err error

	switch models.DictType(dictType) {
	case models.DictPED:
		entry, err = h.parser.GetPEDEntry(id)
	default:
		http.Error(w, "Dictionary type not supported for entry lookup", http.StatusBadRequest)
		return
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(entry)
}

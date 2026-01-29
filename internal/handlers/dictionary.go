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

	// Check search options
	// fz/fuzzy: fuzzy matching (ignores diacritics and consonant doubling)
	// sw: starts-with only (don't match words containing the query)
	// analyze: compound word analysis (default true)
	fuzzy := r.URL.Query().Get("fz") == "true" || r.URL.Query().Get("fuzzy") == "true"
	startsWithOnly := r.URL.Query().Get("sw") == "true"
	analyze := r.URL.Query().Get("analyze") != "false"

	response := models.DictLookupResponse{
		Query:   query,
		Results: []models.DictEntry{},
	}

	var err error

	switch models.DictType(dictType) {
	case models.DictPED:
		response.Results, err = h.parser.LookupPEDWithOptions(query, fuzzy, startsWithOnly)
		// If no results and analysis is enabled, try compound analysis / stemming
		if len(response.Results) == 0 && analyze {
			compoundResponse, compErr := h.parser.AnalyzeCompound(query)
			if compErr == nil {
				// Copy results from stemming or compound analysis
				if len(compoundResponse.Results) > 0 {
					response.Results = compoundResponse.Results
				}
				if compoundResponse.IsCompound {
					response.IsCompound = compoundResponse.IsCompound
					response.Breakdown = compoundResponse.Breakdown
				}
			}
		}
	case models.DictDPPN:
		response.Results, err = h.parser.LookupDPPNWithOptions(query, fuzzy, startsWithOnly)
	case models.DictMulti:
		// Search all dictionaries
		pedResults, pedErr := h.parser.LookupPEDWithOptions(query, fuzzy, startsWithOnly)
		if pedErr == nil {
			response.Results = append(response.Results, pedResults...)
		}
		dppnResults, dppnErr := h.parser.LookupDPPNWithOptions(query, fuzzy, startsWithOnly)
		if dppnErr == nil {
			response.Results = append(response.Results, dppnResults...)
		}
		// If no results and analysis is enabled, try compound analysis / stemming
		if len(response.Results) == 0 && analyze {
			compoundResponse, compErr := h.parser.AnalyzeCompound(query)
			if compErr == nil {
				// Copy results from stemming or compound analysis
				if len(compoundResponse.Results) > 0 {
					response.Results = compoundResponse.Results
				}
				if compoundResponse.IsCompound {
					response.IsCompound = compoundResponse.IsCompound
					response.Breakdown = compoundResponse.Breakdown
				}
			}
		}
	default:
		response.Results, err = h.parser.LookupPEDWithOptions(query, fuzzy, startsWithOnly)
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

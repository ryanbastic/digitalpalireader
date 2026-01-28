package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/ryanbastic/digitalpalireader/internal/models"
	"github.com/ryanbastic/digitalpalireader/internal/xml"
)

// NavigationHandler handles navigation-related API endpoints
type NavigationHandler struct {
	parser *xml.TipitakaParser
}

// NewNavigationHandler creates a new navigation handler
func NewNavigationHandler(parser *xml.TipitakaParser) *NavigationHandler {
	return &NavigationHandler{parser: parser}
}

// Hierarchy data - based on the original DPR configuration
var sets = []models.Set{
	{Code: "v", Name: "Vinaya", FullName: "Vinaya Piṭaka", LongName: "Vin"},
	{Code: "d", Name: "Dīgha", FullName: "Dīgha Nikāya", LongName: "DN"},
	{Code: "m", Name: "Majjhima", FullName: "Majjhima Nikāya", LongName: "MN"},
	{Code: "s", Name: "Saṃyutta", FullName: "Saṃyutta Nikāya", LongName: "SN"},
	{Code: "a", Name: "Aṅguttara", FullName: "Aṅguttara Nikāya", LongName: "AN"},
	{Code: "k", Name: "Khuddaka", FullName: "Khuddaka Nikāya", LongName: "KN"},
	{Code: "y", Name: "Abhidhamma", FullName: "Abhidhamma Piṭaka", LongName: "Abhi"},
}

// Book names for each set
var bookNames = map[string][]string{
	"v": {"Pārājika", "Pācittiya", "Mahāvagga", "Cūḷavagga", "Parivāra"},
	"d": {"Sīlakkhandhavagga", "Mahāvagga", "Pāṭikavagga"},
	"m": {"Mūlapaṇṇāsa", "Majjhimapaṇṇāsa", "Uparipaṇṇāsa"},
	"s": {"Sagāthāvagga", "Nidānavagga", "Khandhavagga", "Saḷāyatanavagga", "Mahāvagga"},
	"a": {"Ekakanipāta", "Dukanipāta", "Tikanipāta", "Catukkanipāta", "Pañcakanipāta",
		"Chakkanipāta", "Sattakanipāta", "Aṭṭhakanipāta", "Navakanipāta", "Dasakanipāta", "Ekādasakanipāta"},
	"k": {"Khuddakapāṭha", "Dhammapada", "Udāna", "Itivuttaka", "Suttanipāta",
		"Vimānavatthu", "Petavatthu", "Theragāthā", "Therīgāthā", "Apadāna I", "Apadāna II",
		"Buddhavaṃsa", "Cariyāpiṭaka", "Jātaka I", "Jātaka II", "Mahāniddesa", "Cūḷaniddesa",
		"Paṭisambhidāmagga", "Milindapañha", "Nettippakaraṇa", "Peṭakopadesa"},
	"y": {"Dhammasaṅgaṇī", "Vibhaṅga", "Dhātukathā", "Puggalapaññatti", "Kathāvatthu",
		"Yamaka I", "Yamaka II", "Yamaka III", "Paṭṭhāna I", "Paṭṭhāna II", "Paṭṭhāna III",
		"Paṭṭhāna IV", "Paṭṭhāna V", "Paṭṭhāna VI"},
}

// XMLFileAvailability tracks which files have mula/atthakatha/tika
// [mula, atthakatha, tika] - 1=available, 0=not available
var xmlFiles = map[string][3]int{
	"v1": {1, 1, 1}, "v2": {1, 1, 1}, "v3": {1, 1, 1}, "v4": {1, 1, 1}, "v5": {1, 1, 1},
	"d1": {1, 1, 1}, "d2": {1, 1, 1}, "d3": {1, 1, 1},
	"m1": {1, 1, 1}, "m2": {1, 1, 1}, "m3": {1, 1, 1},
	"s1": {1, 1, 1}, "s2": {1, 1, 1}, "s3": {1, 1, 1}, "s4": {1, 1, 1}, "s5": {1, 1, 1},
	"a1": {1, 1, 1}, "a2": {1, 1, 1}, "a3": {1, 1, 1}, "a4": {1, 1, 1}, "a5": {1, 1, 1},
	"a6": {1, 1, 1}, "a7": {1, 1, 1}, "a8": {1, 1, 1}, "a9": {1, 1, 1}, "a10": {1, 1, 1}, "a11": {1, 1, 1},
	"k1": {1, 1, 0}, "k2": {1, 1, 0}, "k3": {1, 1, 0}, "k4": {1, 1, 0}, "k5": {1, 1, 0},
	"k6": {1, 1, 0}, "k7": {1, 1, 0}, "k8": {1, 1, 0}, "k9": {1, 1, 0}, "k10": {1, 1, 0},
	"k11": {1, 0, 0}, "k12": {1, 1, 0}, "k13": {1, 1, 0}, "k14": {1, 1, 0}, "k15": {1, 1, 0},
	"k16": {1, 0, 0}, "k17": {1, 0, 0}, "k18": {1, 1, 0}, "k19": {1, 0, 0}, "k20": {1, 0, 0}, "k21": {1, 0, 0},
	"y1": {1, 1, 1}, "y2": {1, 1, 1}, "y3": {1, 1, 1}, "y4": {1, 1, 1}, "y5": {1, 1, 1},
	"y6": {1, 1, 1}, "y7": {1, 0, 0}, "y8": {1, 0, 0}, "y9": {1, 1, 1},
	"y10": {1, 0, 0}, "y11": {1, 0, 0}, "y12": {1, 0, 0}, "y13": {1, 0, 0}, "y14": {1, 0, 0},
}

// GetHierarchy returns the full navigation hierarchy
func (h *NavigationHandler) GetHierarchy(w http.ResponseWriter, r *http.Request) {
	// Build the complete hierarchy
	response := models.HierarchyResponse{
		Sets: make([]models.Set, len(sets)),
	}

	for i, set := range sets {
		response.Sets[i] = set
		names := bookNames[set.Code]
		response.Sets[i].Books = make([]models.Book, len(names))

		for j, name := range names {
			fileKey := set.Code + intToStr(j+1)
			avail := xmlFiles[fileKey]

			response.Sets[i].Books[j] = models.Book{
				Index:   j,
				Name:    name,
				XMLFile: fileKey,
				HasMula: avail[0] == 1,
				HasAtt:  avail[1] == 1,
				HasTika: avail[2] == 1,
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetSetHierarchy returns books for a specific set
func (h *NavigationHandler) GetSetHierarchy(w http.ResponseWriter, r *http.Request) {
	setCode := r.PathValue("set")

	// Find the set
	var foundSet *models.Set
	for _, s := range sets {
		if s.Code == setCode {
			foundSet = &s
			break
		}
	}

	if foundSet == nil {
		http.Error(w, "Set not found", http.StatusNotFound)
		return
	}

	// Build response with books
	names := bookNames[setCode]
	books := make([]models.Book, len(names))

	for i, name := range names {
		fileKey := setCode + intToStr(i+1)
		avail := xmlFiles[fileKey]

		books[i] = models.Book{
			Index:   i,
			Name:    name,
			XMLFile: fileKey,
			HasMula: avail[0] == 1,
			HasAtt:  avail[1] == 1,
			HasTika: avail[2] == 1,
		}
	}

	response := struct {
		Set   string        `json:"set"`
		Name  string        `json:"name"`
		Books []models.Book `json:"books"`
	}{
		Set:   setCode,
		Name:  foundSet.FullName,
		Books: books,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetBookHierarchy returns the detailed hierarchy for a specific book
func (h *NavigationHandler) GetBookHierarchy(w http.ResponseWriter, r *http.Request) {
	setCode := r.PathValue("set")
	bookStr := r.PathValue("book")
	book := parseInt(bookStr)

	hier := r.URL.Query().Get("mat")
	if hier == "" {
		hier = "m"
	}

	response, err := h.parser.GetHierarchy(setCode, book, hier)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func intToStr(n int) string {
	if n == 0 {
		return "0"
	}
	s := ""
	for n > 0 {
		s = string(rune('0'+n%10)) + s
		n /= 10
	}
	return s
}

func parseInt(s string) int {
	n := 0
	for _, c := range s {
		if c >= '0' && c <= '9' {
			n = n*10 + int(c-'0')
		}
	}
	return n
}

package models

// DictType represents dictionary source types
type DictType string

const (
	DictPED   DictType = "PED"   // Pali-English Dictionary
	DictDPPN  DictType = "DPPN"  // Dictionary of Pali Proper Names
	DictCPED  DictType = "CPED"  // Concise Pali-English Dictionary
	DictCEPD  DictType = "CEPD"  // Concise English-Pali Dictionary
	DictMulti DictType = "MULTI" // Combined search
)

// DictEntry represents a dictionary entry
type DictEntry struct {
	Word       string   `json:"word"`
	Definition string   `json:"definition"`
	Source     DictType `json:"source"`
	ID         string   `json:"id"`       // e.g., "0/31" for PED
	WordNorm   string   `json:"wordNorm"` // Normalized word for matching
}

// DictLookupRequest represents a dictionary lookup request
type DictLookupRequest struct {
	Query    string   `json:"query"`
	Dict     DictType `json:"dict"`
	Fuzzy    bool     `json:"fuzzy"`
	FullText bool     `json:"fulltext"`
}

// DictLookupResponse represents a dictionary lookup response
type DictLookupResponse struct {
	Query      string           `json:"query"`
	Results    []DictEntry      `json:"results"`
	IsCompound bool             `json:"isCompound,omitempty"`
	Breakdown  []CompoundPart   `json:"breakdown,omitempty"`
}

// CompoundPart represents a component of a compound word
type CompoundPart struct {
	Word    string      `json:"word"`    // The component word as it appears
	Base    string      `json:"base"`    // Dictionary form of the word
	Results []DictEntry `json:"results"` // Dictionary entries for this component
}

// DictIndex maps words to entry locations
// Key is normalized word, value is list of entry IDs
type DictIndex map[string][]string

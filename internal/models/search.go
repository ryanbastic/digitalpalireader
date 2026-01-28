package models

// SearchType represents the scope of the search
type SearchType int

const (
	SearchAllSets    SearchType = 0 // Search across all nikāyas
	SearchBooksInSet SearchType = 1 // Search books within a single nikāya
	SearchSingleBook SearchType = 2 // Search within a single book
	SearchPartial    SearchType = 3 // Partial/incremental search
)

// SearchRequest represents a search request
type SearchRequest struct {
	Query  string     `json:"query"`
	Type   SearchType `json:"type"`
	Set    string     `json:"set,omitempty"`    // For type 1, 2
	Books  []int      `json:"books,omitempty"`  // For type 1 - specific books
	Book   int        `json:"book,omitempty"`   // For type 2 - single book
	Hier   string     `json:"hier,omitempty"`   // m, a, t - hierarchy type
	Regex  bool       `json:"regex,omitempty"`  // Use regex matching
	Limit  int        `json:"limit,omitempty"`  // Max results (default 100)
	Offset int        `json:"offset,omitempty"` // For pagination
}

// SearchResult represents a single search result
type SearchResult struct {
	Location string `json:"location"` // e.g., "d.0.0.0.0.0.5.m"
	Set      string `json:"set"`
	Book     int    `json:"book"`
	Title    string `json:"title"`   // Sutta/section title
	Snippet  string `json:"snippet"` // Text with highlighted match
	Para     int    `json:"para"`    // Paragraph number
}

// SearchResponse represents the search response
type SearchResponse struct {
	Query        string         `json:"query"`
	TotalResults int            `json:"totalResults"`
	Results      []SearchResult `json:"results"`
	HasMore      bool           `json:"hasMore"`
}

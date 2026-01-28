package models

// Set represents a Nikaya/collection in the Tipitaka
type Set struct {
	Code     string `json:"code"`     // Single letter code (d, m, s, a, k, etc.)
	Name     string `json:"name"`     // Short name (Dīgha, Majjhima, etc.)
	FullName string `json:"fullName"` // Full name (Dīgha Nikāya, etc.)
	LongName string `json:"longName"` // Abbreviation (DN, MN, etc.)
	Books    []Book `json:"books"`    // Books in this set
}

// Book represents a book within a set
type Book struct {
	Index   int    `json:"index"`
	Name    string `json:"name"`
	XMLFile string `json:"xmlFile"` // e.g., "d1m" for Digha book 1 mula
	HasMula bool   `json:"hasMula"`
	HasAtt  bool   `json:"hasAtt"`  // Has Atthakatha
	HasTika bool   `json:"hasTika"` // Has Tika
}

// Place represents a location in the Tipitaka
type Place struct {
	Set     string `json:"set"`     // nikaya code (d, m, s, a, k, etc.)
	Book    int    `json:"book"`    // 0-indexed book number
	Meta    int    `json:"meta"`    // meta level
	Volume  int    `json:"volume"`  // volume within meta
	Vagga   int    `json:"vagga"`   // chapter
	Sutta   int    `json:"sutta"`   // discourse
	Section int    `json:"section"` // paragraph-level section
	Hier    string `json:"hier"`    // m=mula, a=atthakatha, t=tika
	Script  string `json:"script"`  // my=Myanmar, th=Thai
}

// ParseLocation parses a location string like "d.0.0.0.0.0.0.m" into a Place
func ParseLocation(loc string) Place {
	// Default values
	p := Place{
		Hier:   "m",
		Script: "my",
	}

	// Parse the location string
	// Format: set.book.meta.volume.vagga.sutta.section.hier
	var parts []string
	current := ""
	for _, c := range loc {
		if c == '.' {
			parts = append(parts, current)
			current = ""
		} else {
			current += string(c)
		}
	}
	if current != "" {
		parts = append(parts, current)
	}

	if len(parts) >= 1 {
		p.Set = parts[0]
	}
	if len(parts) >= 2 {
		p.Book = parseInt(parts[1])
	}
	if len(parts) >= 3 {
		p.Meta = parseInt(parts[2])
	}
	if len(parts) >= 4 {
		p.Volume = parseInt(parts[3])
	}
	if len(parts) >= 5 {
		p.Vagga = parseInt(parts[4])
	}
	if len(parts) >= 6 {
		p.Sutta = parseInt(parts[5])
	}
	if len(parts) >= 7 {
		p.Section = parseInt(parts[6])
	}
	if len(parts) >= 8 {
		p.Hier = parts[7]
	}

	return p
}

// String returns the location string representation
func (p Place) String() string {
	return p.Set + "." +
		intToStr(p.Book) + "." +
		intToStr(p.Meta) + "." +
		intToStr(p.Volume) + "." +
		intToStr(p.Vagga) + "." +
		intToStr(p.Sutta) + "." +
		intToStr(p.Section) + "." +
		p.Hier
}

// XMLFileName returns the XML file name for this place
func (p Place) XMLFileName() string {
	return p.Set + intToStr(p.Book+1) + p.Hier + ".xml"
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

// TextSection represents parsed text content from XML
type TextSection struct {
	Place   Place    `json:"place"`
	Title   string   `json:"title"`
	Content string   `json:"content"`
	Titles  Titles   `json:"titles"`
	Nav     TextNav  `json:"nav"`
}

// Titles contains the hierarchical titles for a section
type Titles struct {
	Han string `json:"han"` // Main header (e.g., vagga name)
	H0n string `json:"h0n"` // Meta title
	H1n string `json:"h1n"` // Volume title
	H2n string `json:"h2n"` // Vagga/Sutta title
	H3n string `json:"h3n"` // Section group title
	H4n string `json:"h4n"` // Section title
}

// TextNav contains navigation info for previous/next
type TextNav struct {
	Prev       *Place `json:"prev,omitempty"`
	Next       *Place `json:"next,omitempty"`
	Parent     *Place `json:"parent,omitempty"`
	Breadcrumb []string `json:"breadcrumb"`
}

// HierarchyNode represents a node in the navigation tree
type HierarchyNode struct {
	Index    int             `json:"index"`
	Name     string          `json:"name"`
	Children []HierarchyNode `json:"children,omitempty"`
}

// HierarchyResponse is the API response for hierarchy endpoints
type HierarchyResponse struct {
	Sets []Set `json:"sets"`
}

// BookHierarchyResponse is the API response for book hierarchy
type BookHierarchyResponse struct {
	Set     string          `json:"set"`
	Book    int             `json:"book"`
	Hier    string          `json:"hier"`
	Metas   []HierarchyNode `json:"metas"`
	Volumes []HierarchyNode `json:"volumes"`
	Vaggas  []HierarchyNode `json:"vaggas"`
	Suttas  []HierarchyNode `json:"suttas"`
}

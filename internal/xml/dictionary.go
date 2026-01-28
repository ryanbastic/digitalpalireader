package xml

import (
	"encoding/xml"
	"fmt"
	"html"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/ryanbastic/digitalpalireader/internal/cache"
	"github.com/ryanbastic/digitalpalireader/internal/models"
)

// DictionaryParser parses dictionary XML files
type DictionaryParser struct {
	dataPath string
	cache    *cache.Cache
	pedIndex models.DictIndex
}

// NewDictionaryParser creates a new dictionary parser
func NewDictionaryParser(dataPath string, cache *cache.Cache) *DictionaryParser {
	p := &DictionaryParser{
		dataPath: dataPath,
		cache:    cache,
		pedIndex: make(models.DictIndex),
	}
	return p
}

// PEDTop is the root element for PED XML
type PEDTop struct {
	XMLName xml.Name `xml:"top"`
	Entries []string `xml:"d"`
}

// DPPNXml is the root element for DPPN XML
type DPPNXml struct {
	XMLName xml.Name `xml:"xml"`
	Entries []string `xml:"e"`
}

// LookupPED looks up a word in the PED dictionary
func (p *DictionaryParser) LookupPED(query string) ([]models.DictEntry, error) {
	// Normalize query
	normalized := normalizeWord(query)

	// Check cache
	cacheKey := fmt.Sprintf("ped:%s", normalized)
	if cached, ok := p.cache.Get(cacheKey); ok {
		return cached.([]models.DictEntry), nil
	}

	// Search for the word using brute force (load each volume and search)
	// In a production system, you'd want to precompute an index
	var results []models.DictEntry

	for vol := 0; vol <= 4; vol++ {
		entries, err := p.loadPEDVolume(vol)
		if err != nil {
			continue
		}

		for i, entry := range entries {
			// Extract word from entry (usually at the start in bold)
			entryWord := extractWordFromPED(entry)
			if matchesQuery(entryWord, normalized) || matchesQuery(normalizeWord(entryWord), normalized) {
				results = append(results, models.DictEntry{
					Word:       entryWord,
					Definition: formatDefinition(entry),
					Source:     models.DictPED,
					ID:         fmt.Sprintf("%d/%d", vol, i+1),
					WordNorm:   normalizeWord(entryWord),
				})
			}
		}
	}

	p.cache.Set(cacheKey, results)
	return results, nil
}

// LookupDPPN looks up a word in the DPPN dictionary
func (p *DictionaryParser) LookupDPPN(query string) ([]models.DictEntry, error) {
	normalized := strings.ToLower(query)

	cacheKey := fmt.Sprintf("dppn:%s", normalized)
	if cached, ok := p.cache.Get(cacheKey); ok {
		return cached.([]models.DictEntry), nil
	}

	var results []models.DictEntry

	for vol := 1; vol <= 10; vol++ {
		entries, err := p.loadDPPNVolume(vol)
		if err != nil {
			continue
		}

		for i, entry := range entries {
			// DPPN entries have title in div.huge at the start
			entryWord := extractWordFromDPPN(entry)
			if matchesQuery(strings.ToLower(entryWord), normalized) {
				results = append(results, models.DictEntry{
					Word:       entryWord,
					Definition: formatDPPNDefinition(entry),
					Source:     models.DictDPPN,
					ID:         fmt.Sprintf("%d/%d", vol, i+1),
					WordNorm:   strings.ToLower(entryWord),
				})
			}
		}
	}

	p.cache.Set(cacheKey, results)
	return results, nil
}

// GetPEDEntry gets a specific PED entry by ID
func (p *DictionaryParser) GetPEDEntry(id string) (*models.DictEntry, error) {
	parts := strings.Split(id, "/")
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid entry ID: %s", id)
	}

	vol, err := strconv.Atoi(parts[0])
	if err != nil {
		return nil, err
	}

	entryNum, err := strconv.Atoi(parts[1])
	if err != nil {
		return nil, err
	}

	entries, err := p.loadPEDVolume(vol)
	if err != nil {
		return nil, err
	}

	if entryNum < 1 || entryNum > len(entries) {
		return nil, fmt.Errorf("entry not found: %s", id)
	}

	entry := entries[entryNum-1]
	word := extractWordFromPED(entry)

	return &models.DictEntry{
		Word:       word,
		Definition: formatDefinition(entry),
		Source:     models.DictPED,
		ID:         id,
		WordNorm:   normalizeWord(word),
	}, nil
}

// loadPEDVolume loads all entries from a PED volume
func (p *DictionaryParser) loadPEDVolume(vol int) ([]string, error) {
	cacheKey := fmt.Sprintf("ped_vol:%d", vol)
	if cached, ok := p.cache.Get(cacheKey); ok {
		return cached.([]string), nil
	}

	path := filepath.Join(p.dataPath, "en", "ped", fmt.Sprintf("%d", vol), "ped.xml")
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var top PEDTop
	if err := xml.Unmarshal(data, &top); err != nil {
		return nil, err
	}

	p.cache.Set(cacheKey, top.Entries)
	return top.Entries, nil
}

// loadDPPNVolume loads all entries from a DPPN volume
func (p *DictionaryParser) loadDPPNVolume(vol int) ([]string, error) {
	cacheKey := fmt.Sprintf("dppn_vol:%d", vol)
	if cached, ok := p.cache.Get(cacheKey); ok {
		return cached.([]string), nil
	}

	path := filepath.Join(p.dataPath, "en", "dppn", fmt.Sprintf("%d", vol)+".xml")
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var doc DPPNXml
	if err := xml.Unmarshal(data, &doc); err != nil {
		return nil, err
	}

	p.cache.Set(cacheKey, doc.Entries)
	return doc.Entries, nil
}

// normalizeWord normalizes a Pali word for matching
// Converts Velthuis encoding and removes diacritics
func normalizeWord(word string) string {
	// Convert to lowercase
	w := strings.ToLower(word)

	// Remove common diacritics and convert to ASCII approximations
	replacer := strings.NewReplacer(
		"ā", "a", "ī", "i", "ū", "u",
		"ṭ", "t", "ḍ", "d", "ṇ", "n",
		"ṅ", "n", "ñ", "n", "ṃ", "m",
		"ḷ", "l",
		// Velthuis encoding
		".t", "t", ".d", "d", ".n", "n",
		".m", "m", ".l", "l",
		`"n`, "n", "~n", "n",
	)

	return replacer.Replace(w)
}

// matchesQuery checks if a word matches the query
func matchesQuery(word, query string) bool {
	// Exact match
	if word == query {
		return true
	}
	// Prefix match
	if strings.HasPrefix(word, query) {
		return true
	}
	// Contains match for longer queries
	if len(query) >= 3 && strings.Contains(word, query) {
		return true
	}
	return false
}

// extractWordFromPED extracts the headword from a PED entry
func extractWordFromPED(entry string) string {
	// PED entries typically start with the word in bold: <b>word</b>
	decoded := html.UnescapeString(entry)
	re := regexp.MustCompile(`<b>([^<]+)</b>`)
	matches := re.FindStringSubmatch(decoded)
	if len(matches) > 1 {
		// Clean up the word
		word := strings.TrimSpace(matches[1])
		// Remove superscripts and other markup
		word = regexp.MustCompile(`<sup>[^<]*</sup>`).ReplaceAllString(word, "")
		word = regexp.MustCompile(`\s*--\s*$`).ReplaceAllString(word, "")
		return strings.TrimSpace(word)
	}
	return ""
}

// extractWordFromDPPN extracts the headword from a DPPN entry
func extractWordFromDPPN(entry string) string {
	// DPPN entries have [div class="huge"]Title[/div]
	re := regexp.MustCompile(`\[div class="huge"\]([^\[]+)\[/div\]`)
	matches := re.FindStringSubmatch(entry)
	if len(matches) > 1 {
		return strings.TrimSpace(matches[1])
	}
	return ""
}

// formatDefinition formats a PED entry for display
func formatDefinition(entry string) string {
	// Unescape HTML entities
	decoded := html.UnescapeString(entry)

	// Convert HTML tags to proper HTML
	// Already contains HTML, just clean it up
	decoded = strings.TrimSpace(decoded)

	return decoded
}

// formatDPPNDefinition formats a DPPN entry for display
func formatDPPNDefinition(entry string) string {
	// Convert bracket notation to HTML
	decoded := entry

	// [div class="..."]...[/div] -> <div class="...">...</div>
	decoded = regexp.MustCompile(`\[div class="([^"]+)"\]`).ReplaceAllString(decoded, `<div class="$1">`)
	decoded = strings.ReplaceAll(decoded, "[/div]", "</div>")

	// [p]...[/p] -> <p>...</p>
	decoded = strings.ReplaceAll(decoded, "[p]", "<p>")
	decoded = strings.ReplaceAll(decoded, "[/p]", "</p>")

	// [a href="javascript:void(0)" onclick="..."]...[/a] -> just the text
	decoded = regexp.MustCompile(`\[a href="[^"]*"[^\]]*\]`).ReplaceAllString(decoded, "")
	decoded = strings.ReplaceAll(decoded, "[/a]", "")

	return decoded
}

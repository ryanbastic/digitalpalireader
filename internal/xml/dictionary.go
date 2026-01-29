package xml

import (
	"encoding/xml"
	"fmt"
	"html"
	"os"
	"path/filepath"
	"regexp"
	"sort"
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
	return p.LookupPEDWithOptions(query, false, false)
}

// LookupPEDWithOptions looks up a word in the PED dictionary with search options
// fuzzy: if true, use fuzzy matching (ignores diacritics and consonant doubling)
// startsWithOnly: if true, only match words starting with query
func (p *DictionaryParser) LookupPEDWithOptions(query string, fuzzy bool, startsWithOnly bool) ([]models.DictEntry, error) {
	// Convert query to lowercase
	queryLower := strings.ToLower(query)

	// Check if query contains Unicode diacritics
	queryHasUnicode := hasUnicodeChars(queryLower)

	// Prepare query for matching
	var matchQuery string
	if fuzzy {
		matchQuery = toFuzzy(queryLower)
	} else {
		matchQuery = queryLower
	}

	// Check cache
	cacheKey := fmt.Sprintf("ped:%s:fuzzy=%v:sw=%v", matchQuery, fuzzy, startsWithOnly)
	if cached, ok := p.cache.Get(cacheKey); ok {
		return cached.([]models.DictEntry), nil
	}

	// Search for the word using brute force (load each volume and search)
	var results []models.DictEntry

	for vol := 0; vol <= 4; vol++ {
		entries, err := p.loadPEDVolume(vol)
		if err != nil {
			continue
		}

		for i, entry := range entries {
			// Extract word from entry (usually at the start in bold)
			entryWord := extractWordFromPED(entry)
			if entryWord == "" {
				continue
			}

			// Prepare entry word for matching
			var wordToMatch string
			if fuzzy {
				wordToMatch = toFuzzy(entryWord)
			} else if queryHasUnicode {
				// If query has Unicode, convert entry word to Unicode for comparison
				wordToMatch = strings.ToLower(entryWord)
			} else {
				// Convert entry word to Velthuis for comparison
				wordToMatch = strings.ToLower(toVelthuis(entryWord))
			}

			if matchesQuery(wordToMatch, matchQuery, startsWithOnly) {
				// Entry IDs in the original are 0-indexed within each volume
				results = append(results, models.DictEntry{
					Word:       entryWord,
					Definition: formatDefinition(entry),
					Source:     models.DictPED,
					ID:         fmt.Sprintf("%d/%d", vol, i),
					WordNorm:   normalizeWord(entryWord),
				})
			}
		}
	}

	// Sort results to prioritize exact matches, then prefix matches
	sortResultsByRelevance(results, query, fuzzy)

	p.cache.Set(cacheKey, results)
	return results, nil
}

// LookupDPPN looks up a word in the DPPN dictionary
func (p *DictionaryParser) LookupDPPN(query string) ([]models.DictEntry, error) {
	return p.LookupDPPNWithOptions(query, false, false)
}

// LookupDPPNWithOptions looks up a word in the DPPN dictionary with search options
func (p *DictionaryParser) LookupDPPNWithOptions(query string, fuzzy bool, startsWithOnly bool) ([]models.DictEntry, error) {
	queryLower := strings.ToLower(query)
	queryHasUnicode := hasUnicodeChars(queryLower)

	var matchQuery string
	if fuzzy {
		matchQuery = toFuzzy(queryLower)
	} else {
		matchQuery = queryLower
	}

	cacheKey := fmt.Sprintf("dppn:%s:fuzzy=%v:sw=%v", matchQuery, fuzzy, startsWithOnly)
	if cached, ok := p.cache.Get(cacheKey); ok {
		return cached.([]models.DictEntry), nil
	}

	var results []models.DictEntry

	// DPPN has volumes 1-9 (not 10) based on original JS: for (var i = 1; i < 10; i++)
	for vol := 1; vol <= 9; vol++ {
		entries, err := p.loadDPPNVolume(vol)
		if err != nil {
			continue
		}

		for i, entry := range entries {
			// DPPN entries have title in div.huge at the start
			entryWord := extractWordFromDPPN(entry)
			if entryWord == "" {
				continue
			}

			var wordToMatch string
			if fuzzy {
				wordToMatch = toFuzzy(entryWord)
			} else if queryHasUnicode {
				wordToMatch = strings.ToLower(entryWord)
			} else {
				wordToMatch = strings.ToLower(toVelthuis(entryWord))
			}

			if matchesQuery(wordToMatch, matchQuery, startsWithOnly) {
				// DPPN entry ID format: volume/entry (0-indexed entry within volume)
				results = append(results, models.DictEntry{
					Word:       entryWord,
					Definition: formatDPPNDefinition(entry),
					Source:     models.DictDPPN,
					ID:         fmt.Sprintf("%d/%d", vol, i),
					WordNorm:   strings.ToLower(entryWord),
				})
			}
		}
	}

	// Sort results to prioritize exact matches, then prefix matches
	sortResultsByRelevance(results, query, fuzzy)

	p.cache.Set(cacheKey, results)
	return results, nil
}

// GetPEDEntry gets a specific PED entry by ID
// ID format is "volume/index" where index is the 0-based array index in the XML
func (p *DictionaryParser) GetPEDEntry(id string) (*models.DictEntry, error) {
	parts := strings.Split(id, "/")
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid entry ID: %s", id)
	}

	vol, err := strconv.Atoi(parts[0])
	if err != nil {
		return nil, err
	}

	entryIdx, err := strconv.Atoi(parts[1])
	if err != nil {
		return nil, err
	}

	entries, err := p.loadPEDVolume(vol)
	if err != nil {
		return nil, err
	}

	// Use 0-based indexing to match original JavaScript behavior
	if entryIdx < 0 || entryIdx >= len(entries) {
		return nil, fmt.Errorf("entry not found: %s", id)
	}

	entry := entries[entryIdx]
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

// toVelthuis converts Unicode Pali text to Velthuis notation
// This matches the original JavaScript toVel() function
func toVelthuis(input string) string {
	if input == "" {
		return input
	}

	replacer := strings.NewReplacer(
		"ā", "aa", "ī", "ii", "ū", "uu",
		"ṭ", ".t", "ḍ", ".d", "ṅ", `"n`,
		"ṇ", ".n", "ṃ", ".m", "ṁ", ".m",
		"ñ", "~n", "ḷ", ".l",
		"Ā", "AA", "Ī", "II", "Ū", "UU",
		"Ṭ", ".T", "Ḍ", ".D", "Ṅ", `"N`,
		"Ṇ", ".N", "Ṃ", ".M", "Ṁ", ".M",
		"Ñ", "~N", "Ḷ", ".L",
		// Sanskrit additions
		"ḹ", ".ll", "ṛ", ".r", "ṝ", ".rr",
		"ṣ", ".s", "ś", `"s`, "ḥ", ".h",
	)

	return replacer.Replace(input)
}

// toUnicode converts Velthuis notation to Unicode Pali text
// This matches the original JavaScript toUni() function
// Currently unused but kept for future use (e.g., display formatting)
func toUnicode(input string) string { //nolint:unused
	if input == "" {
		return input
	}

	// Order matters - longer patterns first
	replacer := strings.NewReplacer(
		"aa", "ā", "ii", "ī", "uu", "ū",
		".t", "ṭ", ".d", "ḍ", ".n", "ṇ",
		".m", "ṃ", ".l", "ḷ",
		`"nk`, "ṅk", `"ng`, "ṅg", `"n`, "ṅ",
		"~n", "ñ",
		"AA", "Ā", "II", "Ī", "UU", "Ū",
		".T", "Ṭ", ".D", "Ḍ", ".N", "Ṇ",
		".M", "Ṃ", ".L", "Ḷ",
		`"N`, "Ṅ", "~N", "Ñ",
		// Sanskrit additions
		".ll", "ḹ", ".r", "ṛ", ".rr", "ṝ",
		".s", "ṣ", `"s`, "ś", ".h", "ḥ",
	)

	return replacer.Replace(input)
}

// toFuzzy converts a word to fuzzy form for loose matching
// This matches the original JavaScript toFuzzy() function
func toFuzzy(input string) string {
	if input == "" {
		return input
	}

	// First convert to Velthuis, then remove diacritics
	w := toVelthuis(strings.ToLower(input))

	// Remove dot notation for retroflexes, etc.
	w = regexp.MustCompile(`\.([tdnlmTDNLM])`).ReplaceAllString(w, "$1")
	// Remove tilde notation
	w = regexp.MustCompile(`~([nN])`).ReplaceAllString(w, "$1")
	// Remove quote notation
	w = regexp.MustCompile(`"([nN])`).ReplaceAllString(w, "$1")
	// Shorten long vowels
	w = strings.ReplaceAll(w, "aa", "a")
	w = strings.ReplaceAll(w, "ii", "i")
	w = strings.ReplaceAll(w, "uu", "u")
	// Simplify doubled consonants
	w = strings.ReplaceAll(w, "nn", "n")
	w = strings.ReplaceAll(w, "mm", "m")
	w = strings.ReplaceAll(w, "yy", "y")
	w = strings.ReplaceAll(w, "ll", "l")
	w = strings.ReplaceAll(w, "ss", "s")
	// Simplify aspirates and double stops
	w = regexp.MustCompile(`([kgcjtdpb])[kgcjtdpb]?h?`).ReplaceAllString(w, "$1")

	return w
}

// normalizeWord normalizes a Pali word for matching
// This removes diacritics for simple matching
func normalizeWord(word string) string {
	// Convert to lowercase
	w := strings.ToLower(word)

	// Remove common diacritics and convert to ASCII approximations
	replacer := strings.NewReplacer(
		"ā", "a", "ī", "i", "ū", "u",
		"ṭ", "t", "ḍ", "d", "ṇ", "n",
		"ṅ", "n", "ñ", "n", "ṃ", "m", "ṁ", "m",
		"ḷ", "l",
		// Also handle Velthuis in case it's mixed
		"aa", "a", "ii", "i", "uu", "u",
	)

	return replacer.Replace(w)
}

// hasUnicodeChars checks if a string contains Unicode Pali diacritics
func hasUnicodeChars(s string) bool {
	return regexp.MustCompile(`[āīūṭḍṅṇṃṁñḷĀĪŪṬḌṄṆṂṀÑḶ]`).MatchString(s)
}

// matchesQuery checks if a word matches the query
// startsWithOnly: if true, only match prefix; if false, also match contains
func matchesQuery(word, query string, startsWithOnly bool) bool {
	// Exact match
	if word == query {
		return true
	}
	// Prefix match
	if strings.HasPrefix(word, query) {
		return true
	}
	// Contains match (unless startsWithOnly is set)
	if !startsWithOnly && strings.Contains(word, query) {
		return true
	}
	return false
}

// sortResultsByRelevance sorts dictionary results to prioritize exact matches,
// then prefix matches, then contains matches. Within each category, sort alphabetically.
func sortResultsByRelevance(results []models.DictEntry, query string, fuzzy bool) {
	queryNorm := normalizeWord(query)
	if fuzzy {
		queryNorm = toFuzzy(query)
	}

	sort.Slice(results, func(i, j int) bool {
		iNorm := results[i].WordNorm
		jNorm := results[j].WordNorm
		if fuzzy {
			iNorm = toFuzzy(results[i].Word)
			jNorm = toFuzzy(results[j].Word)
		}

		// Priority 1: Exact match
		iExact := iNorm == queryNorm
		jExact := jNorm == queryNorm
		if iExact != jExact {
			return iExact // exact matches first
		}

		// Priority 2: Prefix match
		iPrefix := strings.HasPrefix(iNorm, queryNorm)
		jPrefix := strings.HasPrefix(jNorm, queryNorm)
		if iPrefix != jPrefix {
			return iPrefix // prefix matches second
		}

		// Priority 3: Alphabetical order
		return iNorm < jNorm
	})
}


// extractWordFromPED extracts the headword from a PED entry
func extractWordFromPED(entry string) string {
	// PED entries typically start with the word in bold: <b>word</b>
	// The headword may contain nested tags like <sup>2</sup> for disambiguation
	decoded := html.UnescapeString(entry)

	// Match the FIRST <b>...</b> tag at the start of the entry (the headword)
	// Use .+? (non-greedy) to capture content including nested tags like <sup>
	re := regexp.MustCompile(`^\s*<b>(.+?)</b>`)
	matches := re.FindStringSubmatch(decoded)
	if len(matches) > 1 {
		// Clean up the word
		word := matches[1]
		// Remove superscripts and other markup that may be inside the headword
		word = regexp.MustCompile(`<sup>[^<]*</sup>`).ReplaceAllString(word, "")
		word = regexp.MustCompile(`<[^>]+>`).ReplaceAllString(word, "") // Remove any remaining HTML tags
		// Remove trailing dashes and normalize spaces
		word = regexp.MustCompile(`\s*--\s*$`).ReplaceAllString(word, "")
		word = regexp.MustCompile(`\s+`).ReplaceAllString(word, " ")
		return strings.TrimSpace(word)
	}
	return ""
}

// extractWordFromDPPN extracts the headword from a DPPN entry
func extractWordFromDPPN(entry string) string {
	// DPPN entries can have title in two formats:
	// 1. [div class="huge"]Title[/div]
	// 2. [b]Title[/b]

	// Try div.huge format first
	re := regexp.MustCompile(`\[div class="huge"\]([^\[]+)\[/div\]`)
	matches := re.FindStringSubmatch(entry)
	if len(matches) > 1 {
		return strings.TrimSpace(matches[1])
	}

	// Try [b]...[/b] format
	re2 := regexp.MustCompile(`\[b\]([^\[]+)\[/b\]`)
	matches = re2.FindStringSubmatch(entry)
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

// Common Pali particles and enclitics that are often joined to words
var paliParticles = map[string]string{
	"ca":   "ca",   // and
	"pi":   "pi",   // also, even
	"eva":  "eva",  // indeed, just
	"kho":  "kho",  // indeed (emphatic)
	"pana": "pana", // but, however
	"hi":   "hi",   // for, because
	"tu":   "tu",   // but
	"va":   "vā",   // or
	"ti":   "ti",   // quotation marker
	"ce":   "ce",   // if
	"ve":   "ve",   // indeed
	"nu":   "nu",   // interrogative particle
	"su":   "su",   // well
}

// paliNounEndings maps inflected endings to potential base form restorations
// The key is the ending to strip, the value is what to append to get the stem
// Ordered from longest to shortest for proper matching
var paliNounEndings = []struct {
	ending string
	stems  []string // possible stem endings to try
}{
	// -ant stem nouns (like arahant, bhagavant)
	{"ato", []string{"ant", "at", "a"}},    // gen/abl sg: arahato -> arahant
	{"atā", []string{"ant", "at", "a"}},    // instr sg: arahatā -> arahant
	{"antaṃ", []string{"ant", "at", "a"}},  // acc sg: arahantaṃ -> arahant
	{"ante", []string{"ant", "at", "a"}},   // loc sg: arahante -> arahant
	{"anto", []string{"ant", "at", "a"}},   // nom pl: arahanto -> arahant
	{"antānaṃ", []string{"ant", "at", ""}}, // gen pl
	{"antehi", []string{"ant", "at", ""}},  // instr pl
	{"antesu", []string{"ant", "at", ""}},  // loc pl

	// -a stem nouns (most common, like dhamma, buddha)
	{"assa", []string{"a", ""}},   // gen sg: dhammassa -> dhamma
	{"āya", []string{"a", "ā"}},   // dat sg: dhammāya -> dhamma
	{"asmā", []string{"a", ""}},   // abl sg: dhammasmā -> dhamma
	{"amhā", []string{"a", ""}},   // abl sg: dhammamhā -> dhamma
	{"asmiṃ", []string{"a", ""}},  // loc sg: dhammasmiṃ -> dhamma
	{"amhi", []string{"a", ""}},   // loc sg: dhammamhi -> dhamma
	{"ānaṃ", []string{"a", "ā"}},  // gen pl: dhammānaṃ -> dhamma
	{"ehi", []string{"a", ""}},    // instr pl: dhammehi -> dhamma
	{"ebhi", []string{"a", ""}},   // instr pl: dhammebhi -> dhamma
	{"esu", []string{"a", ""}},    // loc pl: dhammesu -> dhamma
	{"ena", []string{"a", ""}},    // instr sg: dhammena -> dhamma
	{"aṃ", []string{"a", ""}},     // acc sg: dhammaṃ -> dhamma
	{"āni", []string{"a", "aṃ"}},  // nom/acc pl neuter
	{"ā", []string{"a", ""}},      // nom pl / abl sg: dhammā -> dhamma
	{"e", []string{"a", "i"}},     // loc sg / acc pl: dhamme -> dhamma
	{"o", []string{"a", ""}},      // nom sg: dhammo -> dhamma

	// -i stem nouns (like aggi, muni)
	{"ino", []string{"i", "in"}},   // gen sg: munino -> muni
	{"inaṃ", []string{"i", "in"}},  // acc sg
	{"inā", []string{"i", "in"}},   // instr sg
	{"īnaṃ", []string{"i", "in"}},  // gen pl
	{"īhi", []string{"i", "in"}},   // instr pl
	{"īsu", []string{"i", "in"}},   // loc pl
	{"ismiṃ", []string{"i", ""}},   // loc sg
	{"imhi", []string{"i", ""}},    // loc sg
	{"ī", []string{"i", "in"}},     // nom pl

	// -u stem nouns (like bhikkhu)
	{"uno", []string{"u", ""}},    // gen sg
	{"unaṃ", []string{"u", ""}},   // acc sg
	{"unā", []string{"u", ""}},    // instr sg
	{"ūnaṃ", []string{"u", ""}},   // gen pl
	{"ūhi", []string{"u", ""}},    // instr pl
	{"ūsu", []string{"u", ""}},    // loc pl
	{"usmiṃ", []string{"u", ""}},  // loc sg
	{"umhi", []string{"u", ""}},   // loc sg
}

// getStemCandidates returns possible dictionary forms for an inflected Pali word
func getStemCandidates(word string) []string {
	word = strings.ToLower(word)
	var candidates []string

	// Always include the original word
	candidates = append(candidates, word)

	// Try stripping each ending
	for _, ending := range paliNounEndings {
		if strings.HasSuffix(word, ending.ending) {
			stem := strings.TrimSuffix(word, ending.ending)
			if len(stem) >= 2 { // stem must be at least 2 chars
				for _, add := range ending.stems {
					candidate := stem + add
					// Avoid duplicates
					found := false
					for _, c := range candidates {
						if c == candidate {
							found = true
							break
						}
					}
					if !found {
						candidates = append(candidates, candidate)
					}
				}
			}
		}
	}

	return candidates
}

// AnalyzeCompound attempts to break down a compound word into its components
func (p *DictionaryParser) AnalyzeCompound(word string) (*models.DictLookupResponse, error) {
	response := &models.DictLookupResponse{
		Query:      word,
		Results:    []models.DictEntry{},
		IsCompound: false,
		Breakdown:  []models.CompoundPart{},
	}

	// First, try direct lookup
	directResults, _ := p.LookupPED(word)
	if len(directResults) > 0 {
		response.Results = directResults
		return response, nil
	}

	// Try stemming - look up possible base forms
	stemCandidates := getStemCandidates(word)
	for _, stem := range stemCandidates[1:] { // skip first (original word already tried)
		stemResults, _ := p.LookupPEDWithOptions(stem, false, true) // starts-with only for stems
		if len(stemResults) > 0 {
			// Filter to only exact or very close matches
			for _, r := range stemResults {
				if strings.EqualFold(r.Word, stem) || strings.EqualFold(normalizeWord(r.Word), normalizeWord(stem)) {
					response.Results = append(response.Results, r)
				}
			}
			if len(response.Results) > 0 {
				return response, nil
			}
		}
	}

	// Try to break down the word as a compound
	parts := p.breakDownWord(word)
	if len(parts) <= 1 {
		// Could not break down, return empty results
		return response, nil
	}

	// Look up each part
	response.IsCompound = true
	allPartsHaveResults := true

	for _, part := range parts {
		compPart := models.CompoundPart{
			Word: part.original,
			Base: part.base,
		}

		// Look up the base form
		results, _ := p.LookupPED(part.base)
		if len(results) == 0 && part.base != part.original {
			// Try the original form
			results, _ = p.LookupPED(part.original)
		}

		compPart.Results = results
		if len(results) == 0 {
			allPartsHaveResults = false
		}
		response.Breakdown = append(response.Breakdown, compPart)
	}

	// Only mark as compound if we found results for at least some parts
	if !allPartsHaveResults && len(response.Breakdown) > 0 {
		// Check if we found at least one part
		foundAny := false
		for _, part := range response.Breakdown {
			if len(part.Results) > 0 {
				foundAny = true
				break
			}
		}
		if !foundAny {
			response.IsCompound = false
			response.Breakdown = nil
		}
	}

	return response, nil
}

// wordPart represents a component of a compound word
type wordPart struct {
	original string // The word as it appears in the compound
	base     string // The dictionary form
}

// breakDownWord attempts to split a compound word into components
func (p *DictionaryParser) breakDownWord(word string) []wordPart {
	word = strings.ToLower(word)
	var parts []wordPart

	// Check for trailing particles first (ca, pi, eva, etc.)
	remaining := word
	var trailingParticles []wordPart

	// Handle niggahita + particle sandhi (ñca -> ṃ + ca, ñpi -> ṃ + pi)
	for suffix, base := range paliParticles {
		// Check for ñ + particle (niggahita sandhi)
		niggahitaSuffix := "ñ" + suffix
		if before, found := strings.CutSuffix(remaining, niggahitaSuffix); found {
			remaining = before + "ṃ"
			trailingParticles = append([]wordPart{{original: suffix, base: base}}, trailingParticles...)
			break
		}
		// Check for doubled consonant + particle
		if len(suffix) > 0 {
			doubledSuffix := string(suffix[0]) + suffix
			if before, found := strings.CutSuffix(remaining, doubledSuffix); found && suffix[0] != 'a' && suffix[0] != 'i' && suffix[0] != 'u' {
				remaining = before
				trailingParticles = append([]wordPart{{original: suffix, base: base}}, trailingParticles...)
				break
			}
		}
		// Direct suffix match
		if before, found := strings.CutSuffix(remaining, suffix); found && len(remaining) > len(suffix)+2 {
			remaining = before
			trailingParticles = append([]wordPart{{original: suffix, base: base}}, trailingParticles...)
			break
		}
	}

	// Try to find compound breaks using vowel boundaries
	mainParts := p.findCompoundBreaks(remaining)
	parts = append(parts, mainParts...)
	parts = append(parts, trailingParticles...)

	return parts
}

// findCompoundBreaks attempts to split at vowel boundaries
func (p *DictionaryParser) findCompoundBreaks(word string) []wordPart {
	if len(word) < 4 {
		return []wordPart{{original: word, base: word}}
	}

	// Try different split points
	bestSplit := []wordPart{{original: word, base: word}}
	bestScore := 0

	// Get all dictionary entries for scoring
	for i := 2; i < len(word)-1; i++ {
		// Check if this is a valid split point (at a vowel boundary)
		if !isValidSplitPoint(word, i) {
			continue
		}

		firstPart := word[:i]
		secondPart := word[i:]

		// Try various sandhi restorations
		candidates := generateSandhiCandidates(firstPart, secondPart)

		for _, candidate := range candidates {
			// Score this candidate based on dictionary hits
			score := 0
			firstResults, _ := p.LookupPED(candidate.first.base)
			if len(firstResults) > 0 {
				score += 10
			}
			secondResults, _ := p.LookupPED(candidate.second.base)
			if len(secondResults) > 0 {
				score += 10
			}

			if score > bestScore {
				bestScore = score
				bestSplit = []wordPart{candidate.first, candidate.second}
			}
		}
	}

	// Recursively try to break down the second part if we found a good split
	if bestScore > 0 && len(bestSplit) == 2 {
		secondBreaks := p.findCompoundBreaks(bestSplit[1].base)
		if len(secondBreaks) > 1 {
			return append([]wordPart{bestSplit[0]}, secondBreaks...)
		}
	}

	return bestSplit
}

// isValidSplitPoint checks if position i is a valid compound break point
func isValidSplitPoint(word string, i int) bool {
	if i <= 0 || i >= len(word) {
		return false
	}

	// Get surrounding characters (handling multi-byte runes)
	runes := []rune(word)
	if i >= len(runes) {
		return false
	}

	prevChar := runes[i-1]
	nextChar := runes[i]

	// Compounds typically break at vowel boundaries
	vowels := "aāiīuūeo"
	prevIsVowel := strings.ContainsRune(vowels, prevChar)
	nextIsVowel := strings.ContainsRune(vowels, nextChar)

	// Valid: vowel-consonant or consonant-vowel boundary
	return prevIsVowel || nextIsVowel
}

// sandhiCandidate represents a possible compound split
type sandhiCandidate struct {
	first  wordPart
	second wordPart
}

// generateSandhiCandidates generates possible base forms for a split
func generateSandhiCandidates(first, second string) []sandhiCandidate {
	var candidates []sandhiCandidate

	// Direct split (no sandhi)
	candidates = append(candidates, sandhiCandidate{
		first:  wordPart{original: first, base: first},
		second: wordPart{original: second, base: second},
	})

	// Handle vowel sandhi: if first ends in vowel and second starts with vowel
	// e.g., tathāgata = tathā + āgata (ā + ā -> ā)
	if len(first) > 0 && len(second) > 0 {
		firstRunes := []rune(first)
		secondRunes := []rune(second)
		lastChar := firstRunes[len(firstRunes)-1]
		firstChar := secondRunes[0]

		// Long vowel at end might be from sandhi
		longVowels := map[rune]rune{'ā': 'a', 'ī': 'i', 'ū': 'u'}
		if short, ok := longVowels[lastChar]; ok {
			// Try restoring short vowel + adding initial vowel to second part
			shortFirst := string(firstRunes[:len(firstRunes)-1]) + string(short)
			candidates = append(candidates, sandhiCandidate{
				first:  wordPart{original: first, base: shortFirst},
				second: wordPart{original: second, base: second},
			})

			// Also try with long vowel restored to second part
			candidates = append(candidates, sandhiCandidate{
				first:  wordPart{original: first, base: first},
				second: wordPart{original: second, base: string(lastChar) + second},
			})
		}

		// Handle 'o' at word end (often from a + u sandhi, or just -o endings)
		if lastChar == 'o' {
			// Try -a ending
			shortFirst := string(firstRunes[:len(firstRunes)-1]) + "a"
			candidates = append(candidates, sandhiCandidate{
				first:  wordPart{original: first, base: shortFirst},
				second: wordPart{original: second, base: second},
			})
		}

		// Handle consonant at start of second part preceded by same consonant (doubling)
		consonants := "kgcjṭḍtdpbmnyrlvsh"
		if strings.ContainsRune(consonants, firstChar) && len(firstRunes) > 0 && firstRunes[len(firstRunes)-1] == firstChar {
			// Remove doubled consonant from end of first part
			candidates = append(candidates, sandhiCandidate{
				first:  wordPart{original: first, base: string(firstRunes[:len(firstRunes)-1])},
				second: wordPart{original: second, base: second},
			})
		}
	}

	return candidates
}

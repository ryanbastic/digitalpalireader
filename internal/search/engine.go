package search

import (
	"fmt"
	"html"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"

	"github.com/ryanbastic/digitalpalireader/internal/cache"
	"github.com/ryanbastic/digitalpalireader/internal/models"
)

// Engine performs full-text search across Tipitaka XML files
type Engine struct {
	dataPath string
	cache    *cache.Cache
}

// NewEngine creates a new search engine
func NewEngine(dataPath string, cache *cache.Cache) *Engine {
	return &Engine{
		dataPath: dataPath,
		cache:    cache,
	}
}

// File configuration for each set
var setBooks = map[string]int{
	"v": 5,  // Vinaya: 5 books
	"d": 3,  // Digha: 3 books
	"m": 3,  // Majjhima: 3 books
	"s": 5,  // Samyutta: 5 books
	"a": 11, // Anguttara: 11 books
	"k": 21, // Khuddaka: 21 books
	"y": 14, // Abhidhamma: 14 books
}

// Search performs a search based on the request parameters
func (e *Engine) Search(req models.SearchRequest) (*models.SearchResponse, error) {
	if req.Query == "" {
		return &models.SearchResponse{
			Query:   req.Query,
			Results: []models.SearchResult{},
		}, nil
	}

	// Set defaults
	if req.Limit <= 0 {
		req.Limit = 100
	}
	if req.Hier == "" {
		req.Hier = "m"
	}

	// Build list of files to search
	files := e.getFilesToSearch(req)

	// Perform search
	results, total := e.searchFiles(files, req)

	return &models.SearchResponse{
		Query:        req.Query,
		TotalResults: total,
		Results:      results,
		HasMore:      total > req.Offset+len(results),
	}, nil
}

// getFilesToSearch returns the list of XML files to search based on request
func (e *Engine) getFilesToSearch(req models.SearchRequest) []string {
	var files []string

	switch req.Type {
	case models.SearchAllSets:
		// Search all sets
		for set, numBooks := range setBooks {
			for book := 1; book <= numBooks; book++ {
				files = append(files, e.buildFilePath(set, book, req.Hier))
			}
		}

	case models.SearchBooksInSet:
		// Search specific books in a set
		if req.Set == "" {
			return files
		}
		if len(req.Books) > 0 {
			for _, book := range req.Books {
				files = append(files, e.buildFilePath(req.Set, book+1, req.Hier))
			}
		} else {
			// Search all books in the set
			numBooks := setBooks[req.Set]
			for book := 1; book <= numBooks; book++ {
				files = append(files, e.buildFilePath(req.Set, book, req.Hier))
			}
		}

	case models.SearchSingleBook:
		// Search a single book
		if req.Set != "" {
			files = append(files, e.buildFilePath(req.Set, req.Book+1, req.Hier))
		}

	case models.SearchPartial:
		// For partial search, limit to first few sets
		for _, set := range []string{"d", "m", "s"} {
			numBooks := setBooks[set]
			for book := 1; book <= numBooks; book++ {
				files = append(files, e.buildFilePath(set, book, req.Hier))
			}
		}
	}

	return files
}

// buildFilePath constructs the XML file path
func (e *Engine) buildFilePath(set string, book int, hier string) string {
	filename := fmt.Sprintf("%s%d%s.xml", set, book, hier)
	return filepath.Join(e.dataPath, "tipitaka", "my", filename)
}

// searchFiles searches multiple files concurrently
func (e *Engine) searchFiles(files []string, req models.SearchRequest) ([]models.SearchResult, int) {
	var (
		allResults []models.SearchResult
		totalCount int
		mu         sync.Mutex
		wg         sync.WaitGroup
	)

	// Compile search pattern
	pattern, err := e.compilePattern(req.Query, req.Regex)
	if err != nil {
		return nil, 0
	}

	// Search files concurrently (limit concurrency)
	sem := make(chan struct{}, 4) // Max 4 concurrent file reads

	for _, file := range files {
		wg.Add(1)
		go func(filePath string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			results, count := e.searchFile(filePath, pattern, req)

			mu.Lock()
			allResults = append(allResults, results...)
			totalCount += count
			mu.Unlock()
		}(file)
	}

	wg.Wait()

	// Apply offset and limit
	start := req.Offset
	if start > len(allResults) {
		start = len(allResults)
	}
	end := start + req.Limit
	if end > len(allResults) {
		end = len(allResults)
	}

	return allResults[start:end], totalCount
}

// compilePattern compiles the search pattern
func (e *Engine) compilePattern(query string, isRegex bool) (*regexp.Regexp, error) {
	var pattern string
	if isRegex {
		pattern = query
	} else {
		// Escape special regex characters and make case-insensitive
		pattern = regexp.QuoteMeta(query)
	}
	return regexp.Compile("(?i)" + pattern)
}

// searchFile searches a single XML file
func (e *Engine) searchFile(filePath string, pattern *regexp.Regexp, req models.SearchRequest) ([]models.SearchResult, int) {
	// Check cache
	cacheKey := fmt.Sprintf("search:%s:%s", filePath, req.Query)
	if cached, ok := e.cache.Get(cacheKey); ok {
		results := cached.([]models.SearchResult)
		return results, len(results)
	}

	// Read file
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, 0
	}

	content := string(data)

	// Extract set and book from filename
	base := filepath.Base(filePath)
	set := string(base[0])
	book := 0
	for i := 1; i < len(base); i++ {
		if base[i] >= '0' && base[i] <= '9' {
			book = book*10 + int(base[i]-'0')
		} else {
			break
		}
	}
	book-- // Convert to 0-indexed

	var results []models.SearchResult

	// Find all <p> elements and search within them
	pRegex := regexp.MustCompile(`<p>([^<]*(?:<[^/][^>]*>[^<]*</[^>]+>[^<]*)*)</p>`)
	matches := pRegex.FindAllStringSubmatchIndex(content, -1)

	// Track current section context
	currentTitle := ""
	currentH2 := ""
	currentH4 := ""

	for paraNum, match := range matches {
		if len(match) < 4 {
			continue
		}

		// Get paragraph content
		paraContent := content[match[2]:match[3]]

		// Update context by looking at preceding content
		preceding := content[:match[0]]

		// Find most recent h2n (sutta title)
		if h2Match := regexp.MustCompile(`<h2n>\s*([^<]+)\s*</h2n>`).FindAllStringSubmatch(preceding, -1); len(h2Match) > 0 {
			currentH2 = strings.TrimSpace(h2Match[len(h2Match)-1][1])
		}

		// Find most recent h4n (section title)
		if h4Match := regexp.MustCompile(`<h4n>\s*([^<]+)\s*</h4n>`).FindAllStringSubmatch(preceding, -1); len(h4Match) > 0 {
			currentH4 = strings.TrimSpace(h4Match[len(h4Match)-1][1])
		}

		// Use h2 or h4 as title
		if currentH4 != "" {
			currentTitle = currentH4
		} else if currentH2 != "" {
			currentTitle = currentH2
		} else {
			currentTitle = fmt.Sprintf("Paragraph %d", paraNum+1)
		}

		// Search for pattern in paragraph
		if pattern.MatchString(paraContent) {
			// Create snippet with highlighted match
			snippet := e.createSnippet(paraContent, pattern)

			// Build location string
			location := fmt.Sprintf("%s.%d.0.0.0.0.%d.%s", set, book, paraNum, req.Hier)

			results = append(results, models.SearchResult{
				Location: location,
				Set:      set,
				Book:     book,
				Title:    currentTitle,
				Snippet:  snippet,
				Para:     paraNum,
			})
		}
	}

	// Cache results
	e.cache.Set(cacheKey, results)

	return results, len(results)
}

// createSnippet creates a text snippet with highlighted matches
func (e *Engine) createSnippet(text string, pattern *regexp.Regexp) string {
	// Decode HTML entities
	decoded := html.UnescapeString(text)

	// Remove XML/HTML tags for clean text
	decoded = regexp.MustCompile(`<[^>]+>`).ReplaceAllString(decoded, "")

	// Remove reference markers
	decoded = regexp.MustCompile(`\[\d+\]`).ReplaceAllString(decoded, "")
	decoded = regexp.MustCompile(`\^[a-z]\^.*?\^e[a-z]\^`).ReplaceAllString(decoded, "")

	// Clean up whitespace
	decoded = regexp.MustCompile(`\s+`).ReplaceAllString(decoded, " ")
	decoded = strings.TrimSpace(decoded)

	// Find the match location
	loc := pattern.FindStringIndex(decoded)
	if loc == nil {
		// No match found in cleaned text, return truncated
		if len(decoded) > 200 {
			return decoded[:200] + "..."
		}
		return decoded
	}

	// Create snippet around match
	start := loc[0] - 50
	if start < 0 {
		start = 0
	}
	end := loc[1] + 150
	if end > len(decoded) {
		end = len(decoded)
	}

	snippet := decoded[start:end]

	// Add ellipsis if truncated
	if start > 0 {
		snippet = "..." + snippet
	}
	if end < len(decoded) {
		snippet = snippet + "..."
	}

	// Highlight matches with <mark> tags
	snippet = pattern.ReplaceAllString(snippet, "<mark>$0</mark>")

	return snippet
}

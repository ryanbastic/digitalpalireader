package xml

import (
	"encoding/xml"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/ryanbastic/digitalpalireader/internal/cache"
	"github.com/ryanbastic/digitalpalireader/internal/models"
)

// TipitakaParser parses Tipitaka XML files
type TipitakaParser struct {
	dataPath string
	cache    *cache.Cache
}

// NewTipitakaParser creates a new parser
func NewTipitakaParser(dataPath string, cache *cache.Cache) *TipitakaParser {
	return &TipitakaParser{
		dataPath: dataPath,
		cache:    cache,
	}
}

// Body represents the root XML element
type Body struct {
	XMLName xml.Name `xml:"body"`
	Content []byte   `xml:",innerxml"`
}

// LoadSection loads and parses a specific section from a Tipitaka XML file
func (p *TipitakaParser) LoadSection(place models.Place) (*models.TextSection, error) {
	cacheKey := fmt.Sprintf("text:%s", place.String())

	if cached, ok := p.cache.Get(cacheKey); ok {
		return cached.(*models.TextSection), nil
	}

	// Build file path
	script := place.Script
	if script == "" {
		script = "my"
	}

	filename := place.XMLFileName()
	path := filepath.Join(p.dataPath, "tipitaka", script, filename)

	// Read file
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read XML file %s: %w", path, err)
	}

	// Parse the content
	section, err := p.parseXMLContent(data, place)
	if err != nil {
		return nil, err
	}

	p.cache.Set(cacheKey, section)
	return section, nil
}

// parseXMLContent extracts the requested section from XML content
func (p *TipitakaParser) parseXMLContent(data []byte, place models.Place) (*models.TextSection, error) {
	content := string(data)
	section := &models.TextSection{
		Place: place,
	}

	// Extract titles from the hierarchy
	section.Titles = p.extractTitles(content, place)

	// Extract the specific section content
	paragraphs := p.extractSection(content, place)
	section.Content = p.formatParagraphs(paragraphs)

	// Build the title from available hierarchy
	section.Title = p.buildTitle(section.Titles)

	// Build breadcrumb
	section.Nav.Breadcrumb = p.buildBreadcrumb(section.Titles)

	return section, nil
}

// extractTitles extracts the hierarchical titles for a given place
func (p *TipitakaParser) extractTitles(content string, place models.Place) models.Titles {
	titles := models.Titles{}

	// Extract han (main header)
	if match := regexp.MustCompile(`<han>\s*(.*?)\s*</han>`).FindStringSubmatch(content); len(match) > 1 {
		titles.Han = strings.TrimSpace(match[1])
	}

	// We need to navigate to the correct h0/h1/h2/h3/h4 based on place indices
	// For now, extract the first ones we find (simplified implementation)
	// A full implementation would track indices

	// Extract h0n through h4n
	if match := regexp.MustCompile(`<h0n>\s*(.*?)\s*</h0n>`).FindStringSubmatch(content); len(match) > 1 {
		titles.H0n = strings.TrimSpace(match[1])
	}
	if match := regexp.MustCompile(`<h1n>\s*(.*?)\s*</h1n>`).FindStringSubmatch(content); len(match) > 1 {
		titles.H1n = strings.TrimSpace(match[1])
	}
	if match := regexp.MustCompile(`<h2n>\s*(.*?)\s*</h2n>`).FindStringSubmatch(content); len(match) > 1 {
		titles.H2n = strings.TrimSpace(match[1])
	}
	if match := regexp.MustCompile(`<h3n>\s*(.*?)\s*</h3n>`).FindStringSubmatch(content); len(match) > 1 {
		titles.H3n = strings.TrimSpace(match[1])
	}
	if match := regexp.MustCompile(`<h4n>\s*(.*?)\s*</h4n>`).FindStringSubmatch(content); len(match) > 1 {
		titles.H4n = strings.TrimSpace(match[1])
	}

	return titles
}

// extractSection extracts paragraphs for a specific section
func (p *TipitakaParser) extractSection(content string, place models.Place) []string {
	// Find all <p> tags and their content
	re := regexp.MustCompile(`<p>([^<]*(?:<[^/][^>]*>[^<]*</[^>]+>[^<]*)*)</p>`)
	matches := re.FindAllStringSubmatch(content, -1)

	var paragraphs []string
	for _, match := range matches {
		if len(match) > 1 {
			paragraphs = append(paragraphs, match[1])
		}
	}

	// For a full implementation, we'd filter by the place hierarchy
	// For now, return all paragraphs (the UI can paginate)
	return paragraphs
}

// formatParagraphs formats paragraphs into HTML
func (p *TipitakaParser) formatParagraphs(paragraphs []string) string {
	var sb strings.Builder

	for _, para := range paragraphs {
		formatted := p.formatParagraph(para)
		sb.WriteString("<p class=\"pali\">")
		sb.WriteString(formatted)
		sb.WriteString("</p>\n")
	}

	return sb.String()
}

// formatParagraph formats a single paragraph, handling markup
func (p *TipitakaParser) formatParagraph(text string) string {
	// Remove reference markers like [03] at the start
	text = regexp.MustCompile(`^\[[\d]+\]\s*`).ReplaceAllString(text, "")

	// Convert ^b^...^eb^ to <b>...</b>
	text = regexp.MustCompile(`\^b\^(.*?)\^eb\^`).ReplaceAllString(text, "<b>$1</b>")

	// Remove cross-reference markers ^a^...^ea^
	text = regexp.MustCompile(`\^a\^.*?\^ea\^`).ReplaceAllString(text, "")

	// Convert variant readings {text} to <span class="variant">text</span>
	text = regexp.MustCompile(`\{([^}]+)\}`).ReplaceAllString(text, `<span class="variant">$1</span>`)

	// Clean up whitespace
	text = regexp.MustCompile(`\s+`).ReplaceAllString(text, " ")
	text = strings.TrimSpace(text)

	return text
}

// buildTitle creates a display title from available titles
func (p *TipitakaParser) buildTitle(titles models.Titles) string {
	// Prefer h2n (sutta title), then h4n (section title)
	if titles.H2n != "" {
		return titles.H2n
	}
	if titles.H4n != "" {
		return titles.H4n
	}
	if titles.Han != "" {
		return titles.Han
	}
	return "Untitled"
}

// buildBreadcrumb creates a breadcrumb from available titles
func (p *TipitakaParser) buildBreadcrumb(titles models.Titles) []string {
	var breadcrumb []string

	if titles.Han != "" {
		breadcrumb = append(breadcrumb, titles.Han)
	}
	if titles.H2n != "" {
		breadcrumb = append(breadcrumb, titles.H2n)
	}
	if titles.H4n != "" && titles.H4n != titles.H2n {
		breadcrumb = append(breadcrumb, titles.H4n)
	}

	return breadcrumb
}

// GetHierarchy extracts the navigation hierarchy from an XML file
func (p *TipitakaParser) GetHierarchy(set string, book int, hier string) (*models.BookHierarchyResponse, error) {
	cacheKey := fmt.Sprintf("hier:%s:%d:%s", set, book, hier)

	if cached, ok := p.cache.Get(cacheKey); ok {
		return cached.(*models.BookHierarchyResponse), nil
	}

	// Build file path
	filename := fmt.Sprintf("%s%d%s.xml", set, book+1, hier)
	path := filepath.Join(p.dataPath, "tipitaka", "my", filename)

	// Check if file exists
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return nil, fmt.Errorf("XML file not found: %s", filename)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	response := &models.BookHierarchyResponse{
		Set:  set,
		Book: book,
		Hier: hier,
	}

	content := string(data)

	// Extract vaggas (h2 level titles)
	h2Re := regexp.MustCompile(`<h2n>\s*(.*?)\s*</h2n>`)
	h2Matches := h2Re.FindAllStringSubmatch(content, -1)
	for i, match := range h2Matches {
		if len(match) > 1 && strings.TrimSpace(match[1]) != "" {
			response.Vaggas = append(response.Vaggas, models.HierarchyNode{
				Index: i,
				Name:  strings.TrimSpace(match[1]),
			})
		}
	}

	// Extract sections (h4 level titles)
	h4Re := regexp.MustCompile(`<h4n>\s*(.*?)\s*</h4n>`)
	h4Matches := h4Re.FindAllStringSubmatch(content, -1)
	for i, match := range h4Matches {
		if len(match) > 1 && strings.TrimSpace(match[1]) != "" {
			response.Suttas = append(response.Suttas, models.HierarchyNode{
				Index: i,
				Name:  strings.TrimSpace(match[1]),
			})
		}
	}

	p.cache.Set(cacheKey, response)
	return response, nil
}

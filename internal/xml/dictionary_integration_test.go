package xml

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/ryanbastic/digitalpalireader/internal/cache"
)

func TestLookupPEDIntegration(t *testing.T) {
	// Find the data path relative to the test file
	// The dictionary data is in public/en/ped/
	dataPath := filepath.Join("..", "..", "public")

	// Check if data exists
	pedPath := filepath.Join(dataPath, "en", "ped", "0", "ped.xml")
	if _, err := os.Stat(pedPath); os.IsNotExist(err) {
		t.Skip("Dictionary data not found, skipping integration test")
	}

	c := cache.New(time.Hour)
	parser := NewDictionaryParser(dataPath, c)

	tests := []struct {
		query         string
		expectWord    string // The first result should have this word
		expectResults bool   // Should find results
	}{
		{"dhamma", "dhamma", true},
		{"buddha", "Buddha", true},
		{"nibbāna", "Nibbāna", true},
		{"akkha", "Akkha", true}, // This was broken before - was extracting wrong word due to <sup> tag
	}

	for _, tt := range tests {
		t.Run(tt.query, func(t *testing.T) {
			results, err := parser.LookupPED(tt.query)
			if err != nil {
				t.Fatalf("LookupPED(%q) error: %v", tt.query, err)
			}

			if tt.expectResults && len(results) == 0 {
				t.Errorf("LookupPED(%q) returned no results, expected some", tt.query)
				return
			}

			if len(results) > 0 {
				firstWord := results[0].Word
				// Check if first result matches expected (case-insensitive for flexibility)
				if tt.expectWord != "" && !caseInsensitiveMatch(firstWord, tt.expectWord) {
					t.Errorf("LookupPED(%q) first result = %q, want %q", tt.query, firstWord, tt.expectWord)
				}
				t.Logf("LookupPED(%q) returned %d results, first: %q", tt.query, len(results), firstWord)
			}
		})
	}
}

func TestAnalyzeCompoundStemming(t *testing.T) {
	// Find the data path relative to the test file
	dataPath := filepath.Join("..", "..", "public")

	// Check if data exists
	pedPath := filepath.Join(dataPath, "en", "ped", "0", "ped.xml")
	if _, err := os.Stat(pedPath); os.IsNotExist(err) {
		t.Skip("Dictionary data not found, skipping integration test")
	}

	c := cache.New(time.Hour)
	parser := NewDictionaryParser(dataPath, c)

	// Test inflected forms that should find their base forms via AnalyzeCompound
	tests := []struct {
		query         string
		expectWord    string // Should find this base word
		expectResults bool
	}{
		{"arahato", "Arahant", true},  // genitive of arahant
		{"dhammassa", "Dhamma", true}, // genitive of dhamma
		{"buddhassa", "Buddha", true}, // genitive of buddha
	}

	for _, tt := range tests {
		t.Run(tt.query, func(t *testing.T) {
			// Use AnalyzeCompound which includes stemming logic
			response, err := parser.AnalyzeCompound(tt.query)
			if err != nil {
				t.Fatalf("AnalyzeCompound(%q) error: %v", tt.query, err)
			}

			if tt.expectResults && len(response.Results) == 0 {
				t.Errorf("AnalyzeCompound(%q) returned no results, expected some", tt.query)
				return
			}

			if len(response.Results) > 0 {
				firstWord := response.Results[0].Word
				// Check if first result matches expected (case-insensitive for flexibility)
				if tt.expectWord != "" && !caseInsensitiveMatch(firstWord, tt.expectWord) {
					t.Errorf("AnalyzeCompound(%q) first result = %q, want %q", tt.query, firstWord, tt.expectWord)
				}
				t.Logf("AnalyzeCompound(%q) returned %d results, first: %q", tt.query, len(response.Results), firstWord)
			}
		})
	}
}

func caseInsensitiveMatch(a, b string) bool {
	return normalizeWord(a) == normalizeWord(b)
}

package xml

import (
	"testing"

	"github.com/ryanbastic/digitalpalireader/internal/models"
)

func TestSortResultsByRelevance(t *testing.T) {
	tests := []struct {
		name     string
		results  []models.DictEntry
		query    string
		fuzzy    bool
		expected []string // expected word order
	}{
		{
			name: "exact match comes first",
			results: []models.DictEntry{
				{Word: "dhammacakka", WordNorm: "dhammacakka"},
				{Word: "dhammavinaya", WordNorm: "dhammavinaya"},
				{Word: "dhamma", WordNorm: "dhamma"},
				{Word: "saddhamma", WordNorm: "saddhamma"},
			},
			query:    "dhamma",
			fuzzy:    false,
			expected: []string{"dhamma", "dhammacakka", "dhammavinaya", "saddhamma"},
		},
		{
			name: "prefix matches before contains matches",
			results: []models.DictEntry{
				{Word: "saddhamma", WordNorm: "saddhamma"},
				{Word: "dhammacakka", WordNorm: "dhammacakka"},
				{Word: "dhammavinaya", WordNorm: "dhammavinaya"},
			},
			query:    "dhamma",
			fuzzy:    false,
			expected: []string{"dhammacakka", "dhammavinaya", "saddhamma"},
		},
		{
			name: "alphabetical order within same match type",
			results: []models.DictEntry{
				{Word: "dhammavinaya", WordNorm: "dhammavinaya"},
				{Word: "dhammacakka", WordNorm: "dhammacakka"},
				{Word: "dhammaja", WordNorm: "dhammaja"},
			},
			query:    "dhamma",
			fuzzy:    false,
			expected: []string{"dhammacakka", "dhammaja", "dhammavinaya"},
		},
		{
			name: "exact match with diacritics",
			results: []models.DictEntry{
				{Word: "ābādha", WordNorm: "abadha"},
				{Word: "ābādhika", WordNorm: "abadhika"},
				{Word: "ābādha", WordNorm: "abadha"},
			},
			query:    "ābādha",
			fuzzy:    false,
			expected: []string{"ābādha", "ābādha", "ābādhika"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sortResultsByRelevance(tt.results, tt.query, tt.fuzzy)

			if len(tt.results) != len(tt.expected) {
				t.Errorf("expected %d results, got %d", len(tt.expected), len(tt.results))
				return
			}

			for i, exp := range tt.expected {
				if tt.results[i].Word != exp {
					t.Errorf("position %d: expected %q, got %q", i, exp, tt.results[i].Word)
				}
			}
		})
	}
}

func TestMatchesQuery(t *testing.T) {
	tests := []struct {
		name           string
		word           string
		query          string
		startsWithOnly bool
		expected       bool
	}{
		{"exact match", "dhamma", "dhamma", false, true},
		{"prefix match", "dhammacakka", "dhamma", false, true},
		{"contains match", "saddhamma", "dhamma", false, true},
		{"contains match disabled", "saddhamma", "dhamma", true, false},
		{"no match", "buddha", "dhamma", false, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := matchesQuery(tt.word, tt.query, tt.startsWithOnly)
			if got != tt.expected {
				t.Errorf("matchesQuery(%q, %q, %v) = %v, want %v",
					tt.word, tt.query, tt.startsWithOnly, got, tt.expected)
			}
		})
	}
}

func TestGetStemCandidates(t *testing.T) {
	tests := []struct {
		word     string
		expected []string // should contain these candidates
	}{
		{"arahato", []string{"arahato", "arahant", "arahat", "araha"}},
		{"dhammassa", []string{"dhammassa", "dhamma"}},
		{"dhammo", []string{"dhammo", "dhamma"}},
		{"dhammaṃ", []string{"dhammaṃ", "dhamma"}},
		{"dhammena", []string{"dhammena", "dhamma"}},
		{"buddhassa", []string{"buddhassa", "buddha"}},
		{"bhikkhuno", []string{"bhikkhuno", "bhikkhu"}},
	}

	for _, tt := range tests {
		t.Run(tt.word, func(t *testing.T) {
			candidates := getStemCandidates(tt.word)
			for _, exp := range tt.expected {
				found := false
				for _, c := range candidates {
					if c == exp {
						found = true
						break
					}
				}
				if !found {
					t.Errorf("getStemCandidates(%q) missing expected candidate %q, got %v", tt.word, exp, candidates)
				}
			}
		})
	}
}

func TestExtractWordFromPED(t *testing.T) {
	tests := []struct {
		name     string
		entry    string
		expected string
	}{
		{
			name:     "simple word",
			entry:    `<b>dhamma</b> [Sk. dharma] nature, condition...`,
			expected: "dhamma",
		},
		{
			name:     "word with superscript",
			entry:    `<b>Akkha<sup>2</sup></b> [Vedic akṣa] a die...`,
			expected: "Akkha",
		},
		{
			name:     "word with multiple superscripts",
			entry:    `<b>A -- <sup>1</sup></b> the prep. <b>ā</b> shortened...`,
			expected: "A",
		},
		{
			name:     "html encoded entry",
			entry:    `&lt;b&gt;dhamma&lt;/b&gt; definition here`,
			expected: "dhamma",
		},
		{
			name:     "html encoded with superscript",
			entry:    `&lt;b&gt;Akkha&lt;sup&gt;2&lt;/sup&gt;&lt;/b&gt; [Vedic akṣa]`,
			expected: "Akkha",
		},
		{
			name:     "word with trailing dashes",
			entry:    `<b>dhamma -- </b> compound prefix`,
			expected: "dhamma",
		},
		{
			name:     "compound word",
			entry:    `<b>dhamma -- cakka</b> the wheel of the law`,
			expected: "dhamma -- cakka",
		},
		{
			name:     "word with leading whitespace",
			entry:    `  <b>dhamma</b> definition`,
			expected: "dhamma",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := extractWordFromPED(tt.entry)
			if got != tt.expected {
				t.Errorf("extractWordFromPED() = %q, want %q", got, tt.expected)
			}
		})
	}
}

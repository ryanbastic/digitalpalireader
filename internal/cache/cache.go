package cache

import (
	"sync"
	"time"
)

// Cache is a simple TTL cache
type Cache struct {
	items map[string]*cacheItem
	mu    sync.RWMutex
	ttl   time.Duration
}

type cacheItem struct {
	value     any
	expiresAt time.Time
}

// New creates a new cache with the given TTL
func New(ttl time.Duration) *Cache {
	c := &Cache{
		items: make(map[string]*cacheItem),
		ttl:   ttl,
	}
	go c.cleanup()
	return c
}

// Get retrieves an item from the cache
func (c *Cache) Get(key string) (any, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	item, exists := c.items[key]
	if !exists || time.Now().After(item.expiresAt) {
		return nil, false
	}
	return item.value, true
}

// Set stores an item in the cache
func (c *Cache) Set(key string, value any) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.items[key] = &cacheItem{
		value:     value,
		expiresAt: time.Now().Add(c.ttl),
	}
}

// Delete removes an item from the cache
func (c *Cache) Delete(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.items, key)
}

// cleanup periodically removes expired items
func (c *Cache) cleanup() {
	ticker := time.NewTicker(c.ttl / 2)
	defer ticker.Stop()

	for range ticker.C {
		c.mu.Lock()
		now := time.Now()
		for key, item := range c.items {
			if now.After(item.expiresAt) {
				delete(c.items, key)
			}
		}
		c.mu.Unlock()
	}
}

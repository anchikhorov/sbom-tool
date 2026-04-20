import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TAXONOMY_URL = 'https://raw.githubusercontent.com/BSI-Bund/tr-03183-cyclonedx-property-taxonomy/main/README.md';
const CACHE_FILE = path.resolve(__dirname, '../../schemas/bsi-taxonomy.cache.json');
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Default taxonomy to use if both fetch and cache fail
const DEFAULT_PROPERTIES = [
  'bsi:compliance:requirements',
  'bsi:compliance:status',
  'bsi:identification:cpe',
  'bsi:identification:purl',
  'bsi:hash-source',
  'bsi:reproduction:instructions'
];

/**
 * Parses Markdown tables to find bsi property names.
 * Expected format: | **`bsi:name`** | Description |
 * 
 * @param {string} markdown - The markdown content to parse
 * @returns {string[]} - Array of unique property names
 */
export function parseTaxonomy(markdown) {
  // Regex: matches | **`bsi:property:name`** |
  const regex = /\|\s*\*\*`(bsi:[a-z0-9:-]+)`\*\*\s*\|/gi;
  const matches = [...markdown.matchAll(regex)];
  const properties = matches.map(match => match[1]);
  return [...new Set(properties)]; // Unique values
}

/**
 * Fetches the taxonomy from the remote URL and updates the cache.
 * 
 * @returns {Promise<string[]|null>} - Array of properties or null if fetch fails
 */
export async function fetchTaxonomy() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(TAXONOMY_URL, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const text = await response.text();
      const properties = parseTaxonomy(text);
      if (properties.length > 0) {
        // Update cache
        try {
          await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
          const cacheContent = {
            last_updated: Date.now(),
            properties: properties
          };
          await fs.writeFile(CACHE_FILE, JSON.stringify(cacheContent, null, 2));
        } catch (cacheError) {
          console.warn('Failed to write BSI taxonomy cache:', cacheError.message);
        }
        return properties;
      }
    }
  } catch (error) {
    console.warn('Failed to fetch BSI taxonomy from GitHub:', error.message);
  }
  return null;
}

/**
 * Gets allowed properties from remote, cache, or default.
 * Uses a 24-hour cache to avoid excessive network requests.
 * 
 * @returns {Promise<string[]>} - Array of allowed property names
 */
export async function getAllowedProperties() {
  let cachedData = null;
  
  // 1. Try reading the cache
  try {
    const cacheContent = await fs.readFile(CACHE_FILE, 'utf-8');
    cachedData = JSON.parse(cacheContent);
    
    // Check if cache is still valid
    const isCacheValid = cachedData.last_updated && 
                        (Date.now() - cachedData.last_updated < CACHE_MAX_AGE);
    
    if (isCacheValid && Array.isArray(cachedData.properties)) {
      const allProperties = new Set([...DEFAULT_PROPERTIES, ...cachedData.properties]);
      return [...allProperties];
    }
  } catch (error) {
    // Cache missing or unreadable
  }

  // 2. Fetch from remote if cache is invalid or missing
  let properties = await fetchTaxonomy();
  
  // 3. If fetch failed, use stale cache if available
  if (!properties && cachedData && Array.isArray(cachedData.properties)) {
    properties = cachedData.properties;
  }

  // 4. Merge with defaults
  const allProperties = new Set([...DEFAULT_PROPERTIES, ...(properties || [])]);
  return [...allProperties];
}

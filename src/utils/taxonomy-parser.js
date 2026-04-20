import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TAXONOMY_URL = 'https://raw.githubusercontent.com/BSI-Bund/tr-03183-cyclonedx-property-taxonomy/main/README.md';
const CACHE_FILE = path.resolve(__dirname, '../../schemas/bsi-taxonomy.cache.json');

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
  // We use [a-z0-9:-] to handle common property naming conventions including hyphens and colons.
  const regex = /\|\s*\*\*`(bsi:[a-z0-9:-]+)`\*\*\s*\|/gi;
  const matches = [...markdown.matchAll(regex)];
  const properties = matches.map(match => match[1]);
  return [...new Set(properties)]; // Unique values
}

/**
 * Fetches the taxonomy from the remote URL.
 * 
 * @returns {Promise<string[]|null>} - Array of properties or null if fetch fails
 */
export async function fetchTaxonomy() {
  try {
    const response = await axios.get(TAXONOMY_URL, { timeout: 5000 });
    if (response.status === 200 && typeof response.data === 'string') {
      const properties = parseTaxonomy(response.data);
      if (properties.length > 0) {
        // Update cache
        try {
          // Ensure directory exists
          await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
          await fs.writeFile(CACHE_FILE, JSON.stringify(properties, null, 2));
        } catch (cacheError) {
          // Non-fatal error
          console.warn('Failed to write BSI taxonomy cache:', cacheError.message);
        }
        return properties;
      }
    }
  } catch (error) {
    console.warn('Failed to fetch BSI taxonomy from GitHub, using cache or defaults.', error.message);
  }
  return null;
}

/**
 * Gets allowed properties from remote, cache, or default.
 * 
 * @returns {Promise<string[]>} - Array of allowed property names
 */
export async function getAllowedProperties() {
  // 1. Try remote (which also updates cache)
  let properties = await fetchTaxonomy();
  
  // 2. Try cache if remote failed
  if (!properties) {
    try {
      const cacheData = await fs.readFile(CACHE_FILE, 'utf-8');
      properties = JSON.parse(cacheData);
    } catch (error) {
      // Cache missing or unreadable
    }
  }

  // 3. Fallback to hardcoded defaults
  return properties || DEFAULT_PROPERTIES;
}

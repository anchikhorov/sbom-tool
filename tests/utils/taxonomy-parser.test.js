import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import fs from 'fs/promises';
import { parseTaxonomy, fetchTaxonomy, getAllowedProperties } from '../../src/utils/taxonomy-parser.js';

vi.mock('axios');
vi.mock('fs/promises');

describe('Taxonomy Parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseTaxonomy', () => {
    it('should extract bsi properties from markdown table', () => {
      const markdown = `
| Property | Description |
|---|---|
| **\`bsi:compliance:requirements\`** | Req |
| **\`bsi:compliance:status\`** | Status |
| **\`bsi:hash-source\`** | Source |
`;
      const result = parseTaxonomy(markdown);
      expect(result).toContain('bsi:compliance:requirements');
      expect(result).toContain('bsi:compliance:status');
      expect(result).toContain('bsi:hash-source');
      expect(result).toHaveLength(3);
    });

    it('should handle different spacing', () => {
      const markdown = `|**\`bsi:a\`**|   |**\`bsi:b\`**|`;
      const result = parseTaxonomy(markdown);
      expect(result).toEqual(['bsi:a', 'bsi:b']);
    });

    it('should handle numeric values', () => {
      const markdown = `| **\`bsi:v1:test\`** |`;
      const result = parseTaxonomy(markdown);
      expect(result).toEqual(['bsi:v1:test']);
    });
  });

  describe('fetchTaxonomy', () => {
    it('should fetch and update cache', async () => {
      const markdown = `| **\`bsi:fetched\`** |`;
      axios.get.mockResolvedValue({ status: 200, data: markdown });
      fs.writeFile.mockResolvedValue();
      fs.mkdir.mockResolvedValue();

      const result = await fetchTaxonomy();
      expect(result).toEqual(['bsi:fetched']);
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should return null on fetch failure', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));
      const result = await fetchTaxonomy();
      expect(result).toBeNull();
    });
  });

  describe('getAllowedProperties', () => {
    it('should return remote properties if fetch succeeds', async () => {
      axios.get.mockResolvedValue({ status: 200, data: '| **\`bsi:remote\`** |' });
      const result = await getAllowedProperties();
      expect(result).toEqual(['bsi:remote']);
    });

    it('should return cached properties if fetch fails', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));
      fs.readFile.mockResolvedValue(JSON.stringify(['bsi:cached']));
      const result = await getAllowedProperties();
      expect(result).toEqual(['bsi:cached']);
    });

    it('should return default properties if fetch and cache fail', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));
      fs.readFile.mockRejectedValue(new Error('File missing'));
      const result = await getAllowedProperties();
      expect(result).toContain('bsi:compliance:requirements');
      expect(result).toContain('bsi:hash-source');
    });
  });
});

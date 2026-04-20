import { vi, describe, it, expect, beforeEach } from 'vitest';
import { auditAction } from '../../src/commands/audit.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Mock node:fs
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

describe('auditAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should run audit and generate reports by default', async () => {
    const mockSbom = {
      bomFormat: 'CycloneDX',
      specVersion: '1.6',
      metadata: { component: { name: 'test', version: '1.0.0' } },
      components: []
    };

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(mockSbom));

    await auditAction('bom.json', { outputDir: './audit-reports' });

    // Verify output directory creation
    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('audit-reports'), { recursive: true });

    // Verify report generation (default is both)
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
    
    const writtenFiles = fs.writeFileSync.mock.calls.map(call => call[0]);
    expect(writtenFiles.some(f => f.endsWith('.md'))).toBe(true);
    expect(writtenFiles.some(f => f.endsWith('.json'))).toBe(true);
  });

  it('should respect the --format option (markdown)', async () => {
    const mockSbom = {
      bomFormat: 'CycloneDX',
      specVersion: '1.6',
      metadata: { component: { name: 'test', version: '1.0.0' } },
      components: []
    };

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(mockSbom));

    await auditAction('bom.json', { outputDir: './audit-reports', format: 'markdown' });

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    expect(fs.writeFileSync.mock.calls[0][0].endsWith('.md')).toBe(true);
  });

  it('should respect the --format option (json)', async () => {
    const mockSbom = {
      bomFormat: 'CycloneDX',
      specVersion: '1.6',
      metadata: { component: { name: 'test', version: '1.0.0' } },
      components: []
    };

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(mockSbom));

    await auditAction('bom.json', { outputDir: './audit-reports', format: 'json' });

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    expect(fs.writeFileSync.mock.calls[0][0].endsWith('.json')).toBe(true);
  });

  it('should fail gracefully if input file is missing', async () => {
    fs.existsSync.mockReturnValue(false);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await auditAction('missing.json', {});

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  it('should fail gracefully if input file is invalid JSON', async () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('invalid json');
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await auditAction('invalid.json', {});

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid JSON'));
  });
});

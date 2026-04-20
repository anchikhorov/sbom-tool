import { describe, it, expect } from 'vitest';
import { classifyComponent } from '../../src/core/classification.js';

describe('classifyComponent', () => {
  it('should classify NPM package as executable', () => {
    const comp = {
      name: 'express',
      purl: 'pkg:npm/express@4.18.2',
      type: 'library'
    };
    const result = classifyComponent(comp);
    expect(result.executable).toBe('executable');
    expect(result.archive).toBe('no archive');
    expect(result.structured).toBe('unstructured');
  });

  it('should classify zip file as archive and structured', () => {
    const comp = {
      name: 'my-project.zip',
      type: 'application'
    };
    const result = classifyComponent(comp);
    expect(result.executable).toBe('executable');
    expect(result.archive).toBe('archive');
    expect(result.structured).toBe('structured');
  });

  it('should classify library without extensions as non-archive but executable', () => {
    const comp = {
      name: 'some-lib',
      type: 'library'
    };
    const result = classifyComponent(comp);
    expect(result.executable).toBe('executable');
    expect(result.archive).toBe('no archive');
    expect(result.structured).toBe('unstructured');
  });

  it('should classify data file as non-executable, non-archive', () => {
    const comp = {
      name: 'config.json',
      type: 'data'
    };
    const result = classifyComponent(comp);
    expect(result.executable).toBe('non-executable');
    expect(result.archive).toBe('no archive');
    expect(result.structured).toBe('unstructured');
  });

  it('should classify jar file as executable, archive and structured', () => {
    const comp = {
      name: 'app.jar',
      type: 'library'
    };
    const result = classifyComponent(comp);
    expect(result.executable).toBe('executable');
    expect(result.archive).toBe('archive');
    expect(result.structured).toBe('structured');
  });

  it('should handle missing name/purl/type gracefully', () => {
    const comp = {};
    const result = classifyComponent(comp);
    expect(result.executable).toBe('executable'); // Defaults to library type which is executable
    expect(result.archive).toBe('no archive');
    expect(result.structured).toBe('unstructured');
  });
});

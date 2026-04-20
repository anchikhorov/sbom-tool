import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { prepareIsolation, cleanupIsolation, detectProjectType } from '../../src/utils/isolation.js';

describe('Environment Isolation Logic', () => {
  const testProjectDir = join(tmpdir(), 'test-project-isolation');

  beforeEach(() => {
    if (existsSync(testProjectDir)) {
      rmSync(testProjectDir, { recursive: true, force: true });
    }
    mkdirSync(testProjectDir);
  });

  afterEach(() => {
    if (existsSync(testProjectDir)) {
      rmSync(testProjectDir, { recursive: true, force: true });
    }
  });

  it('should detect npm project type', () => {
    writeFileSync(join(testProjectDir, 'package.json'), '{}');
    expect(detectProjectType(testProjectDir)).toBe('npm');
  });

  it('should detect maven project type', () => {
    writeFileSync(join(testProjectDir, 'pom.xml'), '<xml></xml>');
    expect(detectProjectType(testProjectDir)).toBe('maven');
  });

  it('should detect python project type', () => {
    writeFileSync(join(testProjectDir, 'requirements.txt'), '');
    expect(detectProjectType(testProjectDir)).toBe('python');
  });

  it('should isolate npm project by copying only manifests', () => {
    writeFileSync(join(testProjectDir, 'package.json'), '{}');
    writeFileSync(join(testProjectDir, 'README.md'), '# readme');
    
    const { isolatedPath, projectType } = prepareIsolation(testProjectDir);
    
    expect(projectType).toBe('npm');
    expect(existsSync(join(isolatedPath, 'package.json'))).toBe(true);
    expect(existsSync(join(isolatedPath, 'README.md'))).toBe(false);
    
    cleanupIsolation(isolatedPath);
    expect(existsSync(isolatedPath)).toBe(false);
  });

  it('should isolate maven project by copying only manifests', () => {
    writeFileSync(join(testProjectDir, 'pom.xml'), '<xml></xml>');
    const javaDir = join(testProjectDir, 'src/main/java');
    mkdirSync(javaDir, { recursive: true });
    writeFileSync(join(javaDir, 'App.java'), 'class App {}');
    
    const { isolatedPath, projectType } = prepareIsolation(testProjectDir);
    
    expect(projectType).toBe('maven');
    expect(existsSync(join(isolatedPath, 'pom.xml'))).toBe(true);
    expect(existsSync(join(isolatedPath, 'src/main/java/App.java'))).toBe(false);
    
    cleanupIsolation(isolatedPath);
  });

  it('should isolate python project by copying only manifests', () => {
    writeFileSync(join(testProjectDir, 'requirements.txt'), 'lodash');
    writeFileSync(join(testProjectDir, 'app.py'), 'print("hello")');
    
    const { isolatedPath, projectType } = prepareIsolation(testProjectDir);
    
    expect(projectType).toBe('python');
    expect(existsSync(join(isolatedPath, 'requirements.txt'))).toBe(true);
    expect(existsSync(join(isolatedPath, 'app.py'))).toBe(false);
    
    cleanupIsolation(isolatedPath);
  });

  it('should fallback to exclusion filter for unknown types', () => {
    writeFileSync(join(testProjectDir, 'other.txt'), 'content');
    mkdirSync(join(testProjectDir, 'node_modules'));
    writeFileSync(join(testProjectDir, 'node_modules/dep.js'), '');
    
    const { isolatedPath, projectType } = prepareIsolation(testProjectDir);
    
    expect(projectType).toBe(null);
    expect(existsSync(join(isolatedPath, 'other.txt'))).toBe(true);
    expect(existsSync(join(isolatedPath, 'node_modules'))).toBe(false);
    
    cleanupIsolation(isolatedPath);
  });
});

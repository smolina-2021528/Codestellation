import { describe, expect, it } from 'vitest';
import {
  createFixtureFile,
  createFixtureTree,
  createRepositoryFixture,
  normalizeFixturePath
} from '../src/index';

describe('testing fixtures utilities', () => {
  it('normalizes fixture paths to portable relative paths', () => {
    expect(normalizeFixturePath('src\\feature\\index.ts')).toBe('src/feature/index.ts');
    expect(normalizeFixturePath('./src//index.ts')).toBe('src/index.ts');
  });

  it('rejects unsafe fixture paths', () => {
    expect(() => normalizeFixturePath('../secrets.ts')).toThrow('must not escape');
    expect(() => normalizeFixturePath('/tmp/source.ts')).toThrow('must be relative');
    expect(() => normalizeFixturePath('')).toThrow('must not be empty');
  });

  it('creates deterministic fixture trees', () => {
    const tree = createFixtureTree([
      createFixtureFile('src/b.ts', 'export const b = 1;'),
      createFixtureFile('README.md', '# Fixture'),
      createFixtureFile('src/a.ts', 'export const a = 1;')
    ]);

    expect(tree.files.map((file) => file.path)).toEqual([
      'README.md',
      'src/a.ts',
      'src/b.ts'
    ]);
    expect(tree.directories).toEqual(['src']);
  });

  it('creates named repository fixtures', () => {
    const fixture = createRepositoryFixture({
      name: 'tiny-typescript-project',
      files: [createFixtureFile('package.json', '{"type":"module"}')]
    });

    expect(fixture.name).toBe('tiny-typescript-project');
    expect(fixture.tree.files).toHaveLength(1);
  });
});

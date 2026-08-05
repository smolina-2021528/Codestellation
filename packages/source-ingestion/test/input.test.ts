import { describe, expect, it } from 'vitest';

import {
  SOURCE_INPUT_SCHEMA_VERSION,
  assertSourceInput,
  defaultSourceInputOptions,
  isGitReference,
  isGitRepositoryUrl,
  isLocalSourcePath,
  isSourceGlobPattern,
  isSourceInput,
  isSourceInputKind,
  isSourceInputValidationIssueCode,
  isSourceInputValidationSeverity,
  parseGitReference,
  parseGitRepositoryUrl,
  parseLocalSourcePath,
  parseSourceGlobPattern,
  toSerializableSourceInput,
  validateGitReference,
  validateGitRepositoryUrl,
  validateLocalSourcePath,
  validateSourceGlobPattern,
  validateSourceInput,
  type GitRepositorySourceInput,
  type LocalFolderSourceInput,
  type SourceInputSourceId,
  type ZipArchiveSourceInput
} from '../src/index.js';

describe('source input contracts', () => {
  it('defines explicit source input kinds for MVP 1', () => {
    expect(isSourceInputKind('local-folder')).toBe(true);
    expect(isSourceInputKind('zip-archive')).toBe(true);
    expect(isSourceInputKind('git-repository')).toBe(true);
    expect(isSourceInputKind('remote-api')).toBe(false);
  });

  it('normalizes local folder inputs without touching the filesystem', () => {
    const input: LocalFolderSourceInput = {
      schemaVersion: SOURCE_INPUT_SCHEMA_VERSION,
      kind: 'local-folder',
      sourceId: 'source:codestellation-local' as SourceInputSourceId,
      displayName: '  Codestellation Local  ',
      path: parseLocalSourcePath('C:\\Codestellation'),
      options: {
        scan: {
          include: [parseSourceGlobPattern('packages/**/*.ts')],
          exclude: [parseSourceGlobPattern('node_modules/**')],
          maxFiles: 1000
        }
      }
    };

    const serializable = toSerializableSourceInput(input) as LocalFolderSourceInput;

    expect(serializable).toMatchObject({
      schemaVersion: SOURCE_INPUT_SCHEMA_VERSION,
      kind: 'local-folder',
      sourceId: 'source:codestellation-local',
      displayName: 'Codestellation Local',
      path: 'C:/Codestellation'
    });
    expect(serializable.options?.safety).toEqual({
      followSymlinks: false,
      executeRepositoryCode: false,
      includeGitHistory: 'metadata-only'
    });
    expect(serializable.options?.scan?.include).toEqual(['packages/**/*.ts']);
    expect(serializable.options?.scan?.maxFileSizeBytes).toBe(104857600);
    expect(isSourceInput(serializable)).toBe(true);
    expect(() => assertSourceInput(serializable)).not.toThrow();
  });

  it('models zip archive inputs with optional archive entry roots', () => {
    const input: ZipArchiveSourceInput = {
      schemaVersion: SOURCE_INPUT_SCHEMA_VERSION,
      kind: 'zip-archive',
      archivePath: parseLocalSourcePath('/tmp/codestellation-demo.zip'),
      entryRoot: parseSourceGlobPattern('demo-project')
    };

    expect(toSerializableSourceInput(input)).toMatchObject({
      schemaVersion: SOURCE_INPUT_SCHEMA_VERSION,
      kind: 'zip-archive',
      archivePath: '/tmp/codestellation-demo.zip',
      entryRoot: 'demo-project'
    });
  });

  it('models public HTTPS Git repository inputs without embedded credentials', () => {
    const input: GitRepositorySourceInput = {
      schemaVersion: SOURCE_INPUT_SCHEMA_VERSION,
      kind: 'git-repository',
      repositoryUrl: parseGitRepositoryUrl('https://github.com/example/codestellation.git'),
      ref: parseGitReference('main'),
      depth: 1,
      options: {
        safety: {
          includeGitHistory: 'metadata-only'
        }
      }
    };

    expect(toSerializableSourceInput(input)).toMatchObject({
      schemaVersion: SOURCE_INPUT_SCHEMA_VERSION,
      kind: 'git-repository',
      repositoryUrl: 'https://github.com/example/codestellation.git',
      ref: 'main',
      depth: 1
    });
  });

  it('rejects unsafe local paths and repository-relative glob traversal', () => {
    expect(validateLocalSourcePath('../secret')).toBe(false);
    expect(validateLocalSourcePath('file:///tmp/project')).toBe(false);
    expect(validateLocalSourcePath('C:/')).toBe(false);
    expect(validateSourceGlobPattern('../**/*')).toBe(false);
    expect(validateSourceGlobPattern('/absolute/**')).toBe(false);
    expect(parseLocalSourcePath('./src/project')).toBe('src/project');
    expect(parseLocalSourcePath('.')).toBe('.');
    expect(isLocalSourcePath('src/project')).toBe(true);
    expect(isSourceGlobPattern('src/**/*.ts')).toBe(true);
  });

  it('rejects private-looking or credentialed Git repository URLs', () => {
    expect(validateGitRepositoryUrl('https://user:token@github.com/org/repo.git')).toBe(false);
    expect(validateGitRepositoryUrl('http://github.com/org/repo.git')).toBe(false);
    expect(validateGitRepositoryUrl('https://localhost/org/repo.git')).toBe(false);
    expect(validateGitRepositoryUrl('https://github.com/org/repo.git?token=secret')).toBe(false);
    expect(isGitRepositoryUrl('https://github.com/org/repo.git')).toBe(true);
  });

  it('rejects ambiguous Git refs and accepts simple branch tag or revision labels', () => {
    expect(validateGitReference('../main')).toBe(false);
    expect(validateGitReference('feature//demo')).toBe(false);
    expect(validateGitReference('release/v1.0.0')).toBe(true);
    expect(isGitReference('a1b2c3d4')).toBe(true);
  });

  it('keeps default safety options local-first and non-executable', () => {
    expect(defaultSourceInputOptions()).toEqual({
      safety: {
        followSymlinks: false,
        executeRepositoryCode: false,
        includeGitHistory: 'metadata-only'
      },
      scan: {
        include: ['**/*'],
        exclude: [
          '.git/**',
          '.next/**',
          '.turbo/**',
          'coverage/**',
          'dist/**',
          'node_modules/**',
          'out/**'
        ],
        maxFileSizeBytes: 104857600,
        maxFiles: 200000
      }
    });
  });

  it('returns serializable validation issues for invalid payloads', () => {
    const result = validateSourceInput({
      schemaVersion: SOURCE_INPUT_SCHEMA_VERSION,
      kind: 'git-repository',
      repositoryUrl: 'https://user:token@github.com/example/repo.git'
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({
      code: 'SOURCE_INPUT_INVALID_FIELD',
      severity: 'error'
    });
    expect(isSourceInputValidationIssueCode(result.issues[0]?.code)).toBe(true);
    expect(isSourceInputValidationSeverity(result.issues[0]?.severity)).toBe(true);
  });
});

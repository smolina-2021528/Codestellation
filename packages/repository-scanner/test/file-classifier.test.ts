import { describe, expect, it } from 'vitest';

import {
  REPOSITORY_SCAN_SOURCE_INVENTORY_ENTRY_SCHEMA_VERSION,
  REPOSITORY_SCAN_SOURCE_INVENTORY_SCHEMA_VERSION,
  classifyRepositoryScanInventory,
  classifyRepositoryScanInput,
  parseRepositoryScanInventoryPath,
  type RepositoryScanSourceFileKind,
  type RepositoryScanSourceInventory,
  type RepositoryScanSourceInventoryEntry,
  type RepositoryScanSourceInventoryIssue
} from '../src/index.js';

function sourceInventory(
  files: readonly RepositoryScanSourceInventoryEntry[],
  issues: readonly RepositoryScanSourceInventoryIssue[] = []
): RepositoryScanSourceInventory {
  return {
    schemaVersion: REPOSITORY_SCAN_SOURCE_INVENTORY_SCHEMA_VERSION,
    root: {
      kind: 'local-folder',
      requestedPath: 'workspace',
      absolutePath: '/tmp/workspace',
      realPath: '/tmp/workspace',
      directoryName: 'workspace'
    },
    options: {
      scan: {
        include: ['**/*'],
        exclude: ['node_modules/**'],
        maxFiles: 1000,
        maxFileSizeBytes: 1_048_576
      }
    },
    files,
    issues,
    summary: {
      fileCount: files.length,
      totalSizeBytes: files.reduce((sum, file) => sum + file.sizeBytes, 0),
      skippedFileCount: 0,
      skippedDirectoryCount: 0,
      oversizedFileCount: 0,
      symlinkCount: 0
    }
  };
}

function file(
  path: string,
  kind: RepositoryScanSourceFileKind,
  extension?: string
): RepositoryScanSourceInventoryEntry {
  return {
    schemaVersion: REPOSITORY_SCAN_SOURCE_INVENTORY_ENTRY_SCHEMA_VERSION,
    path: parseRepositoryScanInventoryPath(path),
    sizeBytes: 10,
    modifiedAt: '2026-08-05T21:00:00.000Z',
    kind,
    ...(extension === undefined ? {} : { extension })
  };
}

describe('repository file classifier', () => {
  it('classifies inventory files into deterministic candidates and ignored files', () => {
    const result = classifyRepositoryScanInventory(sourceInventory([
      file('README.md', 'documentation', '.md'),
      file('package.json', 'manifest', '.json'),
      file('src/__generated__/schema.ts', 'source', '.ts'),
      file('src/index.test.ts', 'test', '.ts'),
      file('src/index.ts', 'source', '.ts'),
      file('src/styles.min.css', 'asset', '.css'),
      file('vendor/jquery.js', 'source', '.js')
    ]), {
      startedAt: '2026-08-05T21:01:00.000Z',
      completedAt: '2026-08-05T21:01:00.005Z'
    });

    expect(result.status).toBe('completed');
    expect(result.candidateFiles.map((candidate) => candidate.path)).toEqual([
      'package.json',
      'src/index.test.ts',
      'src/index.ts'
    ]);
    expect(result.ignoredFiles.map((ignored) => [ignored.path, ignored.reason])).toEqual([
      ['README.md', 'unsupported-kind'],
      ['src/__generated__/schema.ts', 'generated'],
      ['src/styles.min.css', 'minified'],
      ['vendor/jquery.js', 'vendored']
    ]);
    expect(result.summary).toEqual({
      inventoryFileCount: 7,
      candidateFileCount: 3,
      ignoredFileCount: 4,
      unclassifiedFileCount: 0,
      warningCount: 0,
      errorCount: 0
    });
    expect(result.metadata.durationMs).toBe(5);
  });

  it('uses only inventory metadata to ignore binary and sensitive files', () => {
    const result = classifyRepositoryScanInventory(sourceInventory([
      file('.env.production', 'config'),
      file('public/logo.png', 'asset', '.png'),
      file('src/config.ts', 'config', '.ts')
    ]), {
      startedAt: '2026-08-05T21:02:00.000Z'
    });

    expect(result.status).toBe('completed');
    expect(result.candidateFiles.map((candidate) => candidate.path)).toEqual(['src/config.ts']);
    expect(result.ignoredFiles.map((ignored) => [ignored.path, ignored.reason])).toEqual([
      ['.env.production', 'sensitive'],
      ['public/logo.png', 'binary']
    ]);
  });

  it('marks unknown files as unclassified and returns a partial scan when some files are classified', () => {
    const result = classifyRepositoryScanInput({
      schemaVersion: 1,
      inventory: sourceInventory([
        file('LICENSE', 'unknown'),
        file('src/index.ts', 'source', '.ts')
      ])
    }, {
      startedAt: '2026-08-05T21:03:00.000Z'
    });

    expect(result.status).toBe('partial');
    expect(result.candidateFiles.map((candidate) => candidate.path)).toEqual(['src/index.ts']);
    expect(result.summary.unclassifiedFileCount).toBe(1);
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: 'REPOSITORY_SCAN_UNKNOWN_FILE_KIND',
        path: 'LICENSE'
      })
    ]);
  });

  it('fails safely when no inventory file can be classified', () => {
    const result = classifyRepositoryScanInventory(sourceInventory([
      file('UNRECOGNIZED', 'unknown')
    ]), {
      startedAt: '2026-08-05T21:04:00.000Z'
    });

    expect(result.status).toBe('failed');
    expect(result.summary).toMatchObject({
      candidateFileCount: 0,
      ignoredFileCount: 0,
      unclassifiedFileCount: 1,
      errorCount: 1
    });
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: 'REPOSITORY_SCAN_NO_CLASSIFIABLE_FILES',
        retryable: false
      })
    ]);
  });

  it('preserves source inventory warnings as repository scan warnings', () => {
    const result = classifyRepositoryScanInventory(sourceInventory([
      file('src/index.ts', 'source', '.ts')
    ], [
      {
        code: 'SOURCE_FILE_INVENTORY_SYMLINK_SKIPPED',
        severity: 'warning',
        message: 'Source inventory does not follow symbolic links in MVP 1.',
        path: parseRepositoryScanInventoryPath('linked-external')
      }
    ]), {
      startedAt: '2026-08-05T21:05:00.000Z'
    });

    expect(result.status).toBe('completed');
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: 'REPOSITORY_SCAN_SOURCE_INVENTORY_WARNING',
        message: 'Source inventory warning preserved: Source inventory does not follow symbolic links in MVP 1.'
      })
    ]);
  });
});

import { describe, expect, it } from 'vitest';

import {
  REPOSITORY_SCAN_FILE_REFERENCE_SCHEMA_VERSION,
  REPOSITORY_SCAN_INPUT_SCHEMA_VERSION,
  REPOSITORY_SCAN_RESULT_SCHEMA_VERSION,
  REPOSITORY_SCAN_SOURCE_INVENTORY_ENTRY_SCHEMA_VERSION,
  REPOSITORY_SCAN_SOURCE_INVENTORY_SCHEMA_VERSION,
  assertRepositoryScanInput,
  assertRepositoryScanResult,
  isRepositoryScanIgnoredFileReason,
  isRepositoryScanInput,
  isRepositoryScanInventoryPath,
  isRepositoryScanIssueCode,
  isRepositoryScanResult,
  isRepositoryScanStatus,
  parseRepositoryScanInventoryPath,
  parseRepositoryScanIssueCode,
  toSerializableRepositoryScanInput,
  toSerializableRepositoryScanResult,
  type RepositoryScanResult,
  type RepositoryScanSourceInventory
} from '../src/index.js';

function sourceInventory(): RepositoryScanSourceInventory {
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
    files: [
      {
        schemaVersion: REPOSITORY_SCAN_SOURCE_INVENTORY_ENTRY_SCHEMA_VERSION,
        path: parseRepositoryScanInventoryPath('README.md'),
        sizeBytes: 20,
        modifiedAt: '2026-08-05T20:00:00.000Z',
        extension: '.md',
        kind: 'documentation'
      },
      {
        schemaVersion: REPOSITORY_SCAN_SOURCE_INVENTORY_ENTRY_SCHEMA_VERSION,
        path: parseRepositoryScanInventoryPath('src/index.ts'),
        sizeBytes: 40,
        modifiedAt: '2026-08-05T20:01:00.000Z',
        extension: '.ts',
        kind: 'source'
      }
    ],
    issues: [],
    summary: {
      fileCount: 2,
      totalSizeBytes: 60,
      skippedFileCount: 0,
      skippedDirectoryCount: 0,
      oversizedFileCount: 0,
      symlinkCount: 0
    }
  };
}

function completedResult(): RepositoryScanResult {
  return {
    schemaVersion: REPOSITORY_SCAN_RESULT_SCHEMA_VERSION,
    status: 'completed',
    inventory: sourceInventory(),
    candidateFiles: [
      {
        schemaVersion: REPOSITORY_SCAN_FILE_REFERENCE_SCHEMA_VERSION,
        path: parseRepositoryScanInventoryPath('src/index.ts')
      }
    ],
    ignoredFiles: [
      {
        schemaVersion: REPOSITORY_SCAN_FILE_REFERENCE_SCHEMA_VERSION,
        path: parseRepositoryScanInventoryPath('README.md'),
        reason: 'policy',
        message: 'Documentation is not selected for source analysis.'
      }
    ],
    warnings: [
      {
        code: parseRepositoryScanIssueCode('REPOSITORY_SCAN_DOCUMENTATION_IGNORED'),
        message: 'Documentation remains visible but is not a parser candidate.',
        path: parseRepositoryScanInventoryPath('README.md')
      }
    ],
    errors: [],
    metadata: {
      startedAt: '2026-08-05T20:02:00.000Z',
      completedAt: '2026-08-05T20:02:00.025Z',
      durationMs: 25
    },
    summary: {
      inventoryFileCount: 2,
      candidateFileCount: 1,
      ignoredFileCount: 1,
      unclassifiedFileCount: 0,
      warningCount: 1,
      errorCount: 0
    }
  };
}

describe('repository scan result contracts', () => {
  it('serializes a scan input without changing the normalized inventory contract', () => {
    const input = {
      schemaVersion: REPOSITORY_SCAN_INPUT_SCHEMA_VERSION,
      inventory: sourceInventory()
    } as const;

    expect(toSerializableRepositoryScanInput(input)).toEqual(input);
    expect(isRepositoryScanInput(input)).toBe(true);
    expect(() => assertRepositoryScanInput(input)).not.toThrow();
  });

  it('serializes deterministic candidate, ignored and issue collections', () => {
    const result = completedResult();
    const serializable = toSerializableRepositoryScanResult({
      ...result,
      candidateFiles: [...result.candidateFiles].reverse(),
      ignoredFiles: [...result.ignoredFiles].reverse()
    });

    expect(serializable.schemaVersion).toBe(REPOSITORY_SCAN_RESULT_SCHEMA_VERSION);
    expect(serializable.status).toBe('completed');
    expect(serializable.candidateFiles.map((file) => file.path)).toEqual(['src/index.ts']);
    expect(serializable.ignoredFiles.map((file) => file.path)).toEqual(['README.md']);
    expect(serializable.warnings).toEqual([
      expect.objectContaining({
        code: 'REPOSITORY_SCAN_DOCUMENTATION_IGNORED',
        path: 'README.md'
      })
    ]);
    expect(serializable.summary).toEqual({
      inventoryFileCount: 2,
      candidateFileCount: 1,
      ignoredFileCount: 1,
      unclassifiedFileCount: 0,
      warningCount: 1,
      errorCount: 0
    });
    expect(isRepositoryScanResult(serializable)).toBe(true);
    expect(() => assertRepositoryScanResult(serializable)).not.toThrow();
  });

  it('exposes stable path, status, ignored reason and issue code guards', () => {
    expect(isRepositoryScanInventoryPath('src/index.ts')).toBe(true);
    expect(isRepositoryScanInventoryPath('../src/index.ts')).toBe(false);
    expect(isRepositoryScanStatus('partial')).toBe(true);
    expect(isRepositoryScanStatus('running')).toBe(false);
    expect(isRepositoryScanIgnoredFileReason('generated')).toBe(true);
    expect(isRepositoryScanIgnoredFileReason('excluded')).toBe(false);
    expect(isRepositoryScanIssueCode('REPOSITORY_SCAN_UNKNOWN_FILE_KIND')).toBe(true);
    expect(isRepositoryScanIssueCode('SOURCE_SCAN_UNKNOWN_FILE_KIND')).toBe(false);
    expect(() => parseRepositoryScanIssueCode(' repository_scan_invalid ')).toThrow(RangeError);
  });

  it('rejects duplicate paths, disposition conflicts and paths outside the inventory', () => {
    const result = completedResult();
    const candidate = result.candidateFiles[0];

    expect(candidate).toBeDefined();

    expect(() => toSerializableRepositoryScanResult({
      ...result,
      candidateFiles: [candidate!, candidate!],
      summary: {
        ...result.summary,
        candidateFileCount: 2,
        unclassifiedFileCount: -1
      }
    })).toThrow(RangeError);

    expect(() => toSerializableRepositoryScanResult({
      ...result,
      ignoredFiles: [
        ...result.ignoredFiles,
        {
          schemaVersion: REPOSITORY_SCAN_FILE_REFERENCE_SCHEMA_VERSION,
          path: parseRepositoryScanInventoryPath('src/index.ts'),
          reason: 'policy',
          message: 'Conflicting disposition.'
        }
      ],
      summary: {
        ...result.summary,
        ignoredFileCount: 2
      }
    })).toThrow(/both candidate and ignored/);

    expect(() => toSerializableRepositoryScanResult({
      ...result,
      candidateFiles: [
        {
          schemaVersion: REPOSITORY_SCAN_FILE_REFERENCE_SCHEMA_VERSION,
          path: parseRepositoryScanInventoryPath('src/missing.ts')
        }
      ]
    })).toThrow(/source inventory/);
  });

  it('rejects inconsistent source inventory summaries', () => {
    const inventory = sourceInventory();

    expect(() => toSerializableRepositoryScanInput({
      schemaVersion: REPOSITORY_SCAN_INPUT_SCHEMA_VERSION,
      inventory: {
        ...inventory,
        summary: {
          ...inventory.summary,
          totalSizeBytes: 99
        }
      }
    })).toThrow(/totalSizeBytes/);
  });

  it('rejects inconsistent summaries and status semantics', () => {
    const result = completedResult();

    expect(() => toSerializableRepositoryScanResult({
      ...result,
      summary: {
        ...result.summary,
        candidateFileCount: 2
      }
    })).toThrow(/candidateFileCount/);

    expect(() => toSerializableRepositoryScanResult({
      ...result,
      status: 'completed',
      errors: [
        {
          code: parseRepositoryScanIssueCode('REPOSITORY_SCAN_CLASSIFICATION_FAILED'),
          message: 'Classification failed.',
          retryable: false,
          path: parseRepositoryScanInventoryPath('src/index.ts')
        }
      ],
      summary: {
        ...result.summary,
        errorCount: 1
      }
    })).toThrow(/Completed repository scans/);

    expect(() => toSerializableRepositoryScanResult({
      ...result,
      status: 'failed',
      errors: [],
      candidateFiles: [],
      ignoredFiles: [],
      summary: {
        inventoryFileCount: 2,
        candidateFileCount: 0,
        ignoredFileCount: 0,
        unclassifiedFileCount: 2,
        warningCount: 1,
        errorCount: 0
      }
    })).toThrow(/at least one error/);
  });
});

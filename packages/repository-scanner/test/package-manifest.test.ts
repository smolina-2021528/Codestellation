import { describe, expect, it } from 'vitest';

import {
  REPOSITORY_PACKAGE_MANIFEST_DETECTION_RESULT_SCHEMA_VERSION,
  REPOSITORY_PACKAGE_MANIFEST_SCHEMA_VERSION,
  REPOSITORY_SCAN_SOURCE_INVENTORY_ENTRY_SCHEMA_VERSION,
  REPOSITORY_SCAN_SOURCE_INVENTORY_SCHEMA_VERSION,
  assertRepositoryPackageManifestDetectionResult,
  classifyRepositoryScanInventory,
  detectPackageManifestsFromScanResult,
  isRepositoryPackageManifestDetectionResult,
  parseRepositoryScanInventoryPath,
  toSerializableRepositoryPackageManifestDetectionResult,
  type RepositoryPackageManifestDetectionResult,
  type RepositoryScanSourceFileKind,
  type RepositoryScanSourceInventory,
  type RepositoryScanSourceInventoryEntry
} from '../src/index.js';

function sourceInventory(
  files: readonly RepositoryScanSourceInventoryEntry[]
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
    issues: [],
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
    modifiedAt: '2026-08-05T21:30:00.000Z',
    kind,
    ...(extension === undefined ? {} : { extension })
  };
}

function detectionResult(): RepositoryPackageManifestDetectionResult {
  const sourceScan = classifyRepositoryScanInventory(sourceInventory([
    file('README.md', 'documentation', '.md'),
    file('package.json', 'manifest', '.json'),
    file('packages/api/package.json', 'manifest', '.json'),
    file('pnpm-workspace.yaml', 'manifest', '.yaml'),
    file('src/index.ts', 'source', '.ts')
  ]), {
    startedAt: '2026-08-05T21:31:00.000Z',
    completedAt: '2026-08-05T21:31:00.001Z'
  });

  return detectPackageManifestsFromScanResult(sourceScan);
}

describe('repository package manifest detection', () => {
  it('detects root and nested Node package manifests from classified candidates', () => {
    const result = detectionResult();

    expect(result.schemaVersion).toBe(REPOSITORY_PACKAGE_MANIFEST_DETECTION_RESULT_SCHEMA_VERSION);
    expect(result.status).toBe('completed');
    expect(result.packageManifests).toEqual([
      {
        schemaVersion: REPOSITORY_PACKAGE_MANIFEST_SCHEMA_VERSION,
        path: 'package.json',
        ecosystem: 'node',
        manifestName: 'package.json',
        detectionMethod: 'metadata-path'
      },
      {
        schemaVersion: REPOSITORY_PACKAGE_MANIFEST_SCHEMA_VERSION,
        path: 'packages/api/package.json',
        ecosystem: 'node',
        manifestName: 'package.json',
        detectionMethod: 'metadata-path',
        packageRootPath: 'packages/api'
      }
    ]);
    expect(result.summary).toEqual({
      sourceCandidateFileCount: 4,
      sourceManifestCandidateFileCount: 3,
      packageManifestCount: 2,
      unsupportedManifestCandidateCount: 1,
      warningCount: 1,
      errorCount: 0
    });
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: 'REPOSITORY_SCAN_UNSUPPORTED_PACKAGE_MANIFEST',
        path: 'pnpm-workspace.yaml'
      })
    ]);
  });

  it('only inspects classified candidate files and ignores vendored package manifests', () => {
    const sourceScan = classifyRepositoryScanInventory(sourceInventory([
      file('node_modules/example/package.json', 'manifest', '.json'),
      file('src/index.ts', 'source', '.ts')
    ]), {
      startedAt: '2026-08-05T21:32:00.000Z'
    });
    const result = detectPackageManifestsFromScanResult(sourceScan);

    expect(sourceScan.ignoredFiles.map((ignored) => [ignored.path, ignored.reason])).toEqual([
      ['node_modules/example/package.json', 'vendored']
    ]);
    expect(result.status).toBe('completed');
    expect(result.packageManifests).toEqual([]);
    expect(result.summary).toEqual({
      sourceCandidateFileCount: 1,
      sourceManifestCandidateFileCount: 0,
      packageManifestCount: 0,
      unsupportedManifestCandidateCount: 0,
      warningCount: 0,
      errorCount: 0
    });
  });

  it('returns a partial detection result when the source scan was partial', () => {
    const sourceScan = classifyRepositoryScanInventory(sourceInventory([
      file('LICENSE', 'unknown'),
      file('package.json', 'manifest', '.json')
    ]), {
      startedAt: '2026-08-05T21:33:00.000Z'
    });
    const result = detectPackageManifestsFromScanResult(sourceScan);

    expect(sourceScan.status).toBe('partial');
    expect(result.status).toBe('partial');
    expect(result.packageManifests.map((manifest) => manifest.path)).toEqual(['package.json']);
    expect(result.summary).toMatchObject({
      sourceCandidateFileCount: 1,
      packageManifestCount: 1,
      errorCount: 0
    });
  });

  it('fails safely when package manifest detection receives a failed source scan', () => {
    const sourceScan = classifyRepositoryScanInventory(sourceInventory([
      file('UNRECOGNIZED', 'unknown')
    ]), {
      startedAt: '2026-08-05T21:34:00.000Z'
    });
    const result = detectPackageManifestsFromScanResult(sourceScan);

    expect(sourceScan.status).toBe('failed');
    expect(result.status).toBe('failed');
    expect(result.packageManifests).toEqual([]);
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: 'REPOSITORY_SCAN_PACKAGE_MANIFEST_DETECTION_SKIPPED',
        retryable: false
      })
    ]);
  });

  it('serializes deterministic detection results and exposes guards', () => {
    const result = detectionResult();
    const serializable = toSerializableRepositoryPackageManifestDetectionResult({
      ...result,
      packageManifests: [...result.packageManifests].reverse()
    });

    expect(serializable.packageManifests.map((manifest) => manifest.path)).toEqual([
      'package.json',
      'packages/api/package.json'
    ]);
    expect(isRepositoryPackageManifestDetectionResult(serializable)).toBe(true);
    expect(() => assertRepositoryPackageManifestDetectionResult(serializable)).not.toThrow();
  });

  it('rejects package manifests outside source scan candidates', () => {
    const sourceScan = classifyRepositoryScanInventory(sourceInventory([
      file('package.json', 'manifest', '.json'),
      file('src/index.ts', 'source', '.ts')
    ]), {
      startedAt: '2026-08-05T21:35:00.000Z'
    });
    const result = detectPackageManifestsFromScanResult(sourceScan);

    expect(() => toSerializableRepositoryPackageManifestDetectionResult({
      ...result,
      packageManifests: [
        {
          schemaVersion: REPOSITORY_PACKAGE_MANIFEST_SCHEMA_VERSION,
          path: parseRepositoryScanInventoryPath('src/index.ts'),
          ecosystem: 'node',
          manifestName: 'package.json',
          detectionMethod: 'metadata-path'
        }
      ],
      summary: {
        ...result.summary,
        packageManifestCount: 1,
        unsupportedManifestCandidateCount: 0
      }
    })).toThrow(/not a supported package manifest/);
  });
});

import { describe, expect, it } from 'vitest';

import {
  REPOSITORY_SCAN_SOURCE_INVENTORY_ENTRY_SCHEMA_VERSION,
  REPOSITORY_SCAN_SOURCE_INVENTORY_SCHEMA_VERSION,
  REPOSITORY_STRUCTURE_DIRECTORY_SUMMARY_SCHEMA_VERSION,
  REPOSITORY_STRUCTURE_PACKAGE_ROOT_SUMMARY_SCHEMA_VERSION,
  REPOSITORY_STRUCTURE_REPOSITORY_SUMMARY_SCHEMA_VERSION,
  REPOSITORY_STRUCTURE_SUMMARY_RESULT_SCHEMA_VERSION,
  assertRepositoryStructureSummaryResult,
  classifyRepositoryScanInventory,
  deriveRepositoryStructureFromPackageManifestDetection,
  detectPackageManifestsFromScanResult,
  isRepositoryStructureSummaryResult,
  parseRepositoryScanInventoryPath,
  toSerializableRepositoryStructureSummaryResult,
  type RepositoryPackageManifestDetectionResult,
  type RepositoryScanSourceFileKind,
  type RepositoryScanSourceInventory,
  type RepositoryScanSourceInventoryEntry,
  type RepositoryStructureSummaryResult
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
  extension?: string,
  sizeBytes = 10
): RepositoryScanSourceInventoryEntry {
  return {
    schemaVersion: REPOSITORY_SCAN_SOURCE_INVENTORY_ENTRY_SCHEMA_VERSION,
    path: parseRepositoryScanInventoryPath(path),
    sizeBytes,
    modifiedAt: '2026-08-05T21:45:00.000Z',
    kind,
    ...(extension === undefined ? {} : { extension })
  };
}

function manifestDetection(
  files: readonly RepositoryScanSourceInventoryEntry[]
): RepositoryPackageManifestDetectionResult {
  const sourceScan = classifyRepositoryScanInventory(sourceInventory(files), {
    startedAt: '2026-08-05T21:46:00.000Z',
    completedAt: '2026-08-05T21:46:00.002Z'
  });

  return detectPackageManifestsFromScanResult(sourceScan);
}

function structureResult(): RepositoryStructureSummaryResult {
  return deriveRepositoryStructureFromPackageManifestDetection(manifestDetection([
    file('package.json', 'manifest', '.json', 20),
    file('README.md', 'documentation', '.md', 30),
    file('.github/workflows/ci.yml', 'config', '.yml', 40),
    file('apps/api/package.json', 'manifest', '.json', 50),
    file('apps/api/src/index.ts', 'source', '.ts', 60),
    file('apps/api/src/index.test.ts', 'test', '.ts', 70),
    file('docs/guide.md', 'documentation', '.md', 80),
    file('packages/core/package.json', 'manifest', '.json', 90),
    file('packages/core/src/index.ts', 'source', '.ts', 100),
    file('public/logo.png', 'asset', '.png', 110),
    file('src/root.ts', 'source', '.ts', 120)
  ]));
}

describe('repository structure summary', () => {
  it('derives deterministic repository, directory and package summaries from metadata only', () => {
    const result = structureResult();

    expect(result.schemaVersion).toBe(REPOSITORY_STRUCTURE_SUMMARY_RESULT_SCHEMA_VERSION);
    expect(result.status).toBe('completed');
    expect(result.repository).toEqual({
      schemaVersion: REPOSITORY_STRUCTURE_REPOSITORY_SUMMARY_SCHEMA_VERSION,
      rootFileCount: 2,
      topLevelDirectoryCount: 6,
      maxDirectoryDepth: 3,
      totalSizeBytes: 770
    });
    expect(result.topLevelDirectories).toEqual([
      {
        schemaVersion: REPOSITORY_STRUCTURE_DIRECTORY_SUMMARY_SCHEMA_VERSION,
        path: '.github',
        depth: 1,
        fileCount: 1,
        candidateFileCount: 1,
        ignoredFileCount: 0,
        manifestFileCount: 0,
        packageRootCount: 0,
        totalSizeBytes: 40,
        roles: ['configuration']
      },
      {
        schemaVersion: REPOSITORY_STRUCTURE_DIRECTORY_SUMMARY_SCHEMA_VERSION,
        path: 'apps',
        depth: 1,
        fileCount: 3,
        candidateFileCount: 3,
        ignoredFileCount: 0,
        manifestFileCount: 1,
        packageRootCount: 1,
        totalSizeBytes: 180,
        roles: ['package-container', 'source-container', 'test-container', 'configuration']
      },
      {
        schemaVersion: REPOSITORY_STRUCTURE_DIRECTORY_SUMMARY_SCHEMA_VERSION,
        path: 'docs',
        depth: 1,
        fileCount: 1,
        candidateFileCount: 0,
        ignoredFileCount: 1,
        manifestFileCount: 0,
        packageRootCount: 0,
        totalSizeBytes: 80,
        roles: ['documentation']
      },
      {
        schemaVersion: REPOSITORY_STRUCTURE_DIRECTORY_SUMMARY_SCHEMA_VERSION,
        path: 'packages',
        depth: 1,
        fileCount: 2,
        candidateFileCount: 2,
        ignoredFileCount: 0,
        manifestFileCount: 1,
        packageRootCount: 1,
        totalSizeBytes: 190,
        roles: ['package-container', 'source-container', 'configuration']
      },
      {
        schemaVersion: REPOSITORY_STRUCTURE_DIRECTORY_SUMMARY_SCHEMA_VERSION,
        path: 'public',
        depth: 1,
        fileCount: 1,
        candidateFileCount: 0,
        ignoredFileCount: 1,
        manifestFileCount: 0,
        packageRootCount: 0,
        totalSizeBytes: 110,
        roles: ['asset']
      },
      {
        schemaVersion: REPOSITORY_STRUCTURE_DIRECTORY_SUMMARY_SCHEMA_VERSION,
        path: 'src',
        depth: 1,
        fileCount: 1,
        candidateFileCount: 1,
        ignoredFileCount: 0,
        manifestFileCount: 0,
        packageRootCount: 0,
        totalSizeBytes: 120,
        roles: ['source-container']
      }
    ]);
    expect(result.packageRoots).toEqual([
      expect.objectContaining({
        schemaVersion: REPOSITORY_STRUCTURE_PACKAGE_ROOT_SUMMARY_SCHEMA_VERSION,
        kind: 'root',
        manifestPath: 'package.json',
        fileCount: 11,
        candidateFileCount: 8,
        ignoredFileCount: 3,
        sourceFileCount: 3,
        testFileCount: 1,
        manifestFileCount: 3,
        totalSizeBytes: 770
      }),
      expect.objectContaining({
        schemaVersion: REPOSITORY_STRUCTURE_PACKAGE_ROOT_SUMMARY_SCHEMA_VERSION,
        kind: 'nested',
        manifestPath: 'apps/api/package.json',
        packageRootPath: 'apps/api',
        fileCount: 3,
        candidateFileCount: 3,
        sourceFileCount: 1,
        testFileCount: 1,
        manifestFileCount: 1,
        totalSizeBytes: 180
      }),
      expect.objectContaining({
        schemaVersion: REPOSITORY_STRUCTURE_PACKAGE_ROOT_SUMMARY_SCHEMA_VERSION,
        kind: 'nested',
        manifestPath: 'packages/core/package.json',
        packageRootPath: 'packages/core',
        fileCount: 2,
        candidateFileCount: 2,
        sourceFileCount: 1,
        manifestFileCount: 1,
        totalSizeBytes: 190
      })
    ]);
    expect(result.summary).toEqual({
      inventoryFileCount: 11,
      candidateFileCount: 8,
      ignoredFileCount: 3,
      unclassifiedFileCount: 0,
      packageRootCount: 3,
      rootPackageCount: 1,
      nestedPackageCount: 2,
      topLevelDirectoryCount: 6,
      sourceFileCount: 3,
      testFileCount: 1,
      configFileCount: 1,
      manifestFileCount: 3,
      documentationFileCount: 2,
      assetFileCount: 1,
      unknownFileCount: 0,
      totalSizeBytes: 770,
      maxDirectoryDepth: 3,
      warningCount: 0,
      errorCount: 0
    });
  });

  it('preserves partial status and source scan warnings in the structure summary', () => {
    const result = deriveRepositoryStructureFromPackageManifestDetection(manifestDetection([
      file('LICENSE', 'unknown'),
      file('package.json', 'manifest', '.json')
    ]));

    expect(result.status).toBe('partial');
    expect(result.summary).toMatchObject({
      inventoryFileCount: 2,
      packageRootCount: 1,
      unknownFileCount: 1,
      warningCount: 1,
      errorCount: 0
    });
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: 'REPOSITORY_SCAN_UNKNOWN_FILE_KIND',
        path: 'LICENSE'
      })
    ]);
  });

  it('fails safely when package manifest detection failed', () => {
    const result = deriveRepositoryStructureFromPackageManifestDetection(manifestDetection([
      file('UNRECOGNIZED', 'unknown')
    ]));

    expect(result.status).toBe('failed');
    expect(result.repository).toEqual({
      schemaVersion: REPOSITORY_STRUCTURE_REPOSITORY_SUMMARY_SCHEMA_VERSION,
      rootFileCount: 0,
      topLevelDirectoryCount: 0,
      maxDirectoryDepth: 0,
      totalSizeBytes: 0
    });
    expect(result.topLevelDirectories).toEqual([]);
    expect(result.packageRoots).toEqual([]);
    expect(result.summary).toMatchObject({
      inventoryFileCount: 0,
      packageRootCount: 0,
      warningCount: 1,
      errorCount: 3
    });
    expect(result.errors.map((error) => error.code)).toEqual([
      'REPOSITORY_SCAN_NO_CLASSIFIABLE_FILES',
      'REPOSITORY_SCAN_PACKAGE_MANIFEST_DETECTION_SKIPPED',
      'REPOSITORY_SCAN_STRUCTURE_SUMMARY_SKIPPED'
    ]);
  });

  it('serializes deterministic structure summaries and exposes guards', () => {
    const result = structureResult();
    const serializable = toSerializableRepositoryStructureSummaryResult({
      ...result,
      packageRoots: [...result.packageRoots].reverse(),
      topLevelDirectories: [...result.topLevelDirectories].reverse()
    });

    expect(serializable.topLevelDirectories.map((directory) => directory.path)).toEqual([
      '.github',
      'apps',
      'docs',
      'packages',
      'public',
      'src'
    ]);
    expect(serializable.packageRoots.map((packageRoot) => packageRoot.manifestPath)).toEqual([
      'package.json',
      'apps/api/package.json',
      'packages/core/package.json'
    ]);
    expect(isRepositoryStructureSummaryResult(serializable)).toBe(true);
    expect(() => assertRepositoryStructureSummaryResult(serializable)).not.toThrow();
  });

  it('rejects inconsistent derived summary values', () => {
    const result = structureResult();

    expect(() => toSerializableRepositoryStructureSummaryResult({
      ...result,
      summary: {
        ...result.summary,
        packageRootCount: 99
      }
    })).toThrow(/packageRootCount/);

    expect(() => toSerializableRepositoryStructureSummaryResult({
      ...result,
      topLevelDirectories: [
        {
          ...result.topLevelDirectories[0]!,
          fileCount: 99
        },
        ...result.topLevelDirectories.slice(1)
      ]
    })).toThrow(/fileCount/);
  });
});

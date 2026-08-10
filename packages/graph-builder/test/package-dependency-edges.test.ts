import { describe, expect, it } from 'vitest';

import { isCanonicalGraphSnapshot } from '@codestellation/graph-model';
import {
  REPOSITORY_SCAN_INPUT_SCHEMA_VERSION,
  REPOSITORY_SCAN_SOURCE_INVENTORY_ENTRY_SCHEMA_VERSION,
  REPOSITORY_SCAN_SOURCE_INVENTORY_SCHEMA_VERSION,
  classifyRepositoryScanInput,
  deriveRepositoryStructureSummary,
  detectPackageManifests,
  type RepositoryScanInput,
  type RepositoryScanSourceFileKind
} from '@codestellation/repository-scanner';

import {
  assertGraphBuilderPackageDependencyGraphResult,
  buildPackageDependencyGraphFromProjectFileGraph,
  buildProjectFileGraphFromRepositoryStructure,
  isGraphBuilderPackageDependencyGraphResult,
  toSerializableGraphBuilderPackageDependencyGraphResult
} from '../src/index.js';

function scanInput(files: readonly {
  readonly path: string;
  readonly kind: RepositoryScanSourceFileKind;
  readonly sizeBytes?: number;
  readonly extension?: string;
}[]): RepositoryScanInput {
  return {
    schemaVersion: REPOSITORY_SCAN_INPUT_SCHEMA_VERSION,
    inventory: {
      schemaVersion: REPOSITORY_SCAN_SOURCE_INVENTORY_SCHEMA_VERSION,
      root: {
        kind: 'local-folder',
        requestedPath: './sample-project',
        directoryName: 'sample-project'
      },
      options: {
        followSymlinks: false,
        executeRepositoryCode: false,
        gitHistoryMode: 'metadata-only'
      },
      files: files.map((file, index) => ({
        schemaVersion: REPOSITORY_SCAN_SOURCE_INVENTORY_ENTRY_SCHEMA_VERSION,
        path: file.path,
        sizeBytes: file.sizeBytes ?? 100 + index,
        modifiedAt: `2026-08-10T12:00:0${index}.000Z`,
        ...(file.extension === undefined ? {} : { extension: file.extension }),
        kind: file.kind
      })),
      issues: [],
      summary: {
        fileCount: files.length,
        totalSizeBytes: files.reduce((sum, file, index) => sum + (file.sizeBytes ?? 100 + index), 0),
        skippedFileCount: 0,
        skippedDirectoryCount: 0,
        oversizedFileCount: 0,
        symlinkCount: 0
      }
    }
  };
}

function projectFileGraphFromInventory(input: RepositoryScanInput) {
  const scan = classifyRepositoryScanInput(input, {
    startedAt: '2026-08-10T12:00:00.000Z',
    completedAt: '2026-08-10T12:00:01.000Z'
  });
  const manifests = detectPackageManifests(scan);
  const structure = deriveRepositoryStructureSummary(manifests);
  return buildProjectFileGraphFromRepositoryStructure(structure);
}

describe('graph builder package dependency graph', () => {
  it('adds deterministic package nodes and contains edges from detected manifests', () => {
    const projectFileGraph = projectFileGraphFromInventory(scanInput([
      { path: 'package.json', kind: 'manifest', extension: '.json' },
      { path: 'pnpm-lock.yaml', kind: 'config', extension: '.yaml' },
      { path: 'src/index.ts', kind: 'source', extension: '.ts' },
      { path: 'packages/api/package.json', kind: 'manifest', extension: '.json' },
      { path: 'packages/api/src/index.ts', kind: 'source', extension: '.ts' }
    ]));

    const result = buildPackageDependencyGraphFromProjectFileGraph(projectFileGraph);

    expect(result.status).toBe('completed');
    expect(result.packageNodes.map((node) => node.package.manifestPath)).toEqual([
      'package.json',
      'packages/api/package.json'
    ]);
    expect(result.packageNodes.map((node) => node.package.name)).toEqual(['sample-project', 'api']);
    expect(result.packageNodes.map((node) => node.package.manager)).toEqual(['pnpm', 'unknown']);
    expect(result.packageNodes.map((node) => node.id)).toEqual([
      'node:package/root',
      'node:package/packages/api'
    ]);
    expect(result.dependencyEdges).toEqual([]);
    expect(result.summary).toEqual({
      projectNodeCount: 1,
      folderNodeCount: 4,
      fileNodeCount: 5,
      packageNodeCount: 2,
      totalNodeCount: 12,
      containsEdgeCount: 13,
      packageManifestEdgeCount: 2,
      dependencyEdgeCount: 0,
      totalEdgeCount: 13,
      warningCount: 0,
      errorCount: 0
    });
    expect(result.snapshot.nodes).toHaveLength(12);
    expect(result.snapshot.edges).toHaveLength(13);
    expect(isCanonicalGraphSnapshot(result.snapshot)).toBe(true);
    expect(isGraphBuilderPackageDependencyGraphResult(result)).toBe(true);
    expect(() => assertGraphBuilderPackageDependencyGraphResult(result)).not.toThrow();
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it('parents root packages to the project and nested packages to their folder', () => {
    const result = buildPackageDependencyGraphFromProjectFileGraph(projectFileGraphFromInventory(scanInput([
      { path: 'package.json', kind: 'manifest', extension: '.json' },
      { path: 'packages/api/package.json', kind: 'manifest', extension: '.json' }
    ])));
    const rootPackage = result.packageNodes.find((node) => node.package.manifestPath === 'package.json');
    const apiPackage = result.packageNodes.find((node) => node.package.manifestPath === 'packages/api/package.json');
    const apiFolder = result.folderNodes.find((node) => node.folder.path === 'packages/api');

    expect(rootPackage?.parentId).toBe(result.projectNode.id);
    expect(apiPackage?.parentId).toBe(apiFolder?.id);
    expect(result.containsEdges).toContainEqual(expect.objectContaining({
      kind: 'contains',
      fromNodeId: result.projectNode.id,
      toNodeId: rootPackage?.id
    }));
    expect(result.containsEdges).toContainEqual(expect.objectContaining({
      kind: 'contains',
      fromNodeId: apiPackage?.id,
      toNodeId: result.fileNodes.find((node) => node.file.path === 'packages/api/package.json')?.id
    }));
  });

  it('infers package manager from direct package-root lockfiles only', () => {
    const result = buildPackageDependencyGraphFromProjectFileGraph(projectFileGraphFromInventory(scanInput([
      { path: 'package.json', kind: 'manifest', extension: '.json' },
      { path: 'package-lock.json', kind: 'config', extension: '.json' },
      { path: 'packages/app/package.json', kind: 'manifest', extension: '.json' },
      { path: 'packages/app/yarn.lock', kind: 'config', extension: '.lock' }
    ])));

    expect(result.packageNodes.map((node) => [node.package.manifestPath, node.package.manager])).toEqual([
      ['package.json', 'npm'],
      ['packages/app/package.json', 'yarn']
    ]);
  });

  it('serializes and validates package dependency graph results consistently', () => {
    const result = buildPackageDependencyGraphFromProjectFileGraph(projectFileGraphFromInventory(scanInput([
      { path: 'package.json', kind: 'manifest', extension: '.json' }
    ])));
    const serializable = toSerializableGraphBuilderPackageDependencyGraphResult(result);

    expect(serializable).toEqual(result);
    expect(() => toSerializableGraphBuilderPackageDependencyGraphResult({
      ...result,
      summary: {
        ...result.summary,
        dependencyEdgeCount: 1
      }
    })).toThrow('summary is inconsistent');
  });
});

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
  assertGraphBuilderProjectFileGraphResult,
  buildProjectFileGraphFromRepositoryStructure,
  isGraphBuilderDiagnosticCode,
  isGraphBuilderProjectFileGraphResult,
  parseGraphBuilderDiagnosticCode,
  toSerializableGraphBuilderProjectFileGraphResult
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

function structureFromInventory(input: RepositoryScanInput) {
  const scan = classifyRepositoryScanInput(input, {
    startedAt: '2026-08-10T12:00:00.000Z',
    completedAt: '2026-08-10T12:00:01.000Z'
  });
  const manifests = detectPackageManifests(scan);
  return deriveRepositoryStructureSummary(manifests);
}

describe('graph builder project/file nodes', () => {
  it('builds a deterministic canonical project, folder and file graph without edges', () => {
    const structure = structureFromInventory(scanInput([
      { path: 'package.json', kind: 'manifest', extension: '.json', sizeBytes: 80 },
      { path: 'src/index.ts', kind: 'source', extension: '.ts', sizeBytes: 180 },
      { path: 'src/features/user.ts', kind: 'source', extension: '.ts', sizeBytes: 240 },
      { path: 'test/index.test.ts', kind: 'test', extension: '.ts', sizeBytes: 160 },
      { path: 'README.md', kind: 'documentation', extension: '.md', sizeBytes: 120 },
      { path: 'assets/logo.svg', kind: 'asset', extension: '.svg', sizeBytes: 90 }
    ]));

    const result = buildProjectFileGraphFromRepositoryStructure(structure);

    expect(result.status).toBe('completed');
    expect(result.projectNode.project.name).toBe('sample-project');
    expect(result.projectNode.id).toBe('node:project/root');
    expect(result.folderNodes.map((node) => node.folder.path)).toEqual([
      'assets',
      'src',
      'src/features',
      'test'
    ]);
    expect(result.fileNodes.map((node) => node.file.path)).toEqual([
      'README.md',
      'assets/logo.svg',
      'package.json',
      'src/features/user.ts',
      'src/index.ts',
      'test/index.test.ts'
    ]);
    expect(result.snapshot.edges).toEqual([]);
    expect(result.snapshot.nodes).toHaveLength(11);
    expect(result.summary).toEqual({
      projectNodeCount: 1,
      folderNodeCount: 4,
      fileNodeCount: 6,
      totalNodeCount: 11,
      edgeCount: 0,
      candidateFileNodeCount: 4,
      ignoredFileNodeCount: 2,
      unclassifiedFileNodeCount: 0,
      warningCount: 0,
      errorCount: 0
    });
    expect(isCanonicalGraphSnapshot(result.snapshot)).toBe(true);
    expect(isGraphBuilderProjectFileGraphResult(result)).toBe(true);
    expect(() => assertGraphBuilderProjectFileGraphResult(result)).not.toThrow();
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it('uses folder hierarchy as graph parent ids', () => {
    const structure = structureFromInventory(scanInput([
      { path: 'src/domain/accounts/model.ts', kind: 'source', extension: '.ts' }
    ]));

    const result = buildProjectFileGraphFromRepositoryStructure(structure);
    const foldersByPath = new Map(result.folderNodes.map((node) => [node.folder.path, node]));
    const fileNode = result.fileNodes[0];

    expect(foldersByPath.get('src')?.parentId).toBe(result.projectNode.id);
    expect(foldersByPath.get('src/domain')?.parentId).toBe(foldersByPath.get('src')?.id);
    expect(foldersByPath.get('src/domain/accounts')?.parentId).toBe(foldersByPath.get('src/domain')?.id);
    expect(fileNode?.parentId).toBe(foldersByPath.get('src/domain/accounts')?.id);
    expect(fileNode?.file.language).toBe('typescript');
  });

  it('keeps ignored files visible with disposition facets but no graph edges', () => {
    const structure = structureFromInventory(scanInput([
      { path: 'src/index.ts', kind: 'source', extension: '.ts' },
      { path: 'generated/index.js', kind: 'source', extension: '.js' },
      { path: '.env', kind: 'config', extension: '.env' }
    ]));

    const result = buildProjectFileGraphFromRepositoryStructure(structure);
    const envNode = result.fileNodes.find((node) => node.file.path === '.env');
    const generatedNode = result.fileNodes.find((node) => node.file.path === 'generated/index.js');

    expect(result.summary.ignoredFileNodeCount).toBe(2);
    expect(envNode?.analysis.facets).toContainEqual({ key: 'scan.ignoredReason', value: 'sensitive' });
    expect(generatedNode?.analysis.facets).toContainEqual({ key: 'scan.ignoredReason', value: 'generated' });
    expect(result.snapshot.edges).toEqual([]);
  });

  it('encodes graph node ids for paths that are valid repository paths but not id tokens', () => {
    const structure = structureFromInventory(scanInput([
      { path: 'src/routes/user profile.ts', kind: 'source', extension: '.ts' }
    ]));

    const result = buildProjectFileGraphFromRepositoryStructure(structure);
    const fileNode = result.fileNodes[0];

    expect(fileNode?.file.path).toBe('src/routes/user profile.ts');
    expect(fileNode?.id).toBe('node:file/src/routes/user~20~profile.ts');
    expect(isCanonicalGraphSnapshot(result.snapshot)).toBe(true);
  });

  it('serializes and validates project/file graph results consistently', () => {
    const result = buildProjectFileGraphFromRepositoryStructure(structureFromInventory(scanInput([
      { path: 'src/index.ts', kind: 'source', extension: '.ts' }
    ])));
    const serializable = toSerializableGraphBuilderProjectFileGraphResult(result);

    expect(serializable).toEqual(result);
    expect(() => toSerializableGraphBuilderProjectFileGraphResult({
      ...result,
      summary: {
        ...result.summary,
        edgeCount: 1
      }
    })).toThrow('must not create edges yet');
  });

  it('validates graph builder diagnostic codes', () => {
    expect(parseGraphBuilderDiagnosticCode('GRAPH_BUILDER_SOURCE_STRUCTURE_WARNING'))
      .toBe('GRAPH_BUILDER_SOURCE_STRUCTURE_WARNING');
    expect(isGraphBuilderDiagnosticCode('GRAPH_BUILDER_SOURCE_STRUCTURE_WARNING')).toBe(true);
    expect(isGraphBuilderDiagnosticCode('REPOSITORY_SCAN_SOURCE_STRUCTURE_WARNING')).toBe(false);
  });
});

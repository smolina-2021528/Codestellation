import { describe, expect, it } from 'vitest';

import { isCanonicalGraphSnapshot } from '@codestellation/graph-model';
import {
  ANALYZER_STATIC_ANALYZER_DESCRIPTOR_SCHEMA_VERSION,
  ANALYZER_STATIC_ANALYZER_ID,
  ANALYZER_STATIC_ANALYZER_VERSION,
  ANALYZER_STATIC_EXPORT_REFERENCE_SCHEMA_VERSION,
  ANALYZER_STATIC_FILE_ANALYSIS_SCHEMA_VERSION,
  ANALYZER_STATIC_IMPORT_EXPORT_ANALYSIS_RESULT_SCHEMA_VERSION,
  ANALYZER_STATIC_IMPORT_REFERENCE_SCHEMA_VERSION,
  type AnalyzerStaticExportReference,
  type AnalyzerStaticImportExportAnalysisResult,
  type AnalyzerStaticImportReference
} from '@codestellation/analyzer-static';
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
  assertGraphBuilderImportExportGraphResult,
  buildImportExportGraphFromStaticAnalysis,
  buildPackageDependencyGraphFromProjectFileGraph,
  buildProjectFileGraphFromRepositoryStructure,
  isGraphBuilderImportExportGraphResult,
  toSerializableGraphBuilderImportExportGraphResult
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

function packageGraphFromInventory(input: RepositoryScanInput) {
  const scan = classifyRepositoryScanInput(input, {
    startedAt: '2026-08-10T12:00:00.000Z',
    completedAt: '2026-08-10T12:00:01.000Z'
  });
  const manifests = detectPackageManifests(scan);
  const structure = deriveRepositoryStructureSummary(manifests);
  const projectFileGraph = buildProjectFileGraphFromRepositoryStructure(structure);

  return buildPackageDependencyGraphFromProjectFileGraph(projectFileGraph);
}

function analysisResult(
  imports: readonly AnalyzerStaticImportReference[],
  exports: readonly AnalyzerStaticExportReference[]
): AnalyzerStaticImportExportAnalysisResult {
  const filePaths = [...new Set([
    ...imports.map((record) => record.filePath),
    ...exports.map((record) => record.filePath)
  ])].sort();

  return {
    schemaVersion: ANALYZER_STATIC_IMPORT_EXPORT_ANALYSIS_RESULT_SCHEMA_VERSION,
    status: 'completed',
    analyzer: {
      schemaVersion: ANALYZER_STATIC_ANALYZER_DESCRIPTOR_SCHEMA_VERSION,
      id: ANALYZER_STATIC_ANALYZER_ID,
      version: ANALYZER_STATIC_ANALYZER_VERSION
    },
    files: filePaths.map((filePath) => {
      const fileImports = imports.filter((record) => record.filePath === filePath);
      const fileExports = exports.filter((record) => record.filePath === filePath);

      return {
        schemaVersion: ANALYZER_STATIC_FILE_ANALYSIS_SCHEMA_VERSION,
        filePath,
        parserStatus: 'completed',
        status: 'completed',
        imports: fileImports,
        exports: fileExports,
        diagnostics: [],
        summary: {
          importCount: fileImports.length,
          exportCount: fileExports.length,
          typeOnlyImportCount: fileImports.filter((record) => record.isTypeOnly).length,
          dynamicImportCount: fileImports.filter((record) => record.isDynamic).length,
          reExportCount: fileExports.filter((record) => record.isReExport).length,
          typeOnlyExportCount: fileExports.filter((record) => record.isTypeOnly).length,
          diagnosticCount: 0
        }
      };
    }),
    imports,
    exports,
    diagnostics: [],
    summary: {
      fileCount: filePaths.length,
      completedFileCount: filePaths.length,
      partialFileCount: 0,
      failedFileCount: 0,
      skippedFileCount: 0,
      importCount: imports.length,
      exportCount: exports.length,
      typeOnlyImportCount: imports.filter((record) => record.isTypeOnly).length,
      dynamicImportCount: imports.filter((record) => record.isDynamic).length,
      reExportCount: exports.filter((record) => record.isReExport).length,
      typeOnlyExportCount: exports.filter((record) => record.isTypeOnly).length,
      diagnosticCount: 0
    }
  };
}

function importReference(
  filePath: string,
  moduleSpecifier: string,
  specifierKind: AnalyzerStaticImportReference['specifierKind'],
  importKind: AnalyzerStaticImportReference['importKind'] = 'static'
): AnalyzerStaticImportReference {
  return {
    schemaVersion: ANALYZER_STATIC_IMPORT_REFERENCE_SCHEMA_VERSION,
    filePath,
    moduleSpecifier,
    specifierKind,
    importKind,
    isTypeOnly: importKind === 'type-only',
    isDynamic: importKind === 'dynamic'
  };
}

function exportReference(
  filePath: string,
  name: string,
  sourceModuleSpecifier?: string
): AnalyzerStaticExportReference {
  return {
    schemaVersion: ANALYZER_STATIC_EXPORT_REFERENCE_SCHEMA_VERSION,
    filePath,
    exportKind: 'named',
    name,
    ...(sourceModuleSpecifier === undefined ? {} : {
      sourceModuleSpecifier,
      sourceSpecifierKind: sourceModuleSpecifier.startsWith('.') ? 'relative' : 'package'
    }),
    isTypeOnly: false,
    isReExport: sourceModuleSpecifier !== undefined
  };
}

describe('graph builder import/export edges', () => {
  it('adds external package nodes and import/export edges from static analysis', () => {
    const sourceGraph = packageGraphFromInventory(scanInput([
      { path: 'package.json', kind: 'manifest', extension: '.json' },
      { path: 'src/index.ts', kind: 'source', extension: '.ts' },
      { path: 'src/util.ts', kind: 'source', extension: '.ts' }
    ]));
    const result = buildImportExportGraphFromStaticAnalysis(sourceGraph, analysisResult([
      importReference('src/index.ts', 'react', 'package'),
      importReference('src/index.ts', 'node:fs/promises', 'builtin'),
      importReference('src/index.ts', './util', 'relative')
    ], [
      exportReference('src/index.ts', 'answer'),
      exportReference('src/util.ts', 'helper')
    ]));

    expect(result.status).toBe('completed');
    expect(result.packageNodes.map((node) => node.package.name)).toEqual([
      'sample-project',
      'fs/promises',
      'react'
    ]);
    expect(result.importsEdges.map((edge) => edge.attributes['import.moduleSpecifier'])).toEqual([
      'node:fs/promises',
      'react'
    ]);
    expect(result.exportsEdges.map((edge) => edge.attributes['export.name'])).toEqual(['answer', 'helper']);
    expect(result.unresolvedImportReferences).toEqual([
      {
        filePath: 'src/index.ts',
        moduleSpecifier: './util',
        specifierKind: 'relative',
        importKind: 'static',
        isTypeOnly: false,
        isDynamic: false,
        reason: 'relative-module-resolution-deferred'
      }
    ]);
    expect(result.summary).toMatchObject({
      localPackageNodeCount: 1,
      externalPackageNodeCount: 2,
      importsEdgeCount: 2,
      exportsEdgeCount: 2,
      unresolvedImportReferenceCount: 1
    });
    expect(result.summary.totalEdgeCount).toBe(sourceGraph.summary.totalEdgeCount + 4);
    expect(result.snapshot.edges).toHaveLength(result.summary.totalEdgeCount);
    expect(isCanonicalGraphSnapshot(result.snapshot)).toBe(true);
    expect(isGraphBuilderImportExportGraphResult(result)).toBe(true);
    expect(() => assertGraphBuilderImportExportGraphResult(result)).not.toThrow();
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it('keeps scoped package identity stable without resolving relative imports', () => {
    const sourceGraph = packageGraphFromInventory(scanInput([
      { path: 'package.json', kind: 'manifest', extension: '.json' },
      { path: 'src/index.ts', kind: 'source', extension: '.ts' }
    ]));
    const result = toSerializableGraphBuilderImportExportGraphResult(
      buildImportExportGraphFromStaticAnalysis(sourceGraph, analysisResult([
        importReference('src/index.ts', '@scope/pkg/subpath', 'package'),
        importReference('src/index.ts', '/absolute/module', 'absolute')
      ], [
        exportReference('src/index.ts', 'Widget', '@scope/pkg')
      ]))
    );

    expect(result.packageNodes.map((node) => node.package.name)).toEqual(['sample-project', '@scope/pkg']);
    expect(result.importsEdges).toHaveLength(1);
    expect(result.exportsEdges).toHaveLength(1);
    expect(result.unresolvedImportReferences.map((reference) => reference.reason)).toEqual([
      'absolute-module-resolution-deferred'
    ]);
    expect(result.exportsEdges[0]?.attributes['export.sourceModuleSpecifier']).toBe('@scope/pkg');
  });
});

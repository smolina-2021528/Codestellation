import { describe, expect, it } from 'vitest';

import { isCanonicalGraphSnapshot } from '@codestellation/graph-model';
import {
  ANALYZER_STATIC_ANALYZER_DESCRIPTOR_SCHEMA_VERSION,
  ANALYZER_STATIC_ANALYZER_ID,
  ANALYZER_STATIC_ANALYZER_VERSION,
  ANALYZER_STATIC_FILE_ANALYSIS_SCHEMA_VERSION,
  ANALYZER_STATIC_IMPORT_EXPORT_ANALYSIS_RESULT_SCHEMA_VERSION,
  ANALYZER_STATIC_IMPORT_REFERENCE_SCHEMA_VERSION,
  type AnalyzerStaticImportExportAnalysisResult,
  type AnalyzerStaticImportReference
} from '@codestellation/analyzer-static';
import {
  PARSER_CORE_PARSE_BATCH_RESULT_SCHEMA_VERSION,
  PARSER_CORE_PARSE_UNIT_RESULT_SCHEMA_VERSION,
  PARSER_CORE_PARSEABLE_FILE_SCHEMA_VERSION,
  PARSER_CORE_PARSER_DESCRIPTOR_SCHEMA_VERSION,
  parseParserCoreFilePath,
  parseParserCorePluginId,
  type ParserCoreParseBatchResult,
  type ParserCoreParseUnitResult
} from '@codestellation/parser-core';
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
  assertGraphBuilderRelativeImportGraphResult,
  buildImportExportGraphFromStaticAnalysis,
  buildPackageDependencyGraphFromProjectFileGraph,
  buildProjectFileGraphFromRepositoryStructure,
  buildRelativeImportGraphFromSymbolGraph,
  buildSymbolGraphFromParserResults,
  isGraphBuilderRelativeImportGraphResult,
  toSerializableGraphBuilderRelativeImportGraphResult
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

function analysisResult(imports: readonly AnalyzerStaticImportReference[]): AnalyzerStaticImportExportAnalysisResult {
  const filePaths = [...new Set(imports.map((record) => record.filePath))].sort();

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

      return {
        schemaVersion: ANALYZER_STATIC_FILE_ANALYSIS_SCHEMA_VERSION,
        filePath,
        parserStatus: 'completed',
        status: 'completed',
        imports: fileImports,
        exports: [],
        diagnostics: [],
        summary: {
          importCount: fileImports.length,
          exportCount: 0,
          typeOnlyImportCount: fileImports.filter((record) => record.isTypeOnly).length,
          dynamicImportCount: fileImports.filter((record) => record.isDynamic).length,
          reExportCount: 0,
          typeOnlyExportCount: 0,
          diagnosticCount: 0
        }
      };
    }),
    imports,
    exports: [],
    diagnostics: [],
    summary: {
      fileCount: filePaths.length,
      completedFileCount: filePaths.length,
      partialFileCount: 0,
      failedFileCount: 0,
      skippedFileCount: 0,
      importCount: imports.length,
      exportCount: 0,
      typeOnlyImportCount: imports.filter((record) => record.isTypeOnly).length,
      dynamicImportCount: imports.filter((record) => record.isDynamic).length,
      reExportCount: 0,
      typeOnlyExportCount: 0,
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

function parseBatch(paths: readonly string[]): ParserCoreParseBatchResult {
  const files = paths.map(parseUnit);

  return {
    schemaVersion: PARSER_CORE_PARSE_BATCH_RESULT_SCHEMA_VERSION,
    status: 'completed',
    files,
    diagnostics: [],
    summary: {
      fileCount: files.length,
      completedFileCount: files.length,
      partialFileCount: 0,
      failedFileCount: 0,
      skippedFileCount: 0,
      diagnosticCount: 0,
      symbolCount: 0,
      importCount: 0,
      exportCount: 0,
      referenceCount: 0
    }
  };
}

function parseUnit(path: string): ParserCoreParseUnitResult {
  return {
    schemaVersion: PARSER_CORE_PARSE_UNIT_RESULT_SCHEMA_VERSION,
    status: 'completed',
    file: {
      schemaVersion: PARSER_CORE_PARSEABLE_FILE_SCHEMA_VERSION,
      path: parseParserCoreFilePath(path),
      role: 'source',
      language: 'typescript',
      sizeBytes: 200,
      extension: '.ts'
    },
    parser: {
      schemaVersion: PARSER_CORE_PARSER_DESCRIPTOR_SCHEMA_VERSION,
      id: parseParserCorePluginId('typescript-parser'),
      version: '0.1.1',
      language: 'typescript'
    },
    diagnostics: [],
    symbols: [],
    imports: [],
    exports: [],
    references: [],
    summary: {
      diagnosticCount: 0,
      symbolCount: 0,
      importCount: 0,
      exportCount: 0,
      referenceCount: 0
    }
  };
}

describe('graph builder relative import edges', () => {
  it('resolves relative imports to local file nodes without resolving packages', () => {
    const packageGraph = packageGraphFromInventory(scanInput([
      { path: 'package.json', kind: 'manifest', extension: '.json' },
      { path: 'src/index.ts', kind: 'source', extension: '.ts' },
      { path: 'src/util.ts', kind: 'source', extension: '.ts' },
      { path: 'src/features/index.ts', kind: 'source', extension: '.ts' }
    ]));
    const importExportGraph = buildImportExportGraphFromStaticAnalysis(packageGraph, analysisResult([
      importReference('src/index.ts', './util', 'relative'),
      importReference('src/index.ts', './features', 'relative'),
      importReference('src/index.ts', './missing', 'relative'),
      importReference('src/index.ts', 'react', 'package')
    ]));
    const symbolGraph = buildSymbolGraphFromParserResults(importExportGraph, parseBatch([
      'src/index.ts',
      'src/util.ts',
      'src/features/index.ts'
    ]));
    const result = buildRelativeImportGraphFromSymbolGraph(symbolGraph);

    expect(result.status).toBe('completed');
    expect(result.resolvedRelativeImportReferences.map((reference) => [
      reference.moduleSpecifier,
      reference.resolvedFilePath
    ])).toEqual([
      ['./features', 'src/features/index.ts'],
      ['./util', 'src/util.ts']
    ]);
    expect(result.unresolvedImportReferences.map((reference) => reference.moduleSpecifier)).toEqual(['./missing']);
    expect(result.importsEdges.map((edge) => edge.attributes['import.moduleSpecifier']).sort()).toEqual([
      './features',
      './util',
      'react'
    ]);
    expect(result.summary).toMatchObject({
      resolvedRelativeImportEdgeCount: 2,
      remainingUnresolvedImportReferenceCount: 1,
      unresolvedImportReferenceCount: 1
    });
    expect(result.summary.importsEdgeCount).toBe(symbolGraph.summary.importsEdgeCount + 2);
    expect(result.summary.totalEdgeCount).toBe(symbolGraph.summary.totalEdgeCount + 2);
    expect(result.snapshot.edges).toHaveLength(result.summary.totalEdgeCount);
    expect(isCanonicalGraphSnapshot(result.snapshot)).toBe(true);
    expect(isGraphBuilderRelativeImportGraphResult(result)).toBe(true);
    expect(() => assertGraphBuilderRelativeImportGraphResult(result)).not.toThrow();
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it('serializes and validates relative import graph results consistently', () => {
    const packageGraph = packageGraphFromInventory(scanInput([
      { path: 'package.json', kind: 'manifest', extension: '.json' },
      { path: 'src/index.ts', kind: 'source', extension: '.ts' },
      { path: 'src/util.tsx', kind: 'source', extension: '.tsx' }
    ]));
    const importExportGraph = buildImportExportGraphFromStaticAnalysis(packageGraph, analysisResult([
      importReference('src/index.ts', './util', 'relative', 'type-only')
    ]));
    const symbolGraph = buildSymbolGraphFromParserResults(importExportGraph, parseBatch([
      'src/index.ts',
      'src/util.tsx'
    ]));
    const result = toSerializableGraphBuilderRelativeImportGraphResult(
      buildRelativeImportGraphFromSymbolGraph(symbolGraph)
    );

    expect(result.resolvedRelativeImportReferences).toEqual([
      {
        filePath: 'src/index.ts',
        moduleSpecifier: './util',
        resolvedFilePath: 'src/util.tsx',
        importKind: 'type-only',
        isTypeOnly: true,
        isDynamic: false
      }
    ]);
    expect(result.importsEdges[0]?.attributes['import.isTypeOnly']).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';

import { isCanonicalGraphSnapshot } from '@codestellation/graph-model';
import {
  ANALYZER_STATIC_ANALYZER_DESCRIPTOR_SCHEMA_VERSION,
  ANALYZER_STATIC_ANALYZER_ID,
  ANALYZER_STATIC_ANALYZER_VERSION,
  ANALYZER_STATIC_FILE_ANALYSIS_SCHEMA_VERSION,
  ANALYZER_STATIC_IMPORT_EXPORT_ANALYSIS_RESULT_SCHEMA_VERSION,
  type AnalyzerStaticImportExportAnalysisResult
} from '@codestellation/analyzer-static';
import {
  PARSER_CORE_PARSE_BATCH_RESULT_SCHEMA_VERSION,
  PARSER_CORE_PARSE_UNIT_RESULT_SCHEMA_VERSION,
  PARSER_CORE_PARSEABLE_FILE_SCHEMA_VERSION,
  PARSER_CORE_PARSER_DESCRIPTOR_SCHEMA_VERSION,
  PARSER_CORE_REFERENCE_SCHEMA_VERSION,
  PARSER_CORE_SYMBOL_SCHEMA_VERSION,
  parseParserCoreFilePath,
  parseParserCorePluginId,
  type ParserCoreParseBatchResult,
  type ParserCoreParseUnitResult,
  type ParserCoreReferenceKind,
  type ParserCoreSymbolKind
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
  assertGraphBuilderReferenceGraphResult,
  buildImportExportGraphFromStaticAnalysis,
  buildPackageDependencyGraphFromProjectFileGraph,
  buildProjectFileGraphFromRepositoryStructure,
  buildReferenceGraphFromParserResults,
  buildRelativeImportGraphFromSymbolGraph,
  buildSymbolGraphFromParserResults,
  isGraphBuilderReferenceGraphResult,
  toSerializableGraphBuilderReferenceGraphResult
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

function analysisResult(filePaths: readonly string[]): AnalyzerStaticImportExportAnalysisResult {
  return {
    schemaVersion: ANALYZER_STATIC_IMPORT_EXPORT_ANALYSIS_RESULT_SCHEMA_VERSION,
    status: 'completed',
    analyzer: {
      schemaVersion: ANALYZER_STATIC_ANALYZER_DESCRIPTOR_SCHEMA_VERSION,
      id: ANALYZER_STATIC_ANALYZER_ID,
      version: ANALYZER_STATIC_ANALYZER_VERSION
    },
    files: filePaths.map((filePath) => ({
      schemaVersion: ANALYZER_STATIC_FILE_ANALYSIS_SCHEMA_VERSION,
      filePath,
      parserStatus: 'completed',
      status: 'completed',
      imports: [],
      exports: [],
      diagnostics: [],
      summary: {
        importCount: 0,
        exportCount: 0,
        typeOnlyImportCount: 0,
        dynamicImportCount: 0,
        reExportCount: 0,
        typeOnlyExportCount: 0,
        diagnosticCount: 0
      }
    })),
    imports: [],
    exports: [],
    diagnostics: [],
    summary: {
      fileCount: filePaths.length,
      completedFileCount: filePaths.length,
      partialFileCount: 0,
      failedFileCount: 0,
      skippedFileCount: 0,
      importCount: 0,
      exportCount: 0,
      typeOnlyImportCount: 0,
      dynamicImportCount: 0,
      reExportCount: 0,
      typeOnlyExportCount: 0,
      diagnosticCount: 0
    }
  };
}

function parseBatch(files: readonly ParserCoreParseUnitResult[]): ParserCoreParseBatchResult {
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
      symbolCount: files.reduce((sum, file) => sum + file.summary.symbolCount, 0),
      importCount: 0,
      exportCount: files.reduce((sum, file) => sum + file.summary.exportCount, 0),
      referenceCount: files.reduce((sum, file) => sum + file.summary.referenceCount, 0)
    }
  };
}

function parseUnit(path: string, symbols: readonly {
  readonly name: string;
  readonly kind: ParserCoreSymbolKind;
}[], references: readonly {
  readonly targetName: string;
  readonly kind?: ParserCoreReferenceKind;
}[]): ParserCoreParseUnitResult {
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
    symbols: symbols.map((symbol, index) => ({
      schemaVersion: PARSER_CORE_SYMBOL_SCHEMA_VERSION,
      localId: `symbol:${symbol.kind}:${symbol.name}:${index}`,
      name: symbol.name,
      kind: symbol.kind
    })),
    imports: [],
    exports: [],
    references: references.map((reference, index) => ({
      schemaVersion: PARSER_CORE_REFERENCE_SCHEMA_VERSION,
      kind: reference.kind ?? 'identifier',
      targetName: reference.targetName,
      range: {
        schemaVersion: 1,
        start: {
          schemaVersion: 1,
          offset: 10 + index,
          line: 1,
          column: 10 + index
        },
        end: {
          schemaVersion: 1,
          offset: 16 + index,
          line: 1,
          column: 16 + index
        }
      }
    })),
    summary: {
      diagnosticCount: 0,
      symbolCount: symbols.length,
      importCount: 0,
      exportCount: 0,
      referenceCount: references.length
    }
  };
}

function referenceGraph() {
  const packageGraph = packageGraphFromInventory(scanInput([
    { path: 'package.json', kind: 'manifest', extension: '.json' },
    { path: 'src/index.ts', kind: 'source', extension: '.ts' },
    { path: 'src/util.ts', kind: 'source', extension: '.ts' }
  ]));
  const importExportGraph = buildImportExportGraphFromStaticAnalysis(packageGraph, analysisResult(['src/index.ts', 'src/util.ts']));
  const symbolGraph = buildSymbolGraphFromParserResults(importExportGraph, parseBatch([
    parseUnit('src/index.ts', [
      { name: 'answer', kind: 'constant' },
      { name: 'createApp', kind: 'function' }
    ], [
      { targetName: 'answer' },
      { targetName: 'missingSymbol' }
    ]),
    parseUnit('src/util.ts', [
      { name: 'HelperConfig', kind: 'interface' }
    ], [
      { targetName: 'HelperConfig', kind: 'type' }
    ])
  ]));
  const relativeGraph = buildRelativeImportGraphFromSymbolGraph(symbolGraph);

  return buildReferenceGraphFromParserResults(relativeGraph);
}

describe('graph builder reference edges', () => {
  it('creates local file to symbol reference edges from parser references', () => {
    const result = referenceGraph();

    expect(result.status).toBe('completed');
    expect(result.referencesEdges.map((edge) => [
      edge.kind,
      edge.attributes['reference.targetName'],
      edge.attributes['reference.kind'],
      edge.attributes['reference.resolution']
    ])).toEqual([
      ['references', 'answer', 'identifier', 'same-file-symbol-name'],
      ['references', 'HelperConfig', 'type', 'same-file-symbol-name']
    ]);
    expect(result.resolvedSymbolReferences.map((reference) => [
      reference.filePath,
      reference.targetName,
      reference.resolution
    ])).toEqual([
      ['src/index.ts', 'answer', 'same-file-symbol-name'],
      ['src/util.ts', 'HelperConfig', 'same-file-symbol-name']
    ]);
    expect(result.unresolvedSymbolReferences).toEqual([
      {
        filePath: 'src/index.ts',
        targetName: 'missingSymbol',
        referenceKind: 'identifier',
        reason: 'no-local-symbol-match',
        range: {
          start: { line: 1, column: 11 },
          end: { line: 1, column: 17 }
        }
      }
    ]);
    expect(result.summary).toMatchObject({
      parserReferenceCount: 3,
      referenceEdgeCount: 2,
      resolvedSymbolReferenceCount: 2,
      unresolvedSymbolReferenceCount: 1
    });
    expect(result.summary.totalEdgeCount).toBe(result.sourceGraph.summary.totalEdgeCount + 2);
    expect(result.snapshot.edges).toHaveLength(result.summary.totalEdgeCount);
    expect(isCanonicalGraphSnapshot(result.snapshot)).toBe(true);
    expect(isGraphBuilderReferenceGraphResult(result)).toBe(true);
    expect(() => assertGraphBuilderReferenceGraphResult(result)).not.toThrow();
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it('serializes and validates reference graph results consistently', () => {
    const result = toSerializableGraphBuilderReferenceGraphResult(referenceGraph());

    expect(result.referencesEdges.every((edge) => edge.kind === 'references')).toBe(true);
    expect(result.referencesEdges.map((edge) => edge.source?.path)).toEqual([
      'src/index.ts',
      'src/util.ts'
    ]);
    expect(result.summary.warningCount).toBe(0);
    expect(result.summary.errorCount).toBe(0);
  });
});

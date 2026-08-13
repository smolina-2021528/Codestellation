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
  PARSER_CORE_EXPORT_SCHEMA_VERSION,
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
  assertGraphBuilderImportedSymbolGraphResult,
  buildImportedSymbolReferenceGraphFromReferenceGraph,
  buildImportExportGraphFromStaticAnalysis,
  buildPackageDependencyGraphFromProjectFileGraph,
  buildProjectFileGraphFromRepositoryStructure,
  buildReferenceGraphFromParserResults,
  buildRelativeImportGraphFromSymbolGraph,
  buildSymbolGraphFromParserResults,
  isGraphBuilderImportedSymbolGraphResult,
  toSerializableGraphBuilderImportedSymbolGraphResult
} from '../src/index.js';

function scanInput(files: readonly {
  readonly path: string;
  readonly kind: RepositoryScanSourceFileKind;
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
        sizeBytes: 100 + index,
        modifiedAt: `2026-08-10T12:00:0${index}.000Z`,
        ...(file.extension === undefined ? {} : { extension: file.extension }),
        kind: file.kind
      })),
      issues: [],
      summary: {
        fileCount: files.length,
        totalSizeBytes: files.reduce((sum, _file, index) => sum + 100 + index, 0),
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

function importReference(filePath: string, moduleSpecifier: string): AnalyzerStaticImportReference {
  return {
    schemaVersion: ANALYZER_STATIC_IMPORT_REFERENCE_SCHEMA_VERSION,
    filePath: parseParserCoreFilePath(filePath),
    moduleSpecifier,
    specifierKind: 'relative',
    importKind: 'static',
    isTypeOnly: false,
    isDynamic: false
  };
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
          typeOnlyImportCount: 0,
          dynamicImportCount: 0,
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
  readonly exported?: boolean;
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
    exports: symbols
      .filter((symbol) => symbol.exported === true)
      .map((symbol) => ({
        schemaVersion: PARSER_CORE_EXPORT_SCHEMA_VERSION,
        kind: symbol.kind === 'interface' || symbol.kind === 'type' ? 'type-only' : 'named',
        name: symbol.name
      })),
    references: references.map((reference, index) => ({
      schemaVersion: PARSER_CORE_REFERENCE_SCHEMA_VERSION,
      kind: reference.kind ?? 'identifier',
      targetName: reference.targetName,
      range: {
        schemaVersion: 1,
        start: {
          schemaVersion: 1,
          offset: 20 + index,
          line: 1,
          column: 20 + index
        },
        end: {
          schemaVersion: 1,
          offset: 26 + index,
          line: 1,
          column: 26 + index
        }
      }
    })),
    summary: {
      diagnosticCount: 0,
      symbolCount: symbols.length,
      importCount: 0,
      exportCount: symbols.filter((symbol) => symbol.exported === true).length,
      referenceCount: references.length
    }
  };
}

function referenceGraph() {
  const packageGraph = packageGraphFromInventory(scanInput([
    { path: 'package.json', kind: 'manifest', extension: '.json' },
    { path: 'src/index.ts', kind: 'source', extension: '.ts' },
    { path: 'src/util.ts', kind: 'source', extension: '.ts' },
    { path: 'src/ambiguous.ts', kind: 'source', extension: '.ts' }
  ]));
  const importExportGraph = buildImportExportGraphFromStaticAnalysis(packageGraph, analysisResult([
    importReference('src/index.ts', './util'),
    importReference('src/index.ts', './ambiguous')
  ]));
  const symbolGraph = buildSymbolGraphFromParserResults(importExportGraph, parseBatch([
    parseUnit('src/index.ts', [
      { name: 'localOnly', kind: 'function' }
    ], [
      { targetName: 'localOnly' },
      { targetName: 'helper', kind: 'call' },
      { targetName: 'missingSymbol' },
      { targetName: 'duplicate' }
    ]),
    parseUnit('src/util.ts', [
      { name: 'helper', kind: 'function', exported: true }
    ], []),
    parseUnit('src/ambiguous.ts', [
      { name: 'duplicate', kind: 'function', exported: true },
      { name: 'duplicate', kind: 'constant', exported: true }
    ], [])
  ]));
  const relativeImportGraph = buildRelativeImportGraphFromSymbolGraph(symbolGraph);

  return buildReferenceGraphFromParserResults(relativeImportGraph);
}

describe('graph builder imported symbol references', () => {
  it('resolves references through relative imports to uniquely exported symbols', () => {
    const result = buildImportedSymbolReferenceGraphFromReferenceGraph(referenceGraph());

    expect(result.status).toBe('completed');
    expect(result.resolvedSymbolReferences.map((reference) => reference.targetName)).toEqual(['localOnly']);
    expect(result.resolvedImportedSymbolReferences).toEqual([
      {
        filePath: 'src/index.ts',
        targetName: 'helper',
        referenceKind: 'call',
        importedFromFilePath: 'src/util.ts',
        resolvedSymbolNodeId: result.symbolNodes.find((node) => node.symbol.name === 'helper')?.id,
        resolvedSymbolName: 'helper',
        resolution: 'relative-import-exported-symbol-name',
        range: {
          start: {
            line: 1,
            column: 21
          },
          end: {
            line: 1,
            column: 27
          }
        }
      }
    ]);
    expect(result.unresolvedSymbolReferences.map((reference) => reference.targetName)).toEqual([
      'duplicate',
      'missingSymbol'
    ]);
    expect(result.summary.importedSymbolReferenceEdgeCount).toBe(1);
    expect(result.summary.referenceEdgeCount).toBe(2);
    expect(result.summary.remainingUnresolvedSymbolReferenceCount).toBe(2);
    expect(result.referencesEdges.filter((edge) => edge.attributes['relationship.source'] === 'imported-symbol-resolution')).toHaveLength(1);
    expect(isCanonicalGraphSnapshot(result.snapshot)).toBe(true);
  });

  it('serializes and validates imported symbol graph results consistently', () => {
    const result = buildImportedSymbolReferenceGraphFromReferenceGraph(referenceGraph());
    const serialized = toSerializableGraphBuilderImportedSymbolGraphResult(result);

    expect(isGraphBuilderImportedSymbolGraphResult(serialized)).toBe(true);
    expect(() => assertGraphBuilderImportedSymbolGraphResult(serialized)).not.toThrow();
    expect(serialized.summary.totalEdgeCount).toBe(result.summary.totalEdgeCount);
  });
});

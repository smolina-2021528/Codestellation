import { describe, expect, it } from 'vitest';
import {
  PARSER_CORE_EXPORT_SCHEMA_VERSION,
  PARSER_CORE_IMPORT_SCHEMA_VERSION,
  PARSER_CORE_PARSEABLE_FILE_SCHEMA_VERSION,
  PARSER_CORE_PARSE_BATCH_RESULT_SCHEMA_VERSION,
  PARSER_CORE_PARSE_UNIT_RESULT_SCHEMA_VERSION,
  PARSER_CORE_PARSER_DESCRIPTOR_SCHEMA_VERSION,
  parseParserCoreFilePath,
  parseParserCorePluginId,
  toSerializableParserCoreParseBatchResult,
  type ParserCoreExportRecord,
  type ParserCoreImportRecord,
  type ParserCoreParseBatchResult,
  type ParserCoreParseUnitResult,
  type ParserCoreStatus
} from '@codestellation/parser-core';
import {
  analyzeStaticImportsAndExports,
  classifyModuleSpecifier,
  extractImportsAndExportsFromParseUnit,
  isAnalyzerStaticImportExportAnalysisResult,
  toSerializableAnalyzerStaticImportExportAnalysisResult
} from '../src/index.js';

function importRecord(moduleSpecifier: string, kind: ParserCoreImportRecord['kind']): ParserCoreImportRecord {
  return {
    schemaVersion: PARSER_CORE_IMPORT_SCHEMA_VERSION,
    moduleSpecifier,
    kind
  };
}

function exportRecord(
  kind: ParserCoreExportRecord['kind'],
  name?: string,
  sourceModuleSpecifier?: string
): ParserCoreExportRecord {
  return {
    schemaVersion: PARSER_CORE_EXPORT_SCHEMA_VERSION,
    kind,
    ...(name === undefined ? {} : { name }),
    ...(sourceModuleSpecifier === undefined ? {} : { sourceModuleSpecifier })
  };
}

function parseUnit(
  path: string,
  status: ParserCoreStatus,
  imports: readonly ParserCoreImportRecord[],
  exports: readonly ParserCoreExportRecord[]
): ParserCoreParseUnitResult {
  return {
    schemaVersion: PARSER_CORE_PARSE_UNIT_RESULT_SCHEMA_VERSION,
    status,
    file: {
      schemaVersion: PARSER_CORE_PARSEABLE_FILE_SCHEMA_VERSION,
      path: parseParserCoreFilePath(path),
      role: 'source',
      language: 'typescript',
      extension: '.ts',
      sizeBytes: 500
    },
    parser: {
      schemaVersion: PARSER_CORE_PARSER_DESCRIPTOR_SCHEMA_VERSION,
      id: parseParserCorePluginId('fixture-parser'),
      version: '0.0.0-test',
      language: 'typescript'
    },
    diagnostics: [],
    symbols: [],
    imports,
    exports,
    references: [],
    summary: {
      diagnosticCount: 0,
      symbolCount: 0,
      importCount: imports.length,
      exportCount: exports.length,
      referenceCount: 0
    }
  };
}

function parseBatch(files: readonly ParserCoreParseUnitResult[]): ParserCoreParseBatchResult {
  return toSerializableParserCoreParseBatchResult({
    schemaVersion: PARSER_CORE_PARSE_BATCH_RESULT_SCHEMA_VERSION,
    status: files.some((file) => file.status !== 'completed') ? 'partial' : 'completed',
    files,
    diagnostics: [],
    summary: {
      fileCount: files.length,
      completedFileCount: files.filter((file) => file.status === 'completed').length,
      partialFileCount: files.filter((file) => file.status === 'partial').length,
      failedFileCount: files.filter((file) => file.status === 'failed').length,
      skippedFileCount: files.filter((file) => file.status === 'skipped').length,
      diagnosticCount: files.reduce((sum, file) => sum + file.summary.diagnosticCount, 0),
      symbolCount: 0,
      importCount: files.reduce((sum, file) => sum + file.summary.importCount, 0),
      exportCount: files.reduce((sum, file) => sum + file.summary.exportCount, 0),
      referenceCount: 0
    }
  });
}

describe('static import/export analysis', () => {
  it('extracts flattened imports and exports from parser-core batch results', () => {
    const result = analyzeStaticImportsAndExports(parseBatch([
      parseUnit('src/app.ts', 'completed', [
        importRecord('./config.js', 'static'),
        importRecord('node:fs', 'static'),
        importRecord('react', 'static'),
        importRecord('./types.js', 'type-only'),
        importRecord('../lazy.js', 'dynamic')
      ], [
        exportRecord('named', 'createApp'),
        exportRecord('type-only', 'Feature'),
        exportRecord('named', 'Widget', '@scope/ui')
      ]),
      parseUnit('src/skipped.ts', 'skipped', [], [])
    ]));

    expect(result.status).toBe('partial');
    expect(result.files.map((file) => [file.filePath, file.status])).toEqual([
      ['src/app.ts', 'completed'],
      ['src/skipped.ts', 'skipped']
    ]);
    expect(result.imports.map((importReference) => [
      importReference.moduleSpecifier,
      importReference.importKind,
      importReference.specifierKind,
      importReference.isTypeOnly,
      importReference.isDynamic
    ])).toEqual([
      ['../lazy.js', 'dynamic', 'relative', false, true],
      ['./config.js', 'static', 'relative', false, false],
      ['./types.js', 'type-only', 'relative', true, false],
      ['node:fs', 'static', 'builtin', false, false],
      ['react', 'static', 'package', false, false]
    ]);
    expect(result.exports.map((exportReference) => [
      exportReference.name,
      exportReference.exportKind,
      exportReference.sourceModuleSpecifier,
      exportReference.sourceSpecifierKind,
      exportReference.isReExport,
      exportReference.isTypeOnly
    ])).toEqual([
      ['createApp', 'named', undefined, undefined, false, false],
      ['Feature', 'type-only', undefined, undefined, false, true],
      ['Widget', 'named', '@scope/ui', 'package', true, false]
    ]);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'ANALYZER_STATIC_PARSE_UNIT_SKIPPED'
    ]);
    expect(result.summary).toMatchObject({
      fileCount: 2,
      completedFileCount: 1,
      skippedFileCount: 1,
      importCount: 5,
      exportCount: 3,
      typeOnlyImportCount: 1,
      dynamicImportCount: 1,
      reExportCount: 1,
      typeOnlyExportCount: 1,
      diagnosticCount: 1
    });
    expect(isAnalyzerStaticImportExportAnalysisResult(result)).toBe(true);
  });

  it('does not trust imports and exports from failed parse units', () => {
    const result = extractImportsAndExportsFromParseUnit(parseUnit('src/broken.ts', 'failed', [
      importRecord('./unsafe.js', 'static')
    ], [
      exportRecord('named', 'unsafe')
    ]));

    expect(result.status).toBe('failed');
    expect(result.imports).toEqual([]);
    expect(result.exports).toEqual([]);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'ANALYZER_STATIC_PARSE_UNIT_FAILED'
    ]);
    expect(result.summary).toEqual({
      importCount: 0,
      exportCount: 0,
      typeOnlyImportCount: 0,
      dynamicImportCount: 0,
      reExportCount: 0,
      typeOnlyExportCount: 0,
      diagnosticCount: 1
    });
  });

  it('classifies module specifiers without resolving them', () => {
    expect(classifyModuleSpecifier('./local.js')).toBe('relative');
    expect(classifyModuleSpecifier('/tmp/local.js')).toBe('absolute');
    expect(classifyModuleSpecifier('node:path')).toBe('builtin');
    expect(classifyModuleSpecifier('@scope/package/subpath')).toBe('package');
  });

  it('rejects inconsistent flattened result contracts', () => {
    const result = analyzeStaticImportsAndExports(parseBatch([
      parseUnit('src/app.ts', 'completed', [importRecord('./config.js', 'static')], [])
    ]));

    expect(() => toSerializableAnalyzerStaticImportExportAnalysisResult({
      ...result,
      imports: []
    })).toThrow('flattened imports');
  });
});

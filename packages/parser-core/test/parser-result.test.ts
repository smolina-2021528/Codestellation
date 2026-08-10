import { describe, expect, it } from 'vitest';

import {
  PARSER_CORE_DIAGNOSTIC_SCHEMA_VERSION,
  PARSER_CORE_EXPORT_SCHEMA_VERSION,
  PARSER_CORE_IMPORT_SCHEMA_VERSION,
  PARSER_CORE_PARSEABLE_FILE_SCHEMA_VERSION,
  PARSER_CORE_PARSE_BATCH_INPUT_SCHEMA_VERSION,
  PARSER_CORE_PARSE_BATCH_RESULT_SCHEMA_VERSION,
  PARSER_CORE_PARSE_UNIT_RESULT_SCHEMA_VERSION,
  PARSER_CORE_PARSER_DESCRIPTOR_SCHEMA_VERSION,
  PARSER_CORE_POSITION_SCHEMA_VERSION,
  PARSER_CORE_REFERENCE_SCHEMA_VERSION,
  PARSER_CORE_SYMBOL_SCHEMA_VERSION,
  PARSER_CORE_TEXT_RANGE_SCHEMA_VERSION,
  assertParserCoreParseBatchResult,
  assertParserCoreParseUnitResult,
  createParserCoreParseBatchInput,
  isParserCoreDiagnosticCode,
  isParserCoreFilePath,
  isParserCoreLanguage,
  isParserCoreParseBatchResult,
  isParserCoreParseUnitResult,
  isParserCorePluginId,
  parseParserCoreDiagnosticCode,
  parseParserCoreFilePath,
  parseParserCorePluginId,
  toSerializableParserCoreParseBatchResult,
  toSerializableParserCoreParseUnitResult,
  type ParserCoreDiagnostic,
  type ParserCoreParseableFile,
  type ParserCoreParseBatchResult,
  type ParserCoreParseUnitResult,
  type ParserCoreParserDescriptor,
  type ParserCoreTextRange
} from '../src/index.js';

function file(path = 'src/app.ts'): ParserCoreParseableFile {
  return {
    schemaVersion: PARSER_CORE_PARSEABLE_FILE_SCHEMA_VERSION,
    path: parseParserCoreFilePath(path),
    role: 'source',
    language: 'typescript',
    sizeBytes: 120,
    extension: '.TS'
  };
}

function parser(): ParserCoreParserDescriptor {
  return {
    schemaVersion: PARSER_CORE_PARSER_DESCRIPTOR_SCHEMA_VERSION,
    id: parseParserCorePluginId('typescript-parser'),
    version: '0.0.0',
    language: 'typescript'
  };
}

function range(): ParserCoreTextRange {
  return {
    schemaVersion: PARSER_CORE_TEXT_RANGE_SCHEMA_VERSION,
    start: {
      schemaVersion: PARSER_CORE_POSITION_SCHEMA_VERSION,
      offset: 0,
      line: 1,
      column: 1
    },
    end: {
      schemaVersion: PARSER_CORE_POSITION_SCHEMA_VERSION,
      offset: 12,
      line: 1,
      column: 13
    }
  };
}

function diagnostic(path = 'src/app.ts'): ParserCoreDiagnostic {
  return {
    schemaVersion: PARSER_CORE_DIAGNOSTIC_SCHEMA_VERSION,
    code: parseParserCoreDiagnosticCode('PARSER_RECOVERED_SYNTAX_ERROR'),
    severity: 'warning',
    message: 'Parser recovered from a syntax error.',
    retryable: false,
    path: parseParserCoreFilePath(path),
    range: range()
  };
}

function unitResult(): ParserCoreParseUnitResult {
  return {
    schemaVersion: PARSER_CORE_PARSE_UNIT_RESULT_SCHEMA_VERSION,
    status: 'partial',
    file: file(),
    parser: parser(),
    diagnostics: [diagnostic()],
    symbols: [
      {
        schemaVersion: PARSER_CORE_SYMBOL_SCHEMA_VERSION,
        localId: 'symbol:createApp',
        name: 'createApp',
        kind: 'function',
        qualifiedName: 'createApp',
        range: range()
      }
    ],
    imports: [
      {
        schemaVersion: PARSER_CORE_IMPORT_SCHEMA_VERSION,
        moduleSpecifier: './routes.js',
        kind: 'static',
        range: range()
      }
    ],
    exports: [
      {
        schemaVersion: PARSER_CORE_EXPORT_SCHEMA_VERSION,
        kind: 'named',
        name: 'createApp',
        range: range()
      }
    ],
    references: [
      {
        schemaVersion: PARSER_CORE_REFERENCE_SCHEMA_VERSION,
        kind: 'call',
        targetName: 'bootstrap',
        range: range()
      }
    ],
    summary: {
      diagnosticCount: 1,
      symbolCount: 1,
      importCount: 1,
      exportCount: 1,
      referenceCount: 1
    }
  };
}

describe('parser core contracts', () => {
  it('creates deterministic parse batch inputs from parseable file references', () => {
    const input = createParserCoreParseBatchInput([
      file('packages/api/src/server.ts'),
      file('apps/web/src/page.tsx')
    ]);

    expect(input).toEqual({
      schemaVersion: PARSER_CORE_PARSE_BATCH_INPUT_SCHEMA_VERSION,
      files: [
        expect.objectContaining({
          path: 'apps/web/src/page.tsx',
          extension: '.ts'
        }),
        expect.objectContaining({
          path: 'packages/api/src/server.ts',
          extension: '.ts'
        })
      ]
    });
    expect(JSON.parse(JSON.stringify(input))).toEqual(input);
  });

  it('serializes unit parse results with diagnostics and normalized parser records', () => {
    const result = toSerializableParserCoreParseUnitResult(unitResult());

    expect(result.file.extension).toBe('.ts');
    expect(result.status).toBe('partial');
    expect(result.diagnostics).toEqual([diagnostic()]);
    expect(result.symbols.map((symbol) => symbol.localId)).toEqual(['symbol:createApp']);
    expect(result.imports.map((importRecord) => importRecord.moduleSpecifier)).toEqual(['./routes.js']);
    expect(result.exports.map((exportRecord) => exportRecord.name)).toEqual(['createApp']);
    expect(result.references.map((reference) => reference.targetName)).toEqual(['bootstrap']);
    expect(isParserCoreParseUnitResult(result)).toBe(true);
    expect(() => assertParserCoreParseUnitResult(result)).not.toThrow();
  });

  it('serializes batch parse results and validates aggregate counts', () => {
    const result: ParserCoreParseBatchResult = {
      schemaVersion: PARSER_CORE_PARSE_BATCH_RESULT_SCHEMA_VERSION,
      status: 'partial',
      files: [unitResult()],
      diagnostics: [
        {
          schemaVersion: PARSER_CORE_DIAGNOSTIC_SCHEMA_VERSION,
          code: parseParserCoreDiagnosticCode('PARSER_BATCH_TIMEOUT'),
          severity: 'warning',
          message: 'Batch parsing reached a soft timeout.',
          retryable: true
        }
      ],
      summary: {
        fileCount: 1,
        completedFileCount: 0,
        partialFileCount: 1,
        failedFileCount: 0,
        skippedFileCount: 0,
        diagnosticCount: 2,
        symbolCount: 1,
        importCount: 1,
        exportCount: 1,
        referenceCount: 1
      }
    };

    const serializable = toSerializableParserCoreParseBatchResult(result);

    expect(serializable.schemaVersion).toBe(PARSER_CORE_PARSE_BATCH_RESULT_SCHEMA_VERSION);
    expect(serializable.summary.diagnosticCount).toBe(2);
    expect(isParserCoreParseBatchResult(serializable)).toBe(true);
    expect(() => assertParserCoreParseBatchResult(serializable)).not.toThrow();
  });

  it('validates parser identifiers, paths, languages and diagnostic codes', () => {
    expect(parseParserCoreFilePath('src\\index.ts')).toBe('src/index.ts');
    expect(isParserCoreFilePath('src/index.ts')).toBe(true);
    expect(isParserCoreFilePath('../secret.ts')).toBe(false);
    expect(parseParserCorePluginId('typescript-parser')).toBe('typescript-parser');
    expect(isParserCorePluginId('TypeScript')).toBe(false);
    expect(parseParserCoreDiagnosticCode('PARSER_FILE_SKIPPED')).toBe('PARSER_FILE_SKIPPED');
    expect(isParserCoreDiagnosticCode('PARSER_FILE_SKIPPED')).toBe(true);
    expect(isParserCoreDiagnosticCode('REPOSITORY_SCAN_FILE_SKIPPED')).toBe(false);
    expect(isParserCoreLanguage('typescript')).toBe(true);
    expect(isParserCoreLanguage('python')).toBe(false);
  });

  it('rejects inconsistent summaries, duplicate symbols and invalid ranges', () => {
    expect(() => toSerializableParserCoreParseUnitResult({
      ...unitResult(),
      summary: {
        ...unitResult().summary,
        symbolCount: 2
      }
    })).toThrow('symbolCount is inconsistent');

    expect(() => toSerializableParserCoreParseUnitResult({
      ...unitResult(),
      symbols: [unitResult().symbols[0]!, unitResult().symbols[0]!]
    })).toThrow('Parser core symbol localId must be unique');

    expect(() => toSerializableParserCoreParseUnitResult({
      ...unitResult(),
      diagnostics: [diagnostic('src/other.ts')]
    })).toThrow('does not match parse unit file');

    expect(() => toSerializableParserCoreParseUnitResult({
      ...unitResult(),
      symbols: [
        {
          ...unitResult().symbols[0]!,
          range: {
            schemaVersion: PARSER_CORE_TEXT_RANGE_SCHEMA_VERSION,
            start: {
              schemaVersion: PARSER_CORE_POSITION_SCHEMA_VERSION,
              offset: 10,
              line: 2,
              column: 1
            },
            end: {
              schemaVersion: PARSER_CORE_POSITION_SCHEMA_VERSION,
              offset: 1,
              line: 1,
              column: 2
            }
          }
        }
      ]
    })).toThrow('range start must be before');
  });
});

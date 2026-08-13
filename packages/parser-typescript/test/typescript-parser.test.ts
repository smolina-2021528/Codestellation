import { describe, expect, it } from 'vitest';
import {
  PARSER_CORE_PARSEABLE_FILE_SCHEMA_VERSION,
  parseParserCoreFilePath,
  type ParserCoreParseableFile
} from '@codestellation/parser-core';
import {
  canParseTypeScriptFile,
  createTypeScriptParser,
  parseTypeScriptSourceText,
  typescriptParser
} from '../src/index.js';

function file(
  path: string,
  language: ParserCoreParseableFile['language'] = 'typescript',
  extension = '.ts',
  role: ParserCoreParseableFile['role'] = 'source'
): ParserCoreParseableFile {
  return {
    schemaVersion: PARSER_CORE_PARSEABLE_FILE_SCHEMA_VERSION,
    path: parseParserCoreFilePath(path),
    language,
    extension,
    role,
    sizeBytes: 400
  };
}

describe('typescript parser', () => {
  it('parses TypeScript source text into normalized parser-core records', () => {
    const result = parseTypeScriptSourceText({
      file: file('src/app.ts'),
      sourceText: [
        "import { createConfig } from './config.js';",
        "import type { Feature } from './types.js';",
        'export interface FeatureFlag { enabled: boolean; }',
        'export type UserId = string;',
        'export const answer = 42;',
        'export function createApp() { return createConfig(answer); }',
        'export default class ApiClient {}'
      ].join('\n')
    });

    expect(result.status).toBe('completed');
    expect(result.parser.id).toBe('typescript-parser');
    expect(result.diagnostics).toEqual([]);
    expect(result.imports.map((importRecord) => [
      importRecord.moduleSpecifier,
      importRecord.kind
    ])).toEqual([
      ['./config.js', 'static'],
      ['./types.js', 'type-only']
    ]);
    expect(result.symbols.map((symbol) => [symbol.name, symbol.kind])).toEqual([
      ['ApiClient', 'class'],
      ['answer', 'constant'],
      ['createApp', 'function'],
      ['FeatureFlag', 'interface'],
      ['UserId', 'type']
    ]);
    expect(result.exports.map((exportRecord) => [
      exportRecord.name,
      exportRecord.kind
    ])).toEqual([
      ['answer', 'named'],
      ['ApiClient', 'default'],
      ['createApp', 'named'],
      ['FeatureFlag', 'type-only'],
      ['UserId', 'type-only']
    ]);
    expect(result.references.map((reference) => [
      reference.targetName,
      reference.kind
    ])).toEqual([
      ['answer', 'identifier'],
      ['createConfig', 'call']
    ]);
    expect(result.summary).toEqual({
      diagnosticCount: 0,
      symbolCount: 5,
      importCount: 2,
      exportCount: 5,
      referenceCount: 2
    });
  });

  it('parses TSX source text with the TSX script kind', () => {
    const result = parseTypeScriptSourceText({
      file: file('src/App.tsx', 'tsx', '.tsx'),
      sourceText: 'export function App() { return <main>Hello</main>; }'
    });

    expect(result.status).toBe('completed');
    expect(result.parser.language).toBe('tsx');
    expect(result.symbols.map((symbol) => symbol.name)).toEqual(['App']);
    expect(result.exports.map((exportRecord) => exportRecord.name)).toEqual(['App']);
    expect(result.references).toEqual([]);
  });

  it('returns recoverable diagnostics for syntax errors without throwing', () => {
    const result = parseTypeScriptSourceText({
      file: file('src/broken.ts'),
      sourceText: 'export function broken( { return 1;'
    });

    expect(result.status).toBe('partial');
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0]).toMatchObject({
      code: 'PARSER_TYPESCRIPT_SYNTAX_ERROR',
      severity: 'error',
      retryable: false,
      path: 'src/broken.ts'
    });
  });

  it('skips unsupported files and keeps plugin parse filesystem-free', async () => {
    const parser = createTypeScriptParser();
    const configFile = file('src/config.json', 'json', '.json', 'config');
    const sourceFile = file('src/app.ts');

    expect(canParseTypeScriptFile(configFile)).toBe(false);
    expect(typescriptParser.canParse(sourceFile)).toBe(true);

    const unsupportedResult = parseTypeScriptSourceText({
      file: configFile,
      sourceText: '{"name":"codestellation"}'
    });
    const noContentResult = await parser.parse(sourceFile, {});

    expect(unsupportedResult.status).toBe('skipped');
    expect(unsupportedResult.diagnostics[0]?.code).toBe('PARSER_TYPESCRIPT_FILE_SKIPPED');
    expect(noContentResult.status).toBe('skipped');
    expect(noContentResult.diagnostics[0]?.code).toBe('PARSER_TYPESCRIPT_SOURCE_TEXT_REQUIRED');
  });
});

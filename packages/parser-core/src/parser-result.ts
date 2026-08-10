export declare const parserCoreDiagnosticCodeBrand: unique symbol;
export declare const parserCoreFilePathBrand: unique symbol;
export declare const parserCorePluginIdBrand: unique symbol;

export type ParserCoreDiagnosticCode = string & {
  readonly [parserCoreDiagnosticCodeBrand]: 'ParserCoreDiagnosticCode';
};

export type ParserCoreFilePath = string & {
  readonly [parserCoreFilePathBrand]: 'ParserCoreFilePath';
};

export type ParserCorePluginId = string & {
  readonly [parserCorePluginIdBrand]: 'ParserCorePluginId';
};

export const PARSER_CORE_PARSEABLE_FILE_SCHEMA_VERSION = 1 as const;
export const PARSER_CORE_PARSE_BATCH_INPUT_SCHEMA_VERSION = 1 as const;
export const PARSER_CORE_POSITION_SCHEMA_VERSION = 1 as const;
export const PARSER_CORE_TEXT_RANGE_SCHEMA_VERSION = 1 as const;
export const PARSER_CORE_PARSER_DESCRIPTOR_SCHEMA_VERSION = 1 as const;
export const PARSER_CORE_DIAGNOSTIC_SCHEMA_VERSION = 1 as const;
export const PARSER_CORE_SYMBOL_SCHEMA_VERSION = 1 as const;
export const PARSER_CORE_IMPORT_SCHEMA_VERSION = 1 as const;
export const PARSER_CORE_EXPORT_SCHEMA_VERSION = 1 as const;
export const PARSER_CORE_REFERENCE_SCHEMA_VERSION = 1 as const;
export const PARSER_CORE_PARSE_UNIT_RESULT_SCHEMA_VERSION = 1 as const;
export const PARSER_CORE_PARSE_BATCH_RESULT_SCHEMA_VERSION = 1 as const;

export const PARSER_CORE_LANGUAGES = [
  'typescript',
  'tsx',
  'javascript',
  'jsx',
  'json',
  'unknown'
] as const;

export type ParserCoreLanguage = typeof PARSER_CORE_LANGUAGES[number];

export const PARSER_CORE_FILE_ROLES = [
  'source',
  'test',
  'manifest',
  'config',
  'declaration',
  'unknown'
] as const;

export type ParserCoreFileRole = typeof PARSER_CORE_FILE_ROLES[number];

export const PARSER_CORE_STATUSES = [
  'completed',
  'partial',
  'failed',
  'skipped'
] as const;

export type ParserCoreStatus = typeof PARSER_CORE_STATUSES[number];

export const PARSER_CORE_DIAGNOSTIC_SEVERITIES = [
  'info',
  'warning',
  'error',
  'fatal'
] as const;

export type ParserCoreDiagnosticSeverity = typeof PARSER_CORE_DIAGNOSTIC_SEVERITIES[number];

export const PARSER_CORE_SYMBOL_KINDS = [
  'module',
  'function',
  'class',
  'interface',
  'type',
  'enum',
  'variable',
  'constant',
  'method',
  'property',
  'component',
  'hook',
  'unknown'
] as const;

export type ParserCoreSymbolKind = typeof PARSER_CORE_SYMBOL_KINDS[number];

export const PARSER_CORE_IMPORT_KINDS = [
  'static',
  'dynamic',
  'type-only',
  'unknown'
] as const;

export type ParserCoreImportKind = typeof PARSER_CORE_IMPORT_KINDS[number];

export const PARSER_CORE_EXPORT_KINDS = [
  'named',
  'default',
  'namespace',
  'type-only',
  'unknown'
] as const;

export type ParserCoreExportKind = typeof PARSER_CORE_EXPORT_KINDS[number];

export const PARSER_CORE_REFERENCE_KINDS = [
  'identifier',
  'call',
  'type',
  'jsx',
  'decorator',
  'unknown'
] as const;

export type ParserCoreReferenceKind = typeof PARSER_CORE_REFERENCE_KINDS[number];

export interface ParserCoreParseableFile {
  readonly schemaVersion: typeof PARSER_CORE_PARSEABLE_FILE_SCHEMA_VERSION;
  readonly path: ParserCoreFilePath;
  readonly role: ParserCoreFileRole;
  readonly language: ParserCoreLanguage;
  readonly sizeBytes: number;
  readonly extension?: string;
}

export interface ParserCoreParseBatchInput {
  readonly schemaVersion: typeof PARSER_CORE_PARSE_BATCH_INPUT_SCHEMA_VERSION;
  readonly files: readonly ParserCoreParseableFile[];
}

export interface ParserCorePosition {
  readonly schemaVersion: typeof PARSER_CORE_POSITION_SCHEMA_VERSION;
  readonly offset: number;
  readonly line: number;
  readonly column: number;
}

export interface ParserCoreTextRange {
  readonly schemaVersion: typeof PARSER_CORE_TEXT_RANGE_SCHEMA_VERSION;
  readonly start: ParserCorePosition;
  readonly end: ParserCorePosition;
}

export interface ParserCoreParserDescriptor {
  readonly schemaVersion: typeof PARSER_CORE_PARSER_DESCRIPTOR_SCHEMA_VERSION;
  readonly id: ParserCorePluginId;
  readonly version: string;
  readonly language: ParserCoreLanguage;
}

export interface ParserCoreDiagnostic {
  readonly schemaVersion: typeof PARSER_CORE_DIAGNOSTIC_SCHEMA_VERSION;
  readonly code: ParserCoreDiagnosticCode;
  readonly severity: ParserCoreDiagnosticSeverity;
  readonly message: string;
  readonly retryable: boolean;
  readonly path?: ParserCoreFilePath;
  readonly range?: ParserCoreTextRange;
}

export interface ParserCoreSymbolRecord {
  readonly schemaVersion: typeof PARSER_CORE_SYMBOL_SCHEMA_VERSION;
  readonly localId: string;
  readonly name: string;
  readonly kind: ParserCoreSymbolKind;
  readonly qualifiedName?: string;
  readonly range?: ParserCoreTextRange;
}

export interface ParserCoreImportRecord {
  readonly schemaVersion: typeof PARSER_CORE_IMPORT_SCHEMA_VERSION;
  readonly moduleSpecifier: string;
  readonly kind: ParserCoreImportKind;
  readonly range?: ParserCoreTextRange;
}

export interface ParserCoreExportRecord {
  readonly schemaVersion: typeof PARSER_CORE_EXPORT_SCHEMA_VERSION;
  readonly kind: ParserCoreExportKind;
  readonly name?: string;
  readonly sourceModuleSpecifier?: string;
  readonly range?: ParserCoreTextRange;
}

export interface ParserCoreReferenceRecord {
  readonly schemaVersion: typeof PARSER_CORE_REFERENCE_SCHEMA_VERSION;
  readonly kind: ParserCoreReferenceKind;
  readonly targetName: string;
  readonly range?: ParserCoreTextRange;
}

export interface ParserCoreParseUnitSummary {
  readonly diagnosticCount: number;
  readonly symbolCount: number;
  readonly importCount: number;
  readonly exportCount: number;
  readonly referenceCount: number;
}

export interface ParserCoreParseUnitResult {
  readonly schemaVersion: typeof PARSER_CORE_PARSE_UNIT_RESULT_SCHEMA_VERSION;
  readonly status: ParserCoreStatus;
  readonly file: ParserCoreParseableFile;
  readonly parser: ParserCoreParserDescriptor;
  readonly diagnostics: readonly ParserCoreDiagnostic[];
  readonly symbols: readonly ParserCoreSymbolRecord[];
  readonly imports: readonly ParserCoreImportRecord[];
  readonly exports: readonly ParserCoreExportRecord[];
  readonly references: readonly ParserCoreReferenceRecord[];
  readonly summary: ParserCoreParseUnitSummary;
}

export interface ParserCoreParseBatchSummary {
  readonly fileCount: number;
  readonly completedFileCount: number;
  readonly partialFileCount: number;
  readonly failedFileCount: number;
  readonly skippedFileCount: number;
  readonly diagnosticCount: number;
  readonly symbolCount: number;
  readonly importCount: number;
  readonly exportCount: number;
  readonly referenceCount: number;
}

export interface ParserCoreParseBatchResult {
  readonly schemaVersion: typeof PARSER_CORE_PARSE_BATCH_RESULT_SCHEMA_VERSION;
  readonly status: ParserCoreStatus;
  readonly files: readonly ParserCoreParseUnitResult[];
  readonly diagnostics: readonly ParserCoreDiagnostic[];
  readonly summary: ParserCoreParseBatchSummary;
}

export interface ParserCoreExecutionContext {
  readonly timeoutMs?: number;
  readonly startedAt?: string;
}

export interface ParserCoreLanguageParserPlugin {
  readonly id: ParserCorePluginId;
  readonly supportedLanguages: readonly ParserCoreLanguage[];
  canParse(file: ParserCoreParseableFile): boolean;
  parse(
    file: ParserCoreParseableFile,
    context: ParserCoreExecutionContext
  ): Promise<ParserCoreParseUnitResult>;
  getVersion(): string;
}

const PARSER_CORE_DIAGNOSTIC_CODE_PATTERN = /^PARSER_[A-Z0-9_]{3,63}$/;
const PARSER_CORE_PLUGIN_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;
const SIMPLE_EXTENSION_PATTERN = /[/\\\s\u0000-\u001F\u007F]/;
const MAX_VERSION_LENGTH = 80;
const MAX_EXTENSION_LENGTH = 32;
const MAX_RECORD_NAME_LENGTH = 240;

export function parseParserCoreFilePath(value: string): ParserCoreFilePath {
  if (typeof value !== 'string') {
    throw new RangeError('Parser core file path must be a string.');
  }

  const normalized = value.replaceAll('\\', '/');

  if (normalized.length === 0) {
    throw new RangeError('Parser core file path must not be empty.');
  }

  if (normalized.trim() !== normalized) {
    throw new RangeError('Parser core file path must not have leading or trailing whitespace.');
  }

  if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) {
    throw new RangeError('Parser core file path must be repository-relative.');
  }

  if (normalized.includes('//')) {
    throw new RangeError('Parser core file path must not contain empty path segments.');
  }

  if (normalized.split('/').some((segment) => segment === '.' || segment === '..')) {
    throw new RangeError('Parser core file path must not contain traversal segments.');
  }

  if (CONTROL_CHARACTER_PATTERN.test(normalized)) {
    throw new RangeError('Parser core file path must not include control characters.');
  }

  return normalized as ParserCoreFilePath;
}

export function isParserCoreFilePath(value: unknown): value is ParserCoreFilePath {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    parseParserCoreFilePath(value);
    return true;
  } catch {
    return false;
  }
}

export function parseParserCoreDiagnosticCode(value: string): ParserCoreDiagnosticCode {
  if (typeof value !== 'string') {
    throw new RangeError('Parser core diagnostic code must be a string.');
  }

  if (value.trim() !== value) {
    throw new RangeError('Parser core diagnostic code must not have leading or trailing whitespace.');
  }

  if (!PARSER_CORE_DIAGNOSTIC_CODE_PATTERN.test(value)) {
    throw new RangeError('Parser core diagnostic code must be uppercase and use the PARSER_ prefix.');
  }

  return value as ParserCoreDiagnosticCode;
}

export function isParserCoreDiagnosticCode(value: unknown): value is ParserCoreDiagnosticCode {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    parseParserCoreDiagnosticCode(value);
    return true;
  } catch {
    return false;
  }
}

export function parseParserCorePluginId(value: string): ParserCorePluginId {
  if (typeof value !== 'string') {
    throw new RangeError('Parser core plugin id must be a string.');
  }

  if (value.trim() !== value) {
    throw new RangeError('Parser core plugin id must not have leading or trailing whitespace.');
  }

  if (value.length > 64 || !PARSER_CORE_PLUGIN_ID_PATTERN.test(value)) {
    throw new RangeError('Parser core plugin id must be lowercase kebab-case.');
  }

  return value as ParserCorePluginId;
}

export function isParserCorePluginId(value: unknown): value is ParserCorePluginId {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    parseParserCorePluginId(value);
    return true;
  } catch {
    return false;
  }
}

export function isParserCoreLanguage(value: unknown): value is ParserCoreLanguage {
  return typeof value === 'string' && PARSER_CORE_LANGUAGES.includes(value as ParserCoreLanguage);
}

export function isParserCoreFileRole(value: unknown): value is ParserCoreFileRole {
  return typeof value === 'string' && PARSER_CORE_FILE_ROLES.includes(value as ParserCoreFileRole);
}

export function isParserCoreStatus(value: unknown): value is ParserCoreStatus {
  return typeof value === 'string' && PARSER_CORE_STATUSES.includes(value as ParserCoreStatus);
}

export function isParserCoreDiagnosticSeverity(
  value: unknown
): value is ParserCoreDiagnosticSeverity {
  return typeof value === 'string'
    && PARSER_CORE_DIAGNOSTIC_SEVERITIES.includes(value as ParserCoreDiagnosticSeverity);
}

export function isParserCoreSymbolKind(value: unknown): value is ParserCoreSymbolKind {
  return typeof value === 'string' && PARSER_CORE_SYMBOL_KINDS.includes(value as ParserCoreSymbolKind);
}

export function isParserCoreImportKind(value: unknown): value is ParserCoreImportKind {
  return typeof value === 'string' && PARSER_CORE_IMPORT_KINDS.includes(value as ParserCoreImportKind);
}

export function isParserCoreExportKind(value: unknown): value is ParserCoreExportKind {
  return typeof value === 'string' && PARSER_CORE_EXPORT_KINDS.includes(value as ParserCoreExportKind);
}

export function isParserCoreReferenceKind(value: unknown): value is ParserCoreReferenceKind {
  return typeof value === 'string'
    && PARSER_CORE_REFERENCE_KINDS.includes(value as ParserCoreReferenceKind);
}

export function createParserCoreParseBatchInput(
  files: readonly ParserCoreParseableFile[]
): ParserCoreParseBatchInput {
  return toSerializableParserCoreParseBatchInput({
    schemaVersion: PARSER_CORE_PARSE_BATCH_INPUT_SCHEMA_VERSION,
    files
  });
}

export function toSerializableParserCoreParseBatchInput(
  input: ParserCoreParseBatchInput
): ParserCoreParseBatchInput {
  assertPlainObject(input, 'Parser core parse batch input');

  if (input.schemaVersion !== PARSER_CORE_PARSE_BATCH_INPUT_SCHEMA_VERSION) {
    throw new RangeError('Parser core parse batch input schema version is unsupported.');
  }

  const files = requireArray(input.files, 'Parser core parse batch input files')
    .map(toSerializableParserCoreParseableFile)
    .sort(compareParseableFiles);

  ensureUnique(files.map((file) => file.path), 'Parser core parse batch input file path');

  return {
    schemaVersion: PARSER_CORE_PARSE_BATCH_INPUT_SCHEMA_VERSION,
    files
  };
}

export function toSerializableParserCoreParseableFile(
  file: ParserCoreParseableFile
): ParserCoreParseableFile {
  assertPlainObject(file, 'Parser core parseable file');

  if (file.schemaVersion !== PARSER_CORE_PARSEABLE_FILE_SCHEMA_VERSION) {
    throw new RangeError('Parser core parseable file schema version is unsupported.');
  }

  if (!isParserCoreFileRole(file.role)) {
    throw new RangeError('Parser core parseable file role is unsupported.');
  }

  if (!isParserCoreLanguage(file.language)) {
    throw new RangeError('Parser core parseable file language is unsupported.');
  }

  assertNonNegativeInteger(file.sizeBytes, 'Parser core parseable file sizeBytes');

  return withOptionalExtension({
    schemaVersion: PARSER_CORE_PARSEABLE_FILE_SCHEMA_VERSION,
    path: parseParserCoreFilePath(file.path),
    role: file.role,
    language: file.language,
    sizeBytes: file.sizeBytes
  }, file.extension);
}

export function toSerializableParserCorePosition(position: ParserCorePosition): ParserCorePosition {
  assertPlainObject(position, 'Parser core position');

  if (position.schemaVersion !== PARSER_CORE_POSITION_SCHEMA_VERSION) {
    throw new RangeError('Parser core position schema version is unsupported.');
  }

  assertNonNegativeInteger(position.offset, 'Parser core position offset');
  assertPositiveInteger(position.line, 'Parser core position line');
  assertPositiveInteger(position.column, 'Parser core position column');

  return {
    schemaVersion: PARSER_CORE_POSITION_SCHEMA_VERSION,
    offset: position.offset,
    line: position.line,
    column: position.column
  };
}

export function toSerializableParserCoreTextRange(range: ParserCoreTextRange): ParserCoreTextRange {
  assertPlainObject(range, 'Parser core text range');

  if (range.schemaVersion !== PARSER_CORE_TEXT_RANGE_SCHEMA_VERSION) {
    throw new RangeError('Parser core text range schema version is unsupported.');
  }

  const start = toSerializableParserCorePosition(range.start);
  const end = toSerializableParserCorePosition(range.end);

  if (comparePositions(start, end) > 0) {
    throw new RangeError('Parser core text range start must be before or equal to end.');
  }

  return {
    schemaVersion: PARSER_CORE_TEXT_RANGE_SCHEMA_VERSION,
    start,
    end
  };
}

export function toSerializableParserCoreParserDescriptor(
  parser: ParserCoreParserDescriptor
): ParserCoreParserDescriptor {
  assertPlainObject(parser, 'Parser core parser descriptor');

  if (parser.schemaVersion !== PARSER_CORE_PARSER_DESCRIPTOR_SCHEMA_VERSION) {
    throw new RangeError('Parser core parser descriptor schema version is unsupported.');
  }

  if (!isParserCoreLanguage(parser.language)) {
    throw new RangeError('Parser core parser descriptor language is unsupported.');
  }

  return {
    schemaVersion: PARSER_CORE_PARSER_DESCRIPTOR_SCHEMA_VERSION,
    id: parseParserCorePluginId(parser.id),
    version: parseParserVersion(parser.version),
    language: parser.language
  };
}

export function toSerializableParserCoreDiagnostic(
  diagnostic: ParserCoreDiagnostic
): ParserCoreDiagnostic {
  assertPlainObject(diagnostic, 'Parser core diagnostic');

  if (diagnostic.schemaVersion !== PARSER_CORE_DIAGNOSTIC_SCHEMA_VERSION) {
    throw new RangeError('Parser core diagnostic schema version is unsupported.');
  }

  if (!isParserCoreDiagnosticSeverity(diagnostic.severity)) {
    throw new RangeError('Parser core diagnostic severity is unsupported.');
  }

  assertNonEmptyRecordName(diagnostic.message, 'Parser core diagnostic message');

  return withOptionalRange(withOptionalPath({
    schemaVersion: PARSER_CORE_DIAGNOSTIC_SCHEMA_VERSION,
    code: parseParserCoreDiagnosticCode(diagnostic.code),
    severity: diagnostic.severity,
    message: diagnostic.message,
    retryable: assertBoolean(diagnostic.retryable, 'Parser core diagnostic retryable')
  }, diagnostic.path), diagnostic.range);
}

export function toSerializableParserCoreSymbolRecord(
  symbol: ParserCoreSymbolRecord
): ParserCoreSymbolRecord {
  assertPlainObject(symbol, 'Parser core symbol record');

  if (symbol.schemaVersion !== PARSER_CORE_SYMBOL_SCHEMA_VERSION) {
    throw new RangeError('Parser core symbol record schema version is unsupported.');
  }

  if (!isParserCoreSymbolKind(symbol.kind)) {
    throw new RangeError('Parser core symbol record kind is unsupported.');
  }

  return withOptionalRange(withOptionalQualifiedName({
    schemaVersion: PARSER_CORE_SYMBOL_SCHEMA_VERSION,
    localId: parseRecordToken(symbol.localId, 'Parser core symbol record localId'),
    name: parseRecordName(symbol.name, 'Parser core symbol record name'),
    kind: symbol.kind
  }, symbol.qualifiedName), symbol.range);
}

export function toSerializableParserCoreImportRecord(
  importRecord: ParserCoreImportRecord
): ParserCoreImportRecord {
  assertPlainObject(importRecord, 'Parser core import record');

  if (importRecord.schemaVersion !== PARSER_CORE_IMPORT_SCHEMA_VERSION) {
    throw new RangeError('Parser core import record schema version is unsupported.');
  }

  if (!isParserCoreImportKind(importRecord.kind)) {
    throw new RangeError('Parser core import record kind is unsupported.');
  }

  return withOptionalRange({
    schemaVersion: PARSER_CORE_IMPORT_SCHEMA_VERSION,
    moduleSpecifier: parseRecordName(importRecord.moduleSpecifier, 'Parser core import module specifier'),
    kind: importRecord.kind
  }, importRecord.range);
}

export function toSerializableParserCoreExportRecord(
  exportRecord: ParserCoreExportRecord
): ParserCoreExportRecord {
  assertPlainObject(exportRecord, 'Parser core export record');

  if (exportRecord.schemaVersion !== PARSER_CORE_EXPORT_SCHEMA_VERSION) {
    throw new RangeError('Parser core export record schema version is unsupported.');
  }

  if (!isParserCoreExportKind(exportRecord.kind)) {
    throw new RangeError('Parser core export record kind is unsupported.');
  }

  return withOptionalRange(withOptionalSourceModuleSpecifier(withOptionalName({
    schemaVersion: PARSER_CORE_EXPORT_SCHEMA_VERSION,
    kind: exportRecord.kind
  }, exportRecord.name), exportRecord.sourceModuleSpecifier), exportRecord.range);
}

export function toSerializableParserCoreReferenceRecord(
  reference: ParserCoreReferenceRecord
): ParserCoreReferenceRecord {
  assertPlainObject(reference, 'Parser core reference record');

  if (reference.schemaVersion !== PARSER_CORE_REFERENCE_SCHEMA_VERSION) {
    throw new RangeError('Parser core reference record schema version is unsupported.');
  }

  if (!isParserCoreReferenceKind(reference.kind)) {
    throw new RangeError('Parser core reference record kind is unsupported.');
  }

  return withOptionalRange({
    schemaVersion: PARSER_CORE_REFERENCE_SCHEMA_VERSION,
    kind: reference.kind,
    targetName: parseRecordName(reference.targetName, 'Parser core reference targetName')
  }, reference.range);
}

export function toSerializableParserCoreParseUnitResult(
  result: ParserCoreParseUnitResult
): ParserCoreParseUnitResult {
  assertPlainObject(result, 'Parser core parse unit result');

  if (result.schemaVersion !== PARSER_CORE_PARSE_UNIT_RESULT_SCHEMA_VERSION) {
    throw new RangeError('Parser core parse unit result schema version is unsupported.');
  }

  if (!isParserCoreStatus(result.status)) {
    throw new RangeError('Parser core parse unit result status is unsupported.');
  }

  const file = toSerializableParserCoreParseableFile(result.file);
  const parser = toSerializableParserCoreParserDescriptor(result.parser);
  const diagnostics = requireArray(result.diagnostics, 'Parser core parse unit diagnostics')
    .map(toSerializableParserCoreDiagnostic)
    .sort(compareDiagnostics);
  const symbols = requireArray(result.symbols, 'Parser core parse unit symbols')
    .map(toSerializableParserCoreSymbolRecord)
    .sort(compareSymbols);
  const imports = requireArray(result.imports, 'Parser core parse unit imports')
    .map(toSerializableParserCoreImportRecord)
    .sort(compareImports);
  const exports = requireArray(result.exports, 'Parser core parse unit exports')
    .map(toSerializableParserCoreExportRecord)
    .sort(compareExports);
  const references = requireArray(result.references, 'Parser core parse unit references')
    .map(toSerializableParserCoreReferenceRecord)
    .sort(compareReferences);
  const summary = toSerializableParserCoreParseUnitSummary(result.summary);

  ensureDiagnosticPathsMatchFile(diagnostics, file.path);
  ensureUnique(symbols.map((symbol) => symbol.localId), 'Parser core symbol localId');
  ensureParseUnitSummaryMatches(summary, diagnostics, symbols, imports, exports, references);

  return {
    schemaVersion: PARSER_CORE_PARSE_UNIT_RESULT_SCHEMA_VERSION,
    status: result.status,
    file,
    parser,
    diagnostics,
    symbols,
    imports,
    exports,
    references,
    summary
  };
}

export function isParserCoreParseUnitResult(value: unknown): value is ParserCoreParseUnitResult {
  try {
    toSerializableParserCoreParseUnitResult(value as ParserCoreParseUnitResult);
    return true;
  } catch {
    return false;
  }
}

export function assertParserCoreParseUnitResult(
  value: unknown
): asserts value is ParserCoreParseUnitResult {
  toSerializableParserCoreParseUnitResult(value as ParserCoreParseUnitResult);
}

export function toSerializableParserCoreParseBatchResult(
  result: ParserCoreParseBatchResult
): ParserCoreParseBatchResult {
  assertPlainObject(result, 'Parser core parse batch result');

  if (result.schemaVersion !== PARSER_CORE_PARSE_BATCH_RESULT_SCHEMA_VERSION) {
    throw new RangeError('Parser core parse batch result schema version is unsupported.');
  }

  if (!isParserCoreStatus(result.status)) {
    throw new RangeError('Parser core parse batch result status is unsupported.');
  }

  const files = requireArray(result.files, 'Parser core parse batch files')
    .map(toSerializableParserCoreParseUnitResult)
    .sort(compareParseUnitResults);
  const diagnostics = requireArray(result.diagnostics, 'Parser core parse batch diagnostics')
    .map(toSerializableParserCoreDiagnostic)
    .sort(compareDiagnostics);
  const summary = toSerializableParserCoreParseBatchSummary(result.summary);

  ensureUnique(files.map((fileResult) => fileResult.file.path), 'Parser core parse batch file path');
  ensureParseBatchSummaryMatches(summary, files, diagnostics);

  return {
    schemaVersion: PARSER_CORE_PARSE_BATCH_RESULT_SCHEMA_VERSION,
    status: result.status,
    files,
    diagnostics,
    summary
  };
}

export function isParserCoreParseBatchResult(value: unknown): value is ParserCoreParseBatchResult {
  try {
    toSerializableParserCoreParseBatchResult(value as ParserCoreParseBatchResult);
    return true;
  } catch {
    return false;
  }
}

export function assertParserCoreParseBatchResult(
  value: unknown
): asserts value is ParserCoreParseBatchResult {
  toSerializableParserCoreParseBatchResult(value as ParserCoreParseBatchResult);
}

function toSerializableParserCoreParseUnitSummary(
  summary: ParserCoreParseUnitSummary
): ParserCoreParseUnitSummary {
  assertPlainObject(summary, 'Parser core parse unit summary');
  assertNonNegativeInteger(summary.diagnosticCount, 'Parser core parse unit summary diagnosticCount');
  assertNonNegativeInteger(summary.symbolCount, 'Parser core parse unit summary symbolCount');
  assertNonNegativeInteger(summary.importCount, 'Parser core parse unit summary importCount');
  assertNonNegativeInteger(summary.exportCount, 'Parser core parse unit summary exportCount');
  assertNonNegativeInteger(summary.referenceCount, 'Parser core parse unit summary referenceCount');

  return {
    diagnosticCount: summary.diagnosticCount,
    symbolCount: summary.symbolCount,
    importCount: summary.importCount,
    exportCount: summary.exportCount,
    referenceCount: summary.referenceCount
  };
}

function toSerializableParserCoreParseBatchSummary(
  summary: ParserCoreParseBatchSummary
): ParserCoreParseBatchSummary {
  assertPlainObject(summary, 'Parser core parse batch summary');
  assertNonNegativeInteger(summary.fileCount, 'Parser core parse batch summary fileCount');
  assertNonNegativeInteger(summary.completedFileCount, 'Parser core parse batch summary completedFileCount');
  assertNonNegativeInteger(summary.partialFileCount, 'Parser core parse batch summary partialFileCount');
  assertNonNegativeInteger(summary.failedFileCount, 'Parser core parse batch summary failedFileCount');
  assertNonNegativeInteger(summary.skippedFileCount, 'Parser core parse batch summary skippedFileCount');
  assertNonNegativeInteger(summary.diagnosticCount, 'Parser core parse batch summary diagnosticCount');
  assertNonNegativeInteger(summary.symbolCount, 'Parser core parse batch summary symbolCount');
  assertNonNegativeInteger(summary.importCount, 'Parser core parse batch summary importCount');
  assertNonNegativeInteger(summary.exportCount, 'Parser core parse batch summary exportCount');
  assertNonNegativeInteger(summary.referenceCount, 'Parser core parse batch summary referenceCount');

  return {
    fileCount: summary.fileCount,
    completedFileCount: summary.completedFileCount,
    partialFileCount: summary.partialFileCount,
    failedFileCount: summary.failedFileCount,
    skippedFileCount: summary.skippedFileCount,
    diagnosticCount: summary.diagnosticCount,
    symbolCount: summary.symbolCount,
    importCount: summary.importCount,
    exportCount: summary.exportCount,
    referenceCount: summary.referenceCount
  };
}

function ensureParseUnitSummaryMatches(
  summary: ParserCoreParseUnitSummary,
  diagnostics: readonly ParserCoreDiagnostic[],
  symbols: readonly ParserCoreSymbolRecord[],
  imports: readonly ParserCoreImportRecord[],
  exports: readonly ParserCoreExportRecord[],
  references: readonly ParserCoreReferenceRecord[]
): void {
  if (summary.diagnosticCount !== diagnostics.length) {
    throw new RangeError('Parser core parse unit summary diagnosticCount is inconsistent.');
  }

  if (summary.symbolCount !== symbols.length) {
    throw new RangeError('Parser core parse unit summary symbolCount is inconsistent.');
  }

  if (summary.importCount !== imports.length) {
    throw new RangeError('Parser core parse unit summary importCount is inconsistent.');
  }

  if (summary.exportCount !== exports.length) {
    throw new RangeError('Parser core parse unit summary exportCount is inconsistent.');
  }

  if (summary.referenceCount !== references.length) {
    throw new RangeError('Parser core parse unit summary referenceCount is inconsistent.');
  }
}

function ensureParseBatchSummaryMatches(
  summary: ParserCoreParseBatchSummary,
  files: readonly ParserCoreParseUnitResult[],
  diagnostics: readonly ParserCoreDiagnostic[]
): void {
  const completedFileCount = files.filter((file) => file.status === 'completed').length;
  const partialFileCount = files.filter((file) => file.status === 'partial').length;
  const failedFileCount = files.filter((file) => file.status === 'failed').length;
  const skippedFileCount = files.filter((file) => file.status === 'skipped').length;
  const diagnosticCount = files.reduce((sum, file) => sum + file.summary.diagnosticCount, diagnostics.length);
  const symbolCount = files.reduce((sum, file) => sum + file.summary.symbolCount, 0);
  const importCount = files.reduce((sum, file) => sum + file.summary.importCount, 0);
  const exportCount = files.reduce((sum, file) => sum + file.summary.exportCount, 0);
  const referenceCount = files.reduce((sum, file) => sum + file.summary.referenceCount, 0);

  if (summary.fileCount !== files.length) {
    throw new RangeError('Parser core parse batch summary fileCount is inconsistent.');
  }

  if (summary.completedFileCount !== completedFileCount) {
    throw new RangeError('Parser core parse batch summary completedFileCount is inconsistent.');
  }

  if (summary.partialFileCount !== partialFileCount) {
    throw new RangeError('Parser core parse batch summary partialFileCount is inconsistent.');
  }

  if (summary.failedFileCount !== failedFileCount) {
    throw new RangeError('Parser core parse batch summary failedFileCount is inconsistent.');
  }

  if (summary.skippedFileCount !== skippedFileCount) {
    throw new RangeError('Parser core parse batch summary skippedFileCount is inconsistent.');
  }

  if (summary.diagnosticCount !== diagnosticCount) {
    throw new RangeError('Parser core parse batch summary diagnosticCount is inconsistent.');
  }

  if (summary.symbolCount !== symbolCount) {
    throw new RangeError('Parser core parse batch summary symbolCount is inconsistent.');
  }

  if (summary.importCount !== importCount) {
    throw new RangeError('Parser core parse batch summary importCount is inconsistent.');
  }

  if (summary.exportCount !== exportCount) {
    throw new RangeError('Parser core parse batch summary exportCount is inconsistent.');
  }

  if (summary.referenceCount !== referenceCount) {
    throw new RangeError('Parser core parse batch summary referenceCount is inconsistent.');
  }
}

function ensureDiagnosticPathsMatchFile(
  diagnostics: readonly ParserCoreDiagnostic[],
  path: ParserCoreFilePath
): void {
  const mismatched = diagnostics.find((diagnostic) => diagnostic.path !== undefined && diagnostic.path !== path);

  if (mismatched !== undefined) {
    throw new RangeError(`Parser core diagnostic path ${mismatched.path} does not match parse unit file.`);
  }
}

function ensureUnique(values: readonly string[], label: string): void {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      throw new RangeError(`${label} must be unique: ${value}.`);
    }

    seen.add(value);
  }
}

function requireArray<T>(value: readonly T[], label: string): readonly T[] {
  if (!Array.isArray(value)) {
    throw new RangeError(`${label} must be an array.`);
  }

  return value;
}

function assertPlainObject(value: unknown, label: string): asserts value is Readonly<Record<string, unknown>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RangeError(`${label} must be an object.`);
  }
}

function assertBoolean(value: boolean, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new RangeError(`${label} must be a boolean.`);
  }

  return value;
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer.`);
  }
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${label} must be a positive safe integer.`);
  }
}

function assertNonEmptyRecordName(value: string, label: string): void {
  parseRecordName(value, label);
}

function parseParserVersion(value: string): string {
  if (typeof value !== 'string') {
    throw new RangeError('Parser core parser version must be a string.');
  }

  if (value.trim() !== value || value.length === 0 || value.length > MAX_VERSION_LENGTH) {
    throw new RangeError('Parser core parser version must be non-empty and trimmed.');
  }

  return value;
}

function parseRecordToken(value: string, label: string): string {
  const token = parseRecordName(value, label);

  if (/\s/.test(token)) {
    throw new RangeError(`${label} must not contain whitespace.`);
  }

  return token;
}

function parseRecordName(value: string, label: string): string {
  if (typeof value !== 'string') {
    throw new RangeError(`${label} must be a string.`);
  }

  if (value.trim() !== value || value.length === 0 || value.length > MAX_RECORD_NAME_LENGTH) {
    throw new RangeError(`${label} must be non-empty and trimmed.`);
  }

  if (CONTROL_CHARACTER_PATTERN.test(value)) {
    throw new RangeError(`${label} must not include control characters.`);
  }

  return value;
}

function normalizeExtension(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new RangeError('Parser core parseable file extension must be a string.');
  }

  if (value.length === 0) {
    return undefined;
  }

  if (value.trim() !== value || !value.startsWith('.') || value.length > MAX_EXTENSION_LENGTH) {
    throw new RangeError('Parser core parseable file extension must start with a dot and be trimmed.');
  }

  if (SIMPLE_EXTENSION_PATTERN.test(value)) {
    throw new RangeError('Parser core parseable file extension must be a simple suffix.');
  }

  return value.toLowerCase();
}

function withOptionalExtension(
  file: Omit<ParserCoreParseableFile, 'extension'>,
  extension: string | undefined
): ParserCoreParseableFile {
  const normalizedExtension = normalizeExtension(extension);

  if (normalizedExtension === undefined) {
    return file;
  }

  return {
    ...file,
    extension: normalizedExtension
  };
}

function withOptionalPath(
  diagnostic: Omit<ParserCoreDiagnostic, 'path' | 'range'>,
  path: ParserCoreFilePath | undefined
): Omit<ParserCoreDiagnostic, 'range'> {
  if (path === undefined) {
    return diagnostic;
  }

  return {
    ...diagnostic,
    path: parseParserCoreFilePath(path)
  };
}

function withOptionalRange<T extends object>(value: T, range: ParserCoreTextRange | undefined): T {
  if (range === undefined) {
    return value;
  }

  return {
    ...value,
    range: toSerializableParserCoreTextRange(range)
  };
}

function withOptionalQualifiedName(
  symbol: Omit<ParserCoreSymbolRecord, 'qualifiedName' | 'range'>,
  qualifiedName: string | undefined
): Omit<ParserCoreSymbolRecord, 'range'> {
  if (qualifiedName === undefined) {
    return symbol;
  }

  return {
    ...symbol,
    qualifiedName: parseRecordName(qualifiedName, 'Parser core symbol record qualifiedName')
  };
}

function withOptionalName(
  exportRecord: Omit<ParserCoreExportRecord, 'name' | 'sourceModuleSpecifier' | 'range'>,
  name: string | undefined
): Omit<ParserCoreExportRecord, 'sourceModuleSpecifier' | 'range'> {
  if (name === undefined) {
    return exportRecord;
  }

  return {
    ...exportRecord,
    name: parseRecordName(name, 'Parser core export record name')
  };
}

function withOptionalSourceModuleSpecifier(
  exportRecord: Omit<ParserCoreExportRecord, 'sourceModuleSpecifier' | 'range'>,
  sourceModuleSpecifier: string | undefined
): Omit<ParserCoreExportRecord, 'range'> {
  if (sourceModuleSpecifier === undefined) {
    return exportRecord;
  }

  return {
    ...exportRecord,
    sourceModuleSpecifier: parseRecordName(
      sourceModuleSpecifier,
      'Parser core export record sourceModuleSpecifier'
    )
  };
}

function compareParseableFiles(left: ParserCoreParseableFile, right: ParserCoreParseableFile): number {
  return left.path.localeCompare(right.path);
}

function compareParseUnitResults(
  left: ParserCoreParseUnitResult,
  right: ParserCoreParseUnitResult
): number {
  return left.file.path.localeCompare(right.file.path);
}

function compareDiagnostics(left: ParserCoreDiagnostic, right: ParserCoreDiagnostic): number {
  return compareStrings(left.path ?? '', right.path ?? '')
    || compareStrings(left.code, right.code)
    || compareStrings(left.message, right.message);
}

function compareSymbols(left: ParserCoreSymbolRecord, right: ParserCoreSymbolRecord): number {
  return compareStrings(left.localId, right.localId);
}

function compareImports(left: ParserCoreImportRecord, right: ParserCoreImportRecord): number {
  return compareStrings(left.moduleSpecifier, right.moduleSpecifier) || compareStrings(left.kind, right.kind);
}

function compareExports(left: ParserCoreExportRecord, right: ParserCoreExportRecord): number {
  return compareStrings(left.name ?? '', right.name ?? '')
    || compareStrings(left.sourceModuleSpecifier ?? '', right.sourceModuleSpecifier ?? '')
    || compareStrings(left.kind, right.kind);
}

function compareReferences(left: ParserCoreReferenceRecord, right: ParserCoreReferenceRecord): number {
  return compareStrings(left.targetName, right.targetName) || compareStrings(left.kind, right.kind);
}

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right);
}

function comparePositions(left: ParserCorePosition, right: ParserCorePosition): number {
  return left.offset - right.offset || left.line - right.line || left.column - right.column;
}

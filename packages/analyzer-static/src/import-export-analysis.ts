import {
  parseParserCoreFilePath,
  toSerializableParserCoreParseBatchResult,
  toSerializableParserCoreParseUnitResult,
  type ParserCoreExportKind,
  type ParserCoreImportKind,
  type ParserCoreParseBatchResult,
  type ParserCoreParseUnitResult,
  type ParserCoreFilePath,
  type ParserCoreStatus,
  type ParserCoreTextRange
} from '@codestellation/parser-core';

export declare const analyzerStaticDiagnosticCodeBrand: unique symbol;

export type AnalyzerStaticDiagnosticCode = string & {
  readonly [analyzerStaticDiagnosticCodeBrand]: 'AnalyzerStaticDiagnosticCode';
};

export const ANALYZER_STATIC_IMPORT_REFERENCE_SCHEMA_VERSION = 1 as const;
export const ANALYZER_STATIC_EXPORT_REFERENCE_SCHEMA_VERSION = 1 as const;
export const ANALYZER_STATIC_FILE_ANALYSIS_SCHEMA_VERSION = 1 as const;
export const ANALYZER_STATIC_IMPORT_EXPORT_ANALYSIS_RESULT_SCHEMA_VERSION = 1 as const;
export const ANALYZER_STATIC_ANALYZER_DESCRIPTOR_SCHEMA_VERSION = 1 as const;
export const ANALYZER_STATIC_DIAGNOSTIC_SCHEMA_VERSION = 1 as const;

export const ANALYZER_STATIC_ANALYZER_ID = 'static-import-export-analyzer' as const;
export const ANALYZER_STATIC_ANALYZER_VERSION = '0.1.0' as const;

export const ANALYZER_STATIC_MODULE_SPECIFIER_KINDS = [
  'relative',
  'absolute',
  'package',
  'builtin',
  'unknown'
] as const;

export type AnalyzerStaticModuleSpecifierKind = typeof ANALYZER_STATIC_MODULE_SPECIFIER_KINDS[number];

export const ANALYZER_STATIC_DIAGNOSTIC_SEVERITIES = [
  'info',
  'warning',
  'error',
  'fatal'
] as const;

export type AnalyzerStaticDiagnosticSeverity = typeof ANALYZER_STATIC_DIAGNOSTIC_SEVERITIES[number];

export interface AnalyzerStaticAnalyzerDescriptor {
  readonly schemaVersion: typeof ANALYZER_STATIC_ANALYZER_DESCRIPTOR_SCHEMA_VERSION;
  readonly id: typeof ANALYZER_STATIC_ANALYZER_ID;
  readonly version: typeof ANALYZER_STATIC_ANALYZER_VERSION;
}

export interface AnalyzerStaticDiagnostic {
  readonly schemaVersion: typeof ANALYZER_STATIC_DIAGNOSTIC_SCHEMA_VERSION;
  readonly code: AnalyzerStaticDiagnosticCode;
  readonly severity: AnalyzerStaticDiagnosticSeverity;
  readonly message: string;
  readonly retryable: boolean;
  readonly path?: ParserCoreFilePath;
}

export interface AnalyzerStaticImportReference {
  readonly schemaVersion: typeof ANALYZER_STATIC_IMPORT_REFERENCE_SCHEMA_VERSION;
  readonly filePath: ParserCoreFilePath;
  readonly moduleSpecifier: string;
  readonly specifierKind: AnalyzerStaticModuleSpecifierKind;
  readonly importKind: ParserCoreImportKind;
  readonly isTypeOnly: boolean;
  readonly isDynamic: boolean;
  readonly range?: ParserCoreTextRange;
}

export interface AnalyzerStaticExportReference {
  readonly schemaVersion: typeof ANALYZER_STATIC_EXPORT_REFERENCE_SCHEMA_VERSION;
  readonly filePath: ParserCoreFilePath;
  readonly exportKind: ParserCoreExportKind;
  readonly name?: string;
  readonly sourceModuleSpecifier?: string;
  readonly sourceSpecifierKind?: AnalyzerStaticModuleSpecifierKind;
  readonly isTypeOnly: boolean;
  readonly isReExport: boolean;
  readonly range?: ParserCoreTextRange;
}

export interface AnalyzerStaticFileAnalysisSummary {
  readonly importCount: number;
  readonly exportCount: number;
  readonly typeOnlyImportCount: number;
  readonly dynamicImportCount: number;
  readonly reExportCount: number;
  readonly typeOnlyExportCount: number;
  readonly diagnosticCount: number;
}

export interface AnalyzerStaticFileAnalysis {
  readonly schemaVersion: typeof ANALYZER_STATIC_FILE_ANALYSIS_SCHEMA_VERSION;
  readonly filePath: ParserCoreFilePath;
  readonly parserStatus: ParserCoreStatus;
  readonly status: ParserCoreStatus;
  readonly imports: readonly AnalyzerStaticImportReference[];
  readonly exports: readonly AnalyzerStaticExportReference[];
  readonly diagnostics: readonly AnalyzerStaticDiagnostic[];
  readonly summary: AnalyzerStaticFileAnalysisSummary;
}

export interface AnalyzerStaticImportExportAnalysisSummary {
  readonly fileCount: number;
  readonly completedFileCount: number;
  readonly partialFileCount: number;
  readonly failedFileCount: number;
  readonly skippedFileCount: number;
  readonly importCount: number;
  readonly exportCount: number;
  readonly typeOnlyImportCount: number;
  readonly dynamicImportCount: number;
  readonly reExportCount: number;
  readonly typeOnlyExportCount: number;
  readonly diagnosticCount: number;
}

export interface AnalyzerStaticImportExportAnalysisResult {
  readonly schemaVersion: typeof ANALYZER_STATIC_IMPORT_EXPORT_ANALYSIS_RESULT_SCHEMA_VERSION;
  readonly status: ParserCoreStatus;
  readonly analyzer: AnalyzerStaticAnalyzerDescriptor;
  readonly files: readonly AnalyzerStaticFileAnalysis[];
  readonly imports: readonly AnalyzerStaticImportReference[];
  readonly exports: readonly AnalyzerStaticExportReference[];
  readonly diagnostics: readonly AnalyzerStaticDiagnostic[];
  readonly summary: AnalyzerStaticImportExportAnalysisSummary;
}

const ANALYZER_STATIC_DIAGNOSTIC_CODE_PATTERN = /^ANALYZER_STATIC_[A-Z0-9_]{3,80}$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;
const MAX_SPECIFIER_LENGTH = 360;
const MAX_RECORD_NAME_LENGTH = 240;

const ANALYZER_STATIC_PARSE_UNIT_SKIPPED = parseAnalyzerStaticDiagnosticCode(
  'ANALYZER_STATIC_PARSE_UNIT_SKIPPED'
);
const ANALYZER_STATIC_PARSE_UNIT_FAILED = parseAnalyzerStaticDiagnosticCode(
  'ANALYZER_STATIC_PARSE_UNIT_FAILED'
);

export function parseAnalyzerStaticDiagnosticCode(value: string): AnalyzerStaticDiagnosticCode {
  if (typeof value !== 'string') {
    throw new RangeError('Analyzer static diagnostic code must be a string.');
  }

  if (value.trim() !== value) {
    throw new RangeError('Analyzer static diagnostic code must not have leading or trailing whitespace.');
  }

  if (!ANALYZER_STATIC_DIAGNOSTIC_CODE_PATTERN.test(value)) {
    throw new RangeError('Analyzer static diagnostic code must use the ANALYZER_STATIC_ prefix.');
  }

  return value as AnalyzerStaticDiagnosticCode;
}

export function isAnalyzerStaticDiagnosticCode(value: unknown): value is AnalyzerStaticDiagnosticCode {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    parseAnalyzerStaticDiagnosticCode(value);
    return true;
  } catch {
    return false;
  }
}

export function extractImportsAndExportsFromParseUnit(
  parseUnit: ParserCoreParseUnitResult
): AnalyzerStaticFileAnalysis {
  const normalizedParseUnit = toSerializableParserCoreParseUnitResult(parseUnit);
  const diagnostics: AnalyzerStaticDiagnostic[] = [];

  if (normalizedParseUnit.status === 'skipped') {
    diagnostics.push(createDiagnostic(
      ANALYZER_STATIC_PARSE_UNIT_SKIPPED,
      'info',
      'Static import/export analysis skipped this file because the parser skipped it.',
      normalizedParseUnit.file.path
    ));
  }

  if (normalizedParseUnit.status === 'failed') {
    diagnostics.push(createDiagnostic(
      ANALYZER_STATIC_PARSE_UNIT_FAILED,
      'warning',
      'Static import/export analysis could not trust this file because parsing failed.',
      normalizedParseUnit.file.path
    ));
  }

  return toSerializableAnalyzerStaticFileAnalysis({
    schemaVersion: ANALYZER_STATIC_FILE_ANALYSIS_SCHEMA_VERSION,
    filePath: normalizedParseUnit.file.path,
    parserStatus: normalizedParseUnit.status,
    status: determineFileAnalysisStatus(normalizedParseUnit.status, diagnostics),
    imports: normalizedParseUnit.status === 'failed'
      ? []
      : normalizedParseUnit.imports.map((importRecord) => ({
        schemaVersion: ANALYZER_STATIC_IMPORT_REFERENCE_SCHEMA_VERSION,
        filePath: normalizedParseUnit.file.path,
        moduleSpecifier: importRecord.moduleSpecifier,
        specifierKind: classifyModuleSpecifier(importRecord.moduleSpecifier),
        importKind: importRecord.kind,
        isTypeOnly: importRecord.kind === 'type-only',
        isDynamic: importRecord.kind === 'dynamic',
        ...(importRecord.range === undefined ? {} : { range: importRecord.range })
      })),
    exports: normalizedParseUnit.status === 'failed'
      ? []
      : normalizedParseUnit.exports.map((exportRecord) => ({
        schemaVersion: ANALYZER_STATIC_EXPORT_REFERENCE_SCHEMA_VERSION,
        filePath: normalizedParseUnit.file.path,
        exportKind: exportRecord.kind,
        ...(exportRecord.name === undefined ? {} : { name: exportRecord.name }),
        ...(exportRecord.sourceModuleSpecifier === undefined ? {} : {
          sourceModuleSpecifier: exportRecord.sourceModuleSpecifier,
          sourceSpecifierKind: classifyModuleSpecifier(exportRecord.sourceModuleSpecifier)
        }),
        isTypeOnly: exportRecord.kind === 'type-only',
        isReExport: exportRecord.sourceModuleSpecifier !== undefined,
        ...(exportRecord.range === undefined ? {} : { range: exportRecord.range })
      })),
    diagnostics,
    summary: createFileSummary(
      normalizedParseUnit.status === 'failed' ? [] : normalizedParseUnit.imports,
      normalizedParseUnit.status === 'failed' ? [] : normalizedParseUnit.exports,
      diagnostics
    )
  });
}

export function extractImportsAndExportsFromParseBatch(
  parseBatch: ParserCoreParseBatchResult
): AnalyzerStaticImportExportAnalysisResult {
  const normalizedBatch = toSerializableParserCoreParseBatchResult(parseBatch);
  const files = normalizedBatch.files.map(extractImportsAndExportsFromParseUnit);
  const imports = files.flatMap((file) => file.imports);
  const exports = files.flatMap((file) => file.exports);
  const diagnostics = files.flatMap((file) => file.diagnostics);
  const summary = createResultSummary(files, imports, exports, diagnostics);

  return toSerializableAnalyzerStaticImportExportAnalysisResult({
    schemaVersion: ANALYZER_STATIC_IMPORT_EXPORT_ANALYSIS_RESULT_SCHEMA_VERSION,
    status: determineResultStatus(summary),
    analyzer: createAnalyzerDescriptor(),
    files,
    imports,
    exports,
    diagnostics,
    summary
  });
}

export const analyzeStaticImportsAndExports = extractImportsAndExportsFromParseBatch;

export function isAnalyzerStaticImportExportAnalysisResult(
  value: unknown
): value is AnalyzerStaticImportExportAnalysisResult {
  try {
    toSerializableAnalyzerStaticImportExportAnalysisResult(
      value as AnalyzerStaticImportExportAnalysisResult
    );
    return true;
  } catch {
    return false;
  }
}

export function assertAnalyzerStaticImportExportAnalysisResult(
  value: unknown
): asserts value is AnalyzerStaticImportExportAnalysisResult {
  toSerializableAnalyzerStaticImportExportAnalysisResult(
    value as AnalyzerStaticImportExportAnalysisResult
  );
}

export function toSerializableAnalyzerStaticImportExportAnalysisResult(
  result: AnalyzerStaticImportExportAnalysisResult
): AnalyzerStaticImportExportAnalysisResult {
  assertPlainObject(result, 'Analyzer static import/export analysis result');

  if (result.schemaVersion !== ANALYZER_STATIC_IMPORT_EXPORT_ANALYSIS_RESULT_SCHEMA_VERSION) {
    throw new RangeError('Analyzer static import/export analysis result schema version is unsupported.');
  }

  if (!isParserCoreStatus(result.status)) {
    throw new RangeError('Analyzer static import/export analysis result status is unsupported.');
  }

  const analyzer = toSerializableAnalyzerStaticAnalyzerDescriptor(result.analyzer);
  const files = requireArray(result.files, 'Analyzer static import/export files')
    .map(toSerializableAnalyzerStaticFileAnalysis)
    .sort(compareFileAnalyses);
  const imports = requireArray(result.imports, 'Analyzer static import/export imports')
    .map(toSerializableAnalyzerStaticImportReference)
    .sort(compareImports);
  const exports = requireArray(result.exports, 'Analyzer static import/export exports')
    .map(toSerializableAnalyzerStaticExportReference)
    .sort(compareExports);
  const diagnostics = requireArray(result.diagnostics, 'Analyzer static import/export diagnostics')
    .map(toSerializableAnalyzerStaticDiagnostic)
    .sort(compareDiagnostics);
  const summary = toSerializableAnalyzerStaticImportExportAnalysisSummary(result.summary);

  ensureUnique(files.map((file) => file.filePath), 'Analyzer static file path');
  ensureFlattenedImportsMatchFiles(imports, files);
  ensureFlattenedExportsMatchFiles(exports, files);
  ensureFlattenedDiagnosticsMatchFiles(diagnostics, files);
  ensureResultSummaryMatches(summary, files, imports, exports, diagnostics);
  ensureResultStatusMatches(result.status, summary);

  return {
    schemaVersion: ANALYZER_STATIC_IMPORT_EXPORT_ANALYSIS_RESULT_SCHEMA_VERSION,
    status: result.status,
    analyzer,
    files,
    imports,
    exports,
    diagnostics,
    summary
  };
}

export function toSerializableAnalyzerStaticFileAnalysis(
  analysis: AnalyzerStaticFileAnalysis
): AnalyzerStaticFileAnalysis {
  assertPlainObject(analysis, 'Analyzer static file analysis');

  if (analysis.schemaVersion !== ANALYZER_STATIC_FILE_ANALYSIS_SCHEMA_VERSION) {
    throw new RangeError('Analyzer static file analysis schema version is unsupported.');
  }

  if (!isParserCoreStatus(analysis.parserStatus) || !isParserCoreStatus(analysis.status)) {
    throw new RangeError('Analyzer static file analysis status is unsupported.');
  }

  const filePath = parseParserCoreFilePath(analysis.filePath);
  const imports = requireArray(analysis.imports, 'Analyzer static file imports')
    .map(toSerializableAnalyzerStaticImportReference)
    .sort(compareImports);
  const exports = requireArray(analysis.exports, 'Analyzer static file exports')
    .map(toSerializableAnalyzerStaticExportReference)
    .sort(compareExports);
  const diagnostics = requireArray(analysis.diagnostics, 'Analyzer static file diagnostics')
    .map(toSerializableAnalyzerStaticDiagnostic)
    .sort(compareDiagnostics);
  const summary = toSerializableAnalyzerStaticFileAnalysisSummary(analysis.summary);

  if (imports.some((importReference) => importReference.filePath !== filePath)) {
    throw new RangeError('Analyzer static file import path must match file analysis path.');
  }

  if (exports.some((exportReference) => exportReference.filePath !== filePath)) {
    throw new RangeError('Analyzer static file export path must match file analysis path.');
  }

  if (diagnostics.some((diagnostic) => diagnostic.path !== undefined && diagnostic.path !== filePath)) {
    throw new RangeError('Analyzer static file diagnostic path must match file analysis path.');
  }

  ensureFileSummaryMatches(summary, imports, exports, diagnostics);

  return {
    schemaVersion: ANALYZER_STATIC_FILE_ANALYSIS_SCHEMA_VERSION,
    filePath,
    parserStatus: analysis.parserStatus,
    status: analysis.status,
    imports,
    exports,
    diagnostics,
    summary
  };
}

export function toSerializableAnalyzerStaticImportReference(
  importReference: AnalyzerStaticImportReference
): AnalyzerStaticImportReference {
  assertPlainObject(importReference, 'Analyzer static import reference');

  if (importReference.schemaVersion !== ANALYZER_STATIC_IMPORT_REFERENCE_SCHEMA_VERSION) {
    throw new RangeError('Analyzer static import reference schema version is unsupported.');
  }

  if (!isAnalyzerStaticModuleSpecifierKind(importReference.specifierKind)) {
    throw new RangeError('Analyzer static import reference specifierKind is unsupported.');
  }

  if (!isParserCoreImportKind(importReference.importKind)) {
    throw new RangeError('Analyzer static import reference importKind is unsupported.');
  }

  const moduleSpecifier = parseModuleSpecifier(importReference.moduleSpecifier);
  const specifierKind = classifyModuleSpecifier(moduleSpecifier);

  if (specifierKind !== importReference.specifierKind) {
    throw new RangeError('Analyzer static import reference specifierKind is inconsistent.');
  }

  if (importReference.isTypeOnly !== (importReference.importKind === 'type-only')) {
    throw new RangeError('Analyzer static import reference isTypeOnly is inconsistent.');
  }

  if (importReference.isDynamic !== (importReference.importKind === 'dynamic')) {
    throw new RangeError('Analyzer static import reference isDynamic is inconsistent.');
  }

  return withOptionalRange({
    schemaVersion: ANALYZER_STATIC_IMPORT_REFERENCE_SCHEMA_VERSION,
    filePath: parseParserCoreFilePath(importReference.filePath),
    moduleSpecifier,
    specifierKind,
    importKind: importReference.importKind,
    isTypeOnly: importReference.isTypeOnly,
    isDynamic: importReference.isDynamic
  }, importReference.range);
}

export function toSerializableAnalyzerStaticExportReference(
  exportReference: AnalyzerStaticExportReference
): AnalyzerStaticExportReference {
  assertPlainObject(exportReference, 'Analyzer static export reference');

  if (exportReference.schemaVersion !== ANALYZER_STATIC_EXPORT_REFERENCE_SCHEMA_VERSION) {
    throw new RangeError('Analyzer static export reference schema version is unsupported.');
  }

  if (!isParserCoreExportKind(exportReference.exportKind)) {
    throw new RangeError('Analyzer static export reference exportKind is unsupported.');
  }

  const sourceModuleSpecifier = optionalModuleSpecifier(exportReference.sourceModuleSpecifier);
  const sourceSpecifierKind = sourceModuleSpecifier === undefined
    ? undefined
    : classifyModuleSpecifier(sourceModuleSpecifier);

  if (sourceModuleSpecifier === undefined && exportReference.sourceSpecifierKind !== undefined) {
    throw new RangeError('Analyzer static export reference sourceSpecifierKind requires sourceModuleSpecifier.');
  }

  if (sourceSpecifierKind !== undefined && exportReference.sourceSpecifierKind !== sourceSpecifierKind) {
    throw new RangeError('Analyzer static export reference sourceSpecifierKind is inconsistent.');
  }

  if (exportReference.isTypeOnly !== (exportReference.exportKind === 'type-only')) {
    throw new RangeError('Analyzer static export reference isTypeOnly is inconsistent.');
  }

  if (exportReference.isReExport !== (sourceModuleSpecifier !== undefined)) {
    throw new RangeError('Analyzer static export reference isReExport is inconsistent.');
  }

  return withOptionalRange(withOptionalSourceModuleSpecifier(withOptionalSourceSpecifierKind(withOptionalName({
    schemaVersion: ANALYZER_STATIC_EXPORT_REFERENCE_SCHEMA_VERSION,
    filePath: parseParserCoreFilePath(exportReference.filePath),
    exportKind: exportReference.exportKind,
    isTypeOnly: exportReference.isTypeOnly,
    isReExport: exportReference.isReExport
  }, exportReference.name), sourceSpecifierKind), sourceModuleSpecifier), exportReference.range);
}

export function toSerializableAnalyzerStaticDiagnostic(
  diagnostic: AnalyzerStaticDiagnostic
): AnalyzerStaticDiagnostic {
  assertPlainObject(diagnostic, 'Analyzer static diagnostic');

  if (diagnostic.schemaVersion !== ANALYZER_STATIC_DIAGNOSTIC_SCHEMA_VERSION) {
    throw new RangeError('Analyzer static diagnostic schema version is unsupported.');
  }

  if (!isAnalyzerStaticDiagnosticSeverity(diagnostic.severity)) {
    throw new RangeError('Analyzer static diagnostic severity is unsupported.');
  }

  parseRecordName(diagnostic.message, 'Analyzer static diagnostic message');

  const normalized: Omit<AnalyzerStaticDiagnostic, 'path'> = {
    schemaVersion: ANALYZER_STATIC_DIAGNOSTIC_SCHEMA_VERSION,
    code: parseAnalyzerStaticDiagnosticCode(diagnostic.code),
    severity: diagnostic.severity,
    message: diagnostic.message,
    retryable: assertBoolean(diagnostic.retryable, 'Analyzer static diagnostic retryable')
  };

  if (diagnostic.path === undefined) {
    return normalized;
  }

  return {
    ...normalized,
    path: parseParserCoreFilePath(diagnostic.path)
  };
}

export function classifyModuleSpecifier(value: string): AnalyzerStaticModuleSpecifierKind {
  const specifier = parseModuleSpecifier(value);

  if (specifier.startsWith('.') || specifier.startsWith('..')) {
    return 'relative';
  }

  if (specifier.startsWith('/') || /^[A-Za-z]:[\\/]/.test(specifier)) {
    return 'absolute';
  }

  if (specifier.startsWith('node:')) {
    return 'builtin';
  }

  if (/^[A-Za-z0-9@][A-Za-z0-9@._/-]*$/.test(specifier)) {
    return 'package';
  }

  return 'unknown';
}

function createAnalyzerDescriptor(): AnalyzerStaticAnalyzerDescriptor {
  return {
    schemaVersion: ANALYZER_STATIC_ANALYZER_DESCRIPTOR_SCHEMA_VERSION,
    id: ANALYZER_STATIC_ANALYZER_ID,
    version: ANALYZER_STATIC_ANALYZER_VERSION
  };
}

function toSerializableAnalyzerStaticAnalyzerDescriptor(
  analyzer: AnalyzerStaticAnalyzerDescriptor
): AnalyzerStaticAnalyzerDescriptor {
  assertPlainObject(analyzer, 'Analyzer static analyzer descriptor');

  if (analyzer.schemaVersion !== ANALYZER_STATIC_ANALYZER_DESCRIPTOR_SCHEMA_VERSION) {
    throw new RangeError('Analyzer static analyzer descriptor schema version is unsupported.');
  }

  if (analyzer.id !== ANALYZER_STATIC_ANALYZER_ID) {
    throw new RangeError('Analyzer static analyzer descriptor id is unsupported.');
  }

  if (analyzer.version !== ANALYZER_STATIC_ANALYZER_VERSION) {
    throw new RangeError('Analyzer static analyzer descriptor version is unsupported.');
  }

  return createAnalyzerDescriptor();
}

function createDiagnostic(
  code: AnalyzerStaticDiagnosticCode,
  severity: AnalyzerStaticDiagnosticSeverity,
  message: string,
  path: ParserCoreFilePath
): AnalyzerStaticDiagnostic {
  return {
    schemaVersion: ANALYZER_STATIC_DIAGNOSTIC_SCHEMA_VERSION,
    code,
    severity,
    message,
    retryable: false,
    path
  };
}

function createFileSummary(
  imports: readonly { readonly kind: ParserCoreImportKind }[],
  exports: readonly { readonly kind: ParserCoreExportKind; readonly sourceModuleSpecifier?: string }[],
  diagnostics: readonly AnalyzerStaticDiagnostic[]
): AnalyzerStaticFileAnalysisSummary {
  return {
    importCount: imports.length,
    exportCount: exports.length,
    typeOnlyImportCount: imports.filter((importRecord) => importRecord.kind === 'type-only').length,
    dynamicImportCount: imports.filter((importRecord) => importRecord.kind === 'dynamic').length,
    reExportCount: exports.filter((exportRecord) => exportRecord.sourceModuleSpecifier !== undefined).length,
    typeOnlyExportCount: exports.filter((exportRecord) => exportRecord.kind === 'type-only').length,
    diagnosticCount: diagnostics.length
  };
}

function createResultSummary(
  files: readonly AnalyzerStaticFileAnalysis[],
  imports: readonly AnalyzerStaticImportReference[],
  exports: readonly AnalyzerStaticExportReference[],
  diagnostics: readonly AnalyzerStaticDiagnostic[]
): AnalyzerStaticImportExportAnalysisSummary {
  return {
    fileCount: files.length,
    completedFileCount: files.filter((file) => file.status === 'completed').length,
    partialFileCount: files.filter((file) => file.status === 'partial').length,
    failedFileCount: files.filter((file) => file.status === 'failed').length,
    skippedFileCount: files.filter((file) => file.status === 'skipped').length,
    importCount: imports.length,
    exportCount: exports.length,
    typeOnlyImportCount: imports.filter((importRecord) => importRecord.isTypeOnly).length,
    dynamicImportCount: imports.filter((importRecord) => importRecord.isDynamic).length,
    reExportCount: exports.filter((exportRecord) => exportRecord.isReExport).length,
    typeOnlyExportCount: exports.filter((exportRecord) => exportRecord.isTypeOnly).length,
    diagnosticCount: diagnostics.length
  };
}

function determineFileAnalysisStatus(
  parserStatus: ParserCoreStatus,
  diagnostics: readonly AnalyzerStaticDiagnostic[]
): ParserCoreStatus {
  if (parserStatus === 'failed') {
    return 'failed';
  }

  if (parserStatus === 'skipped') {
    return 'skipped';
  }

  if (parserStatus === 'partial' || diagnostics.some((diagnostic) => diagnostic.severity === 'warning')) {
    return 'partial';
  }

  return 'completed';
}

function determineResultStatus(summary: AnalyzerStaticImportExportAnalysisSummary): ParserCoreStatus {
  if (summary.fileCount === 0) {
    return 'skipped';
  }

  if (summary.failedFileCount > 0 && summary.completedFileCount === 0 && summary.partialFileCount === 0) {
    return 'failed';
  }

  if (summary.partialFileCount > 0 || summary.failedFileCount > 0 || summary.skippedFileCount > 0) {
    return 'partial';
  }

  return 'completed';
}

function toSerializableAnalyzerStaticFileAnalysisSummary(
  summary: AnalyzerStaticFileAnalysisSummary
): AnalyzerStaticFileAnalysisSummary {
  assertPlainObject(summary, 'Analyzer static file analysis summary');
  assertNonNegativeInteger(summary.importCount, 'Analyzer static file summary importCount');
  assertNonNegativeInteger(summary.exportCount, 'Analyzer static file summary exportCount');
  assertNonNegativeInteger(summary.typeOnlyImportCount, 'Analyzer static file summary typeOnlyImportCount');
  assertNonNegativeInteger(summary.dynamicImportCount, 'Analyzer static file summary dynamicImportCount');
  assertNonNegativeInteger(summary.reExportCount, 'Analyzer static file summary reExportCount');
  assertNonNegativeInteger(summary.typeOnlyExportCount, 'Analyzer static file summary typeOnlyExportCount');
  assertNonNegativeInteger(summary.diagnosticCount, 'Analyzer static file summary diagnosticCount');

  return {
    importCount: summary.importCount,
    exportCount: summary.exportCount,
    typeOnlyImportCount: summary.typeOnlyImportCount,
    dynamicImportCount: summary.dynamicImportCount,
    reExportCount: summary.reExportCount,
    typeOnlyExportCount: summary.typeOnlyExportCount,
    diagnosticCount: summary.diagnosticCount
  };
}

function toSerializableAnalyzerStaticImportExportAnalysisSummary(
  summary: AnalyzerStaticImportExportAnalysisSummary
): AnalyzerStaticImportExportAnalysisSummary {
  assertPlainObject(summary, 'Analyzer static import/export analysis summary');
  assertNonNegativeInteger(summary.fileCount, 'Analyzer static summary fileCount');
  assertNonNegativeInteger(summary.completedFileCount, 'Analyzer static summary completedFileCount');
  assertNonNegativeInteger(summary.partialFileCount, 'Analyzer static summary partialFileCount');
  assertNonNegativeInteger(summary.failedFileCount, 'Analyzer static summary failedFileCount');
  assertNonNegativeInteger(summary.skippedFileCount, 'Analyzer static summary skippedFileCount');
  assertNonNegativeInteger(summary.importCount, 'Analyzer static summary importCount');
  assertNonNegativeInteger(summary.exportCount, 'Analyzer static summary exportCount');
  assertNonNegativeInteger(summary.typeOnlyImportCount, 'Analyzer static summary typeOnlyImportCount');
  assertNonNegativeInteger(summary.dynamicImportCount, 'Analyzer static summary dynamicImportCount');
  assertNonNegativeInteger(summary.reExportCount, 'Analyzer static summary reExportCount');
  assertNonNegativeInteger(summary.typeOnlyExportCount, 'Analyzer static summary typeOnlyExportCount');
  assertNonNegativeInteger(summary.diagnosticCount, 'Analyzer static summary diagnosticCount');

  return {
    fileCount: summary.fileCount,
    completedFileCount: summary.completedFileCount,
    partialFileCount: summary.partialFileCount,
    failedFileCount: summary.failedFileCount,
    skippedFileCount: summary.skippedFileCount,
    importCount: summary.importCount,
    exportCount: summary.exportCount,
    typeOnlyImportCount: summary.typeOnlyImportCount,
    dynamicImportCount: summary.dynamicImportCount,
    reExportCount: summary.reExportCount,
    typeOnlyExportCount: summary.typeOnlyExportCount,
    diagnosticCount: summary.diagnosticCount
  };
}

function ensureFileSummaryMatches(
  summary: AnalyzerStaticFileAnalysisSummary,
  imports: readonly AnalyzerStaticImportReference[],
  exports: readonly AnalyzerStaticExportReference[],
  diagnostics: readonly AnalyzerStaticDiagnostic[]
): void {
  if (summary.importCount !== imports.length) {
    throw new RangeError('Analyzer static file summary importCount is inconsistent.');
  }

  if (summary.exportCount !== exports.length) {
    throw new RangeError('Analyzer static file summary exportCount is inconsistent.');
  }

  if (summary.typeOnlyImportCount !== imports.filter((importRecord) => importRecord.isTypeOnly).length) {
    throw new RangeError('Analyzer static file summary typeOnlyImportCount is inconsistent.');
  }

  if (summary.dynamicImportCount !== imports.filter((importRecord) => importRecord.isDynamic).length) {
    throw new RangeError('Analyzer static file summary dynamicImportCount is inconsistent.');
  }

  if (summary.reExportCount !== exports.filter((exportRecord) => exportRecord.isReExport).length) {
    throw new RangeError('Analyzer static file summary reExportCount is inconsistent.');
  }

  if (summary.typeOnlyExportCount !== exports.filter((exportRecord) => exportRecord.isTypeOnly).length) {
    throw new RangeError('Analyzer static file summary typeOnlyExportCount is inconsistent.');
  }

  if (summary.diagnosticCount !== diagnostics.length) {
    throw new RangeError('Analyzer static file summary diagnosticCount is inconsistent.');
  }
}

function ensureResultSummaryMatches(
  summary: AnalyzerStaticImportExportAnalysisSummary,
  files: readonly AnalyzerStaticFileAnalysis[],
  imports: readonly AnalyzerStaticImportReference[],
  exports: readonly AnalyzerStaticExportReference[],
  diagnostics: readonly AnalyzerStaticDiagnostic[]
): void {
  if (summary.fileCount !== files.length) {
    throw new RangeError('Analyzer static summary fileCount is inconsistent.');
  }

  if (summary.completedFileCount !== files.filter((file) => file.status === 'completed').length) {
    throw new RangeError('Analyzer static summary completedFileCount is inconsistent.');
  }

  if (summary.partialFileCount !== files.filter((file) => file.status === 'partial').length) {
    throw new RangeError('Analyzer static summary partialFileCount is inconsistent.');
  }

  if (summary.failedFileCount !== files.filter((file) => file.status === 'failed').length) {
    throw new RangeError('Analyzer static summary failedFileCount is inconsistent.');
  }

  if (summary.skippedFileCount !== files.filter((file) => file.status === 'skipped').length) {
    throw new RangeError('Analyzer static summary skippedFileCount is inconsistent.');
  }

  if (summary.importCount !== imports.length) {
    throw new RangeError('Analyzer static summary importCount is inconsistent.');
  }

  if (summary.exportCount !== exports.length) {
    throw new RangeError('Analyzer static summary exportCount is inconsistent.');
  }

  if (summary.typeOnlyImportCount !== imports.filter((importRecord) => importRecord.isTypeOnly).length) {
    throw new RangeError('Analyzer static summary typeOnlyImportCount is inconsistent.');
  }

  if (summary.dynamicImportCount !== imports.filter((importRecord) => importRecord.isDynamic).length) {
    throw new RangeError('Analyzer static summary dynamicImportCount is inconsistent.');
  }

  if (summary.reExportCount !== exports.filter((exportRecord) => exportRecord.isReExport).length) {
    throw new RangeError('Analyzer static summary reExportCount is inconsistent.');
  }

  if (summary.typeOnlyExportCount !== exports.filter((exportRecord) => exportRecord.isTypeOnly).length) {
    throw new RangeError('Analyzer static summary typeOnlyExportCount is inconsistent.');
  }

  if (summary.diagnosticCount !== diagnostics.length) {
    throw new RangeError('Analyzer static summary diagnosticCount is inconsistent.');
  }
}

function ensureResultStatusMatches(
  status: ParserCoreStatus,
  summary: AnalyzerStaticImportExportAnalysisSummary
): void {
  const expected = determineResultStatus(summary);

  if (status !== expected) {
    throw new RangeError('Analyzer static import/export analysis result status is inconsistent.');
  }
}

function ensureFlattenedImportsMatchFiles(
  imports: readonly AnalyzerStaticImportReference[],
  files: readonly AnalyzerStaticFileAnalysis[]
): void {
  const expected = files.flatMap((file) => file.imports).map(importIdentity).sort();
  const actual = imports.map(importIdentity).sort();

  if (!sameStrings(expected, actual)) {
    throw new RangeError('Analyzer static flattened imports do not match file imports.');
  }
}

function ensureFlattenedExportsMatchFiles(
  exports: readonly AnalyzerStaticExportReference[],
  files: readonly AnalyzerStaticFileAnalysis[]
): void {
  const expected = files.flatMap((file) => file.exports).map(exportIdentity).sort();
  const actual = exports.map(exportIdentity).sort();

  if (!sameStrings(expected, actual)) {
    throw new RangeError('Analyzer static flattened exports do not match file exports.');
  }
}

function ensureFlattenedDiagnosticsMatchFiles(
  diagnostics: readonly AnalyzerStaticDiagnostic[],
  files: readonly AnalyzerStaticFileAnalysis[]
): void {
  const expected = files.flatMap((file) => file.diagnostics).map(diagnosticIdentity).sort();
  const actual = diagnostics.map(diagnosticIdentity).sort();

  if (!sameStrings(expected, actual)) {
    throw new RangeError('Analyzer static flattened diagnostics do not match file diagnostics.');
  }
}

function importIdentity(importReference: AnalyzerStaticImportReference): string {
  return [
    importReference.filePath,
    importReference.moduleSpecifier,
    importReference.importKind,
    importReference.range?.start.offset ?? -1
  ].join('|');
}

function exportIdentity(exportReference: AnalyzerStaticExportReference): string {
  return [
    exportReference.filePath,
    exportReference.name ?? '',
    exportReference.exportKind,
    exportReference.sourceModuleSpecifier ?? '',
    exportReference.range?.start.offset ?? -1
  ].join('|');
}

function diagnosticIdentity(diagnostic: AnalyzerStaticDiagnostic): string {
  return [diagnostic.path ?? '', diagnostic.code, diagnostic.message].join('|');
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function parseModuleSpecifier(value: string): string {
  if (typeof value !== 'string') {
    throw new RangeError('Analyzer static module specifier must be a string.');
  }

  if (value.trim() !== value || value.length === 0 || value.length > MAX_SPECIFIER_LENGTH) {
    throw new RangeError('Analyzer static module specifier must be non-empty and trimmed.');
  }

  if (CONTROL_CHARACTER_PATTERN.test(value)) {
    throw new RangeError('Analyzer static module specifier must not include control characters.');
  }

  return value;
}

function optionalModuleSpecifier(value: string | undefined): string | undefined {
  return value === undefined ? undefined : parseModuleSpecifier(value);
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

function withOptionalName<T extends object>(value: T, name: string | undefined): T {
  if (name === undefined) {
    return value;
  }

  return {
    ...value,
    name: parseRecordName(name, 'Analyzer static export reference name')
  };
}

function withOptionalSourceSpecifierKind<T extends object>(
  value: T,
  sourceSpecifierKind: AnalyzerStaticModuleSpecifierKind | undefined
): T {
  if (sourceSpecifierKind === undefined) {
    return value;
  }

  return {
    ...value,
    sourceSpecifierKind
  };
}

function withOptionalSourceModuleSpecifier<T extends object>(
  value: T,
  sourceModuleSpecifier: string | undefined
): T {
  if (sourceModuleSpecifier === undefined) {
    return value;
  }

  return {
    ...value,
    sourceModuleSpecifier
  };
}

function withOptionalRange<T extends object>(value: T, range: ParserCoreTextRange | undefined): T {
  if (range === undefined) {
    return value;
  }

  return {
    ...value,
    range
  };
}

function isAnalyzerStaticDiagnosticSeverity(
  value: unknown
): value is AnalyzerStaticDiagnosticSeverity {
  return typeof value === 'string'
    && ANALYZER_STATIC_DIAGNOSTIC_SEVERITIES.includes(value as AnalyzerStaticDiagnosticSeverity);
}

function isAnalyzerStaticModuleSpecifierKind(
  value: unknown
): value is AnalyzerStaticModuleSpecifierKind {
  return typeof value === 'string'
    && ANALYZER_STATIC_MODULE_SPECIFIER_KINDS.includes(value as AnalyzerStaticModuleSpecifierKind);
}

function isParserCoreStatus(value: unknown): value is ParserCoreStatus {
  return value === 'completed' || value === 'partial' || value === 'failed' || value === 'skipped';
}

function isParserCoreImportKind(value: unknown): value is ParserCoreImportKind {
  return value === 'static' || value === 'dynamic' || value === 'type-only' || value === 'unknown';
}

function isParserCoreExportKind(value: unknown): value is ParserCoreExportKind {
  return value === 'named' || value === 'default' || value === 'namespace' || value === 'type-only' || value === 'unknown';
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

function ensureUnique(values: readonly string[], label: string): void {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      throw new RangeError(`${label} must be unique: ${value}.`);
    }

    seen.add(value);
  }
}

function compareFileAnalyses(left: AnalyzerStaticFileAnalysis, right: AnalyzerStaticFileAnalysis): number {
  return left.filePath.localeCompare(right.filePath);
}

function compareImports(
  left: AnalyzerStaticImportReference,
  right: AnalyzerStaticImportReference
): number {
  return compareStrings(left.filePath, right.filePath)
    || compareStrings(left.moduleSpecifier, right.moduleSpecifier)
    || compareStrings(left.importKind, right.importKind)
    || compareNumbers(left.range?.start.offset ?? -1, right.range?.start.offset ?? -1);
}

function compareExports(
  left: AnalyzerStaticExportReference,
  right: AnalyzerStaticExportReference
): number {
  return compareStrings(left.filePath, right.filePath)
    || compareStrings(left.name ?? '', right.name ?? '')
    || compareStrings(left.sourceModuleSpecifier ?? '', right.sourceModuleSpecifier ?? '')
    || compareStrings(left.exportKind, right.exportKind)
    || compareNumbers(left.range?.start.offset ?? -1, right.range?.start.offset ?? -1);
}

function compareDiagnostics(left: AnalyzerStaticDiagnostic, right: AnalyzerStaticDiagnostic): number {
  return compareStrings(left.path ?? '', right.path ?? '')
    || compareStrings(left.code, right.code)
    || compareStrings(left.message, right.message);
}

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right);
}

function compareNumbers(left: number, right: number): number {
  return left - right;
}

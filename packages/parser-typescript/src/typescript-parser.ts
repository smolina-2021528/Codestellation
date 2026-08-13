import {
  PARSER_CORE_DIAGNOSTIC_SCHEMA_VERSION,
  PARSER_CORE_EXPORT_SCHEMA_VERSION,
  PARSER_CORE_IMPORT_SCHEMA_VERSION,
  PARSER_CORE_PARSE_UNIT_RESULT_SCHEMA_VERSION,
  PARSER_CORE_PARSER_DESCRIPTOR_SCHEMA_VERSION,
  PARSER_CORE_POSITION_SCHEMA_VERSION,
  PARSER_CORE_REFERENCE_SCHEMA_VERSION,
  PARSER_CORE_SYMBOL_SCHEMA_VERSION,
  PARSER_CORE_TEXT_RANGE_SCHEMA_VERSION,
  parseParserCoreDiagnosticCode,
  parseParserCorePluginId,
  toSerializableParserCoreParseUnitResult,
  toSerializableParserCoreParseableFile,
  type ParserCoreDiagnostic,
  type ParserCoreExecutionContext,
  type ParserCoreExportKind,
  type ParserCoreExportRecord,
  type ParserCoreFileRole,
  type ParserCoreImportKind,
  type ParserCoreImportRecord,
  type ParserCoreLanguage,
  type ParserCoreLanguageParserPlugin,
  type ParserCoreParseUnitResult,
  type ParserCoreParseableFile,
  type ParserCoreParserDescriptor,
  type ParserCoreReferenceKind,
  type ParserCoreReferenceRecord,
  type ParserCoreStatus,
  type ParserCoreSymbolKind,
  type ParserCoreSymbolRecord,
  type ParserCoreTextRange
} from '@codestellation/parser-core';

export const TYPESCRIPT_PARSER_ID = parseParserCorePluginId('typescript-parser');
export const TYPESCRIPT_PARSER_VERSION = '0.1.2';
export const TYPESCRIPT_PARSER_SUPPORTED_LANGUAGES = [
  'typescript',
  'tsx'
] as const satisfies readonly ParserCoreLanguage[];

export interface TypeScriptSourceTextParseInput {
  readonly file: ParserCoreParseableFile;
  readonly sourceText: string;
}

interface TextMatch {
  readonly name: string;
  readonly kind: ParserCoreSymbolKind;
  readonly exportKind?: ParserCoreExportKind;
  readonly statementStart: number;
  readonly statementEnd: number;
}

interface IgnoredIdentifierSpan {
  readonly startOffset: number;
  readonly endOffset: number;
}

interface SourceLocationIndex {
  readonly text: string;
  readonly lineStarts: readonly number[];
}

const PARSER_TYPESCRIPT_SYNTAX_ERROR = parseParserCoreDiagnosticCode('PARSER_TYPESCRIPT_SYNTAX_ERROR');
const PARSER_TYPESCRIPT_FILE_SKIPPED = parseParserCoreDiagnosticCode('PARSER_TYPESCRIPT_FILE_SKIPPED');
const PARSER_TYPESCRIPT_SOURCE_TEXT_REQUIRED = parseParserCoreDiagnosticCode(
  'PARSER_TYPESCRIPT_SOURCE_TEXT_REQUIRED'
);

const IDENTIFIER_PATTERN = '[A-Za-z_$][A-Za-z0-9_$]*';
const TOP_LEVEL_PREFIX = String.raw`(?:^|\n)\s*`;
const STATIC_IMPORT_PATTERN = /(?:^|\n)\s*import\s+(type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]\s*;?/g;
const DYNAMIC_IMPORT_PATTERN = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const EXPORT_DECLARATION_PATTERN = /(?:^|\n)\s*export\s+(type\s+)?(?:(\*)\s*(?:as\s+([A-Za-z_$][A-Za-z0-9_$]*))?|\{([^}]*)\})\s*(?:from\s+['"]([^'"]+)['"])?\s*;?/g;
const EXPORT_ASSIGNMENT_PATTERN = /(?:^|\n)\s*export\s+default\s+(?!class\b|function\b)([^;\n]+)/g;
const VARIABLE_DECLARATION_PATTERN = new RegExp(
  `${TOP_LEVEL_PREFIX}(export\\s+)?(const|let|var)\\s+([^;\\n]+)`,
  'g'
);
const FUNCTION_DECLARATION_PATTERN = createNamedDeclarationPattern('function');
const CLASS_DECLARATION_PATTERN = createNamedDeclarationPattern('class');
const INTERFACE_DECLARATION_PATTERN = createNamedDeclarationPattern('interface');
const TYPE_DECLARATION_PATTERN = createNamedDeclarationPattern('type');
const ENUM_DECLARATION_PATTERN = createNamedDeclarationPattern('enum');
const IDENTIFIER_TOKEN_PATTERN = new RegExp(`\\b${IDENTIFIER_PATTERN}\\b`, 'g');
const PARAMETER_LIST_PATTERN = /\(([^()]*)\)\s*(?::\s*[A-Za-z_$][A-Za-z0-9_$.<>[\]|&\s,?]*)?\s*[{:=>]/g;

const TYPESCRIPT_IDENTIFIER_KEYWORDS = new Set([
  'abstract',
  'any',
  'as',
  'async',
  'await',
  'bigint',
  'boolean',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'constructor',
  'continue',
  'debugger',
  'declare',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'from',
  'function',
  'get',
  'if',
  'implements',
  'import',
  'in',
  'infer',
  'instanceof',
  'interface',
  'keyof',
  'let',
  'module',
  'namespace',
  'never',
  'new',
  'null',
  'number',
  'object',
  'of',
  'private',
  'protected',
  'public',
  'readonly',
  'require',
  'return',
  'satisfies',
  'set',
  'static',
  'string',
  'super',
  'switch',
  'symbol',
  'this',
  'throw',
  'true',
  'try',
  'type',
  'typeof',
  'undefined',
  'unknown',
  'var',
  'void',
  'while',
  'with',
  'yield'
]);

export class TypeScriptParser implements ParserCoreLanguageParserPlugin {
  public readonly id = TYPESCRIPT_PARSER_ID;
  public readonly supportedLanguages = TYPESCRIPT_PARSER_SUPPORTED_LANGUAGES;

  public canParse(file: ParserCoreParseableFile): boolean {
    return canParseTypeScriptFile(file);
  }

  public async parse(
    file: ParserCoreParseableFile,
    context: ParserCoreExecutionContext
  ): Promise<ParserCoreParseUnitResult> {
    void context;

    const parseableFile = toSerializableParserCoreParseableFile(file);

    if (!this.canParse(parseableFile)) {
      return createSkippedResult(
        parseableFile,
        'TypeScript parser only accepts TypeScript or TSX source, test or declaration files.',
        PARSER_TYPESCRIPT_FILE_SKIPPED
      );
    }

    return createSkippedResult(
      parseableFile,
      'TypeScript parser requires source text supplied by the local pipeline; it does not read files.',
      PARSER_TYPESCRIPT_SOURCE_TEXT_REQUIRED
    );
  }

  public parseSourceText(input: TypeScriptSourceTextParseInput): ParserCoreParseUnitResult {
    return parseTypeScriptSourceText(input);
  }

  public getVersion(): string {
    return TYPESCRIPT_PARSER_VERSION;
  }
}

export const typescriptParser = new TypeScriptParser();

export function createTypeScriptParser(): TypeScriptParser {
  return new TypeScriptParser();
}

export function canParseTypeScriptFile(file: ParserCoreParseableFile): boolean {
  const parseableFile = toSerializableParserCoreParseableFile(file);

  return isSupportedTypeScriptLanguage(parseableFile.language)
    && isParseableTypeScriptRole(parseableFile.role);
}

function isSupportedTypeScriptLanguage(language: ParserCoreLanguage): boolean {
  return language === 'typescript' || language === 'tsx';
}

function isParseableTypeScriptRole(role: ParserCoreFileRole): boolean {
  return role === 'source' || role === 'test' || role === 'declaration';
}

export function parseTypeScriptSourceText(
  input: TypeScriptSourceTextParseInput
): ParserCoreParseUnitResult {
  if (typeof input.sourceText !== 'string') {
    throw new RangeError('TypeScript parser sourceText must be a string.');
  }

  const file = toSerializableParserCoreParseableFile(input.file);

  if (!canParseTypeScriptFile(file)) {
    return createSkippedResult(
      file,
      'TypeScript parser skipped a file with an unsupported language or role.',
      PARSER_TYPESCRIPT_FILE_SKIPPED
    );
  }

  const locationIndex = createSourceLocationIndex(input.sourceText);
  const diagnostics = collectParseDiagnostics(locationIndex, file);
  const declarations = collectTopLevelDeclarations(input.sourceText);
  const symbols = declarations.map((declaration) => createSymbolRecord(locationIndex, declaration));
  const imports = collectImports(locationIndex);
  const exports = collectExports(locationIndex, declarations);
  const references = collectReferences(locationIndex, declarations);
  const status: ParserCoreStatus = diagnostics.length > 0 ? 'partial' : 'completed';

  return createParseUnitResult({
    status,
    file,
    diagnostics,
    symbols,
    imports,
    exports,
    references
  });
}

interface ParseUnitDraft {
  readonly status: ParserCoreStatus;
  readonly file: ParserCoreParseableFile;
  readonly diagnostics: readonly ParserCoreDiagnostic[];
  readonly symbols: readonly ParserCoreSymbolRecord[];
  readonly imports: readonly ParserCoreImportRecord[];
  readonly exports: readonly ParserCoreExportRecord[];
  readonly references: readonly ParserCoreReferenceRecord[];
}

function createParseUnitResult(draft: ParseUnitDraft): ParserCoreParseUnitResult {
  return toSerializableParserCoreParseUnitResult({
    schemaVersion: PARSER_CORE_PARSE_UNIT_RESULT_SCHEMA_VERSION,
    status: draft.status,
    file: draft.file,
    parser: createParserDescriptor(draft.file.language),
    diagnostics: draft.diagnostics,
    symbols: draft.symbols,
    imports: draft.imports,
    exports: draft.exports,
    references: draft.references,
    summary: {
      diagnosticCount: draft.diagnostics.length,
      symbolCount: draft.symbols.length,
      importCount: draft.imports.length,
      exportCount: draft.exports.length,
      referenceCount: draft.references.length
    }
  });
}

function createSkippedResult(
  file: ParserCoreParseableFile,
  message: string,
  code: ParserCoreDiagnostic['code']
): ParserCoreParseUnitResult {
  const diagnostic: ParserCoreDiagnostic = {
    schemaVersion: PARSER_CORE_DIAGNOSTIC_SCHEMA_VERSION,
    code,
    severity: 'info',
    message,
    retryable: false,
    path: file.path
  };

  return createParseUnitResult({
    status: 'skipped',
    file,
    diagnostics: [diagnostic],
    symbols: [],
    imports: [],
    exports: [],
    references: []
  });
}

function createParserDescriptor(language: ParserCoreLanguage): ParserCoreParserDescriptor {
  return {
    schemaVersion: PARSER_CORE_PARSER_DESCRIPTOR_SCHEMA_VERSION,
    id: TYPESCRIPT_PARSER_ID,
    version: TYPESCRIPT_PARSER_VERSION,
    language
  };
}

function collectTopLevelDeclarations(sourceText: string): readonly TextMatch[] {
  return [
    ...collectNamedDeclarations(sourceText, FUNCTION_DECLARATION_PATTERN, 'function'),
    ...collectNamedDeclarations(sourceText, CLASS_DECLARATION_PATTERN, 'class'),
    ...collectNamedDeclarations(sourceText, INTERFACE_DECLARATION_PATTERN, 'interface', 'type-only'),
    ...collectNamedDeclarations(sourceText, TYPE_DECLARATION_PATTERN, 'type', 'type-only'),
    ...collectNamedDeclarations(sourceText, ENUM_DECLARATION_PATTERN, 'enum'),
    ...collectVariableDeclarations(sourceText)
  ];
}

function collectNamedDeclarations(
  sourceText: string,
  pattern: RegExp,
  kind: ParserCoreSymbolKind,
  typeOnlyExportKind?: ParserCoreExportKind
): readonly TextMatch[] {
  const declarations: TextMatch[] = [];

  for (const match of sourceText.matchAll(pattern)) {
    const statementStart = offsetWithoutLeadingLineBreak(match);
    const exportPrefix = match[1] ?? '';
    const name = match[2];

    if (name === undefined) {
      continue;
    }

    declarations.push(withOptionalExportKind({
      name,
      kind,
      statementStart,
      statementEnd: findStatementEnd(sourceText, statementStart)
    }, getDeclarationExportKind(exportPrefix, typeOnlyExportKind)));
  }

  return declarations;
}

function collectVariableDeclarations(sourceText: string): readonly TextMatch[] {
  const declarations: TextMatch[] = [];

  for (const match of sourceText.matchAll(VARIABLE_DECLARATION_PATTERN)) {
    const statementStart = offsetWithoutLeadingLineBreak(match);
    const exportPrefix = match[1] ?? '';
    const declarationKind = match[2];
    const declarationList = match[3];

    if (declarationKind === undefined || declarationList === undefined) {
      continue;
    }

    const kind: ParserCoreSymbolKind = declarationKind === 'const' ? 'constant' : 'variable';
    const exportKind = getDeclarationExportKind(exportPrefix, undefined);

    for (const name of extractVariableNames(declarationList)) {
      declarations.push(withOptionalExportKind({
        name,
        kind,
        statementStart,
        statementEnd: findStatementEnd(sourceText, statementStart)
      }, exportKind));
    }
  }

  return declarations;
}

function collectImports(locationIndex: SourceLocationIndex): readonly ParserCoreImportRecord[] {
  const imports: ParserCoreImportRecord[] = [];

  for (const match of locationIndex.text.matchAll(STATIC_IMPORT_PATTERN)) {
    const moduleSpecifier = match[2];

    if (moduleSpecifier === undefined) {
      continue;
    }

    imports.push(createImportRecord(
      locationIndex,
      moduleSpecifier,
      match[1] === undefined ? 'static' : 'type-only',
      offsetWithoutLeadingLineBreak(match),
      offsetWithoutLeadingLineBreak(match) + match[0].trimStart().length
    ));
  }

  for (const match of locationIndex.text.matchAll(DYNAMIC_IMPORT_PATTERN)) {
    const moduleSpecifier = match[1];

    if (moduleSpecifier === undefined) {
      continue;
    }

    imports.push(createImportRecord(
      locationIndex,
      moduleSpecifier,
      'dynamic',
      match.index,
      match.index + match[0].length
    ));
  }

  return imports;
}

function collectExports(
  locationIndex: SourceLocationIndex,
  declarations: readonly TextMatch[]
): readonly ParserCoreExportRecord[] {
  const exports: ParserCoreExportRecord[] = [];

  for (const declaration of declarations) {
    if (declaration.exportKind === undefined) {
      continue;
    }

    exports.push(createExportRecord(
      locationIndex,
      declaration.exportKind,
      declaration.exportKind === 'default' ? declaration.name || 'default' : declaration.name,
      declaration.statementStart,
      declaration.statementEnd
    ));
  }

  exports.push(...collectExportDeclarations(locationIndex));
  exports.push(...collectExportAssignments(locationIndex));

  return exports;
}

function collectExportDeclarations(locationIndex: SourceLocationIndex): readonly ParserCoreExportRecord[] {
  const exports: ParserCoreExportRecord[] = [];

  for (const match of locationIndex.text.matchAll(EXPORT_DECLARATION_PATTERN)) {
    const statementStart = offsetWithoutLeadingLineBreak(match);
    const typeOnlyPrefix = match[1];
    const wildcard = match[2];
    const namespaceName = match[3];
    const namedClause = match[4];
    const sourceModuleSpecifier = match[5];
    const statementEnd = statementStart + match[0].trimStart().length;

    if (wildcard !== undefined) {
      exports.push(createExportRecord(
        locationIndex,
        'namespace',
        namespaceName,
        statementStart,
        statementEnd,
        sourceModuleSpecifier
      ));
      continue;
    }

    if (namedClause === undefined) {
      continue;
    }

    for (const exportedName of extractExportClauseNames(namedClause)) {
      exports.push(createExportRecord(
        locationIndex,
        typeOnlyPrefix === undefined ? 'named' : 'type-only',
        exportedName,
        statementStart,
        statementEnd,
        sourceModuleSpecifier
      ));
    }
  }

  return exports;
}

function collectExportAssignments(locationIndex: SourceLocationIndex): readonly ParserCoreExportRecord[] {
  const exports: ParserCoreExportRecord[] = [];

  for (const match of locationIndex.text.matchAll(EXPORT_ASSIGNMENT_PATTERN)) {
    const statementStart = offsetWithoutLeadingLineBreak(match);
    exports.push(createExportRecord(
      locationIndex,
      'default',
      'default',
      statementStart,
      findStatementEnd(locationIndex.text, statementStart)
    ));
  }

  return exports;
}

function collectParseDiagnostics(
  locationIndex: SourceLocationIndex,
  file: ParserCoreParseableFile
): readonly ParserCoreDiagnostic[] {
  const imbalance = findBracketImbalance(locationIndex.text);

  if (imbalance === undefined) {
    return [];
  }

  return [{
    schemaVersion: PARSER_CORE_DIAGNOSTIC_SCHEMA_VERSION,
    code: PARSER_TYPESCRIPT_SYNTAX_ERROR,
    severity: 'error',
    message: `TypeScript syntax error: ${imbalance.message}`,
    retryable: false,
    path: file.path,
    range: createRangeFromOffsets(locationIndex, imbalance.offset, imbalance.offset + 1)
  }];
}

function collectReferences(
  locationIndex: SourceLocationIndex,
  declarations: readonly TextMatch[]
): readonly ParserCoreReferenceRecord[] {
  const ignoredSpans = createIgnoredIdentifierSpans(locationIndex, declarations);
  const ignoredNames = collectIgnoredIdentifierNames(locationIndex.text);
  const references: ParserCoreReferenceRecord[] = [];

  for (const match of locationIndex.text.matchAll(IDENTIFIER_TOKEN_PATTERN)) {
    const targetName = match[0];
    const startOffset = match.index;
    const endOffset = startOffset + targetName.length;

    if (shouldSkipIdentifierReference(
      locationIndex.text,
      targetName,
      startOffset,
      endOffset,
      ignoredSpans,
      ignoredNames
    )) {
      continue;
    }

    references.push(createReferenceRecord(
      locationIndex,
      targetName,
      inferReferenceKind(locationIndex.text, endOffset),
      startOffset,
      endOffset
    ));
  }

  return references;
}

function createIgnoredIdentifierSpans(
  locationIndex: SourceLocationIndex,
  declarations: readonly TextMatch[]
): readonly IgnoredIdentifierSpan[] {
  return [
    ...collectImportStatementSpans(locationIndex),
    ...collectExportDeclarationSpans(locationIndex),
    ...collectDeclarationIdentifierSpans(locationIndex, declarations),
    ...collectParameterIdentifierSpans(locationIndex.text)
  ].sort((left, right) => left.startOffset - right.startOffset || left.endOffset - right.endOffset);
}

function collectImportStatementSpans(locationIndex: SourceLocationIndex): readonly IgnoredIdentifierSpan[] {
  const spans: IgnoredIdentifierSpan[] = [];

  for (const match of locationIndex.text.matchAll(STATIC_IMPORT_PATTERN)) {
    const startOffset = offsetWithoutLeadingLineBreak(match);
    spans.push({
      startOffset,
      endOffset: startOffset + match[0].trimStart().length
    });
  }

  return spans;
}

function collectExportDeclarationSpans(locationIndex: SourceLocationIndex): readonly IgnoredIdentifierSpan[] {
  const spans: IgnoredIdentifierSpan[] = [];

  for (const match of locationIndex.text.matchAll(EXPORT_DECLARATION_PATTERN)) {
    const startOffset = offsetWithoutLeadingLineBreak(match);
    spans.push({
      startOffset,
      endOffset: startOffset + match[0].trimStart().length
    });
  }

  return spans;
}

function collectDeclarationIdentifierSpans(
  locationIndex: SourceLocationIndex,
  declarations: readonly TextMatch[]
): readonly IgnoredIdentifierSpan[] {
  const spans: IgnoredIdentifierSpan[] = [];

  for (const declaration of declarations) {
    const nameOffset = findDeclarationNameOffset(locationIndex.text, declaration);

    if (nameOffset === undefined) {
      continue;
    }

    spans.push({
      startOffset: nameOffset,
      endOffset: nameOffset + declaration.name.length
    });
  }

  return spans;
}

function collectParameterIdentifierSpans(sourceText: string): readonly IgnoredIdentifierSpan[] {
  const spans: IgnoredIdentifierSpan[] = [];

  for (const parameterListMatch of sourceText.matchAll(PARAMETER_LIST_PATTERN)) {
    const parameterList = parameterListMatch[1];
    const parameterListStart = (parameterListMatch.index ?? 0) + 1;

    if (parameterList === undefined) {
      continue;
    }

    for (const parameterMatch of parameterList.matchAll(IDENTIFIER_TOKEN_PATTERN)) {
      const parameterName = parameterMatch[0];
      const parameterStart = parameterListStart + parameterMatch.index;

      if (TYPESCRIPT_IDENTIFIER_KEYWORDS.has(parameterName)) {
        continue;
      }

      if (isTypeAnnotationIdentifier(parameterList, parameterMatch.index)) {
        continue;
      }

      spans.push({
        startOffset: parameterStart,
        endOffset: parameterStart + parameterName.length
      });
    }
  }

  return spans;
}

function collectIgnoredIdentifierNames(sourceText: string): ReadonlySet<string> {
  const names = new Set<string>();

  for (const parameterListMatch of sourceText.matchAll(PARAMETER_LIST_PATTERN)) {
    const parameterList = parameterListMatch[1];

    if (parameterList === undefined) {
      continue;
    }

    for (const parameterMatch of parameterList.matchAll(IDENTIFIER_TOKEN_PATTERN)) {
      const parameterName = parameterMatch[0];

      if (TYPESCRIPT_IDENTIFIER_KEYWORDS.has(parameterName)) {
        continue;
      }

      if (isTypeAnnotationIdentifier(parameterList, parameterMatch.index)) {
        continue;
      }

      names.add(parameterName);
    }
  }

  return names;
}

function shouldSkipIdentifierReference(
  sourceText: string,
  targetName: string,
  startOffset: number,
  endOffset: number,
  ignoredSpans: readonly IgnoredIdentifierSpan[],
  ignoredNames: ReadonlySet<string>
): boolean {
  return TYPESCRIPT_IDENTIFIER_KEYWORDS.has(targetName)
    || ignoredNames.has(targetName)
    || isOffsetInsideIgnoredSpan(startOffset, endOffset, ignoredSpans)
    || isIdentifierInPropertyAccess(sourceText, startOffset)
    || isJsxTagIdentifier(sourceText, startOffset)
    || isJsxTextIdentifier(sourceText, startOffset, endOffset)
    || isObjectLiteralKey(sourceText, endOffset)
    || isTypeAnnotationIdentifier(sourceText, startOffset)
    || isStringOrCommentContext(sourceText, startOffset);
}

function isOffsetInsideIgnoredSpan(
  startOffset: number,
  endOffset: number,
  ignoredSpans: readonly IgnoredIdentifierSpan[]
): boolean {
  return ignoredSpans.some((span) => span.startOffset <= startOffset && endOffset <= span.endOffset);
}

function isIdentifierInPropertyAccess(sourceText: string, startOffset: number): boolean {
  return sourceText[startOffset - 1] === '.';
}

function isJsxTagIdentifier(sourceText: string, startOffset: number): boolean {
  const previousNonWhitespace = findPreviousNonWhitespace(sourceText, startOffset - 1);

  if (previousNonWhitespace === undefined) {
    return false;
  }

  if (sourceText[previousNonWhitespace] === '<') {
    return true;
  }

  return sourceText[previousNonWhitespace] === '/' && sourceText[previousNonWhitespace - 1] === '<';
}

function isJsxTextIdentifier(sourceText: string, startOffset: number, endOffset: number): boolean {
  const previousNonWhitespace = findPreviousNonWhitespace(sourceText, startOffset - 1);
  const nextNonWhitespace = findNextNonWhitespace(sourceText, endOffset);

  if (previousNonWhitespace === undefined || nextNonWhitespace === undefined) {
    return false;
  }

  return sourceText[previousNonWhitespace] === '>' && sourceText[nextNonWhitespace] === '<';
}

function isObjectLiteralKey(sourceText: string, endOffset: number): boolean {
  const nextNonWhitespace = findNextNonWhitespace(sourceText, endOffset);
  return nextNonWhitespace !== undefined && sourceText[nextNonWhitespace] === ':';
}

function isTypeAnnotationIdentifier(sourceText: string, startOffset: number): boolean {
  const previousNonWhitespace = findPreviousNonWhitespace(sourceText, startOffset - 1);
  return previousNonWhitespace !== undefined && sourceText[previousNonWhitespace] === ':';
}

function isStringOrCommentContext(sourceText: string, startOffset: number): boolean {
  let quote: string | undefined;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < startOffset; index += 1) {
    const char = sourceText[index];
    const nextChar = sourceText[index + 1];

    if (char === undefined) {
      continue;
    }

    if (lineComment) {
      if (char === '\n') {
        lineComment = false;
      }
      continue;
    }

    if (blockComment) {
      if (char === '*' && nextChar === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote !== undefined) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === quote) {
        quote = undefined;
      }

      continue;
    }

    if (char === '/' && nextChar === '/') {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && nextChar === '*') {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
    }
  }

  return quote !== undefined || lineComment || blockComment;
}

function inferReferenceKind(sourceText: string, endOffset: number): ParserCoreReferenceKind {
  const nextNonWhitespace = findNextNonWhitespace(sourceText, endOffset);

  return nextNonWhitespace !== undefined && sourceText[nextNonWhitespace] === '(' ? 'call' : 'identifier';
}

function createReferenceRecord(
  locationIndex: SourceLocationIndex,
  targetName: string,
  kind: ParserCoreReferenceKind,
  startOffset: number,
  endOffset: number
): ParserCoreReferenceRecord {
  return {
    schemaVersion: PARSER_CORE_REFERENCE_SCHEMA_VERSION,
    kind,
    targetName,
    range: createRangeFromOffsets(locationIndex, startOffset, endOffset)
  };
}

function findDeclarationNameOffset(sourceText: string, declaration: TextMatch): number | undefined {
  const offset = sourceText.indexOf(declaration.name, declaration.statementStart);

  if (offset < 0 || offset >= declaration.statementEnd) {
    return undefined;
  }

  return offset;
}

function findNextNonWhitespace(sourceText: string, startOffset: number): number | undefined {
  for (let index = startOffset; index < sourceText.length; index += 1) {
    const char = sourceText[index];

    if (char !== undefined && !/\s/.test(char)) {
      return index;
    }
  }

  return undefined;
}

function findPreviousNonWhitespace(sourceText: string, startOffset: number): number | undefined {
  for (let index = startOffset; index >= 0; index -= 1) {
    const char = sourceText[index];

    if (char !== undefined && !/\s/.test(char)) {
      return index;
    }
  }

  return undefined;
}

function createSymbolRecord(locationIndex: SourceLocationIndex, declaration: TextMatch): ParserCoreSymbolRecord {
  return {
    schemaVersion: PARSER_CORE_SYMBOL_SCHEMA_VERSION,
    localId: `symbol:${declaration.kind}:${sanitizeLocalIdPart(declaration.name)}:${declaration.statementStart}`,
    name: declaration.name,
    kind: declaration.kind,
    qualifiedName: declaration.name,
    range: createRangeFromOffsets(locationIndex, declaration.statementStart, declaration.statementEnd)
  };
}

function createImportRecord(
  locationIndex: SourceLocationIndex,
  moduleSpecifier: string,
  kind: ParserCoreImportKind,
  startOffset: number,
  endOffset: number
): ParserCoreImportRecord {
  return {
    schemaVersion: PARSER_CORE_IMPORT_SCHEMA_VERSION,
    moduleSpecifier,
    kind,
    range: createRangeFromOffsets(locationIndex, startOffset, endOffset)
  };
}

function createExportRecord(
  locationIndex: SourceLocationIndex,
  kind: ParserCoreExportKind,
  name: string | undefined,
  startOffset: number,
  endOffset: number,
  sourceModuleSpecifier?: string
): ParserCoreExportRecord {
  const baseRecord: Omit<ParserCoreExportRecord, 'name' | 'sourceModuleSpecifier'> = {
    schemaVersion: PARSER_CORE_EXPORT_SCHEMA_VERSION,
    kind,
    range: createRangeFromOffsets(locationIndex, startOffset, endOffset)
  };

  const recordWithName = name === undefined ? baseRecord : {
    ...baseRecord,
    name
  };

  if (sourceModuleSpecifier === undefined) {
    return recordWithName;
  }

  return {
    ...recordWithName,
    sourceModuleSpecifier
  };
}

function createSourceLocationIndex(text: string): SourceLocationIndex {
  const lineStarts: number[] = [0];

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '\n') {
      lineStarts.push(index + 1);
    }
  }

  return { text, lineStarts };
}

function createRangeFromOffsets(
  locationIndex: SourceLocationIndex,
  startOffset: number,
  endOffset: number
): ParserCoreTextRange {
  return {
    schemaVersion: PARSER_CORE_TEXT_RANGE_SCHEMA_VERSION,
    start: createPosition(locationIndex, startOffset),
    end: createPosition(locationIndex, Math.max(startOffset, endOffset))
  };
}

function createPosition(locationIndex: SourceLocationIndex, offset: number) {
  const safeOffset = Math.min(Math.max(offset, 0), locationIndex.text.length);
  const lineIndex = findLineIndex(locationIndex.lineStarts, safeOffset);
  const lineStart = locationIndex.lineStarts[lineIndex] ?? 0;

  return {
    schemaVersion: PARSER_CORE_POSITION_SCHEMA_VERSION,
    offset: safeOffset,
    line: lineIndex + 1,
    column: safeOffset - lineStart + 1
  };
}

function findLineIndex(lineStarts: readonly number[], offset: number): number {
  let low = 0;
  let high = lineStarts.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const lineStart = lineStarts[middle] ?? 0;
    const nextLineStart = lineStarts[middle + 1];

    if (lineStart <= offset && (nextLineStart === undefined || offset < nextLineStart)) {
      return middle;
    }

    if (offset < lineStart) {
      high = middle - 1;
    } else {
      low = middle + 1;
    }
  }

  return Math.max(0, lineStarts.length - 1);
}

function findStatementEnd(sourceText: string, statementStart: number): number {
  const semicolonIndex = sourceText.indexOf(';', statementStart);
  const newlineIndex = sourceText.indexOf('\n', statementStart + 1);

  if (semicolonIndex >= 0 && (newlineIndex < 0 || semicolonIndex < newlineIndex)) {
    return semicolonIndex + 1;
  }

  if (newlineIndex >= 0) {
    return newlineIndex;
  }

  return sourceText.length;
}

function findBracketImbalance(sourceText: string): { readonly message: string; readonly offset: number } | undefined {
  const stack: { readonly char: string; readonly offset: number }[] = [];
  let quote: string | undefined;
  let escaped = false;

  for (let index = 0; index < sourceText.length; index += 1) {
    const char = sourceText[index];

    if (char === undefined) {
      continue;
    }

    if (quote !== undefined) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === quote) {
        quote = undefined;
      }

      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (char === '(' || char === '{' || char === '[') {
      stack.push({ char, offset: index });
      continue;
    }

    if (char === ')' || char === '}' || char === ']') {
      const expected = getOpeningBracket(char);
      const latest = stack.pop();

      if (latest === undefined || latest.char !== expected) {
        return {
          message: `unexpected closing bracket '${char}'.`,
          offset: index
        };
      }
    }
  }

  const unclosed = stack.at(-1);

  if (unclosed === undefined) {
    return undefined;
  }

  return {
    message: `unclosed bracket '${unclosed.char}'.`,
    offset: unclosed.offset
  };
}

function getOpeningBracket(closingBracket: string): string {
  if (closingBracket === ')') {
    return '(';
  }

  if (closingBracket === '}') {
    return '{';
  }

  return '[';
}

function getDeclarationExportKind(
  exportPrefix: string,
  typeOnlyExportKind: ParserCoreExportKind | undefined
): ParserCoreExportKind | undefined {
  if (exportPrefix.length === 0) {
    return undefined;
  }

  if (/\bdefault\b/.test(exportPrefix)) {
    return 'default';
  }

  return typeOnlyExportKind ?? 'named';
}

function withOptionalExportKind(
  declaration: Omit<TextMatch, 'exportKind'>,
  exportKind: ParserCoreExportKind | undefined
): TextMatch {
  if (exportKind === undefined) {
    return declaration;
  }

  return {
    ...declaration,
    exportKind
  };
}

function offsetWithoutLeadingLineBreak(match: RegExpMatchArray): number {
  return (match.index ?? 0) + (match[0].startsWith('\n') ? 1 : 0);
}

function createNamedDeclarationPattern(keyword: string): RegExp {
  return new RegExp(
    `${TOP_LEVEL_PREFIX}(export\\s+(?:default\\s+)?)?(?:async\\s+)?${keyword}\\s+(${IDENTIFIER_PATTERN})\\b`,
    'g'
  );
}

function extractVariableNames(declarationList: string): readonly string[] {
  return declarationList
    .split(',')
    .map((declaration) => declaration.trim().match(new RegExp(`^(${IDENTIFIER_PATTERN})\\b`))?.[1])
    .filter((name): name is string => name !== undefined);
}

function extractExportClauseNames(namedClause: string): readonly string[] {
  return namedClause
    .split(',')
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0)
    .map((clause) => {
      const withoutTypeKeyword = clause.replace(/^type\s+/, '');
      const aliasMatch = withoutTypeKeyword.match(/\bas\s+([A-Za-z_$][A-Za-z0-9_$]*)$/);
      const directMatch = withoutTypeKeyword.match(new RegExp(`^(${IDENTIFIER_PATTERN})\\b`));
      return aliasMatch?.[1] ?? directMatch?.[1];
    })
    .filter((name): name is string => name !== undefined);
}

function sanitizeLocalIdPart(value: string): string {
  return value.replace(/[^A-Za-z0-9_$.-]+/g, '_');
}

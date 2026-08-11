#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SOURCE_INPUT_SCHEMA_VERSION,
  createNormalizedSourceFileInventory,
  parseLocalSourcePath,
  parseSourceGlobPattern,
  resolveLocalFolderSource,
  toSerializableSourceFileInventory,
  type LocalFolderSourceInput,
  type SourceFileInventory,
  type SourceFileInventoryEntry,
  type SourceGlobPattern
} from '@codestellation/source-ingestion';
import {
  PARSER_CORE_PARSE_BATCH_RESULT_SCHEMA_VERSION,
  PARSER_CORE_PARSEABLE_FILE_SCHEMA_VERSION,
  parseParserCoreFilePath,
  toSerializableParserCoreParseBatchResult,
  type ParserCoreFileRole,
  type ParserCoreLanguage,
  type ParserCoreParseBatchResult,
  type ParserCoreParseUnitResult,
  type ParserCoreParseableFile,
  type ParserCoreStatus
} from '@codestellation/parser-core';
import { parseTypeScriptSourceText } from '@codestellation/parser-typescript';
import {
  analyzeStaticImportsAndExports,
  toSerializableAnalyzerStaticImportExportAnalysisResult,
  type AnalyzerStaticImportExportAnalysisResult
} from '@codestellation/analyzer-static';
import {
  REPOSITORY_SCAN_INPUT_SCHEMA_VERSION,
  classifyRepositoryScanInput,
  detectPackageManifests,
  deriveRepositoryStructureSummary,
  type RepositoryScanCandidateFile,
  type RepositoryScanInput
} from '@codestellation/repository-scanner';
import {
  buildPackageDependencyGraphFromProjectFileGraph,
  buildProjectFileGraphFromRepositoryStructure,
  toSerializableGraphBuilderPackageDependencyGraphResult,
  type GraphBuilderPackageDependencyGraphResult
} from '@codestellation/graph-builder';

export const CODESTELLATION_CLI_LOCAL_FOLDER_GRAPH_EXPORT_SCHEMA_VERSION = 1 as const;
export const CODESTELLATION_CLI_SOURCE_TEXT_PARSING_SCHEMA_VERSION = 1 as const;
export const DEFAULT_MAX_SOURCE_TEXT_BYTES = 512 * 1024;

export interface CliIndexLocalOptions {
  readonly sourcePath: string;
  readonly outputPath?: string;
  readonly cwd?: string | URL;
  readonly pretty?: boolean;
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
  readonly maxFiles?: number;
  readonly maxFileSizeBytes?: number;
  readonly parseSourceText?: boolean;
  readonly maxSourceTextBytes?: number;
  readonly now?: () => Date;
}

export interface CliLocalFolderGraphExportInput {
  readonly kind: 'local-folder';
  readonly requestedPath: string;
  readonly resolvedRootName: string;
}

export interface CliLocalFolderGraphExportSummary {
  readonly inventoryFileCount: number;
  readonly candidateFileCount: number;
  readonly ignoredFileCount: number;
  readonly packageNodeCount: number;
  readonly totalNodeCount: number;
  readonly totalEdgeCount: number;
  readonly warningCount: number;
  readonly errorCount: number;
  readonly parsedSourceFileCount: number;
  readonly sourceImportCount: number;
  readonly sourceExportCount: number;
}

export interface CliLocalFolderSourceTextParsingSummary {
  readonly parseCandidateFileCount: number;
  readonly parsedFileCount: number;
  readonly skippedUnsupportedFileCount: number;
  readonly skippedOversizedFileCount: number;
  readonly sourceTextReadBytes: number;
  readonly symbolCount: number;
  readonly importCount: number;
  readonly exportCount: number;
  readonly diagnosticCount: number;
}

export interface CliLocalFolderSourceTextParsingExport {
  readonly schemaVersion: typeof CODESTELLATION_CLI_SOURCE_TEXT_PARSING_SCHEMA_VERSION;
  readonly enabled: true;
  readonly maxSourceTextBytes: number;
  readonly parseBatch: ParserCoreParseBatchResult;
  readonly analysis: AnalyzerStaticImportExportAnalysisResult;
  readonly summary: CliLocalFolderSourceTextParsingSummary;
}

export interface CliLocalFolderGraphExport {
  readonly schemaVersion: typeof CODESTELLATION_CLI_LOCAL_FOLDER_GRAPH_EXPORT_SCHEMA_VERSION;
  readonly command: 'index-local';
  readonly generatedAt: string;
  readonly input: CliLocalFolderGraphExportInput;
  readonly graph: GraphBuilderPackageDependencyGraphResult;
  readonly sourceTextParsing?: CliLocalFolderSourceTextParsingExport;
  readonly summary: CliLocalFolderGraphExportSummary;
}

export interface CliRunResult {
  readonly exitCode: 0 | 1;
  readonly stdout: string;
  readonly stderr: string;
}

export interface ParsedCliArguments {
  readonly command: 'index-local' | 'help';
  readonly sourcePath?: string;
  readonly outputPath?: string;
  readonly pretty: boolean;
  readonly include: readonly string[];
  readonly exclude: readonly string[];
  readonly maxFiles?: number;
  readonly maxFileSizeBytes?: number;
  readonly parseSourceText: boolean;
  readonly maxSourceTextBytes?: number;
}

export interface CliExecutionOptions {
  readonly argv?: readonly string[];
  readonly cwd?: string;
  readonly writeStdout?: (value: string) => void;
  readonly writeStderr?: (value: string) => void;
  readonly now?: () => Date;
}

const HELP_TEXT = `Codestellation CLI

Usage:
  codestellation index-local <path> --out <graph.json> [--pretty]

Options:
  --out <file>                 Write the graph JSON export to a file.
  --pretty                     Pretty-print JSON with two spaces.
  --include <glob>             Add an include pattern for local ingestion. Repeatable.
  --exclude <glob>             Add an exclude pattern for local ingestion. Repeatable.
  --max-files <count>          Limit inventoried files.
  --max-file-size-bytes <n>    Limit inventoried file size in bytes.
  --parse-source-text          Safely read and parse TypeScript/TSX candidate files.
  --max-source-text-bytes <n>  Per-file source text read limit when parsing is enabled.
  --help                       Show this help text.
`;

export async function createLocalFolderGraphExport(
  options: CliIndexLocalOptions
): Promise<CliLocalFolderGraphExport> {
  const sourceInput = createLocalFolderSourceInput(options);
  const resolvedSource = await resolveLocalFolderSource(
    sourceInput,
    options.cwd === undefined ? {} : { cwd: options.cwd }
  );
  const inventory = await createNormalizedSourceFileInventory(resolvedSource);
  const graph = buildGraphFromInventory(inventory, options.now);
  const sourceTextParsing = options.parseSourceText === true
    ? await createSafeSourceTextParsingExport({
        inventory,
        rootRealPath: resolvedSource.realPath,
        graph,
        maxSourceTextBytes: normalizeMaxSourceTextBytes(options.maxSourceTextBytes)
      })
    : undefined;
  const generatedAt = normalizeNow(options.now).toISOString();

  return withOptionalSourceTextParsing({
    schemaVersion: CODESTELLATION_CLI_LOCAL_FOLDER_GRAPH_EXPORT_SCHEMA_VERSION,
    command: 'index-local',
    generatedAt,
    input: {
      kind: 'local-folder',
      requestedPath: sourceInput.path,
      resolvedRootName: resolvedSource.directoryName
    },
    graph,
    summary: {
      inventoryFileCount: inventory.summary.fileCount,
      candidateFileCount: graph.sourceGraph.sourceStructure.packageManifestDetection.sourceScan.summary.candidateFileCount,
      ignoredFileCount: graph.sourceGraph.sourceStructure.packageManifestDetection.sourceScan.summary.ignoredFileCount,
      packageNodeCount: graph.summary.packageNodeCount,
      totalNodeCount: graph.summary.totalNodeCount,
      totalEdgeCount: graph.summary.totalEdgeCount,
      warningCount: graph.summary.warningCount,
      errorCount: graph.summary.errorCount,
      parsedSourceFileCount: sourceTextParsing?.summary.parsedFileCount ?? 0,
      sourceImportCount: sourceTextParsing?.summary.importCount ?? 0,
      sourceExportCount: sourceTextParsing?.summary.exportCount ?? 0
    }
  }, sourceTextParsing);
}

export async function indexLocalFolderToJson(options: CliIndexLocalOptions): Promise<string> {
  const exportResult = await createLocalFolderGraphExport(options);
  return `${JSON.stringify(exportResult, undefined, options.pretty === true ? 2 : undefined)}\n`;
}

export async function runCodestellationCli(options: CliExecutionOptions = {}): Promise<CliRunResult> {
  try {
    const parsed = parseCliArguments(options.argv ?? process.argv.slice(2));

    if (parsed.command === 'help') {
      return writeCliResult({ exitCode: 0, stdout: HELP_TEXT, stderr: '' }, options);
    }

    if (parsed.sourcePath === undefined) {
      return writeCliResult({
        exitCode: 1,
        stdout: '',
        stderr: 'Missing local folder path.\n\n' + HELP_TEXT
      }, options);
    }

    const json = await indexLocalFolderToJson({
      sourcePath: parsed.sourcePath,
      pretty: parsed.pretty,
      include: parsed.include,
      exclude: parsed.exclude,
      ...(parsed.outputPath === undefined ? {} : { outputPath: parsed.outputPath }),
      ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
      ...(parsed.maxFiles === undefined ? {} : { maxFiles: parsed.maxFiles }),
      ...(parsed.maxFileSizeBytes === undefined ? {} : { maxFileSizeBytes: parsed.maxFileSizeBytes }),
      parseSourceText: parsed.parseSourceText,
      ...(parsed.maxSourceTextBytes === undefined ? {} : { maxSourceTextBytes: parsed.maxSourceTextBytes }),
      ...(options.now === undefined ? {} : { now: options.now })
    });

    if (parsed.outputPath === undefined) {
      return writeCliResult({ exitCode: 0, stdout: json, stderr: '' }, options);
    }

    await writeFile(resolveCliOutputPath(parsed.outputPath, options.cwd), json, 'utf8');
    return writeCliResult({ exitCode: 0, stdout: '', stderr: '' }, options);
  } catch (error) {
    return writeCliResult({ exitCode: 1, stdout: '', stderr: `${formatCliError(error)}\n` }, options);
  }
}

export function parseCliArguments(argv: readonly string[]): ParsedCliArguments {
  const args = [...argv];
  const command = args.shift();

  if (command === undefined || command === '--help' || command === '-h' || command === 'help') {
    return {
      command: 'help',
      pretty: false,
      include: [],
      exclude: [],
      parseSourceText: false
    };
  }

  if (command !== 'index-local') {
    throw new RangeError(`Unsupported command: ${command}`);
  }

  const sourcePath = args.shift();
  const parsed: {
    outputPath?: string;
    pretty: boolean;
    include: string[];
    exclude: string[];
    maxFiles?: number;
    maxFileSizeBytes?: number;
    parseSourceText: boolean;
    maxSourceTextBytes?: number;
  } = {
    pretty: false,
    include: [],
    exclude: [],
    parseSourceText: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === undefined) {
      continue;
    }

    switch (arg) {
      case '--out':
        parsed.outputPath = readRequiredOptionValue(args, index, arg);
        index += 1;
        break;
      case '--pretty':
        parsed.pretty = true;
        break;
      case '--include':
        parsed.include.push(readRequiredOptionValue(args, index, arg));
        index += 1;
        break;
      case '--exclude':
        parsed.exclude.push(readRequiredOptionValue(args, index, arg));
        index += 1;
        break;
      case '--max-files':
        parsed.maxFiles = parsePositiveIntegerOption(readRequiredOptionValue(args, index, arg), arg);
        index += 1;
        break;
      case '--max-file-size-bytes':
        parsed.maxFileSizeBytes = parsePositiveIntegerOption(readRequiredOptionValue(args, index, arg), arg);
        index += 1;
        break;
      case '--parse-source-text':
        parsed.parseSourceText = true;
        break;
      case '--max-source-text-bytes':
        parsed.maxSourceTextBytes = parsePositiveIntegerOption(readRequiredOptionValue(args, index, arg), arg);
        index += 1;
        break;
      case '--help':
      case '-h':
        return {
          command: 'help',
          pretty: false,
          include: [],
          exclude: [],
          parseSourceText: false
        };
      default:
        throw new RangeError(`Unsupported option: ${arg}`);
    }
  }

  return {
    command: 'index-local',
    ...(sourcePath === undefined ? {} : { sourcePath }),
    ...(parsed.outputPath === undefined ? {} : { outputPath: parsed.outputPath }),
    pretty: parsed.pretty,
    include: parsed.include,
    exclude: parsed.exclude,
    ...(parsed.maxFiles === undefined ? {} : { maxFiles: parsed.maxFiles }),
    ...(parsed.maxFileSizeBytes === undefined ? {} : { maxFileSizeBytes: parsed.maxFileSizeBytes }),
    parseSourceText: parsed.parseSourceText,
    ...(parsed.maxSourceTextBytes === undefined ? {} : { maxSourceTextBytes: parsed.maxSourceTextBytes })
  };
}

function createLocalFolderSourceInput(options: CliIndexLocalOptions): LocalFolderSourceInput {
  const include = normalizeGlobPatterns(options.include, 'include');
  const exclude = normalizeGlobPatterns(options.exclude, 'exclude');

  return {
    schemaVersion: SOURCE_INPUT_SCHEMA_VERSION,
    kind: 'local-folder',
    path: parseLocalSourcePath(options.sourcePath),
    options: {
      safety: {
        followSymlinks: false,
        executeRepositoryCode: false,
        includeGitHistory: 'metadata-only'
      },
      scan: {
        ...(include.length === 0 ? {} : { include }),
        ...(exclude.length === 0 ? {} : { exclude }),
        ...(options.maxFiles === undefined ? {} : { maxFiles: options.maxFiles }),
        ...(options.maxFileSizeBytes === undefined ? {} : { maxFileSizeBytes: options.maxFileSizeBytes })
      }
    }
  };
}

function buildGraphFromInventory(
  inventory: SourceFileInventory,
  now: (() => Date) | undefined
): GraphBuilderPackageDependencyGraphResult {
  const serializedInventory = toSerializableSourceFileInventory(inventory);
  const scanStartedAt = normalizeNow(now).toISOString();
  const scanInput: RepositoryScanInput = {
    schemaVersion: REPOSITORY_SCAN_INPUT_SCHEMA_VERSION,
    inventory: serializedInventory
  };
  const sourceScan = classifyRepositoryScanInput(scanInput, {
    startedAt: scanStartedAt,
    completedAt: scanStartedAt
  });
  const packageManifests = detectPackageManifests(sourceScan);
  const structure = deriveRepositoryStructureSummary(packageManifests);
  const projectFileGraph = buildProjectFileGraphFromRepositoryStructure(structure);
  const packageGraph = buildPackageDependencyGraphFromProjectFileGraph(projectFileGraph);

  return toSerializableGraphBuilderPackageDependencyGraphResult(packageGraph);
}

interface SourceTextParsingContext {
  readonly inventory: SourceFileInventory;
  readonly rootRealPath: string;
  readonly graph: GraphBuilderPackageDependencyGraphResult;
  readonly maxSourceTextBytes: number;
}

interface SourceTextParseTarget {
  readonly file: SourceFileInventoryEntry;
  readonly parseableFile: ParserCoreParseableFile;
}

async function createSafeSourceTextParsingExport(
  context: SourceTextParsingContext
): Promise<CliLocalFolderSourceTextParsingExport> {
  const candidatePathSet = new Set(
    context.graph.sourceGraph.sourceStructure.packageManifestDetection.sourceScan.candidateFiles.map(
      (file: RepositoryScanCandidateFile) => file.path
    )
  );
  const parseCandidateFiles = context.inventory.files.filter((file: SourceFileInventoryEntry) => (
    candidatePathSet.has(file.path) && isTypeScriptSourceTextCandidate(file)
  ));
  const targets = parseCandidateFiles
    .filter((file: SourceFileInventoryEntry) => file.sizeBytes <= context.maxSourceTextBytes)
    .map(toSourceTextParseTarget);
  const parseUnits: ParserCoreParseUnitResult[] = [];

  for (const target of targets) {
    const sourceText = await readFile(resolveSafeRepositoryFilePath(context.rootRealPath, target.file), 'utf8');
    parseUnits.push(parseTypeScriptSourceText({
      file: target.parseableFile,
      sourceText
    }));
  }

  const parseBatch = createCliParserCoreParseBatchResult(parseUnits);
  const analysis = toSerializableAnalyzerStaticImportExportAnalysisResult(
    analyzeStaticImportsAndExports(parseBatch)
  );

  return {
    schemaVersion: CODESTELLATION_CLI_SOURCE_TEXT_PARSING_SCHEMA_VERSION,
    enabled: true,
    maxSourceTextBytes: context.maxSourceTextBytes,
    parseBatch,
    analysis,
    summary: {
      parseCandidateFileCount: parseCandidateFiles.length,
      parsedFileCount: parseBatch.summary.fileCount,
      skippedUnsupportedFileCount: context.graph.sourceGraph.sourceStructure.packageManifestDetection.sourceScan.summary.candidateFileCount
        - parseCandidateFiles.length,
      skippedOversizedFileCount: parseCandidateFiles.length - targets.length,
      sourceTextReadBytes: targets.reduce((sum: number, target: SourceTextParseTarget) => sum + target.file.sizeBytes, 0),
      symbolCount: parseBatch.summary.symbolCount,
      importCount: parseBatch.summary.importCount,
      exportCount: parseBatch.summary.exportCount,
      diagnosticCount: parseBatch.summary.diagnosticCount + analysis.summary.diagnosticCount
    }
  };
}

function createCliParserCoreParseBatchResult(
  parseUnits: readonly ParserCoreParseUnitResult[]
): ParserCoreParseBatchResult {
  const unitDiagnosticCount = parseUnits.reduce(
    (sum: number, parseUnit: ParserCoreParseUnitResult) => sum + parseUnit.summary.diagnosticCount,
    0
  );

  return toSerializableParserCoreParseBatchResult({
    schemaVersion: PARSER_CORE_PARSE_BATCH_RESULT_SCHEMA_VERSION,
    status: determineParseBatchStatus(parseUnits),
    files: parseUnits,
    diagnostics: [],
    summary: {
      fileCount: parseUnits.length,
      completedFileCount: parseUnits.filter((parseUnit: ParserCoreParseUnitResult) => parseUnit.status === 'completed').length,
      partialFileCount: parseUnits.filter((parseUnit: ParserCoreParseUnitResult) => parseUnit.status === 'partial').length,
      failedFileCount: parseUnits.filter((parseUnit: ParserCoreParseUnitResult) => parseUnit.status === 'failed').length,
      skippedFileCount: parseUnits.filter((parseUnit: ParserCoreParseUnitResult) => parseUnit.status === 'skipped').length,
      diagnosticCount: unitDiagnosticCount,
      symbolCount: parseUnits.reduce((sum: number, parseUnit: ParserCoreParseUnitResult) => sum + parseUnit.summary.symbolCount, 0),
      importCount: parseUnits.reduce((sum: number, parseUnit: ParserCoreParseUnitResult) => sum + parseUnit.summary.importCount, 0),
      exportCount: parseUnits.reduce((sum: number, parseUnit: ParserCoreParseUnitResult) => sum + parseUnit.summary.exportCount, 0),
      referenceCount: parseUnits.reduce((sum: number, parseUnit: ParserCoreParseUnitResult) => sum + parseUnit.summary.referenceCount, 0)
    }
  });
}

function determineParseBatchStatus(parseUnits: readonly ParserCoreParseUnitResult[]): ParserCoreStatus {
  if (parseUnits.length === 0) {
    return 'skipped';
  }

  if (parseUnits.every((parseUnit: ParserCoreParseUnitResult) => parseUnit.status === 'failed')) {
    return 'failed';
  }

  if (parseUnits.some((parseUnit: ParserCoreParseUnitResult) => parseUnit.status !== 'completed')) {
    return 'partial';
  }

  return 'completed';
}

function toSourceTextParseTarget(file: SourceFileInventoryEntry): SourceTextParseTarget {
  return {
    file,
    parseableFile: {
      schemaVersion: PARSER_CORE_PARSEABLE_FILE_SCHEMA_VERSION,
      path: parseParserCoreFilePath(file.path),
      role: inferParserCoreFileRole(file),
      language: inferParserCoreLanguage(file),
      sizeBytes: file.sizeBytes,
      ...(file.extension === undefined ? {} : { extension: file.extension })
    }
  };
}

function isTypeScriptSourceTextCandidate(file: SourceFileInventoryEntry): boolean {
  return (file.kind === 'source' || file.kind === 'test')
    && (file.path.endsWith('.ts') || file.path.endsWith('.tsx'));
}

function inferParserCoreLanguage(file: SourceFileInventoryEntry): ParserCoreLanguage {
  return file.path.endsWith('.tsx') ? 'tsx' : 'typescript';
}

function inferParserCoreFileRole(file: SourceFileInventoryEntry): ParserCoreFileRole {
  if (file.path.endsWith('.d.ts')) {
    return 'declaration';
  }

  return file.kind === 'test' ? 'test' : 'source';
}

function resolveSafeRepositoryFilePath(rootRealPath: string, file: SourceFileInventoryEntry): string {
  const root = resolve(rootRealPath);
  const absolutePath = resolve(root, file.path);

  if (absolutePath !== root && !absolutePath.startsWith(`${root}${sep}`)) {
    throw new RangeError(`Refusing to read source text outside repository root: ${file.path}`);
  }

  return absolutePath;
}

function normalizeMaxSourceTextBytes(value: number | undefined): number {
  if (value === undefined) {
    return DEFAULT_MAX_SOURCE_TEXT_BYTES;
  }

  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError('maxSourceTextBytes must be a positive safe integer.');
  }

  return value;
}

function withOptionalSourceTextParsing(
  exportResult: Omit<CliLocalFolderGraphExport, 'sourceTextParsing'>,
  sourceTextParsing: CliLocalFolderSourceTextParsingExport | undefined
): CliLocalFolderGraphExport {
  return sourceTextParsing === undefined
    ? exportResult
    : {
        ...exportResult,
        sourceTextParsing
      };
}

function normalizeGlobPatterns(values: readonly string[] | undefined, name: string): readonly SourceGlobPattern[] {
  if (values === undefined) {
    return [];
  }

  return values.map((value) => {
    try {
      return parseSourceGlobPattern(value);
    } catch (error) {
      throw new RangeError(`Invalid ${name} glob pattern "${value}": ${formatCliError(error)}`);
    }
  });
}

function readRequiredOptionValue(args: readonly string[], index: number, optionName: string): string {
  const value = args[index + 1];

  if (value === undefined || value.startsWith('--')) {
    throw new RangeError(`Option ${optionName} requires a value.`);
  }

  return value;
}

function parsePositiveIntegerOption(value: string, optionName: string): number {
  if (!/^\d+$/.test(value)) {
    throw new RangeError(`Option ${optionName} must be a positive integer.`);
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new RangeError(`Option ${optionName} must be a positive safe integer.`);
  }

  return parsed;
}

function resolveCliOutputPath(outputPath: string, cwd: string | undefined): string {
  if (outputPath.trim().length === 0) {
    throw new RangeError('Output path must not be empty.');
  }

  return resolve(cwd ?? process.cwd(), outputPath);
}

function normalizeNow(now: (() => Date) | undefined): Date {
  const value = now?.() ?? new Date();

  if (Number.isNaN(value.getTime())) {
    throw new RangeError('CLI clock returned an invalid Date.');
  }

  return value;
}

function writeCliResult(result: CliRunResult, options: CliExecutionOptions): CliRunResult {
  if (result.stdout.length > 0) {
    options.writeStdout?.(result.stdout);
  }

  if (result.stderr.length > 0) {
    options.writeStderr?.(result.stderr);
  }

  return result;
}

function formatCliError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function runCliEntryPoint(): Promise<void> {
  const result = await runCodestellationCli({
    writeStdout: (value) => process.stdout.write(value),
    writeStderr: (value) => process.stderr.write(value)
  });

  if (result.exitCode !== 0) {
    process.exitCode = result.exitCode;
  }
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] === undefined ? undefined : resolve(process.argv[1]);

if (invokedFile === resolve(currentFile)) {
  await runCliEntryPoint();
}

#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
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
  type SourceGlobPattern
} from '@codestellation/source-ingestion';
import {
  REPOSITORY_SCAN_INPUT_SCHEMA_VERSION,
  classifyRepositoryScanInput,
  detectPackageManifests,
  deriveRepositoryStructureSummary,
  type RepositoryScanInput
} from '@codestellation/repository-scanner';
import {
  buildPackageDependencyGraphFromProjectFileGraph,
  buildProjectFileGraphFromRepositoryStructure,
  toSerializableGraphBuilderPackageDependencyGraphResult,
  type GraphBuilderPackageDependencyGraphResult
} from '@codestellation/graph-builder';

export const CODESTELLATION_CLI_LOCAL_FOLDER_GRAPH_EXPORT_SCHEMA_VERSION = 1 as const;

export interface CliIndexLocalOptions {
  readonly sourcePath: string;
  readonly outputPath?: string;
  readonly cwd?: string | URL;
  readonly pretty?: boolean;
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
  readonly maxFiles?: number;
  readonly maxFileSizeBytes?: number;
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
}

export interface CliLocalFolderGraphExport {
  readonly schemaVersion: typeof CODESTELLATION_CLI_LOCAL_FOLDER_GRAPH_EXPORT_SCHEMA_VERSION;
  readonly command: 'index-local';
  readonly generatedAt: string;
  readonly input: CliLocalFolderGraphExportInput;
  readonly graph: GraphBuilderPackageDependencyGraphResult;
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
  const generatedAt = normalizeNow(options.now).toISOString();

  return {
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
      errorCount: graph.summary.errorCount
    }
  };
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
      exclude: []
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
  } = {
    pretty: false,
    include: [],
    exclude: []
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
      case '--help':
      case '-h':
        return {
          command: 'help',
          pretty: false,
          include: [],
          exclude: []
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
    ...(parsed.maxFileSizeBytes === undefined ? {} : { maxFileSizeBytes: parsed.maxFileSizeBytes })
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

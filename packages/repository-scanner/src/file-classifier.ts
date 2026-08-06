import {
  REPOSITORY_SCAN_FILE_REFERENCE_SCHEMA_VERSION,
  REPOSITORY_SCAN_INPUT_SCHEMA_VERSION,
  REPOSITORY_SCAN_RESULT_SCHEMA_VERSION,
  parseRepositoryScanInventoryPath,
  parseRepositoryScanIssueCode,
  toSerializableRepositoryScanInput,
  toSerializableRepositoryScanResult,
  type RepositoryScanCandidateFile,
  type RepositoryScanError,
  type RepositoryScanIgnoredFile,
  type RepositoryScanIgnoredFileReason,
  type RepositoryScanInput,
  type RepositoryScanInventoryPath,
  type RepositoryScanResult,
  type RepositoryScanSourceInventory,
  type RepositoryScanSourceInventoryEntry,
  type RepositoryScanSourceInventoryIssue,
  type RepositoryScanStatus,
  type RepositoryScanWarning
} from './scan-result.js';

export const REPOSITORY_SCAN_CLASSIFICATION_RULESET_VERSION = 1 as const;

export interface RepositoryFileClassificationOptions {
  readonly startedAt?: string;
  readonly completedAt?: string;
}

interface ClassificationAccumulator {
  readonly candidateFiles: RepositoryScanCandidateFile[];
  readonly ignoredFiles: RepositoryScanIgnoredFile[];
  readonly unclassifiedFiles: RepositoryScanInventoryPath[];
  readonly warnings: RepositoryScanWarning[];
  readonly errors: RepositoryScanError[];
}

interface IgnoreDecision {
  readonly reason: RepositoryScanIgnoredFileReason;
  readonly message: string;
}

const CANDIDATE_KINDS = new Set(['source', 'test', 'manifest', 'config']);
const IGNORED_KINDS = new Set(['documentation', 'asset']);

const BINARY_EXTENSIONS = new Set([
  '.7z',
  '.avif',
  '.bin',
  '.bmp',
  '.class',
  '.db',
  '.dll',
  '.dmg',
  '.doc',
  '.docx',
  '.eot',
  '.exe',
  '.gif',
  '.gz',
  '.ico',
  '.jar',
  '.jpeg',
  '.jpg',
  '.mp3',
  '.mp4',
  '.otf',
  '.pdf',
  '.png',
  '.rar',
  '.so',
  '.tar',
  '.tgz',
  '.ttf',
  '.wasm',
  '.webm',
  '.webp',
  '.woff',
  '.woff2',
  '.xls',
  '.xlsx',
  '.zip'
]);

const VENDORED_SEGMENTS = new Set([
  'bower_components',
  'external',
  'node_modules',
  'third-party',
  'third_party',
  'vendor',
  'vendors'
]);

const GENERATED_SEGMENTS = new Set([
  '__generated__',
  'generated',
  'gen'
]);

const SENSITIVE_FILE_NAMES = new Set([
  '.env',
  '.npmrc',
  '.pypirc',
  'credentials.json',
  'id_dsa',
  'id_ecdsa',
  'id_ed25519',
  'id_rsa'
]);

const SENSITIVE_EXTENSIONS = new Set([
  '.key',
  '.pem',
  '.pfx',
  '.p12'
]);

export function classifyRepositoryScanInput(
  input: RepositoryScanInput,
  options: RepositoryFileClassificationOptions = {}
): RepositoryScanResult {
  const serializableInput = toSerializableRepositoryScanInput(input);
  return classifyRepositoryScanInventory(serializableInput.inventory, options);
}

export function classifyRepositoryScanInventory(
  inventory: RepositoryScanSourceInventory,
  options: RepositoryFileClassificationOptions = {}
): RepositoryScanResult {
  const startedAt = normalizeClassificationTimestamp(options.startedAt, 'startedAt');
  const completedAt = normalizeClassificationTimestamp(options.completedAt ?? startedAt, 'completedAt');
  const normalizedInventory = toSerializableRepositoryScanInput({
    schemaVersion: REPOSITORY_SCAN_INPUT_SCHEMA_VERSION,
    inventory
  }).inventory;

  const accumulator = createClassificationAccumulator(normalizedInventory);

  for (const file of normalizedInventory.files) {
    classifyInventoryFile(file, accumulator);
  }

  if (
    accumulator.candidateFiles.length === 0
      && accumulator.ignoredFiles.length === 0
      && accumulator.unclassifiedFiles.length > 0
  ) {
    accumulator.errors.push({
      code: parseRepositoryScanIssueCode('REPOSITORY_SCAN_NO_CLASSIFIABLE_FILES'),
      message: 'Repository scan could not classify any inventory file as a candidate or ignored file.',
      retryable: false
    });
  }

  const result: RepositoryScanResult = {
    schemaVersion: REPOSITORY_SCAN_RESULT_SCHEMA_VERSION,
    status: determineClassificationStatus(accumulator),
    inventory: normalizedInventory,
    candidateFiles: accumulator.candidateFiles,
    ignoredFiles: accumulator.ignoredFiles,
    warnings: accumulator.warnings,
    errors: accumulator.errors,
    metadata: {
      startedAt,
      completedAt,
      durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(startedAt))
    },
    summary: {
      inventoryFileCount: normalizedInventory.files.length,
      candidateFileCount: accumulator.candidateFiles.length,
      ignoredFileCount: accumulator.ignoredFiles.length,
      unclassifiedFileCount: accumulator.unclassifiedFiles.length,
      warningCount: accumulator.warnings.length,
      errorCount: accumulator.errors.length
    }
  };

  return toSerializableRepositoryScanResult(result);
}

function createClassificationAccumulator(
  inventory: RepositoryScanSourceInventory
): ClassificationAccumulator {
  const inventoryPaths = new Set(inventory.files.map((file) => file.path));

  return {
    candidateFiles: [],
    ignoredFiles: [],
    unclassifiedFiles: [],
    warnings: inventory.issues
      .filter((issue) => issue.severity === 'warning')
      .map((issue) => toRepositoryScanInventoryWarning(issue, inventoryPaths)),
    errors: inventory.issues
      .filter((issue) => issue.severity === 'error')
      .map((issue) => toRepositoryScanInventoryError(issue, inventoryPaths))
  };
}

function classifyInventoryFile(
  file: RepositoryScanSourceInventoryEntry,
  accumulator: ClassificationAccumulator
): void {
  const ignoreDecision = getIgnoreDecision(file);

  if (ignoreDecision !== undefined) {
    accumulator.ignoredFiles.push({
      schemaVersion: REPOSITORY_SCAN_FILE_REFERENCE_SCHEMA_VERSION,
      path: file.path,
      reason: ignoreDecision.reason,
      message: ignoreDecision.message
    });
    return;
  }

  if (CANDIDATE_KINDS.has(file.kind)) {
    accumulator.candidateFiles.push({
      schemaVersion: REPOSITORY_SCAN_FILE_REFERENCE_SCHEMA_VERSION,
      path: file.path
    });
    return;
  }

  accumulator.unclassifiedFiles.push(file.path);
  accumulator.warnings.push({
    code: parseRepositoryScanIssueCode('REPOSITORY_SCAN_UNKNOWN_FILE_KIND'),
    message: 'Repository scanner could not classify this file from inventory metadata alone.',
    path: file.path
  });
}

function getIgnoreDecision(file: RepositoryScanSourceInventoryEntry): IgnoreDecision | undefined {
  const path = parseRepositoryScanInventoryPath(file.path);
  const pathParts = splitInventoryPath(path);
  const fileName = pathParts[pathParts.length - 1] ?? path;
  const lowerFileName = fileName.toLowerCase();
  const extension = (file.extension ?? '').toLowerCase();

  if (isSensitiveFile(pathParts, lowerFileName, extension)) {
    return {
      reason: 'sensitive',
      message: 'Potentially sensitive file was excluded from scanner candidates by metadata policy.'
    };
  }

  if (isVendoredPath(pathParts)) {
    return {
      reason: 'vendored',
      message: 'Vendored or dependency-managed file was excluded from scanner candidates.'
    };
  }

  if (isGeneratedPath(pathParts, lowerFileName)) {
    return {
      reason: 'generated',
      message: 'Generated file was excluded from scanner candidates.'
    };
  }

  if (isMinifiedFile(lowerFileName)) {
    return {
      reason: 'minified',
      message: 'Minified file was excluded from scanner candidates.'
    };
  }

  if (BINARY_EXTENSIONS.has(extension)) {
    return {
      reason: 'binary',
      message: 'Binary file was excluded from scanner candidates.'
    };
  }

  if (IGNORED_KINDS.has(file.kind)) {
    return {
      reason: 'unsupported-kind',
      message: `Inventory file kind ${file.kind} is not a scanner candidate in MVP 1.`
    };
  }

  return undefined;
}

function toRepositoryScanInventoryWarning(
  issue: RepositoryScanSourceInventoryIssue,
  inventoryPaths: ReadonlySet<RepositoryScanInventoryPath>
): RepositoryScanWarning {
  const baseWarning: RepositoryScanWarning = {
    code: parseRepositoryScanIssueCode('REPOSITORY_SCAN_SOURCE_INVENTORY_WARNING'),
    message: `Source inventory warning preserved: ${issue.message}`
  };

  return issue.path === undefined || !inventoryPaths.has(parseRepositoryScanInventoryPath(issue.path))
    ? baseWarning
    : {
        ...baseWarning,
        path: parseRepositoryScanInventoryPath(issue.path)
      };
}

function toRepositoryScanInventoryError(
  issue: RepositoryScanSourceInventoryIssue,
  inventoryPaths: ReadonlySet<RepositoryScanInventoryPath>
): RepositoryScanError {
  const baseError: RepositoryScanError = {
    code: parseRepositoryScanIssueCode('REPOSITORY_SCAN_SOURCE_INVENTORY_ERROR'),
    message: `Source inventory error preserved: ${issue.message}`,
    retryable: false
  };

  return issue.path === undefined || !inventoryPaths.has(parseRepositoryScanInventoryPath(issue.path))
    ? baseError
    : {
        ...baseError,
        path: parseRepositoryScanInventoryPath(issue.path)
      };
}

function determineClassificationStatus(accumulator: ClassificationAccumulator): RepositoryScanStatus {
  if (accumulator.errors.length > 0) {
    const processedFileCount = accumulator.candidateFiles.length + accumulator.ignoredFiles.length;
    return processedFileCount === 0 ? 'failed' : 'partial';
  }

  return accumulator.unclassifiedFiles.length === 0 ? 'completed' : 'partial';
}

function isSensitiveFile(
  pathParts: readonly string[],
  lowerFileName: string,
  extension: string
): boolean {
  return SENSITIVE_FILE_NAMES.has(lowerFileName)
    || SENSITIVE_EXTENSIONS.has(extension)
    || lowerFileName.startsWith('.env.')
    || lowerFileName.includes('secret')
    || lowerFileName.includes('credential')
    || pathParts.some((part) => part === 'secrets' || part === '.secrets');
}

function isVendoredPath(pathParts: readonly string[]): boolean {
  return pathParts.some((part) => VENDORED_SEGMENTS.has(part));
}

function isGeneratedPath(pathParts: readonly string[], lowerFileName: string): boolean {
  return pathParts.some((part) => GENERATED_SEGMENTS.has(part))
    || lowerFileName.includes('.generated.')
    || lowerFileName.endsWith('.generated.ts')
    || lowerFileName.endsWith('.generated.tsx')
    || lowerFileName.endsWith('.generated.js')
    || lowerFileName.endsWith('.generated.jsx')
    || lowerFileName.endsWith('.pb.ts')
    || lowerFileName.endsWith('.pb.js')
    || lowerFileName.endsWith('.g.ts')
    || lowerFileName.endsWith('.g.js');
}

function isMinifiedFile(lowerFileName: string): boolean {
  return lowerFileName.endsWith('.min.js')
    || lowerFileName.endsWith('.min.css')
    || lowerFileName.endsWith('.min.mjs')
    || lowerFileName.endsWith('.min.cjs');
}

function splitInventoryPath(path: RepositoryScanInventoryPath): string[] {
  return path
    .toLowerCase()
    .split('/')
    .filter((part) => part.length > 0);
}

function normalizeClassificationTimestamp(value: string | undefined, label: string): string {
  const timestamp = value ?? new Date().toISOString();
  const parsed = Date.parse(timestamp);

  if (Number.isNaN(parsed)) {
    throw new RangeError(`Repository scan classification ${label} must be a valid ISO timestamp.`);
  }

  return new Date(parsed).toISOString();
}

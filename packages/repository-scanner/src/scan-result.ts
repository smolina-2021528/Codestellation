export declare const repositoryScanIssueCodeBrand: unique symbol;

export type RepositoryScanIssueCode = string & {
  readonly [repositoryScanIssueCodeBrand]: 'RepositoryScanIssueCode';
};

export type RepositoryScanInventoryPath = string;

export const REPOSITORY_SCAN_INPUT_SCHEMA_VERSION = 1 as const;
export const REPOSITORY_SCAN_RESULT_SCHEMA_VERSION = 1 as const;
export const REPOSITORY_SCAN_FILE_REFERENCE_SCHEMA_VERSION = 1 as const;
export const REPOSITORY_SCAN_SOURCE_INVENTORY_SCHEMA_VERSION = 1 as const;
export const REPOSITORY_SCAN_SOURCE_INVENTORY_ENTRY_SCHEMA_VERSION = 1 as const;

export const REPOSITORY_SCAN_STATUSES = [
  'completed',
  'partial',
  'failed'
] as const;

export type RepositoryScanStatus = typeof REPOSITORY_SCAN_STATUSES[number];

export const REPOSITORY_SCAN_IGNORED_FILE_REASONS = [
  'unsupported-kind',
  'binary',
  'generated',
  'vendored',
  'minified',
  'sensitive',
  'policy'
] as const;

export type RepositoryScanIgnoredFileReason = typeof REPOSITORY_SCAN_IGNORED_FILE_REASONS[number];

export const REPOSITORY_SCAN_SOURCE_FILE_KINDS = [
  'source',
  'test',
  'manifest',
  'config',
  'documentation',
  'asset',
  'unknown'
] as const;

export type RepositoryScanSourceFileKind = typeof REPOSITORY_SCAN_SOURCE_FILE_KINDS[number];

export const REPOSITORY_SCAN_SOURCE_INVENTORY_ISSUE_SEVERITIES = [
  'warning',
  'error'
] as const;

export type RepositoryScanSourceInventoryIssueSeverity =
  typeof REPOSITORY_SCAN_SOURCE_INVENTORY_ISSUE_SEVERITIES[number];

export interface RepositoryScanSourceInventoryEntry {
  readonly schemaVersion: typeof REPOSITORY_SCAN_SOURCE_INVENTORY_ENTRY_SCHEMA_VERSION;
  readonly path: RepositoryScanInventoryPath;
  readonly sizeBytes: number;
  readonly modifiedAt: string;
  readonly createdAt?: string;
  readonly extension?: string;
  readonly kind: RepositoryScanSourceFileKind;
}

export interface RepositoryScanSourceInventoryIssue {
  readonly code: string;
  readonly severity: RepositoryScanSourceInventoryIssueSeverity;
  readonly message: string;
  readonly path?: RepositoryScanInventoryPath;
}

export interface RepositoryScanSourceInventorySummary {
  readonly fileCount: number;
  readonly totalSizeBytes: number;
  readonly skippedFileCount: number;
  readonly skippedDirectoryCount: number;
  readonly oversizedFileCount: number;
  readonly symlinkCount: number;
}

export interface RepositoryScanSourceInventory {
  readonly schemaVersion: typeof REPOSITORY_SCAN_SOURCE_INVENTORY_SCHEMA_VERSION;
  readonly root: unknown;
  readonly options: unknown;
  readonly files: readonly RepositoryScanSourceInventoryEntry[];
  readonly issues: readonly RepositoryScanSourceInventoryIssue[];
  readonly summary: RepositoryScanSourceInventorySummary;
}

export interface RepositoryScanInput {
  readonly schemaVersion: typeof REPOSITORY_SCAN_INPUT_SCHEMA_VERSION;
  readonly inventory: RepositoryScanSourceInventory;
}

export interface RepositoryScanCandidateFile {
  readonly schemaVersion: typeof REPOSITORY_SCAN_FILE_REFERENCE_SCHEMA_VERSION;
  readonly path: RepositoryScanInventoryPath;
}

export interface RepositoryScanIgnoredFile {
  readonly schemaVersion: typeof REPOSITORY_SCAN_FILE_REFERENCE_SCHEMA_VERSION;
  readonly path: RepositoryScanInventoryPath;
  readonly reason: RepositoryScanIgnoredFileReason;
  readonly message: string;
}

export interface RepositoryScanWarning {
  readonly code: RepositoryScanIssueCode;
  readonly message: string;
  readonly path?: RepositoryScanInventoryPath;
}

export interface RepositoryScanError {
  readonly code: RepositoryScanIssueCode;
  readonly message: string;
  readonly retryable: boolean;
  readonly path?: RepositoryScanInventoryPath;
}

export interface RepositoryScanMetadata {
  readonly startedAt: string;
  readonly completedAt: string;
  readonly durationMs: number;
}

export interface RepositoryScanSummary {
  readonly inventoryFileCount: number;
  readonly candidateFileCount: number;
  readonly ignoredFileCount: number;
  readonly unclassifiedFileCount: number;
  readonly warningCount: number;
  readonly errorCount: number;
}

export interface RepositoryScanResult {
  readonly schemaVersion: typeof REPOSITORY_SCAN_RESULT_SCHEMA_VERSION;
  readonly status: RepositoryScanStatus;
  readonly inventory: RepositoryScanSourceInventory;
  readonly candidateFiles: readonly RepositoryScanCandidateFile[];
  readonly ignoredFiles: readonly RepositoryScanIgnoredFile[];
  readonly warnings: readonly RepositoryScanWarning[];
  readonly errors: readonly RepositoryScanError[];
  readonly metadata: RepositoryScanMetadata;
  readonly summary: RepositoryScanSummary;
}

const REPOSITORY_SCAN_ISSUE_CODE_PATTERN = /^REPOSITORY_SCAN_[A-Z0-9_]{3,63}$/;
const SOURCE_INVENTORY_ISSUE_CODE_PATTERN = /^SOURCE_FILE_INVENTORY_[A-Z0-9_]{3,63}$/;

export function parseRepositoryScanInventoryPath(value: string): RepositoryScanInventoryPath {
  if (typeof value !== 'string') {
    throw new RangeError('Repository scan inventory path must be a string.');
  }

  const normalized = normalizeInventoryPath(value);

  if (normalized.length === 0) {
    throw new RangeError('Repository scan inventory path must not be empty.');
  }

  if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) {
    throw new RangeError('Repository scan inventory path must be repository-relative.');
  }

  if (normalized.split('/').some((segment) => segment === '..' || segment === '.')) {
    throw new RangeError('Repository scan inventory path must not contain traversal segments.');
  }

  if (/[\u0000-\u001F\u007F]/.test(normalized)) {
    throw new RangeError('Repository scan inventory path must not include control characters.');
  }

  return normalized;
}

export function isRepositoryScanInventoryPath(value: unknown): value is RepositoryScanInventoryPath {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    parseRepositoryScanInventoryPath(value);
    return true;
  } catch {
    return false;
  }
}

export function parseRepositoryScanIssueCode(value: string): RepositoryScanIssueCode {
  if (typeof value !== 'string') {
    throw new RangeError('Repository scan issue code must be a string.');
  }

  if (value.trim() !== value) {
    throw new RangeError('Repository scan issue code must not have leading or trailing whitespace.');
  }

  if (!REPOSITORY_SCAN_ISSUE_CODE_PATTERN.test(value)) {
    throw new RangeError('Repository scan issue code must be uppercase and use the REPOSITORY_SCAN_ prefix.');
  }

  return value as RepositoryScanIssueCode;
}

export function isRepositoryScanIssueCode(value: unknown): value is RepositoryScanIssueCode {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    parseRepositoryScanIssueCode(value);
    return true;
  } catch {
    return false;
  }
}

export function isRepositoryScanStatus(value: unknown): value is RepositoryScanStatus {
  return typeof value === 'string' && REPOSITORY_SCAN_STATUSES.includes(value as RepositoryScanStatus);
}

export function isRepositoryScanIgnoredFileReason(
  value: unknown
): value is RepositoryScanIgnoredFileReason {
  return typeof value === 'string'
    && REPOSITORY_SCAN_IGNORED_FILE_REASONS.includes(value as RepositoryScanIgnoredFileReason);
}

export function isRepositoryScanInput(value: unknown): value is RepositoryScanInput {
  try {
    toSerializableRepositoryScanInput(value as RepositoryScanInput);
    return true;
  } catch {
    return false;
  }
}

export function assertRepositoryScanInput(value: unknown): asserts value is RepositoryScanInput {
  toSerializableRepositoryScanInput(value as RepositoryScanInput);
}

export function toSerializableRepositoryScanInput(input: RepositoryScanInput): RepositoryScanInput {
  assertPlainObject(input, 'Repository scan input');

  if (input.schemaVersion !== REPOSITORY_SCAN_INPUT_SCHEMA_VERSION) {
    throw new RangeError('Repository scan input schema version is unsupported.');
  }

  return {
    schemaVersion: REPOSITORY_SCAN_INPUT_SCHEMA_VERSION,
    inventory: toSerializableRepositoryScanSourceInventory(input.inventory)
  };
}

export function isRepositoryScanResult(value: unknown): value is RepositoryScanResult {
  try {
    toSerializableRepositoryScanResult(value as RepositoryScanResult);
    return true;
  } catch {
    return false;
  }
}

export function assertRepositoryScanResult(value: unknown): asserts value is RepositoryScanResult {
  toSerializableRepositoryScanResult(value as RepositoryScanResult);
}

export function toSerializableRepositoryScanResult(result: RepositoryScanResult): RepositoryScanResult {
  assertPlainObject(result, 'Repository scan result');

  if (result.schemaVersion !== REPOSITORY_SCAN_RESULT_SCHEMA_VERSION) {
    throw new RangeError('Repository scan result schema version is unsupported.');
  }

  if (!isRepositoryScanStatus(result.status)) {
    throw new RangeError('Repository scan result status is unsupported.');
  }

  const inventory = toSerializableRepositoryScanSourceInventory(result.inventory);
  const inventoryPaths = new Set(inventory.files.map((file: RepositoryScanSourceInventoryEntry) => file.path));
  const candidateFiles = normalizeCandidateFiles(result.candidateFiles, inventoryPaths);
  const ignoredFiles = normalizeIgnoredFiles(result.ignoredFiles, inventoryPaths);

  assertNoDispositionConflicts(candidateFiles, ignoredFiles);

  const warnings = normalizeWarnings(result.warnings, inventoryPaths);
  const errors = normalizeErrors(result.errors, inventoryPaths);
  const metadata = normalizeMetadata(result.metadata);
  const summary = normalizeSummary(
    result.summary,
    inventory.summary.fileCount,
    candidateFiles.length,
    ignoredFiles.length,
    warnings.length,
    errors.length
  );

  assertStatusConsistency(result.status, summary);

  return {
    schemaVersion: REPOSITORY_SCAN_RESULT_SCHEMA_VERSION,
    status: result.status,
    inventory,
    candidateFiles,
    ignoredFiles,
    warnings,
    errors,
    metadata,
    summary
  };
}

export function toSerializableRepositoryScanSourceInventory(
  inventory: RepositoryScanSourceInventory
): RepositoryScanSourceInventory {
  assertPlainObject(inventory, 'Repository scan source inventory');

  if (inventory.schemaVersion !== REPOSITORY_SCAN_SOURCE_INVENTORY_SCHEMA_VERSION) {
    throw new RangeError('Repository scan source inventory schema version is unsupported.');
  }

  assertPlainObject(inventory.root, 'Repository scan source inventory root');
  assertPlainObject(inventory.options, 'Repository scan source inventory options');

  if (!Array.isArray(inventory.files)) {
    throw new RangeError('Repository scan source inventory files must be an array.');
  }

  if (!Array.isArray(inventory.issues)) {
    throw new RangeError('Repository scan source inventory issues must be an array.');
  }

  const files = inventory.files.map((file, index) => normalizeSourceInventoryEntry(file, index));
  const issues = inventory.issues.map((issue, index) => normalizeSourceInventoryIssue(issue, index));
  const summary = normalizeSourceInventorySummary(inventory.summary, files);

  assertUniquePaths(files, 'source inventory files');

  return {
    schemaVersion: REPOSITORY_SCAN_SOURCE_INVENTORY_SCHEMA_VERSION,
    root: inventory.root,
    options: inventory.options,
    files,
    issues,
    summary
  };
}

function normalizeSourceInventoryEntry(
  entry: RepositoryScanSourceInventoryEntry,
  index: number
): RepositoryScanSourceInventoryEntry {
  assertPlainObject(entry, `Repository scan source inventory files[${index}]`);

  if (entry.schemaVersion !== REPOSITORY_SCAN_SOURCE_INVENTORY_ENTRY_SCHEMA_VERSION) {
    throw new RangeError(`Repository scan source inventory files[${index}] schema version is unsupported.`);
  }

  const baseEntry: RepositoryScanSourceInventoryEntry = {
    schemaVersion: REPOSITORY_SCAN_SOURCE_INVENTORY_ENTRY_SCHEMA_VERSION,
    path: parseRepositoryScanInventoryPath(entry.path),
    sizeBytes: normalizeNonNegativeInteger(
      entry.sizeBytes,
      `Repository scan source inventory files[${index}] sizeBytes`
    ),
    modifiedAt: normalizeIsoTimestamp(
      entry.modifiedAt,
      `Repository scan source inventory files[${index}] modifiedAt`
    ),
    kind: normalizeSourceFileKind(entry.kind, index)
  };

  const withCreatedAt = entry.createdAt === undefined
    ? baseEntry
    : {
        ...baseEntry,
        createdAt: normalizeIsoTimestamp(
          entry.createdAt,
          `Repository scan source inventory files[${index}] createdAt`
        )
      };

  return entry.extension === undefined
    ? withCreatedAt
    : {
        ...withCreatedAt,
        extension: normalizeRequiredExtension(
          entry.extension,
          `Repository scan source inventory files[${index}] extension`
        )
      };
}

function normalizeSourceInventoryIssue(
  issue: RepositoryScanSourceInventoryIssue,
  index: number
): RepositoryScanSourceInventoryIssue {
  assertPlainObject(issue, `Repository scan source inventory issues[${index}]`);

  if (typeof issue.code !== 'string' || !SOURCE_INVENTORY_ISSUE_CODE_PATTERN.test(issue.code)) {
    throw new RangeError(`Repository scan source inventory issues[${index}] code is unsupported.`);
  }

  if (!REPOSITORY_SCAN_SOURCE_INVENTORY_ISSUE_SEVERITIES.includes(issue.severity)) {
    throw new RangeError(`Repository scan source inventory issues[${index}] severity is unsupported.`);
  }

  const baseIssue: RepositoryScanSourceInventoryIssue = {
    code: issue.code,
    severity: issue.severity,
    message: normalizeMessage(issue.message, `Repository scan source inventory issues[${index}] message`)
  };

  return issue.path === undefined
    ? baseIssue
    : {
        ...baseIssue,
        path: parseRepositoryScanInventoryPath(issue.path)
      };
}

function normalizeSourceInventorySummary(
  summary: RepositoryScanSourceInventorySummary,
  files: readonly RepositoryScanSourceInventoryEntry[]
): RepositoryScanSourceInventorySummary {
  assertPlainObject(summary, 'Repository scan source inventory summary');

  const normalized: RepositoryScanSourceInventorySummary = {
    fileCount: normalizeNonNegativeInteger(
      summary.fileCount,
      'Repository scan source inventory summary fileCount'
    ),
    totalSizeBytes: normalizeNonNegativeInteger(
      summary.totalSizeBytes,
      'Repository scan source inventory summary totalSizeBytes'
    ),
    skippedFileCount: normalizeNonNegativeInteger(
      summary.skippedFileCount,
      'Repository scan source inventory summary skippedFileCount'
    ),
    skippedDirectoryCount: normalizeNonNegativeInteger(
      summary.skippedDirectoryCount,
      'Repository scan source inventory summary skippedDirectoryCount'
    ),
    oversizedFileCount: normalizeNonNegativeInteger(
      summary.oversizedFileCount,
      'Repository scan source inventory summary oversizedFileCount'
    ),
    symlinkCount: normalizeNonNegativeInteger(
      summary.symlinkCount,
      'Repository scan source inventory summary symlinkCount'
    )
  };

  if (normalized.fileCount !== files.length) {
    throw new RangeError('Repository scan source inventory fileCount does not match files.');
  }

  const totalSizeBytes = files.reduce(
    (sum: number, file: RepositoryScanSourceInventoryEntry) => sum + file.sizeBytes,
    0
  );

  if (normalized.totalSizeBytes !== totalSizeBytes) {
    throw new RangeError('Repository scan source inventory totalSizeBytes does not match files.');
  }

  return normalized;
}

function normalizeCandidateFiles(
  candidateFiles: readonly RepositoryScanCandidateFile[],
  inventoryPaths: ReadonlySet<RepositoryScanInventoryPath>
): RepositoryScanCandidateFile[] {
  if (!Array.isArray(candidateFiles)) {
    throw new RangeError('Repository scan candidateFiles must be an array.');
  }

  const normalized = candidateFiles.map((candidate, index) => {
    assertPlainObject(candidate, `Repository scan candidateFiles[${index}]`);

    if (candidate.schemaVersion !== REPOSITORY_SCAN_FILE_REFERENCE_SCHEMA_VERSION) {
      throw new RangeError(`Repository scan candidateFiles[${index}] schema version is unsupported.`);
    }

    const path = parseRepositoryScanInventoryPath(candidate.path);
    assertInventoryPathExists(path, inventoryPaths, `candidateFiles[${index}].path`);

    return {
      schemaVersion: REPOSITORY_SCAN_FILE_REFERENCE_SCHEMA_VERSION,
      path
    };
  });

  assertUniquePaths(normalized, 'candidateFiles');
  return normalized.sort(compareFileReferences);
}

function normalizeIgnoredFiles(
  ignoredFiles: readonly RepositoryScanIgnoredFile[],
  inventoryPaths: ReadonlySet<RepositoryScanInventoryPath>
): RepositoryScanIgnoredFile[] {
  if (!Array.isArray(ignoredFiles)) {
    throw new RangeError('Repository scan ignoredFiles must be an array.');
  }

  const normalized = ignoredFiles.map((ignored, index) => {
    assertPlainObject(ignored, `Repository scan ignoredFiles[${index}]`);

    if (ignored.schemaVersion !== REPOSITORY_SCAN_FILE_REFERENCE_SCHEMA_VERSION) {
      throw new RangeError(`Repository scan ignoredFiles[${index}] schema version is unsupported.`);
    }

    const path = parseRepositoryScanInventoryPath(ignored.path);
    assertInventoryPathExists(path, inventoryPaths, `ignoredFiles[${index}].path`);

    if (!isRepositoryScanIgnoredFileReason(ignored.reason)) {
      throw new RangeError(`Repository scan ignoredFiles[${index}] reason is unsupported.`);
    }

    return {
      schemaVersion: REPOSITORY_SCAN_FILE_REFERENCE_SCHEMA_VERSION,
      path,
      reason: ignored.reason,
      message: normalizeMessage(ignored.message, `Repository scan ignoredFiles[${index}] message`)
    };
  });

  assertUniquePaths(normalized, 'ignoredFiles');
  return normalized.sort(compareFileReferences);
}

function normalizeWarnings(
  warnings: readonly RepositoryScanWarning[],
  inventoryPaths: ReadonlySet<RepositoryScanInventoryPath>
): RepositoryScanWarning[] {
  if (!Array.isArray(warnings)) {
    throw new RangeError('Repository scan warnings must be an array.');
  }

  return warnings
    .map((warning, index) => normalizeWarning(warning, index, inventoryPaths))
    .sort(compareIssues);
}

function normalizeWarning(
  warning: RepositoryScanWarning,
  index: number,
  inventoryPaths: ReadonlySet<RepositoryScanInventoryPath>
): RepositoryScanWarning {
  assertPlainObject(warning, `Repository scan warnings[${index}]`);

  const base: RepositoryScanWarning = {
    code: parseRepositoryScanIssueCode(warning.code),
    message: normalizeMessage(warning.message, `Repository scan warnings[${index}] message`)
  };

  if (warning.path === undefined) {
    return base;
  }

  const path = parseRepositoryScanInventoryPath(warning.path);
  assertInventoryPathExists(path, inventoryPaths, `warnings[${index}].path`);

  return {
    ...base,
    path
  };
}

function normalizeErrors(
  errors: readonly RepositoryScanError[],
  inventoryPaths: ReadonlySet<RepositoryScanInventoryPath>
): RepositoryScanError[] {
  if (!Array.isArray(errors)) {
    throw new RangeError('Repository scan errors must be an array.');
  }

  return errors
    .map((error, index) => normalizeError(error, index, inventoryPaths))
    .sort(compareIssues);
}

function normalizeError(
  error: RepositoryScanError,
  index: number,
  inventoryPaths: ReadonlySet<RepositoryScanInventoryPath>
): RepositoryScanError {
  assertPlainObject(error, `Repository scan errors[${index}]`);

  if (typeof error.retryable !== 'boolean') {
    throw new RangeError(`Repository scan errors[${index}] retryable must be a boolean.`);
  }

  const base: RepositoryScanError = {
    code: parseRepositoryScanIssueCode(error.code),
    message: normalizeMessage(error.message, `Repository scan errors[${index}] message`),
    retryable: error.retryable
  };

  if (error.path === undefined) {
    return base;
  }

  const path = parseRepositoryScanInventoryPath(error.path);
  assertInventoryPathExists(path, inventoryPaths, `errors[${index}].path`);

  return {
    ...base,
    path
  };
}

function normalizeMetadata(metadata: RepositoryScanMetadata): RepositoryScanMetadata {
  assertPlainObject(metadata, 'Repository scan metadata');

  const startedAt = normalizeIsoTimestamp(metadata.startedAt, 'Repository scan startedAt');
  const completedAt = normalizeIsoTimestamp(metadata.completedAt, 'Repository scan completedAt');
  const durationMs = normalizeNonNegativeInteger(metadata.durationMs, 'Repository scan durationMs');

  if (Date.parse(completedAt) < Date.parse(startedAt)) {
    throw new RangeError('Repository scan completedAt must not be earlier than startedAt.');
  }

  return {
    startedAt,
    completedAt,
    durationMs
  };
}

function normalizeSummary(
  summary: RepositoryScanSummary,
  inventoryFileCount: number,
  candidateFileCount: number,
  ignoredFileCount: number,
  warningCount: number,
  errorCount: number
): RepositoryScanSummary {
  assertPlainObject(summary, 'Repository scan summary');

  const normalized: RepositoryScanSummary = {
    inventoryFileCount: normalizeNonNegativeInteger(
      summary.inventoryFileCount,
      'Repository scan summary inventoryFileCount'
    ),
    candidateFileCount: normalizeNonNegativeInteger(
      summary.candidateFileCount,
      'Repository scan summary candidateFileCount'
    ),
    ignoredFileCount: normalizeNonNegativeInteger(
      summary.ignoredFileCount,
      'Repository scan summary ignoredFileCount'
    ),
    unclassifiedFileCount: normalizeNonNegativeInteger(
      summary.unclassifiedFileCount,
      'Repository scan summary unclassifiedFileCount'
    ),
    warningCount: normalizeNonNegativeInteger(
      summary.warningCount,
      'Repository scan summary warningCount'
    ),
    errorCount: normalizeNonNegativeInteger(
      summary.errorCount,
      'Repository scan summary errorCount'
    )
  };

  if (normalized.inventoryFileCount !== inventoryFileCount) {
    throw new RangeError('Repository scan summary inventoryFileCount does not match the source inventory.');
  }

  if (normalized.candidateFileCount !== candidateFileCount) {
    throw new RangeError('Repository scan summary candidateFileCount does not match candidateFiles.');
  }

  if (normalized.ignoredFileCount !== ignoredFileCount) {
    throw new RangeError('Repository scan summary ignoredFileCount does not match ignoredFiles.');
  }

  if (normalized.warningCount !== warningCount) {
    throw new RangeError('Repository scan summary warningCount does not match warnings.');
  }

  if (normalized.errorCount !== errorCount) {
    throw new RangeError('Repository scan summary errorCount does not match errors.');
  }

  if (
    normalized.candidateFileCount
      + normalized.ignoredFileCount
      + normalized.unclassifiedFileCount
    !== normalized.inventoryFileCount
  ) {
    throw new RangeError('Repository scan file disposition counts must cover the source inventory exactly.');
  }

  return normalized;
}

function assertStatusConsistency(status: RepositoryScanStatus, summary: RepositoryScanSummary): void {
  const processedFileCount = summary.candidateFileCount + summary.ignoredFileCount;

  if (status === 'completed') {
    if (summary.errorCount !== 0 || summary.unclassifiedFileCount !== 0) {
      throw new RangeError('Completed repository scans must not contain errors or unclassified files.');
    }
    return;
  }

  if (status === 'partial') {
    if (processedFileCount === 0) {
      throw new RangeError('Partial repository scans must contain at least one classified file.');
    }

    if (summary.errorCount === 0 && summary.unclassifiedFileCount === 0) {
      throw new RangeError('Partial repository scans must contain errors or unclassified files.');
    }
    return;
  }

  if (summary.errorCount === 0) {
    throw new RangeError('Failed repository scans must contain at least one error.');
  }

  if (processedFileCount !== 0) {
    throw new RangeError('Failed repository scans must not contain classified files.');
  }
}

function assertNoDispositionConflicts(
  candidateFiles: readonly RepositoryScanCandidateFile[],
  ignoredFiles: readonly RepositoryScanIgnoredFile[]
): void {
  const candidatePaths = new Set(candidateFiles.map((file) => file.path));
  const conflict = ignoredFiles.find((file) => candidatePaths.has(file.path));

  if (conflict !== undefined) {
    throw new RangeError(`Repository scan file ${conflict.path} cannot be both candidate and ignored.`);
  }
}

function assertUniquePaths(
  files: readonly { readonly path: RepositoryScanInventoryPath }[],
  collectionName: string
): void {
  const seen = new Set<RepositoryScanInventoryPath>();

  for (const file of files) {
    if (seen.has(file.path)) {
      throw new RangeError(`Repository scan ${collectionName} contains duplicate path ${file.path}.`);
    }
    seen.add(file.path);
  }
}

function assertInventoryPathExists(
  path: RepositoryScanInventoryPath,
  inventoryPaths: ReadonlySet<RepositoryScanInventoryPath>,
  label: string
): void {
  if (!inventoryPaths.has(path)) {
    throw new RangeError(`Repository scan ${label} must reference a file from the source inventory.`);
  }
}

function normalizeMessage(value: string, label: string): string {
  if (typeof value !== 'string') {
    throw new RangeError(`${label} must be a string.`);
  }

  const message = value.trim();

  if (message.length === 0) {
    throw new RangeError(`${label} must not be empty.`);
  }

  return message;
}

function normalizeIsoTimestamp(value: string, label: string): string {
  if (typeof value !== 'string') {
    throw new RangeError(`${label} must be a string.`);
  }

  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    throw new RangeError(`${label} must be a valid ISO timestamp.`);
  }

  return new Date(timestamp).toISOString();
}

function normalizeNonNegativeInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer.`);
  }

  return value;
}

function normalizeSourceFileKind(value: string, index: number): RepositoryScanSourceFileKind {
  if (!REPOSITORY_SCAN_SOURCE_FILE_KINDS.includes(value as RepositoryScanSourceFileKind)) {
    throw new RangeError(`Repository scan source inventory files[${index}] kind is unsupported.`);
  }

  return value as RepositoryScanSourceFileKind;
}

function normalizeRequiredExtension(value: string, label: string): string {
  if (typeof value !== 'string') {
    throw new RangeError(`${label} must be a string.`);
  }

  const extension = value.trim().toLowerCase();

  if (extension.length === 0) {
    throw new RangeError(`${label} must not be empty when present.`);
  }

  if (!extension.startsWith('.') || extension.length === 1) {
    throw new RangeError(`${label} must start with a dot and include a suffix.`);
  }

  if (extension.includes('/') || extension.includes('\\') || /[\u0000-\u001F\u007F]/.test(extension)) {
    throw new RangeError(`${label} must be a single path suffix.`);
  }

  return extension;
}

function normalizeInventoryPath(value: string): string {
  return value
    .trim()
    .replaceAll('\\', '/')
    .split('/')
    .filter((segment) => segment.length > 0 && segment !== '.')
    .join('/');
}

function compareFileReferences(
  left: RepositoryScanCandidateFile | RepositoryScanIgnoredFile,
  right: RepositoryScanCandidateFile | RepositoryScanIgnoredFile
): number {
  return left.path.localeCompare(right.path);
}

function compareIssues(
  left: RepositoryScanWarning | RepositoryScanError,
  right: RepositoryScanWarning | RepositoryScanError
): number {
  return left.code.localeCompare(right.code)
    || (left.path ?? '').localeCompare(right.path ?? '')
    || left.message.localeCompare(right.message);
}

function assertPlainObject(value: unknown, label: string): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RangeError(`${label} must be a plain object.`);
  }
}

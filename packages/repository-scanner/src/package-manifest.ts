import {
  parseRepositoryScanInventoryPath,
  parseRepositoryScanIssueCode,
  toSerializableRepositoryScanResult,
  type RepositoryScanError,
  type RepositoryScanInventoryPath,
  type RepositoryScanResult,
  type RepositoryScanSourceInventoryEntry,
  type RepositoryScanStatus,
  type RepositoryScanWarning
} from './scan-result.js';

export const REPOSITORY_PACKAGE_MANIFEST_SCHEMA_VERSION = 1 as const;
export const REPOSITORY_PACKAGE_MANIFEST_DETECTION_RESULT_SCHEMA_VERSION = 1 as const;
export const REPOSITORY_PACKAGE_MANIFEST_DETECTION_RULESET_VERSION = 1 as const;

export const REPOSITORY_PACKAGE_MANIFEST_ECOSYSTEMS = [
  'node'
] as const;

export type RepositoryPackageManifestEcosystem = typeof REPOSITORY_PACKAGE_MANIFEST_ECOSYSTEMS[number];

export const REPOSITORY_PACKAGE_MANIFEST_NAMES = [
  'package.json'
] as const;

export type RepositoryPackageManifestName = typeof REPOSITORY_PACKAGE_MANIFEST_NAMES[number];

export const REPOSITORY_PACKAGE_MANIFEST_DETECTION_METHODS = [
  'metadata-path'
] as const;

export type RepositoryPackageManifestDetectionMethod =
  typeof REPOSITORY_PACKAGE_MANIFEST_DETECTION_METHODS[number];

export interface RepositoryPackageManifest {
  readonly schemaVersion: typeof REPOSITORY_PACKAGE_MANIFEST_SCHEMA_VERSION;
  readonly path: RepositoryScanInventoryPath;
  readonly ecosystem: RepositoryPackageManifestEcosystem;
  readonly manifestName: RepositoryPackageManifestName;
  readonly detectionMethod: RepositoryPackageManifestDetectionMethod;
  readonly packageRootPath?: RepositoryScanInventoryPath;
}

export interface RepositoryPackageManifestDetectionSummary {
  readonly sourceCandidateFileCount: number;
  readonly sourceManifestCandidateFileCount: number;
  readonly packageManifestCount: number;
  readonly unsupportedManifestCandidateCount: number;
  readonly warningCount: number;
  readonly errorCount: number;
}

export interface RepositoryPackageManifestDetectionResult {
  readonly schemaVersion: typeof REPOSITORY_PACKAGE_MANIFEST_DETECTION_RESULT_SCHEMA_VERSION;
  readonly status: RepositoryScanStatus;
  readonly sourceScan: RepositoryScanResult;
  readonly packageManifests: readonly RepositoryPackageManifest[];
  readonly warnings: readonly RepositoryScanWarning[];
  readonly errors: readonly RepositoryScanError[];
  readonly summary: RepositoryPackageManifestDetectionSummary;
}

interface ManifestDetectionAccumulator {
  readonly packageManifests: RepositoryPackageManifest[];
  readonly warnings: RepositoryScanWarning[];
  readonly errors: RepositoryScanError[];
  sourceManifestCandidateFileCount: number;
  unsupportedManifestCandidateCount: number;
}

const NODE_PACKAGE_MANIFEST_NAME = 'package.json';

export function detectPackageManifestsFromScanResult(
  sourceScan: RepositoryScanResult
): RepositoryPackageManifestDetectionResult {
  const normalizedSourceScan = toSerializableRepositoryScanResult(sourceScan);
  const inventoryByPath = createInventoryEntryMap(normalizedSourceScan.inventory.files);
  const accumulator: ManifestDetectionAccumulator = {
    packageManifests: [],
    warnings: [],
    errors: [],
    sourceManifestCandidateFileCount: 0,
    unsupportedManifestCandidateCount: 0
  };

  if (normalizedSourceScan.status === 'failed') {
    accumulator.errors.push({
      code: parseRepositoryScanIssueCode('REPOSITORY_SCAN_PACKAGE_MANIFEST_DETECTION_SKIPPED'),
      message: 'Package manifest detection was skipped because the source repository scan failed.',
      retryable: false
    });
  } else {
    for (const candidate of normalizedSourceScan.candidateFiles) {
      const inventoryEntry = inventoryByPath.get(candidate.path);

      if (inventoryEntry === undefined || inventoryEntry.kind !== 'manifest') {
        continue;
      }

      accumulator.sourceManifestCandidateFileCount += 1;
      detectPackageManifestCandidate(inventoryEntry, accumulator);
    }
  }

  return toSerializableRepositoryPackageManifestDetectionResult({
    schemaVersion: REPOSITORY_PACKAGE_MANIFEST_DETECTION_RESULT_SCHEMA_VERSION,
    status: determinePackageManifestDetectionStatus(normalizedSourceScan.status, accumulator.errors),
    sourceScan: normalizedSourceScan,
    packageManifests: accumulator.packageManifests,
    warnings: accumulator.warnings,
    errors: accumulator.errors,
    summary: {
      sourceCandidateFileCount: normalizedSourceScan.candidateFiles.length,
      sourceManifestCandidateFileCount: accumulator.sourceManifestCandidateFileCount,
      packageManifestCount: accumulator.packageManifests.length,
      unsupportedManifestCandidateCount: accumulator.unsupportedManifestCandidateCount,
      warningCount: accumulator.warnings.length,
      errorCount: accumulator.errors.length
    }
  });
}

export const detectPackageManifests = detectPackageManifestsFromScanResult;

export function isRepositoryPackageManifestDetectionResult(
  value: unknown
): value is RepositoryPackageManifestDetectionResult {
  try {
    toSerializableRepositoryPackageManifestDetectionResult(
      value as RepositoryPackageManifestDetectionResult
    );
    return true;
  } catch {
    return false;
  }
}

export function assertRepositoryPackageManifestDetectionResult(
  value: unknown
): asserts value is RepositoryPackageManifestDetectionResult {
  toSerializableRepositoryPackageManifestDetectionResult(
    value as RepositoryPackageManifestDetectionResult
  );
}

export function toSerializableRepositoryPackageManifestDetectionResult(
  result: RepositoryPackageManifestDetectionResult
): RepositoryPackageManifestDetectionResult {
  assertPlainObject(result, 'Repository package manifest detection result');

  if (result.schemaVersion !== REPOSITORY_PACKAGE_MANIFEST_DETECTION_RESULT_SCHEMA_VERSION) {
    throw new RangeError('Repository package manifest detection result schema version is unsupported.');
  }

  const sourceScan = toSerializableRepositoryScanResult(result.sourceScan);
  const inventoryByPath = createInventoryEntryMap(sourceScan.inventory.files);
  const candidatePaths = new Set(sourceScan.candidateFiles.map((file) => file.path));
  const inventoryPaths = new Set(sourceScan.inventory.files.map((file) => file.path));
  const packageManifests = normalizePackageManifests(
    result.packageManifests,
    candidatePaths,
    inventoryByPath
  );
  const warnings = normalizeWarnings(result.warnings, inventoryPaths);
  const errors = normalizeErrors(result.errors, inventoryPaths);
  const summary = normalizePackageManifestDetectionSummary(
    result.summary,
    sourceScan.candidateFiles.length,
    countSourceManifestCandidates(sourceScan, inventoryByPath),
    packageManifests.length,
    countUnsupportedManifestCandidates(sourceScan, inventoryByPath, packageManifests),
    warnings.length,
    errors.length
  );

  assertPackageManifestDetectionStatus(result.status, sourceScan.status, summary);

  return {
    schemaVersion: REPOSITORY_PACKAGE_MANIFEST_DETECTION_RESULT_SCHEMA_VERSION,
    status: result.status,
    sourceScan,
    packageManifests,
    warnings,
    errors,
    summary
  };
}

function detectPackageManifestCandidate(
  inventoryEntry: RepositoryScanSourceInventoryEntry,
  accumulator: ManifestDetectionAccumulator
): void {
  const lowerFileName = getInventoryFileName(inventoryEntry.path).toLowerCase();

  if (isNodePackageManifest(inventoryEntry, lowerFileName)) {
    accumulator.packageManifests.push(toNodePackageManifest(inventoryEntry.path));
    return;
  }

  accumulator.unsupportedManifestCandidateCount += 1;
  accumulator.warnings.push({
    code: parseRepositoryScanIssueCode('REPOSITORY_SCAN_UNSUPPORTED_PACKAGE_MANIFEST'),
    message: 'Manifest candidate is not a supported package manifest in MVP 1.',
    path: inventoryEntry.path
  });
}

function toNodePackageManifest(path: RepositoryScanInventoryPath): RepositoryPackageManifest {
  const packageRootPath = getInventoryDirectoryPath(path);
  const baseManifest: RepositoryPackageManifest = {
    schemaVersion: REPOSITORY_PACKAGE_MANIFEST_SCHEMA_VERSION,
    path,
    ecosystem: 'node',
    manifestName: NODE_PACKAGE_MANIFEST_NAME,
    detectionMethod: 'metadata-path'
  };

  return packageRootPath === undefined
    ? baseManifest
    : {
        ...baseManifest,
        packageRootPath
      };
}

function isNodePackageManifest(
  inventoryEntry: RepositoryScanSourceInventoryEntry,
  lowerFileName: string
): boolean {
  const extension = inventoryEntry.extension?.toLowerCase();

  return lowerFileName === NODE_PACKAGE_MANIFEST_NAME
    && inventoryEntry.kind === 'manifest'
    && (extension === undefined || extension === '.json');
}

function normalizePackageManifests(
  packageManifests: readonly RepositoryPackageManifest[],
  candidatePaths: ReadonlySet<RepositoryScanInventoryPath>,
  inventoryByPath: ReadonlyMap<RepositoryScanInventoryPath, RepositoryScanSourceInventoryEntry>
): RepositoryPackageManifest[] {
  if (!Array.isArray(packageManifests)) {
    throw new RangeError('Repository package manifests must be an array.');
  }

  const normalized = packageManifests.map((manifest, index) => normalizePackageManifest(
    manifest,
    index,
    candidatePaths,
    inventoryByPath
  ));

  assertUniqueManifestPaths(normalized);
  return normalized.sort(comparePackageManifests);
}

function normalizePackageManifest(
  manifest: RepositoryPackageManifest,
  index: number,
  candidatePaths: ReadonlySet<RepositoryScanInventoryPath>,
  inventoryByPath: ReadonlyMap<RepositoryScanInventoryPath, RepositoryScanSourceInventoryEntry>
): RepositoryPackageManifest {
  assertPlainObject(manifest, `Repository package manifests[${index}]`);

  if (manifest.schemaVersion !== REPOSITORY_PACKAGE_MANIFEST_SCHEMA_VERSION) {
    throw new RangeError(`Repository package manifests[${index}] schema version is unsupported.`);
  }

  const path = parseRepositoryScanInventoryPath(manifest.path);

  if (!candidatePaths.has(path)) {
    throw new RangeError(`Repository package manifests[${index}] path must reference a source scan candidate file.`);
  }

  const inventoryEntry = inventoryByPath.get(path);

  if (inventoryEntry === undefined || !isNodePackageManifest(inventoryEntry, getInventoryFileName(path).toLowerCase())) {
    throw new RangeError(`Repository package manifests[${index}] path is not a supported package manifest.`);
  }

  if (!REPOSITORY_PACKAGE_MANIFEST_ECOSYSTEMS.includes(manifest.ecosystem)) {
    throw new RangeError(`Repository package manifests[${index}] ecosystem is unsupported.`);
  }

  if (!REPOSITORY_PACKAGE_MANIFEST_NAMES.includes(manifest.manifestName)) {
    throw new RangeError(`Repository package manifests[${index}] manifestName is unsupported.`);
  }

  if (!REPOSITORY_PACKAGE_MANIFEST_DETECTION_METHODS.includes(manifest.detectionMethod)) {
    throw new RangeError(`Repository package manifests[${index}] detectionMethod is unsupported.`);
  }

  const expectedPackageRootPath = getInventoryDirectoryPath(path);

  if (expectedPackageRootPath === undefined) {
    if (manifest.packageRootPath !== undefined) {
      throw new RangeError(`Repository package manifests[${index}] packageRootPath must be omitted for root manifests.`);
    }

    return {
      schemaVersion: REPOSITORY_PACKAGE_MANIFEST_SCHEMA_VERSION,
      path,
      ecosystem: 'node',
      manifestName: NODE_PACKAGE_MANIFEST_NAME,
      detectionMethod: 'metadata-path'
    };
  }

  if (manifest.packageRootPath === undefined) {
    throw new RangeError(`Repository package manifests[${index}] packageRootPath is required for nested manifests.`);
  }

  const packageRootPath = parseRepositoryScanInventoryPath(manifest.packageRootPath);

  if (packageRootPath !== expectedPackageRootPath) {
    throw new RangeError(`Repository package manifests[${index}] packageRootPath must match the manifest directory.`);
  }

  return {
    schemaVersion: REPOSITORY_PACKAGE_MANIFEST_SCHEMA_VERSION,
    path,
    ecosystem: 'node',
    manifestName: NODE_PACKAGE_MANIFEST_NAME,
    detectionMethod: 'metadata-path',
    packageRootPath
  };
}

function normalizeWarnings(
  warnings: readonly RepositoryScanWarning[],
  inventoryPaths: ReadonlySet<RepositoryScanInventoryPath>
): RepositoryScanWarning[] {
  if (!Array.isArray(warnings)) {
    throw new RangeError('Repository package manifest detection warnings must be an array.');
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
  assertPlainObject(warning, `Repository package manifest detection warnings[${index}]`);

  const baseWarning: RepositoryScanWarning = {
    code: parseRepositoryScanIssueCode(warning.code),
    message: normalizeMessage(
      warning.message,
      `Repository package manifest detection warnings[${index}] message`
    )
  };

  if (warning.path === undefined) {
    return baseWarning;
  }

  const path = parseRepositoryScanInventoryPath(warning.path);
  assertInventoryPathExists(
    path,
    inventoryPaths,
    `Repository package manifest detection warnings[${index}] path`
  );

  return {
    ...baseWarning,
    path
  };
}

function normalizeErrors(
  errors: readonly RepositoryScanError[],
  inventoryPaths: ReadonlySet<RepositoryScanInventoryPath>
): RepositoryScanError[] {
  if (!Array.isArray(errors)) {
    throw new RangeError('Repository package manifest detection errors must be an array.');
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
  assertPlainObject(error, `Repository package manifest detection errors[${index}]`);

  if (typeof error.retryable !== 'boolean') {
    throw new RangeError(`Repository package manifest detection errors[${index}] retryable must be a boolean.`);
  }

  const baseError: RepositoryScanError = {
    code: parseRepositoryScanIssueCode(error.code),
    message: normalizeMessage(
      error.message,
      `Repository package manifest detection errors[${index}] message`
    ),
    retryable: error.retryable
  };

  if (error.path === undefined) {
    return baseError;
  }

  const path = parseRepositoryScanInventoryPath(error.path);
  assertInventoryPathExists(
    path,
    inventoryPaths,
    `Repository package manifest detection errors[${index}] path`
  );

  return {
    ...baseError,
    path
  };
}

function normalizePackageManifestDetectionSummary(
  summary: RepositoryPackageManifestDetectionSummary,
  sourceCandidateFileCount: number,
  sourceManifestCandidateFileCount: number,
  packageManifestCount: number,
  unsupportedManifestCandidateCount: number,
  warningCount: number,
  errorCount: number
): RepositoryPackageManifestDetectionSummary {
  assertPlainObject(summary, 'Repository package manifest detection summary');

  const normalized: RepositoryPackageManifestDetectionSummary = {
    sourceCandidateFileCount: normalizeNonNegativeInteger(
      summary.sourceCandidateFileCount,
      'Repository package manifest detection summary sourceCandidateFileCount'
    ),
    sourceManifestCandidateFileCount: normalizeNonNegativeInteger(
      summary.sourceManifestCandidateFileCount,
      'Repository package manifest detection summary sourceManifestCandidateFileCount'
    ),
    packageManifestCount: normalizeNonNegativeInteger(
      summary.packageManifestCount,
      'Repository package manifest detection summary packageManifestCount'
    ),
    unsupportedManifestCandidateCount: normalizeNonNegativeInteger(
      summary.unsupportedManifestCandidateCount,
      'Repository package manifest detection summary unsupportedManifestCandidateCount'
    ),
    warningCount: normalizeNonNegativeInteger(
      summary.warningCount,
      'Repository package manifest detection summary warningCount'
    ),
    errorCount: normalizeNonNegativeInteger(
      summary.errorCount,
      'Repository package manifest detection summary errorCount'
    )
  };

  if (normalized.sourceCandidateFileCount !== sourceCandidateFileCount) {
    throw new RangeError('Repository package manifest detection sourceCandidateFileCount does not match source scan.');
  }

  if (normalized.sourceManifestCandidateFileCount !== sourceManifestCandidateFileCount) {
    throw new RangeError('Repository package manifest detection sourceManifestCandidateFileCount does not match source scan.');
  }

  if (normalized.packageManifestCount !== packageManifestCount) {
    throw new RangeError('Repository package manifest detection packageManifestCount does not match packageManifests.');
  }

  if (normalized.unsupportedManifestCandidateCount !== unsupportedManifestCandidateCount) {
    throw new RangeError(
      'Repository package manifest detection unsupportedManifestCandidateCount does not match source scan.'
    );
  }

  if (normalized.warningCount !== warningCount) {
    throw new RangeError('Repository package manifest detection warningCount does not match warnings.');
  }

  if (normalized.errorCount !== errorCount) {
    throw new RangeError('Repository package manifest detection errorCount does not match errors.');
  }

  return normalized;
}

function assertPackageManifestDetectionStatus(
  status: RepositoryScanStatus,
  sourceScanStatus: RepositoryScanStatus,
  summary: RepositoryPackageManifestDetectionSummary
): void {
  if (status === 'completed') {
    if (sourceScanStatus !== 'completed' || summary.errorCount !== 0) {
      throw new RangeError('Completed package manifest detection requires a completed source scan and no errors.');
    }
    return;
  }

  if (status === 'partial') {
    if (sourceScanStatus === 'completed' && summary.errorCount === 0) {
      throw new RangeError('Partial package manifest detection requires a partial source scan or errors.');
    }
    return;
  }

  if (status === 'failed') {
    if (summary.errorCount === 0) {
      throw new RangeError('Failed package manifest detection must contain at least one error.');
    }
    return;
  }

  throw new RangeError('Repository package manifest detection status is unsupported.');
}

function determinePackageManifestDetectionStatus(
  sourceScanStatus: RepositoryScanStatus,
  errors: readonly RepositoryScanError[]
): RepositoryScanStatus {
  if (sourceScanStatus === 'failed') {
    return 'failed';
  }

  if (errors.length > 0 || sourceScanStatus === 'partial') {
    return 'partial';
  }

  return 'completed';
}

function countSourceManifestCandidates(
  sourceScan: RepositoryScanResult,
  inventoryByPath: ReadonlyMap<RepositoryScanInventoryPath, RepositoryScanSourceInventoryEntry>
): number {
  return sourceScan.candidateFiles.filter((candidate) => {
    const entry = inventoryByPath.get(candidate.path);
    return entry !== undefined && entry.kind === 'manifest';
  }).length;
}

function countUnsupportedManifestCandidates(
  sourceScan: RepositoryScanResult,
  inventoryByPath: ReadonlyMap<RepositoryScanInventoryPath, RepositoryScanSourceInventoryEntry>,
  packageManifests: readonly RepositoryPackageManifest[]
): number {
  const packageManifestPaths = new Set(packageManifests.map((manifest) => manifest.path));

  return sourceScan.candidateFiles.filter((candidate) => {
    const entry = inventoryByPath.get(candidate.path);
    return entry !== undefined && entry.kind === 'manifest' && !packageManifestPaths.has(candidate.path);
  }).length;
}

function createInventoryEntryMap(
  files: readonly RepositoryScanSourceInventoryEntry[]
): ReadonlyMap<RepositoryScanInventoryPath, RepositoryScanSourceInventoryEntry> {
  return new Map(files.map((file) => [file.path, file]));
}

function getInventoryFileName(path: RepositoryScanInventoryPath): string {
  const segments = path.split('/');
  return segments[segments.length - 1] ?? path;
}

function getInventoryDirectoryPath(
  path: RepositoryScanInventoryPath
): RepositoryScanInventoryPath | undefined {
  const lastSlashIndex = path.lastIndexOf('/');

  return lastSlashIndex === -1
    ? undefined
    : parseRepositoryScanInventoryPath(path.slice(0, lastSlashIndex));
}

function assertUniqueManifestPaths(packageManifests: readonly RepositoryPackageManifest[]): void {
  const seen = new Set<RepositoryScanInventoryPath>();

  for (const manifest of packageManifests) {
    if (seen.has(manifest.path)) {
      throw new RangeError(`Repository package manifests contain duplicate path ${manifest.path}.`);
    }

    seen.add(manifest.path);
  }
}

function assertInventoryPathExists(
  path: RepositoryScanInventoryPath,
  inventoryPaths: ReadonlySet<RepositoryScanInventoryPath>,
  label: string
): void {
  if (!inventoryPaths.has(path)) {
    throw new RangeError(`${label} must reference a file from the source inventory.`);
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

function normalizeNonNegativeInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer.`);
  }

  return value;
}

function comparePackageManifests(
  left: RepositoryPackageManifest,
  right: RepositoryPackageManifest
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


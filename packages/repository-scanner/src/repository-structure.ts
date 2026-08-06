import {
  toSerializableRepositoryPackageManifestDetectionResult,
  type RepositoryPackageManifest,
  type RepositoryPackageManifestDetectionResult,
  type RepositoryPackageManifestEcosystem
} from './package-manifest.js';
import {
  parseRepositoryScanInventoryPath,
  parseRepositoryScanIssueCode,
  toSerializableRepositoryScanResult,
  type RepositoryScanError,
  type RepositoryScanIgnoredFile,
  type RepositoryScanInventoryPath,
  type RepositoryScanSourceInventoryEntry,
  type RepositoryScanSourceFileKind,
  type RepositoryScanStatus,
  type RepositoryScanWarning
} from './scan-result.js';

export const REPOSITORY_STRUCTURE_SUMMARY_RESULT_SCHEMA_VERSION = 1 as const;
export const REPOSITORY_STRUCTURE_REPOSITORY_SUMMARY_SCHEMA_VERSION = 1 as const;
export const REPOSITORY_STRUCTURE_DIRECTORY_SUMMARY_SCHEMA_VERSION = 1 as const;
export const REPOSITORY_STRUCTURE_PACKAGE_ROOT_SUMMARY_SCHEMA_VERSION = 1 as const;

export const REPOSITORY_STRUCTURE_PACKAGE_ROOT_KINDS = [
  'root',
  'nested'
] as const;

export type RepositoryStructurePackageRootKind = typeof REPOSITORY_STRUCTURE_PACKAGE_ROOT_KINDS[number];

export const REPOSITORY_STRUCTURE_DIRECTORY_ROLES = [
  'package-container',
  'source-container',
  'test-container',
  'configuration',
  'documentation',
  'asset'
] as const;

export type RepositoryStructureDirectoryRole = typeof REPOSITORY_STRUCTURE_DIRECTORY_ROLES[number];

export interface RepositoryStructureRepositorySummary {
  readonly schemaVersion: typeof REPOSITORY_STRUCTURE_REPOSITORY_SUMMARY_SCHEMA_VERSION;
  readonly rootFileCount: number;
  readonly topLevelDirectoryCount: number;
  readonly maxDirectoryDepth: number;
  readonly totalSizeBytes: number;
}

export interface RepositoryStructureDirectorySummary {
  readonly schemaVersion: typeof REPOSITORY_STRUCTURE_DIRECTORY_SUMMARY_SCHEMA_VERSION;
  readonly path: RepositoryScanInventoryPath;
  readonly depth: number;
  readonly fileCount: number;
  readonly candidateFileCount: number;
  readonly ignoredFileCount: number;
  readonly manifestFileCount: number;
  readonly packageRootCount: number;
  readonly totalSizeBytes: number;
  readonly roles: readonly RepositoryStructureDirectoryRole[];
}

export interface RepositoryStructurePackageRootSummary {
  readonly schemaVersion: typeof REPOSITORY_STRUCTURE_PACKAGE_ROOT_SUMMARY_SCHEMA_VERSION;
  readonly kind: RepositoryStructurePackageRootKind;
  readonly ecosystem: RepositoryPackageManifestEcosystem;
  readonly manifestPath: RepositoryScanInventoryPath;
  readonly packageRootPath?: RepositoryScanInventoryPath;
  readonly fileCount: number;
  readonly candidateFileCount: number;
  readonly ignoredFileCount: number;
  readonly sourceFileCount: number;
  readonly testFileCount: number;
  readonly configFileCount: number;
  readonly manifestFileCount: number;
  readonly documentationFileCount: number;
  readonly assetFileCount: number;
  readonly unknownFileCount: number;
  readonly totalSizeBytes: number;
}

export interface RepositoryStructureSummaryCounts {
  readonly inventoryFileCount: number;
  readonly candidateFileCount: number;
  readonly ignoredFileCount: number;
  readonly unclassifiedFileCount: number;
  readonly packageRootCount: number;
  readonly rootPackageCount: number;
  readonly nestedPackageCount: number;
  readonly topLevelDirectoryCount: number;
  readonly sourceFileCount: number;
  readonly testFileCount: number;
  readonly configFileCount: number;
  readonly manifestFileCount: number;
  readonly documentationFileCount: number;
  readonly assetFileCount: number;
  readonly unknownFileCount: number;
  readonly totalSizeBytes: number;
  readonly maxDirectoryDepth: number;
  readonly warningCount: number;
  readonly errorCount: number;
}

export interface RepositoryStructureSummaryResult {
  readonly schemaVersion: typeof REPOSITORY_STRUCTURE_SUMMARY_RESULT_SCHEMA_VERSION;
  readonly status: RepositoryScanStatus;
  readonly packageManifestDetection: RepositoryPackageManifestDetectionResult;
  readonly repository: RepositoryStructureRepositorySummary;
  readonly topLevelDirectories: readonly RepositoryStructureDirectorySummary[];
  readonly packageRoots: readonly RepositoryStructurePackageRootSummary[];
  readonly warnings: readonly RepositoryScanWarning[];
  readonly errors: readonly RepositoryScanError[];
  readonly summary: RepositoryStructureSummaryCounts;
}

interface DirectoryAccumulator {
  readonly path: RepositoryScanInventoryPath;
  fileCount: number;
  candidateFileCount: number;
  ignoredFileCount: number;
  manifestFileCount: number;
  packageRootCount: number;
  totalSizeBytes: number;
  readonly roles: Set<RepositoryStructureDirectoryRole>;
}

interface FileDispositionIndex {
  readonly candidatePaths: ReadonlySet<RepositoryScanInventoryPath>;
  readonly ignoredPaths: ReadonlySet<RepositoryScanInventoryPath>;
}

export function deriveRepositoryStructureFromPackageManifestDetection(
  packageManifestDetection: RepositoryPackageManifestDetectionResult
): RepositoryStructureSummaryResult {
  const normalizedDetection = toSerializableRepositoryPackageManifestDetectionResult(packageManifestDetection);
  const sourceScan = normalizedDetection.sourceScan;
  const dispositionIndex = createFileDispositionIndex(sourceScan.candidateFiles, sourceScan.ignoredFiles);
  const warnings = normalizeStructureWarnings([
    ...sourceScan.warnings,
    ...normalizedDetection.warnings
  ], createInventoryPathSet(sourceScan.inventory.files));
  const errors = normalizeStructureErrors([
    ...sourceScan.errors,
    ...normalizedDetection.errors,
    ...toStructureSummaryErrors(normalizedDetection.status)
  ], createInventoryPathSet(sourceScan.inventory.files));

  const packageRoots = normalizedDetection.status === 'failed'
    ? []
    : derivePackageRootSummaries(
        normalizedDetection.packageManifests,
        sourceScan.inventory.files,
        dispositionIndex
      );
  const topLevelDirectories = normalizedDetection.status === 'failed'
    ? []
    : deriveTopLevelDirectorySummaries(
        sourceScan.inventory.files,
        dispositionIndex,
        normalizedDetection.packageManifests
      );
  const repository = normalizedDetection.status === 'failed'
    ? emptyRepositorySummary()
    : deriveRepositorySummary(sourceScan.inventory.files, topLevelDirectories.length);

  return toSerializableRepositoryStructureSummaryResult({
    schemaVersion: REPOSITORY_STRUCTURE_SUMMARY_RESULT_SCHEMA_VERSION,
    status: determineRepositoryStructureSummaryStatus(normalizedDetection.status, errors),
    packageManifestDetection: normalizedDetection,
    repository,
    topLevelDirectories,
    packageRoots,
    warnings,
    errors,
    summary: deriveStructureSummaryCounts(
      normalizedDetection.status === 'failed' ? [] : sourceScan.inventory.files,
      normalizedDetection.status === 'failed' ? 0 : sourceScan.summary.candidateFileCount,
      normalizedDetection.status === 'failed' ? 0 : sourceScan.summary.ignoredFileCount,
      normalizedDetection.status === 'failed' ? 0 : sourceScan.summary.unclassifiedFileCount,
      packageRoots,
      topLevelDirectories.length,
      repository.maxDirectoryDepth,
      warnings.length,
      errors.length
    )
  });
}

export const deriveRepositoryStructureSummary = deriveRepositoryStructureFromPackageManifestDetection;

export function isRepositoryStructureSummaryResult(
  value: unknown
): value is RepositoryStructureSummaryResult {
  try {
    toSerializableRepositoryStructureSummaryResult(value as RepositoryStructureSummaryResult);
    return true;
  } catch {
    return false;
  }
}

export function assertRepositoryStructureSummaryResult(
  value: unknown
): asserts value is RepositoryStructureSummaryResult {
  toSerializableRepositoryStructureSummaryResult(value as RepositoryStructureSummaryResult);
}

export function toSerializableRepositoryStructureSummaryResult(
  result: RepositoryStructureSummaryResult
): RepositoryStructureSummaryResult {
  assertPlainObject(result, 'Repository structure summary result');

  if (result.schemaVersion !== REPOSITORY_STRUCTURE_SUMMARY_RESULT_SCHEMA_VERSION) {
    throw new RangeError('Repository structure summary result schema version is unsupported.');
  }

  const packageManifestDetection = toSerializableRepositoryPackageManifestDetectionResult(
    result.packageManifestDetection
  );
  const sourceScan = toSerializableRepositoryScanResult(packageManifestDetection.sourceScan);
  const inventoryPaths = createInventoryPathSet(sourceScan.inventory.files);
  const dispositionIndex = createFileDispositionIndex(sourceScan.candidateFiles, sourceScan.ignoredFiles);
  const structureFiles = packageManifestDetection.status === 'failed' ? [] : sourceScan.inventory.files;
  const topLevelDirectories = normalizeTopLevelDirectorySummaries(
    result.topLevelDirectories,
    structureFiles,
    dispositionIndex,
    packageManifestDetection.status === 'failed' ? [] : packageManifestDetection.packageManifests
  );
  const repository = normalizeRepositorySummary(
    result.repository,
    structureFiles,
    topLevelDirectories.length
  );
  const packageRoots = normalizePackageRootSummaries(
    result.packageRoots,
    packageManifestDetection.status === 'failed' ? [] : packageManifestDetection.packageManifests,
    structureFiles,
    dispositionIndex
  );
  const warnings = normalizeStructureWarnings(result.warnings, inventoryPaths);
  const errors = normalizeStructureErrors(result.errors, inventoryPaths);
  const summary = normalizeStructureSummaryCounts(
    result.summary,
    structureFiles,
    packageManifestDetection.status === 'failed' ? 0 : sourceScan.summary.candidateFileCount,
    packageManifestDetection.status === 'failed' ? 0 : sourceScan.summary.ignoredFileCount,
    packageManifestDetection.status === 'failed' ? 0 : sourceScan.summary.unclassifiedFileCount,
    packageRoots,
    topLevelDirectories.length,
    repository.maxDirectoryDepth,
    warnings.length,
    errors.length
  );

  assertRepositoryStructureStatus(result.status, packageManifestDetection.status, summary);

  return {
    schemaVersion: REPOSITORY_STRUCTURE_SUMMARY_RESULT_SCHEMA_VERSION,
    status: result.status,
    packageManifestDetection,
    repository,
    topLevelDirectories,
    packageRoots,
    warnings,
    errors,
    summary
  };
}

function deriveTopLevelDirectorySummaries(
  files: readonly RepositoryScanSourceInventoryEntry[],
  dispositionIndex: FileDispositionIndex,
  packageManifests: readonly RepositoryPackageManifest[]
): RepositoryStructureDirectorySummary[] {
  const directories = new Map<RepositoryScanInventoryPath, DirectoryAccumulator>();

  for (const file of files) {
    const topLevelPath = getTopLevelDirectoryPath(file.path);

    if (topLevelPath === undefined) {
      continue;
    }

    const accumulator = getOrCreateDirectoryAccumulator(directories, topLevelPath);
    accumulator.fileCount += 1;
    accumulator.totalSizeBytes += file.sizeBytes;

    if (dispositionIndex.candidatePaths.has(file.path)) {
      accumulator.candidateFileCount += 1;
    }

    if (dispositionIndex.ignoredPaths.has(file.path)) {
      accumulator.ignoredFileCount += 1;
    }

    if (file.kind === 'manifest') {
      accumulator.manifestFileCount += 1;
    }

    addDirectoryRoles(accumulator.roles, file.kind);
  }

  for (const manifest of packageManifests) {
    const topLevelPath = getPackageTopLevelDirectoryPath(manifest);

    if (topLevelPath === undefined) {
      continue;
    }

    const accumulator = getOrCreateDirectoryAccumulator(directories, topLevelPath);
    accumulator.packageRootCount += 1;
    accumulator.roles.add('package-container');
  }

  return [...directories.values()]
    .map((directory) => ({
      schemaVersion: REPOSITORY_STRUCTURE_DIRECTORY_SUMMARY_SCHEMA_VERSION,
      path: directory.path,
      depth: 1,
      fileCount: directory.fileCount,
      candidateFileCount: directory.candidateFileCount,
      ignoredFileCount: directory.ignoredFileCount,
      manifestFileCount: directory.manifestFileCount,
      packageRootCount: directory.packageRootCount,
      totalSizeBytes: directory.totalSizeBytes,
      roles: sortDirectoryRoles([...directory.roles])
    }))
    .sort(compareDirectorySummaries);
}

function derivePackageRootSummaries(
  packageManifests: readonly RepositoryPackageManifest[],
  files: readonly RepositoryScanSourceInventoryEntry[],
  dispositionIndex: FileDispositionIndex
): RepositoryStructurePackageRootSummary[] {
  return packageManifests
    .map((manifest) => derivePackageRootSummary(manifest, files, dispositionIndex))
    .sort(comparePackageRootSummaries);
}

function derivePackageRootSummary(
  manifest: RepositoryPackageManifest,
  files: readonly RepositoryScanSourceInventoryEntry[],
  dispositionIndex: FileDispositionIndex
): RepositoryStructurePackageRootSummary {
  const packageFiles = files.filter((file) => isFileInsidePackageRoot(file.path, manifest.packageRootPath));
  const fileKindCounts = countSourceFileKinds(packageFiles);
  const baseSummary: RepositoryStructurePackageRootSummary = {
    schemaVersion: REPOSITORY_STRUCTURE_PACKAGE_ROOT_SUMMARY_SCHEMA_VERSION,
    kind: manifest.packageRootPath === undefined ? 'root' : 'nested',
    ecosystem: manifest.ecosystem,
    manifestPath: manifest.path,
    fileCount: packageFiles.length,
    candidateFileCount: countFilesByDisposition(packageFiles, dispositionIndex.candidatePaths),
    ignoredFileCount: countFilesByDisposition(packageFiles, dispositionIndex.ignoredPaths),
    sourceFileCount: fileKindCounts.source,
    testFileCount: fileKindCounts.test,
    configFileCount: fileKindCounts.config,
    manifestFileCount: fileKindCounts.manifest,
    documentationFileCount: fileKindCounts.documentation,
    assetFileCount: fileKindCounts.asset,
    unknownFileCount: fileKindCounts.unknown,
    totalSizeBytes: totalSizeBytes(packageFiles)
  };

  return manifest.packageRootPath === undefined
    ? baseSummary
    : {
        ...baseSummary,
        packageRootPath: manifest.packageRootPath
      };
}

function deriveRepositorySummary(
  files: readonly RepositoryScanSourceInventoryEntry[],
  topLevelDirectoryCount: number
): RepositoryStructureRepositorySummary {
  return {
    schemaVersion: REPOSITORY_STRUCTURE_REPOSITORY_SUMMARY_SCHEMA_VERSION,
    rootFileCount: files.filter((file) => getTopLevelDirectoryPath(file.path) === undefined).length,
    topLevelDirectoryCount,
    maxDirectoryDepth: deriveMaxDirectoryDepth(files),
    totalSizeBytes: totalSizeBytes(files)
  };
}

function deriveStructureSummaryCounts(
  files: readonly RepositoryScanSourceInventoryEntry[],
  candidateFileCount: number,
  ignoredFileCount: number,
  unclassifiedFileCount: number,
  packageRoots: readonly RepositoryStructurePackageRootSummary[],
  topLevelDirectoryCount: number,
  maxDirectoryDepth: number,
  warningCount: number,
  errorCount: number
): RepositoryStructureSummaryCounts {
  const fileKindCounts = countSourceFileKinds(files);
  const rootPackageCount = packageRoots.filter((packageRoot) => packageRoot.kind === 'root').length;
  const nestedPackageCount = packageRoots.filter((packageRoot) => packageRoot.kind === 'nested').length;

  return {
    inventoryFileCount: files.length,
    candidateFileCount,
    ignoredFileCount,
    unclassifiedFileCount,
    packageRootCount: packageRoots.length,
    rootPackageCount,
    nestedPackageCount,
    topLevelDirectoryCount,
    sourceFileCount: fileKindCounts.source,
    testFileCount: fileKindCounts.test,
    configFileCount: fileKindCounts.config,
    manifestFileCount: fileKindCounts.manifest,
    documentationFileCount: fileKindCounts.documentation,
    assetFileCount: fileKindCounts.asset,
    unknownFileCount: fileKindCounts.unknown,
    totalSizeBytes: totalSizeBytes(files),
    maxDirectoryDepth,
    warningCount,
    errorCount
  };
}

function normalizeRepositorySummary(
  repository: RepositoryStructureRepositorySummary,
  files: readonly RepositoryScanSourceInventoryEntry[],
  topLevelDirectoryCount: number
): RepositoryStructureRepositorySummary {
  assertPlainObject(repository, 'Repository structure repository summary');

  if (repository.schemaVersion !== REPOSITORY_STRUCTURE_REPOSITORY_SUMMARY_SCHEMA_VERSION) {
    throw new RangeError('Repository structure repository summary schema version is unsupported.');
  }

  const expected = deriveRepositorySummary(files, topLevelDirectoryCount);
  const normalized: RepositoryStructureRepositorySummary = {
    schemaVersion: REPOSITORY_STRUCTURE_REPOSITORY_SUMMARY_SCHEMA_VERSION,
    rootFileCount: normalizeNonNegativeInteger(
      repository.rootFileCount,
      'Repository structure repository summary rootFileCount'
    ),
    topLevelDirectoryCount: normalizeNonNegativeInteger(
      repository.topLevelDirectoryCount,
      'Repository structure repository summary topLevelDirectoryCount'
    ),
    maxDirectoryDepth: normalizeNonNegativeInteger(
      repository.maxDirectoryDepth,
      'Repository structure repository summary maxDirectoryDepth'
    ),
    totalSizeBytes: normalizeNonNegativeInteger(
      repository.totalSizeBytes,
      'Repository structure repository summary totalSizeBytes'
    )
  };

  assertExactCount(normalized.rootFileCount, expected.rootFileCount, 'repository rootFileCount');
  assertExactCount(
    normalized.topLevelDirectoryCount,
    expected.topLevelDirectoryCount,
    'repository topLevelDirectoryCount'
  );
  assertExactCount(normalized.maxDirectoryDepth, expected.maxDirectoryDepth, 'repository maxDirectoryDepth');
  assertExactCount(normalized.totalSizeBytes, expected.totalSizeBytes, 'repository totalSizeBytes');

  return normalized;
}

function normalizeTopLevelDirectorySummaries(
  directories: readonly RepositoryStructureDirectorySummary[],
  files: readonly RepositoryScanSourceInventoryEntry[],
  dispositionIndex: FileDispositionIndex,
  packageManifests: readonly RepositoryPackageManifest[]
): RepositoryStructureDirectorySummary[] {
  if (!Array.isArray(directories)) {
    throw new RangeError('Repository structure topLevelDirectories must be an array.');
  }

  const expected = deriveTopLevelDirectorySummaries(files, dispositionIndex, packageManifests);
  const expectedByPath = new Map(expected.map((directory) => [directory.path, directory]));
  const normalized = directories.map((directory, index) => normalizeTopLevelDirectorySummary(
    directory,
    index,
    expectedByPath
  ));

  assertExactCount(normalized.length, expected.length, 'topLevelDirectories length');
  assertUniqueDirectoryPaths(normalized);

  return normalized.sort(compareDirectorySummaries);
}

function normalizeTopLevelDirectorySummary(
  directory: RepositoryStructureDirectorySummary,
  index: number,
  expectedByPath: ReadonlyMap<RepositoryScanInventoryPath, RepositoryStructureDirectorySummary>
): RepositoryStructureDirectorySummary {
  assertPlainObject(directory, `Repository structure topLevelDirectories[${index}]`);

  if (directory.schemaVersion !== REPOSITORY_STRUCTURE_DIRECTORY_SUMMARY_SCHEMA_VERSION) {
    throw new RangeError(`Repository structure topLevelDirectories[${index}] schema version is unsupported.`);
  }

  const path = parseRepositoryScanInventoryPath(directory.path);
  const expected = expectedByPath.get(path);

  if (expected === undefined) {
    throw new RangeError(`Repository structure topLevelDirectories[${index}] path is not a top-level directory.`);
  }

  const normalized: RepositoryStructureDirectorySummary = {
    schemaVersion: REPOSITORY_STRUCTURE_DIRECTORY_SUMMARY_SCHEMA_VERSION,
    path,
    depth: normalizeNonNegativeInteger(directory.depth, `Repository structure topLevelDirectories[${index}] depth`),
    fileCount: normalizeNonNegativeInteger(
      directory.fileCount,
      `Repository structure topLevelDirectories[${index}] fileCount`
    ),
    candidateFileCount: normalizeNonNegativeInteger(
      directory.candidateFileCount,
      `Repository structure topLevelDirectories[${index}] candidateFileCount`
    ),
    ignoredFileCount: normalizeNonNegativeInteger(
      directory.ignoredFileCount,
      `Repository structure topLevelDirectories[${index}] ignoredFileCount`
    ),
    manifestFileCount: normalizeNonNegativeInteger(
      directory.manifestFileCount,
      `Repository structure topLevelDirectories[${index}] manifestFileCount`
    ),
    packageRootCount: normalizeNonNegativeInteger(
      directory.packageRootCount,
      `Repository structure topLevelDirectories[${index}] packageRootCount`
    ),
    totalSizeBytes: normalizeNonNegativeInteger(
      directory.totalSizeBytes,
      `Repository structure topLevelDirectories[${index}] totalSizeBytes`
    ),
    roles: normalizeDirectoryRoles(directory.roles, index)
  };

  assertDirectorySummaryMatchesExpected(normalized, expected, index);
  return normalized;
}

function normalizePackageRootSummaries(
  packageRoots: readonly RepositoryStructurePackageRootSummary[],
  packageManifests: readonly RepositoryPackageManifest[],
  files: readonly RepositoryScanSourceInventoryEntry[],
  dispositionIndex: FileDispositionIndex
): RepositoryStructurePackageRootSummary[] {
  if (!Array.isArray(packageRoots)) {
    throw new RangeError('Repository structure packageRoots must be an array.');
  }

  const expected = derivePackageRootSummaries(packageManifests, files, dispositionIndex);
  const expectedByManifestPath = new Map(expected.map((packageRoot) => [packageRoot.manifestPath, packageRoot]));
  const normalized = packageRoots.map((packageRoot, index) => normalizePackageRootSummary(
    packageRoot,
    index,
    expectedByManifestPath
  ));

  assertExactCount(normalized.length, expected.length, 'packageRoots length');
  assertUniquePackageManifestPaths(normalized);

  return normalized.sort(comparePackageRootSummaries);
}

function normalizePackageRootSummary(
  packageRoot: RepositoryStructurePackageRootSummary,
  index: number,
  expectedByManifestPath: ReadonlyMap<RepositoryScanInventoryPath, RepositoryStructurePackageRootSummary>
): RepositoryStructurePackageRootSummary {
  assertPlainObject(packageRoot, `Repository structure packageRoots[${index}]`);

  if (packageRoot.schemaVersion !== REPOSITORY_STRUCTURE_PACKAGE_ROOT_SUMMARY_SCHEMA_VERSION) {
    throw new RangeError(`Repository structure packageRoots[${index}] schema version is unsupported.`);
  }

  const manifestPath = parseRepositoryScanInventoryPath(packageRoot.manifestPath);
  const expected = expectedByManifestPath.get(manifestPath);

  if (expected === undefined) {
    throw new RangeError(`Repository structure packageRoots[${index}] manifestPath is not a detected package manifest.`);
  }

  if (!REPOSITORY_STRUCTURE_PACKAGE_ROOT_KINDS.includes(packageRoot.kind)) {
    throw new RangeError(`Repository structure packageRoots[${index}] kind is unsupported.`);
  }

  if (packageRoot.ecosystem !== expected.ecosystem) {
    throw new RangeError(`Repository structure packageRoots[${index}] ecosystem does not match detected manifest.`);
  }

  const normalizedBase: RepositoryStructurePackageRootSummary = {
    schemaVersion: REPOSITORY_STRUCTURE_PACKAGE_ROOT_SUMMARY_SCHEMA_VERSION,
    kind: packageRoot.kind,
    ecosystem: packageRoot.ecosystem,
    manifestPath,
    fileCount: normalizeNonNegativeInteger(packageRoot.fileCount, `Repository structure packageRoots[${index}] fileCount`),
    candidateFileCount: normalizeNonNegativeInteger(
      packageRoot.candidateFileCount,
      `Repository structure packageRoots[${index}] candidateFileCount`
    ),
    ignoredFileCount: normalizeNonNegativeInteger(
      packageRoot.ignoredFileCount,
      `Repository structure packageRoots[${index}] ignoredFileCount`
    ),
    sourceFileCount: normalizeNonNegativeInteger(
      packageRoot.sourceFileCount,
      `Repository structure packageRoots[${index}] sourceFileCount`
    ),
    testFileCount: normalizeNonNegativeInteger(
      packageRoot.testFileCount,
      `Repository structure packageRoots[${index}] testFileCount`
    ),
    configFileCount: normalizeNonNegativeInteger(
      packageRoot.configFileCount,
      `Repository structure packageRoots[${index}] configFileCount`
    ),
    manifestFileCount: normalizeNonNegativeInteger(
      packageRoot.manifestFileCount,
      `Repository structure packageRoots[${index}] manifestFileCount`
    ),
    documentationFileCount: normalizeNonNegativeInteger(
      packageRoot.documentationFileCount,
      `Repository structure packageRoots[${index}] documentationFileCount`
    ),
    assetFileCount: normalizeNonNegativeInteger(
      packageRoot.assetFileCount,
      `Repository structure packageRoots[${index}] assetFileCount`
    ),
    unknownFileCount: normalizeNonNegativeInteger(
      packageRoot.unknownFileCount,
      `Repository structure packageRoots[${index}] unknownFileCount`
    ),
    totalSizeBytes: normalizeNonNegativeInteger(
      packageRoot.totalSizeBytes,
      `Repository structure packageRoots[${index}] totalSizeBytes`
    )
  };
  const normalized = packageRoot.packageRootPath === undefined
    ? normalizedBase
    : {
        ...normalizedBase,
        packageRootPath: parseRepositoryScanInventoryPath(packageRoot.packageRootPath)
      };

  assertPackageRootSummaryMatchesExpected(normalized, expected, index);
  return normalized;
}

function normalizeStructureSummaryCounts(
  summary: RepositoryStructureSummaryCounts,
  files: readonly RepositoryScanSourceInventoryEntry[],
  candidateFileCount: number,
  ignoredFileCount: number,
  unclassifiedFileCount: number,
  packageRoots: readonly RepositoryStructurePackageRootSummary[],
  topLevelDirectoryCount: number,
  maxDirectoryDepth: number,
  warningCount: number,
  errorCount: number
): RepositoryStructureSummaryCounts {
  assertPlainObject(summary, 'Repository structure summary');

  const expected = deriveStructureSummaryCounts(
    files,
    candidateFileCount,
    ignoredFileCount,
    unclassifiedFileCount,
    packageRoots,
    topLevelDirectoryCount,
    maxDirectoryDepth,
    warningCount,
    errorCount
  );
  const normalized: RepositoryStructureSummaryCounts = {
    inventoryFileCount: normalizeNonNegativeInteger(summary.inventoryFileCount, 'Repository structure summary inventoryFileCount'),
    candidateFileCount: normalizeNonNegativeInteger(summary.candidateFileCount, 'Repository structure summary candidateFileCount'),
    ignoredFileCount: normalizeNonNegativeInteger(summary.ignoredFileCount, 'Repository structure summary ignoredFileCount'),
    unclassifiedFileCount: normalizeNonNegativeInteger(
      summary.unclassifiedFileCount,
      'Repository structure summary unclassifiedFileCount'
    ),
    packageRootCount: normalizeNonNegativeInteger(summary.packageRootCount, 'Repository structure summary packageRootCount'),
    rootPackageCount: normalizeNonNegativeInteger(summary.rootPackageCount, 'Repository structure summary rootPackageCount'),
    nestedPackageCount: normalizeNonNegativeInteger(summary.nestedPackageCount, 'Repository structure summary nestedPackageCount'),
    topLevelDirectoryCount: normalizeNonNegativeInteger(
      summary.topLevelDirectoryCount,
      'Repository structure summary topLevelDirectoryCount'
    ),
    sourceFileCount: normalizeNonNegativeInteger(summary.sourceFileCount, 'Repository structure summary sourceFileCount'),
    testFileCount: normalizeNonNegativeInteger(summary.testFileCount, 'Repository structure summary testFileCount'),
    configFileCount: normalizeNonNegativeInteger(summary.configFileCount, 'Repository structure summary configFileCount'),
    manifestFileCount: normalizeNonNegativeInteger(summary.manifestFileCount, 'Repository structure summary manifestFileCount'),
    documentationFileCount: normalizeNonNegativeInteger(
      summary.documentationFileCount,
      'Repository structure summary documentationFileCount'
    ),
    assetFileCount: normalizeNonNegativeInteger(summary.assetFileCount, 'Repository structure summary assetFileCount'),
    unknownFileCount: normalizeNonNegativeInteger(summary.unknownFileCount, 'Repository structure summary unknownFileCount'),
    totalSizeBytes: normalizeNonNegativeInteger(summary.totalSizeBytes, 'Repository structure summary totalSizeBytes'),
    maxDirectoryDepth: normalizeNonNegativeInteger(summary.maxDirectoryDepth, 'Repository structure summary maxDirectoryDepth'),
    warningCount: normalizeNonNegativeInteger(summary.warningCount, 'Repository structure summary warningCount'),
    errorCount: normalizeNonNegativeInteger(summary.errorCount, 'Repository structure summary errorCount')
  };

  assertStructureSummaryMatchesExpected(normalized, expected);
  return normalized;
}

function normalizeStructureWarnings(
  warnings: readonly RepositoryScanWarning[],
  inventoryPaths: ReadonlySet<RepositoryScanInventoryPath>
): RepositoryScanWarning[] {
  if (!Array.isArray(warnings)) {
    throw new RangeError('Repository structure summary warnings must be an array.');
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
  assertPlainObject(warning, `Repository structure summary warnings[${index}]`);

  const baseWarning: RepositoryScanWarning = {
    code: parseRepositoryScanIssueCode(warning.code),
    message: normalizeMessage(warning.message, `Repository structure summary warnings[${index}] message`)
  };

  if (warning.path === undefined) {
    return baseWarning;
  }

  const path = parseRepositoryScanInventoryPath(warning.path);
  assertInventoryPathExists(path, inventoryPaths, `Repository structure summary warnings[${index}] path`);

  return {
    ...baseWarning,
    path
  };
}

function normalizeStructureErrors(
  errors: readonly RepositoryScanError[],
  inventoryPaths: ReadonlySet<RepositoryScanInventoryPath>
): RepositoryScanError[] {
  if (!Array.isArray(errors)) {
    throw new RangeError('Repository structure summary errors must be an array.');
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
  assertPlainObject(error, `Repository structure summary errors[${index}]`);

  if (typeof error.retryable !== 'boolean') {
    throw new RangeError(`Repository structure summary errors[${index}] retryable must be a boolean.`);
  }

  const baseError: RepositoryScanError = {
    code: parseRepositoryScanIssueCode(error.code),
    message: normalizeMessage(error.message, `Repository structure summary errors[${index}] message`),
    retryable: error.retryable
  };

  if (error.path === undefined) {
    return baseError;
  }

  const path = parseRepositoryScanInventoryPath(error.path);
  assertInventoryPathExists(path, inventoryPaths, `Repository structure summary errors[${index}] path`);

  return {
    ...baseError,
    path
  };
}

function createFileDispositionIndex(
  candidateFiles: readonly { readonly path: RepositoryScanInventoryPath }[],
  ignoredFiles: readonly RepositoryScanIgnoredFile[]
): FileDispositionIndex {
  return {
    candidatePaths: new Set(candidateFiles.map((file) => file.path)),
    ignoredPaths: new Set(ignoredFiles.map((file) => file.path))
  };
}

function createInventoryPathSet(
  files: readonly RepositoryScanSourceInventoryEntry[]
): ReadonlySet<RepositoryScanInventoryPath> {
  return new Set(files.map((file) => file.path));
}

function getOrCreateDirectoryAccumulator(
  directories: Map<RepositoryScanInventoryPath, DirectoryAccumulator>,
  path: RepositoryScanInventoryPath
): DirectoryAccumulator {
  const existing = directories.get(path);

  if (existing !== undefined) {
    return existing;
  }

  const created: DirectoryAccumulator = {
    path,
    fileCount: 0,
    candidateFileCount: 0,
    ignoredFileCount: 0,
    manifestFileCount: 0,
    packageRootCount: 0,
    totalSizeBytes: 0,
    roles: new Set()
  };
  directories.set(path, created);
  return created;
}

function addDirectoryRoles(
  roles: Set<RepositoryStructureDirectoryRole>,
  kind: RepositoryScanSourceFileKind
): void {
  if (kind === 'source') {
    roles.add('source-container');
    return;
  }

  if (kind === 'test') {
    roles.add('test-container');
    return;
  }

  if (kind === 'config' || kind === 'manifest') {
    roles.add('configuration');
    return;
  }

  if (kind === 'documentation') {
    roles.add('documentation');
    return;
  }

  if (kind === 'asset') {
    roles.add('asset');
  }
}

function sortDirectoryRoles(
  roles: readonly RepositoryStructureDirectoryRole[]
): RepositoryStructureDirectoryRole[] {
  return [...roles].sort((left, right) => {
    const leftIndex = REPOSITORY_STRUCTURE_DIRECTORY_ROLES.indexOf(left);
    const rightIndex = REPOSITORY_STRUCTURE_DIRECTORY_ROLES.indexOf(right);
    return leftIndex - rightIndex;
  });
}

function normalizeDirectoryRoles(
  roles: readonly RepositoryStructureDirectoryRole[],
  directoryIndex: number
): RepositoryStructureDirectoryRole[] {
  if (!Array.isArray(roles)) {
    throw new RangeError(`Repository structure topLevelDirectories[${directoryIndex}] roles must be an array.`);
  }

  const normalized = roles.map((role, roleIndex) => {
    if (!REPOSITORY_STRUCTURE_DIRECTORY_ROLES.includes(role)) {
      throw new RangeError(
        `Repository structure topLevelDirectories[${directoryIndex}] roles[${roleIndex}] is unsupported.`
      );
    }
    return role;
  });
  const uniqueRoles = new Set(normalized);

  if (uniqueRoles.size !== normalized.length) {
    throw new RangeError(`Repository structure topLevelDirectories[${directoryIndex}] roles must be unique.`);
  }

  return sortDirectoryRoles(normalized);
}

function countSourceFileKinds(files: readonly RepositoryScanSourceInventoryEntry[]): Record<RepositoryScanSourceFileKind, number> {
  return {
    source: countFilesByKind(files, 'source'),
    test: countFilesByKind(files, 'test'),
    manifest: countFilesByKind(files, 'manifest'),
    config: countFilesByKind(files, 'config'),
    documentation: countFilesByKind(files, 'documentation'),
    asset: countFilesByKind(files, 'asset'),
    unknown: countFilesByKind(files, 'unknown')
  };
}

function countFilesByKind(
  files: readonly RepositoryScanSourceInventoryEntry[],
  kind: RepositoryScanSourceFileKind
): number {
  return files.filter((file) => file.kind === kind).length;
}

function countFilesByDisposition(
  files: readonly RepositoryScanSourceInventoryEntry[],
  dispositionPaths: ReadonlySet<RepositoryScanInventoryPath>
): number {
  return files.filter((file) => dispositionPaths.has(file.path)).length;
}

function totalSizeBytes(files: readonly RepositoryScanSourceInventoryEntry[]): number {
  return files.reduce((sum, file) => sum + file.sizeBytes, 0);
}

function getTopLevelDirectoryPath(path: RepositoryScanInventoryPath): RepositoryScanInventoryPath | undefined {
  const firstSlashIndex = path.indexOf('/');

  if (firstSlashIndex === -1) {
    return undefined;
  }

  return parseRepositoryScanInventoryPath(path.slice(0, firstSlashIndex));
}

function getPackageTopLevelDirectoryPath(
  manifest: RepositoryPackageManifest
): RepositoryScanInventoryPath | undefined {
  if (manifest.packageRootPath !== undefined) {
    return getTopLevelDirectoryPath(`${manifest.packageRootPath}/__package-root__`);
  }

  return getTopLevelDirectoryPath(manifest.path);
}

function isFileInsidePackageRoot(
  filePath: RepositoryScanInventoryPath,
  packageRootPath: RepositoryScanInventoryPath | undefined
): boolean {
  if (packageRootPath === undefined) {
    return true;
  }

  return filePath === packageRootPath || filePath.startsWith(`${packageRootPath}/`);
}

function deriveMaxDirectoryDepth(files: readonly RepositoryScanSourceInventoryEntry[]): number {
  return files.reduce((maxDepth, file) => Math.max(maxDepth, getDirectoryDepth(file.path)), 0);
}

function getDirectoryDepth(path: RepositoryScanInventoryPath): number {
  const segmentCount = path.split('/').length;
  return Math.max(0, segmentCount - 1);
}

function determineRepositoryStructureSummaryStatus(
  sourceStatus: RepositoryScanStatus,
  errors: readonly RepositoryScanError[]
): RepositoryScanStatus {
  if (errors.length > 0 || sourceStatus === 'failed') {
    return 'failed';
  }

  if (sourceStatus === 'partial') {
    return 'partial';
  }

  return 'completed';
}

function toStructureSummaryErrors(status: RepositoryScanStatus): RepositoryScanError[] {
  if (status !== 'failed') {
    return [];
  }

  return [
    {
      code: parseRepositoryScanIssueCode('REPOSITORY_SCAN_STRUCTURE_SUMMARY_SKIPPED'),
      message: 'Repository structure summary was skipped because package manifest detection failed.',
      retryable: false
    }
  ];
}

function emptyRepositorySummary(): RepositoryStructureRepositorySummary {
  return {
    schemaVersion: REPOSITORY_STRUCTURE_REPOSITORY_SUMMARY_SCHEMA_VERSION,
    rootFileCount: 0,
    topLevelDirectoryCount: 0,
    maxDirectoryDepth: 0,
    totalSizeBytes: 0
  };
}

function normalizeNonNegativeInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer.`);
  }

  return value;
}

function normalizeMessage(value: string, label: string): string {
  if (typeof value !== 'string') {
    throw new RangeError(`${label} must be a string.`);
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new RangeError(`${label} must not be empty.`);
  }

  return normalized;
}

function assertPlainObject(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new RangeError(`${label} must be an object.`);
  }
}

function assertInventoryPathExists(
  path: RepositoryScanInventoryPath,
  inventoryPaths: ReadonlySet<RepositoryScanInventoryPath>,
  context: string
): void {
  if (!inventoryPaths.has(path)) {
    throw new RangeError(`${context} must reference a file from the source inventory.`);
  }
}

function assertExactCount(actual: number, expected: number, label: string): void {
  if (actual !== expected) {
    throw new RangeError(`Repository structure ${label} does not match derived value.`);
  }
}

function assertDirectorySummaryMatchesExpected(
  actual: RepositoryStructureDirectorySummary,
  expected: RepositoryStructureDirectorySummary,
  index: number
): void {
  assertExactCount(actual.depth, expected.depth, `topLevelDirectories[${index}] depth`);
  assertExactCount(actual.fileCount, expected.fileCount, `topLevelDirectories[${index}] fileCount`);
  assertExactCount(
    actual.candidateFileCount,
    expected.candidateFileCount,
    `topLevelDirectories[${index}] candidateFileCount`
  );
  assertExactCount(
    actual.ignoredFileCount,
    expected.ignoredFileCount,
    `topLevelDirectories[${index}] ignoredFileCount`
  );
  assertExactCount(actual.manifestFileCount, expected.manifestFileCount, `topLevelDirectories[${index}] manifestFileCount`);
  assertExactCount(actual.packageRootCount, expected.packageRootCount, `topLevelDirectories[${index}] packageRootCount`);
  assertExactCount(actual.totalSizeBytes, expected.totalSizeBytes, `topLevelDirectories[${index}] totalSizeBytes`);

  if (actual.roles.join('|') !== expected.roles.join('|')) {
    throw new RangeError(`Repository structure topLevelDirectories[${index}] roles do not match derived value.`);
  }
}

function assertPackageRootSummaryMatchesExpected(
  actual: RepositoryStructurePackageRootSummary,
  expected: RepositoryStructurePackageRootSummary,
  index: number
): void {
  if (actual.kind !== expected.kind) {
    throw new RangeError(`Repository structure packageRoots[${index}] kind does not match detected manifest.`);
  }

  if (actual.packageRootPath !== expected.packageRootPath) {
    throw new RangeError(`Repository structure packageRoots[${index}] packageRootPath does not match detected manifest.`);
  }

  assertExactCount(actual.fileCount, expected.fileCount, `packageRoots[${index}] fileCount`);
  assertExactCount(actual.candidateFileCount, expected.candidateFileCount, `packageRoots[${index}] candidateFileCount`);
  assertExactCount(actual.ignoredFileCount, expected.ignoredFileCount, `packageRoots[${index}] ignoredFileCount`);
  assertExactCount(actual.sourceFileCount, expected.sourceFileCount, `packageRoots[${index}] sourceFileCount`);
  assertExactCount(actual.testFileCount, expected.testFileCount, `packageRoots[${index}] testFileCount`);
  assertExactCount(actual.configFileCount, expected.configFileCount, `packageRoots[${index}] configFileCount`);
  assertExactCount(actual.manifestFileCount, expected.manifestFileCount, `packageRoots[${index}] manifestFileCount`);
  assertExactCount(
    actual.documentationFileCount,
    expected.documentationFileCount,
    `packageRoots[${index}] documentationFileCount`
  );
  assertExactCount(actual.assetFileCount, expected.assetFileCount, `packageRoots[${index}] assetFileCount`);
  assertExactCount(actual.unknownFileCount, expected.unknownFileCount, `packageRoots[${index}] unknownFileCount`);
  assertExactCount(actual.totalSizeBytes, expected.totalSizeBytes, `packageRoots[${index}] totalSizeBytes`);
}

function assertStructureSummaryMatchesExpected(
  actual: RepositoryStructureSummaryCounts,
  expected: RepositoryStructureSummaryCounts
): void {
  assertExactCount(actual.inventoryFileCount, expected.inventoryFileCount, 'summary inventoryFileCount');
  assertExactCount(actual.candidateFileCount, expected.candidateFileCount, 'summary candidateFileCount');
  assertExactCount(actual.ignoredFileCount, expected.ignoredFileCount, 'summary ignoredFileCount');
  assertExactCount(actual.unclassifiedFileCount, expected.unclassifiedFileCount, 'summary unclassifiedFileCount');
  assertExactCount(actual.packageRootCount, expected.packageRootCount, 'summary packageRootCount');
  assertExactCount(actual.rootPackageCount, expected.rootPackageCount, 'summary rootPackageCount');
  assertExactCount(actual.nestedPackageCount, expected.nestedPackageCount, 'summary nestedPackageCount');
  assertExactCount(actual.topLevelDirectoryCount, expected.topLevelDirectoryCount, 'summary topLevelDirectoryCount');
  assertExactCount(actual.sourceFileCount, expected.sourceFileCount, 'summary sourceFileCount');
  assertExactCount(actual.testFileCount, expected.testFileCount, 'summary testFileCount');
  assertExactCount(actual.configFileCount, expected.configFileCount, 'summary configFileCount');
  assertExactCount(actual.manifestFileCount, expected.manifestFileCount, 'summary manifestFileCount');
  assertExactCount(actual.documentationFileCount, expected.documentationFileCount, 'summary documentationFileCount');
  assertExactCount(actual.assetFileCount, expected.assetFileCount, 'summary assetFileCount');
  assertExactCount(actual.unknownFileCount, expected.unknownFileCount, 'summary unknownFileCount');
  assertExactCount(actual.totalSizeBytes, expected.totalSizeBytes, 'summary totalSizeBytes');
  assertExactCount(actual.maxDirectoryDepth, expected.maxDirectoryDepth, 'summary maxDirectoryDepth');
  assertExactCount(actual.warningCount, expected.warningCount, 'summary warningCount');
  assertExactCount(actual.errorCount, expected.errorCount, 'summary errorCount');
}

function assertRepositoryStructureStatus(
  status: RepositoryScanStatus,
  sourceStatus: RepositoryScanStatus,
  summary: RepositoryStructureSummaryCounts
): void {
  if (status !== 'completed' && status !== 'partial' && status !== 'failed') {
    throw new RangeError('Repository structure summary status is unsupported.');
  }

  if (status === 'completed' && summary.errorCount > 0) {
    throw new RangeError('Completed repository structure summaries must not contain errors.');
  }

  if (status === 'failed' && summary.errorCount === 0) {
    throw new RangeError('Failed repository structure summaries must contain at least one error.');
  }

  if (sourceStatus === 'failed' && status !== 'failed') {
    throw new RangeError('Repository structure summary must fail when package manifest detection failed.');
  }

  if (sourceStatus === 'partial' && status === 'completed') {
    throw new RangeError('Repository structure summary must preserve partial package manifest detection status.');
  }
}

function assertUniqueDirectoryPaths(directories: readonly RepositoryStructureDirectorySummary[]): void {
  const seen = new Set<RepositoryScanInventoryPath>();

  for (const directory of directories) {
    if (seen.has(directory.path)) {
      throw new RangeError(`Repository structure duplicate top-level directory path: ${directory.path}.`);
    }
    seen.add(directory.path);
  }
}

function assertUniquePackageManifestPaths(packageRoots: readonly RepositoryStructurePackageRootSummary[]): void {
  const seen = new Set<RepositoryScanInventoryPath>();

  for (const packageRoot of packageRoots) {
    if (seen.has(packageRoot.manifestPath)) {
      throw new RangeError(`Repository structure duplicate package manifest path: ${packageRoot.manifestPath}.`);
    }
    seen.add(packageRoot.manifestPath);
  }
}

function compareDirectorySummaries(
  left: RepositoryStructureDirectorySummary,
  right: RepositoryStructureDirectorySummary
): number {
  return left.path.localeCompare(right.path);
}

function comparePackageRootSummaries(
  left: RepositoryStructurePackageRootSummary,
  right: RepositoryStructurePackageRootSummary
): number {
  const leftKindIndex = REPOSITORY_STRUCTURE_PACKAGE_ROOT_KINDS.indexOf(left.kind);
  const rightKindIndex = REPOSITORY_STRUCTURE_PACKAGE_ROOT_KINDS.indexOf(right.kind);

  return leftKindIndex - rightKindIndex || left.manifestPath.localeCompare(right.manifestPath);
}

function compareIssues(
  left: RepositoryScanWarning | RepositoryScanError,
  right: RepositoryScanWarning | RepositoryScanError
): number {
  return left.code.localeCompare(right.code)
    || (left.path ?? '').localeCompare(right.path ?? '')
    || left.message.localeCompare(right.message);
}


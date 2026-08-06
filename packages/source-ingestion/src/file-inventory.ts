import { lstat, readdir } from 'node:fs/promises';
import { extname, join, sep } from 'node:path';

import {
  parseSourceGlobPattern,
  type SerializableSourceInputOptions,
  type SourceGlobPattern,
  type SourceInputSourceId
} from './input.js';
import {
  type LocalFolderAbsolutePath,
  type LocalFolderRealPath,
  type ResolvedLocalFolderSource
} from './local-folder.js';

export declare const sourceFileInventoryPathBrand: unique symbol;

export type SourceFileInventoryPath = string & {
  readonly [sourceFileInventoryPathBrand]: 'SourceFileInventoryPath';
};

export const SOURCE_FILE_INVENTORY_SCHEMA_VERSION = 1 as const;
export const SOURCE_FILE_INVENTORY_ENTRY_SCHEMA_VERSION = 1 as const;

export const SOURCE_FILE_INVENTORY_ISSUE_CODES = [
  'SOURCE_FILE_INVENTORY_ENTRY_READ_FAILED',
  'SOURCE_FILE_INVENTORY_DIRECTORY_READ_FAILED',
  'SOURCE_FILE_INVENTORY_FILE_TOO_LARGE',
  'SOURCE_FILE_INVENTORY_SYMLINK_SKIPPED',
  'SOURCE_FILE_INVENTORY_MAX_FILES_EXCEEDED'
] as const;

export type SourceFileInventoryIssueCode = typeof SOURCE_FILE_INVENTORY_ISSUE_CODES[number];

export const SOURCE_FILE_INVENTORY_ISSUE_SEVERITIES = [
  'warning',
  'error'
] as const;

export type SourceFileInventoryIssueSeverity = typeof SOURCE_FILE_INVENTORY_ISSUE_SEVERITIES[number];

export const SOURCE_FILE_KINDS = [
  'source',
  'test',
  'manifest',
  'config',
  'documentation',
  'asset',
  'unknown'
] as const;

export type SourceFileKind = typeof SOURCE_FILE_KINDS[number];

export interface SourceFileInventoryIssue {
  readonly code: SourceFileInventoryIssueCode;
  readonly severity: SourceFileInventoryIssueSeverity;
  readonly message: string;
  readonly path?: SourceFileInventoryPath;
}

export interface SourceFileInventoryEntry {
  readonly schemaVersion: typeof SOURCE_FILE_INVENTORY_ENTRY_SCHEMA_VERSION;
  readonly path: SourceFileInventoryPath;
  readonly sizeBytes: number;
  readonly modifiedAt: string;
  readonly createdAt?: string;
  readonly extension?: string;
  readonly kind: SourceFileKind;
}

export interface SourceFileInventoryRoot {
  readonly kind: 'local-folder';
  readonly sourceId?: SourceInputSourceId;
  readonly displayName?: string;
  readonly requestedPath: string;
  readonly absolutePath: LocalFolderAbsolutePath;
  readonly realPath: LocalFolderRealPath;
  readonly directoryName: string;
}

export interface SourceFileInventorySummary {
  readonly fileCount: number;
  readonly totalSizeBytes: number;
  readonly skippedFileCount: number;
  readonly skippedDirectoryCount: number;
  readonly oversizedFileCount: number;
  readonly symlinkCount: number;
}

export interface SourceFileInventory {
  readonly schemaVersion: typeof SOURCE_FILE_INVENTORY_SCHEMA_VERSION;
  readonly root: SourceFileInventoryRoot;
  readonly options: SerializableSourceInputOptions;
  readonly files: readonly SourceFileInventoryEntry[];
  readonly issues: readonly SourceFileInventoryIssue[];
  readonly summary: SourceFileInventorySummary;
}

interface InventoryAccumulator {
  readonly files: SourceFileInventoryEntry[];
  readonly issues: SourceFileInventoryIssue[];
  readonly options: SerializableSourceInputOptions;
  skippedDirectoryCount: number;
  skippedFileCount: number;
  oversizedFileCount: number;
  symlinkCount: number;
}

interface DirectoryWalkEntry {
  readonly name: string;
  readonly absolutePath: string;
  readonly relativePath: SourceFileInventoryPath;
}

export class SourceFileInventoryError extends Error {
  public readonly code: SourceFileInventoryIssueCode;
  public readonly path?: SourceFileInventoryPath;

  public constructor(code: SourceFileInventoryIssueCode, message: string, path?: SourceFileInventoryPath) {
    super(message);
    this.name = 'SourceFileInventoryError';
    this.code = code;

    if (path !== undefined) {
      this.path = path;
    }
  }
}

export async function createNormalizedSourceFileInventory(
  source: ResolvedLocalFolderSource
): Promise<SourceFileInventory> {
  const accumulator: InventoryAccumulator = {
    files: [],
    issues: [],
    options: source.options,
    skippedDirectoryCount: 0,
    skippedFileCount: 0,
    oversizedFileCount: 0,
    symlinkCount: 0
  };

  await walkDirectory(source.realPath, '', accumulator);

  const files = accumulator.files.sort((left, right) => compareInventoryPaths(left.path, right.path));
  const totalSizeBytes = files.reduce((sum, file) => sum + file.sizeBytes, 0);

  return {
    schemaVersion: SOURCE_FILE_INVENTORY_SCHEMA_VERSION,
    root: toSourceFileInventoryRoot(source),
    options: source.options,
    files,
    issues: accumulator.issues,
    summary: {
      fileCount: files.length,
      totalSizeBytes,
      skippedFileCount: accumulator.skippedFileCount,
      skippedDirectoryCount: accumulator.skippedDirectoryCount,
      oversizedFileCount: accumulator.oversizedFileCount,
      symlinkCount: accumulator.symlinkCount
    }
  };
}

export function parseSourceFileInventoryPath(value: string): SourceFileInventoryPath {
  if (typeof value !== 'string') {
    throw new RangeError('Source file inventory path must be a string.');
  }

  const normalized = normalizeInventoryPath(value);

  if (normalized.length === 0) {
    throw new RangeError('Source file inventory path must not be empty.');
  }

  if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) {
    throw new RangeError('Source file inventory path must be repository-relative.');
  }

  if (normalized.split('/').some((segment) => segment === '..' || segment === '.')) {
    throw new RangeError('Source file inventory path must not contain traversal segments.');
  }

  if (/[\u0000-\u001F\u007F]/.test(normalized)) {
    throw new RangeError('Source file inventory path must not include control characters.');
  }

  return normalized as SourceFileInventoryPath;
}

export function isSourceFileInventoryPath(value: unknown): value is SourceFileInventoryPath {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    parseSourceFileInventoryPath(value);
    return true;
  } catch {
    return false;
  }
}

export function isSourceFileInventoryIssueCode(value: unknown): value is SourceFileInventoryIssueCode {
  return typeof value === 'string'
    && SOURCE_FILE_INVENTORY_ISSUE_CODES.includes(value as SourceFileInventoryIssueCode);
}

export function isSourceFileKind(value: unknown): value is SourceFileKind {
  return typeof value === 'string' && SOURCE_FILE_KINDS.includes(value as SourceFileKind);
}

export function toSerializableSourceFileInventory(inventory: SourceFileInventory): SourceFileInventory {
  return {
    schemaVersion: SOURCE_FILE_INVENTORY_SCHEMA_VERSION,
    root: toSerializableSourceFileInventoryRoot(inventory.root),
    options: inventory.options,
    files: inventory.files.map(toSerializableSourceFileInventoryEntry),
    issues: inventory.issues.map(toSerializableSourceFileInventoryIssue),
    summary: {
      fileCount: normalizeNonNegativeInteger(inventory.summary.fileCount, 'Source inventory fileCount'),
      totalSizeBytes: normalizeNonNegativeInteger(inventory.summary.totalSizeBytes, 'Source inventory totalSizeBytes'),
      skippedFileCount: normalizeNonNegativeInteger(
        inventory.summary.skippedFileCount,
        'Source inventory skippedFileCount'
      ),
      skippedDirectoryCount: normalizeNonNegativeInteger(
        inventory.summary.skippedDirectoryCount,
        'Source inventory skippedDirectoryCount'
      ),
      oversizedFileCount: normalizeNonNegativeInteger(
        inventory.summary.oversizedFileCount,
        'Source inventory oversizedFileCount'
      ),
      symlinkCount: normalizeNonNegativeInteger(inventory.summary.symlinkCount, 'Source inventory symlinkCount')
    }
  };
}

async function walkDirectory(
  absoluteDirectoryPath: string,
  relativeDirectoryPath: string,
  accumulator: InventoryAccumulator
): Promise<void> {
  const entries = await readDirectoryEntries(absoluteDirectoryPath, relativeDirectoryPath, accumulator);

  for (const entry of entries) {
    const stats = await readEntryStats(entry.absolutePath, entry.relativePath, accumulator);

    if (stats === undefined) {
      continue;
    }

    if (stats.isSymbolicLink()) {
      accumulator.symlinkCount += 1;
      addIssue(
        accumulator,
        'SOURCE_FILE_INVENTORY_SYMLINK_SKIPPED',
        'Source inventory does not follow symbolic links in MVP 1.',
        entry.relativePath
      );
      continue;
    }

    if (stats.isDirectory()) {
      if (isExcluded(entry.relativePath, true, accumulator.options.scan.exclude)) {
        accumulator.skippedDirectoryCount += 1;
        continue;
      }

      await walkDirectory(entry.absolutePath, entry.relativePath, accumulator);
      continue;
    }

    if (!stats.isFile()) {
      accumulator.skippedFileCount += 1;
      continue;
    }

    if (isExcluded(entry.relativePath, false, accumulator.options.scan.exclude)
      || !isIncluded(entry.relativePath, accumulator.options.scan.include)) {
      accumulator.skippedFileCount += 1;
      continue;
    }

    if (stats.size > accumulator.options.scan.maxFileSizeBytes) {
      accumulator.oversizedFileCount += 1;
      accumulator.skippedFileCount += 1;
      addIssue(
        accumulator,
        'SOURCE_FILE_INVENTORY_FILE_TOO_LARGE',
        'Source file exceeds maxFileSizeBytes and was excluded from the inventory.',
        entry.relativePath
      );
      continue;
    }

    if (accumulator.files.length >= accumulator.options.scan.maxFiles) {
      throw new SourceFileInventoryError(
        'SOURCE_FILE_INVENTORY_MAX_FILES_EXCEEDED',
        'Source file inventory exceeded maxFiles before completing traversal.',
        entry.relativePath
      );
    }

    accumulator.files.push(createInventoryEntry(entry.relativePath, stats));
  }
}

async function readDirectoryEntries(
  absoluteDirectoryPath: string,
  relativeDirectoryPath: string,
  accumulator: InventoryAccumulator
): Promise<DirectoryWalkEntry[]> {
  try {
    const entries = await readdir(absoluteDirectoryPath, { withFileTypes: true });

    return entries
      .map((entry) => ({
        name: entry.name,
        absolutePath: normalizeFilesystemPath(join(absoluteDirectoryPath, entry.name)),
        relativePath: joinInventoryPath(relativeDirectoryPath, entry.name)
      }))
      .sort((left, right) => compareInventoryPaths(left.relativePath, right.relativePath));
  } catch {
    const path = relativeDirectoryPath.length === 0
      ? undefined
      : parseSourceFileInventoryPath(relativeDirectoryPath);

    addIssue(
      accumulator,
      'SOURCE_FILE_INVENTORY_DIRECTORY_READ_FAILED',
      'Source inventory could not read a directory and skipped its children.',
      path
    );
    accumulator.skippedDirectoryCount += 1;
    return [];
  }
}

async function readEntryStats(
  absolutePath: string,
  relativePath: SourceFileInventoryPath,
  accumulator: InventoryAccumulator
): Promise<Awaited<ReturnType<typeof lstat>> | undefined> {
  try {
    return await lstat(absolutePath);
  } catch {
    addIssue(
      accumulator,
      'SOURCE_FILE_INVENTORY_ENTRY_READ_FAILED',
      'Source inventory could not read an entry and skipped it.',
      relativePath
    );
    accumulator.skippedFileCount += 1;
    return undefined;
  }
}

function createInventoryEntry(
  path: SourceFileInventoryPath,
  stats: Awaited<ReturnType<typeof lstat>>
): SourceFileInventoryEntry {
  const extension = normalizeExtension(path);
  const baseEntry: SourceFileInventoryEntry = {
    schemaVersion: SOURCE_FILE_INVENTORY_ENTRY_SCHEMA_VERSION,
    path,
    sizeBytes: normalizeFileSizeBytes(stats.size),
    modifiedAt: stats.mtime.toISOString(),
    kind: inferSourceFileKind(path)
  };
  const withCreatedAt = Number.isNaN(stats.birthtime.getTime())
    ? baseEntry
    : {
        ...baseEntry,
        createdAt: stats.birthtime.toISOString()
      };

  return extension === undefined
    ? withCreatedAt
    : {
        ...withCreatedAt,
        extension
      };
}

function toSerializableSourceFileInventoryRoot(root: SourceFileInventoryRoot): SourceFileInventoryRoot {
  const baseRoot: SourceFileInventoryRoot = {
    kind: 'local-folder',
    requestedPath: root.requestedPath,
    absolutePath: root.absolutePath,
    realPath: root.realPath,
    directoryName: root.directoryName
  };
  const withSourceId = root.sourceId === undefined
    ? baseRoot
    : {
        ...baseRoot,
        sourceId: root.sourceId
      };

  return root.displayName === undefined
    ? withSourceId
    : {
        ...withSourceId,
        displayName: root.displayName
      };
}

function toSerializableSourceFileInventoryEntry(entry: SourceFileInventoryEntry): SourceFileInventoryEntry {
  return {
    schemaVersion: SOURCE_FILE_INVENTORY_ENTRY_SCHEMA_VERSION,
    path: parseSourceFileInventoryPath(entry.path),
    sizeBytes: normalizeNonNegativeInteger(entry.sizeBytes, 'Source file size'),
    modifiedAt: normalizeIsoTimestamp(entry.modifiedAt, 'Source file modifiedAt'),
    kind: normalizeSourceFileKind(entry.kind),
    ...(entry.createdAt === undefined
      ? {}
      : { createdAt: normalizeIsoTimestamp(entry.createdAt, 'Source file createdAt') }),
    ...(entry.extension === undefined
      ? {}
      : { extension: normalizeRequiredExtension(entry.extension) })
  };
}

function toSerializableSourceFileInventoryIssue(issue: SourceFileInventoryIssue): SourceFileInventoryIssue {
  if (!isSourceFileInventoryIssueCode(issue.code)) {
    throw new RangeError('Source file inventory issue code is unsupported.');
  }

  if (!SOURCE_FILE_INVENTORY_ISSUE_SEVERITIES.includes(issue.severity)) {
    throw new RangeError('Source file inventory issue severity is unsupported.');
  }

  const message = issue.message.trim();

  if (message.length === 0) {
    throw new RangeError('Source file inventory issue message must not be empty.');
  }

  return issue.path === undefined
    ? {
        code: issue.code,
        severity: issue.severity,
        message
      }
    : {
        code: issue.code,
        severity: issue.severity,
        message,
        path: parseSourceFileInventoryPath(issue.path)
      };
}

function toSourceFileInventoryRoot(source: ResolvedLocalFolderSource): SourceFileInventoryRoot {
  const baseRoot: SourceFileInventoryRoot = {
    kind: 'local-folder',
    requestedPath: source.requestedPath,
    absolutePath: source.absolutePath,
    realPath: source.realPath,
    directoryName: source.directoryName
  };
  const withSourceId = source.sourceId === undefined
    ? baseRoot
    : {
        ...baseRoot,
        sourceId: source.sourceId
      };

  return source.displayName === undefined
    ? withSourceId
    : {
        ...withSourceId,
        displayName: source.displayName
      };
}

function addIssue(
  accumulator: InventoryAccumulator,
  code: SourceFileInventoryIssueCode,
  message: string,
  path?: SourceFileInventoryPath
): void {
  accumulator.issues.push(path === undefined
    ? {
        code,
        severity: code === 'SOURCE_FILE_INVENTORY_MAX_FILES_EXCEEDED' ? 'error' : 'warning',
        message
      }
    : {
        code,
        severity: code === 'SOURCE_FILE_INVENTORY_MAX_FILES_EXCEEDED' ? 'error' : 'warning',
        message,
        path
      });
}

function isIncluded(path: SourceFileInventoryPath, includePatterns: readonly SourceGlobPattern[]): boolean {
  return includePatterns.some((pattern) => matchesSourceGlobPattern(path, pattern, false));
}

function isExcluded(
  path: SourceFileInventoryPath,
  directory: boolean,
  excludePatterns: readonly SourceGlobPattern[]
): boolean {
  return excludePatterns.some((pattern) => matchesSourceGlobPattern(path, pattern, directory));
}

function matchesSourceGlobPattern(
  path: SourceFileInventoryPath,
  pattern: SourceGlobPattern,
  directory: boolean
): boolean {
  const normalizedPattern = parseSourceGlobPattern(pattern);
  const normalizedPath = directory ? path.replace(/\/$/, '') : path;

  if (normalizedPattern === '**/*') {
    return normalizedPath.length > 0;
  }

  if (normalizedPattern.endsWith('/**')) {
    const basePath = normalizedPattern.slice(0, -3).replace(/\/$/, '');
    return normalizedPath === basePath || normalizedPath.startsWith(`${basePath}/`);
  }

  return globToRegExp(normalizedPattern).test(normalizedPath);
}

function globToRegExp(pattern: SourceGlobPattern): RegExp {
  let expression = '^';

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];

    if (char === undefined) {
      continue;
    }

    const nextChar = pattern[index + 1];
    const nextNextChar = pattern[index + 2];

    if (char === '*' && nextChar === '*' && nextNextChar === '/') {
      expression += '(?:.*/)?';
      index += 2;
      continue;
    }

    if (char === '*' && nextChar === '*') {
      expression += '.*';
      index += 1;
      continue;
    }

    if (char === '*') {
      expression += '[^/]*';
      continue;
    }

    if (char === '?') {
      expression += '[^/]';
      continue;
    }

    expression += escapeRegExp(char);
  }

  expression += '$';
  return new RegExp(expression);
}

function inferSourceFileKind(path: SourceFileInventoryPath): SourceFileKind {
  const lowerPath = path.toLowerCase();
  const fileName = lowerPath.split('/').at(-1) ?? lowerPath;

  if (fileName === 'package.json' || fileName === 'pnpm-lock.yaml' || fileName === 'package-lock.json') {
    return 'manifest';
  }

  if (fileName.endsWith('.test.ts') || fileName.endsWith('.spec.ts') || lowerPath.includes('/test/')) {
    return 'test';
  }

  if (fileName.endsWith('.ts') || fileName.endsWith('.tsx') || fileName.endsWith('.js') || fileName.endsWith('.jsx')) {
    return 'source';
  }

  if (fileName.endsWith('.json') || fileName.endsWith('.yaml') || fileName.endsWith('.yml') || fileName.startsWith('.')) {
    return 'config';
  }

  if (fileName.endsWith('.md') || fileName.endsWith('.mdx') || fileName.endsWith('.txt')) {
    return 'documentation';
  }

  if (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.svg')) {
    return 'asset';
  }

  return 'unknown';
}


function compareInventoryPaths(left: SourceFileInventoryPath, right: SourceFileInventoryPath): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function normalizeSourceFileKind(value: SourceFileKind): SourceFileKind {
  if (!isSourceFileKind(value)) {
    throw new RangeError('Source file kind is unsupported.');
  }

  return value;
}


function normalizeFileSizeBytes(size: number | bigint): number {
  if (typeof size === 'number') {
    return size;
  }

  const maxSafeInteger = BigInt(Number.MAX_SAFE_INTEGER);
  return size > maxSafeInteger ? Number.MAX_SAFE_INTEGER : Number(size);
}

function normalizeExtension(path: string): string | undefined {
  const extension = extname(path).toLowerCase();

  if (extension.length === 0) {
    return undefined;
  }

  return extension;
}


function normalizeRequiredExtension(value: string): string {
  const extension = value.trim().toLowerCase();

  if (extension.length === 0) {
    throw new RangeError('Source file extension must not be empty when present.');
  }

  if (!extension.startsWith('.') || extension.length === 1) {
    throw new RangeError('Source file extension must start with a dot and include a suffix.');
  }

  if (extension.includes('/') || extension.includes('\\') || /[\u0000-\u001F\u007F]/.test(extension)) {
    throw new RangeError('Source file extension must be a single path suffix.');
  }

  return extension;
}

function normalizeIsoTimestamp(value: string, label: string): string {
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

function joinInventoryPath(basePath: string, childName: string): SourceFileInventoryPath {
  return parseSourceFileInventoryPath(basePath.length === 0 ? childName : `${basePath}/${childName}`);
}

function normalizeInventoryPath(value: string): string {
  return value
    .trim()
    .replaceAll('\\', '/')
    .split('/')
    .filter((segment) => segment.length > 0 && segment !== '.')
    .join('/');
}

function normalizeFilesystemPath(value: string): string {
  return value.replaceAll('\\', '/').split(sep).join('/');
}

function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

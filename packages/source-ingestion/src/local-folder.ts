import { lstat, realpath } from 'node:fs/promises';
import { basename, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parseLocalSourcePath,
  toSerializableSourceInput,
  type LocalFolderSourceInput,
  type LocalSourcePath,
  type SerializableSourceInputOptions,
  type SourceInputSourceId
} from './input.js';

export declare const localFolderAbsolutePathBrand: unique symbol;
export declare const localFolderRealPathBrand: unique symbol;

export type LocalFolderAbsolutePath = string & {
  readonly [localFolderAbsolutePathBrand]: 'LocalFolderAbsolutePath';
};

export type LocalFolderRealPath = string & {
  readonly [localFolderRealPathBrand]: 'LocalFolderRealPath';
};

export const RESOLVED_LOCAL_FOLDER_SOURCE_SCHEMA_VERSION = 1 as const;

export const LOCAL_FOLDER_RESOLUTION_ISSUE_CODES = [
  'LOCAL_FOLDER_SOURCE_INVALID_INPUT',
  'LOCAL_FOLDER_SOURCE_NOT_FOUND',
  'LOCAL_FOLDER_SOURCE_NOT_DIRECTORY',
  'LOCAL_FOLDER_SOURCE_SYMLINK_NOT_ALLOWED',
  'LOCAL_FOLDER_SOURCE_REALPATH_FAILED'
] as const;

export type LocalFolderResolutionIssueCode = typeof LOCAL_FOLDER_RESOLUTION_ISSUE_CODES[number];

export interface ResolveLocalFolderSourceOptions {
  readonly cwd?: string | URL;
}

export interface ResolvedLocalFolderFilesystemMetadata {
  readonly exists: true;
  readonly type: 'directory';
  readonly symbolicLink: false;
}

export interface ResolvedLocalFolderSource {
  readonly schemaVersion: typeof RESOLVED_LOCAL_FOLDER_SOURCE_SCHEMA_VERSION;
  readonly kind: 'local-folder';
  readonly sourceId?: SourceInputSourceId;
  readonly displayName?: string;
  readonly requestedPath: LocalSourcePath;
  readonly absolutePath: LocalFolderAbsolutePath;
  readonly realPath: LocalFolderRealPath;
  readonly directoryName: string;
  readonly filesystem: ResolvedLocalFolderFilesystemMetadata;
  readonly options: SerializableSourceInputOptions;
}

export class LocalFolderResolutionError extends Error {
  public readonly code: LocalFolderResolutionIssueCode;
  public readonly path?: string;

  public constructor(code: LocalFolderResolutionIssueCode, message: string, path?: string) {
    super(message);
    this.name = 'LocalFolderResolutionError';
    this.code = code;

    if (path !== undefined) {
      this.path = path;
    }
  }
}

export async function resolveLocalFolderSource(
  input: LocalFolderSourceInput,
  options: ResolveLocalFolderSourceOptions = {}
): Promise<ResolvedLocalFolderSource> {
  const serializableInput = toSerializableSourceInput(input);

  if (serializableInput.kind !== 'local-folder') {
    throw new LocalFolderResolutionError(
      'LOCAL_FOLDER_SOURCE_INVALID_INPUT',
      'Local folder resolver only accepts local-folder source inputs.'
    );
  }

  const cwd = resolveResolverCwd(options.cwd);
  const sourceOptions = serializableInput.options as SerializableSourceInputOptions;
  const absolutePath = toLocalFolderAbsolutePath(resolve(cwd, serializableInput.path));
  const stats = await readLocalFolderStats(absolutePath);

  if (stats.isSymbolicLink()) {
    throw new LocalFolderResolutionError(
      'LOCAL_FOLDER_SOURCE_SYMLINK_NOT_ALLOWED',
      'Local folder source must not be a symbolic link in MVP 1.',
      absolutePath
    );
  }

  if (!stats.isDirectory()) {
    throw new LocalFolderResolutionError(
      'LOCAL_FOLDER_SOURCE_NOT_DIRECTORY',
      'Local folder source must resolve to an existing directory.',
      absolutePath
    );
  }

  const resolvedRealPath = await resolveRealPath(absolutePath);
  const source: ResolvedLocalFolderSource = {
    schemaVersion: RESOLVED_LOCAL_FOLDER_SOURCE_SCHEMA_VERSION,
    kind: 'local-folder',
    requestedPath: parseLocalSourcePath(serializableInput.path),
    absolutePath,
    realPath: resolvedRealPath,
    directoryName: basename(resolvedRealPath),
    filesystem: {
      exists: true,
      type: 'directory',
      symbolicLink: false
    },
    options: sourceOptions
  };

  return withOptionalResolvedLocalFolderDisplayName(
    withOptionalResolvedLocalFolderSourceId(source, serializableInput.sourceId),
    serializableInput.displayName
  );
}

export function isLocalFolderResolutionIssueCode(value: unknown): value is LocalFolderResolutionIssueCode {
  return typeof value === 'string'
    && LOCAL_FOLDER_RESOLUTION_ISSUE_CODES.includes(value as LocalFolderResolutionIssueCode);
}

export function toSerializableResolvedLocalFolderSource(
  source: ResolvedLocalFolderSource
): ResolvedLocalFolderSource {
  return withOptionalResolvedLocalFolderDisplayName(
    withOptionalResolvedLocalFolderSourceId({
      schemaVersion: RESOLVED_LOCAL_FOLDER_SOURCE_SCHEMA_VERSION,
      kind: 'local-folder',
      requestedPath: parseLocalSourcePath(source.requestedPath),
      absolutePath: toLocalFolderAbsolutePath(source.absolutePath),
      realPath: toLocalFolderRealPath(source.realPath),
      directoryName: normalizeDirectoryName(source.directoryName),
      filesystem: {
        exists: true,
        type: 'directory',
        symbolicLink: false
      },
      options: source.options
    }, source.sourceId),
    source.displayName
  );
}

function resolveResolverCwd(cwd: string | URL | undefined): string {
  if (cwd instanceof URL) {
    return resolve(fileURLToPath(cwd));
  }

  if (cwd === undefined) {
    return process.cwd();
  }

  if (typeof cwd !== 'string' || cwd.trim().length === 0) {
    throw new LocalFolderResolutionError(
      'LOCAL_FOLDER_SOURCE_INVALID_INPUT',
      'Local folder resolver cwd must be a non-empty filesystem path.'
    );
  }

  return resolve(cwd);
}

async function readLocalFolderStats(path: LocalFolderAbsolutePath): Promise<Awaited<ReturnType<typeof lstat>>> {
  try {
    return await lstat(path);
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) {
      throw new LocalFolderResolutionError(
        'LOCAL_FOLDER_SOURCE_NOT_FOUND',
        'Local folder source does not exist.',
        path
      );
    }

    throw error;
  }
}

async function resolveRealPath(path: LocalFolderAbsolutePath): Promise<LocalFolderRealPath> {
  try {
    return toLocalFolderRealPath(await realpath(path));
  } catch (error) {
    const message = error instanceof Error
      ? `Local folder realpath resolution failed: ${error.message}`
      : 'Local folder realpath resolution failed.';

    throw new LocalFolderResolutionError(
      'LOCAL_FOLDER_SOURCE_REALPATH_FAILED',
      message,
      path
    );
  }
}

function toLocalFolderAbsolutePath(value: string): LocalFolderAbsolutePath {
  const normalized = normalizeFilesystemPath(value);

  if (!isAbsoluteLike(normalized)) {
    throw new LocalFolderResolutionError(
      'LOCAL_FOLDER_SOURCE_INVALID_INPUT',
      'Local folder absolute path must be absolute after resolution.',
      normalized
    );
  }

  return normalized as LocalFolderAbsolutePath;
}

function toLocalFolderRealPath(value: string): LocalFolderRealPath {
  const normalized = normalizeFilesystemPath(value);

  if (!isAbsoluteLike(normalized)) {
    throw new LocalFolderResolutionError(
      'LOCAL_FOLDER_SOURCE_REALPATH_FAILED',
      'Local folder real path must be absolute.',
      normalized
    );
  }

  return normalized as LocalFolderRealPath;
}

function normalizeFilesystemPath(value: string): string {
  return value.replaceAll('\\', '/').split(sep).join('/').replace(/\/+$|\/+$/g, '');
}

function isAbsoluteLike(value: string): boolean {
  return value.startsWith('/') || /^[A-Za-z]:\//.test(value);
}

function normalizeDirectoryName(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0 || trimmed.includes('/') || trimmed.includes('\\')) {
    throw new LocalFolderResolutionError(
      'LOCAL_FOLDER_SOURCE_INVALID_INPUT',
      'Local folder directory name must be a single non-empty path segment.'
    );
  }

  return trimmed;
}

function hasErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === code;
}

function withOptionalResolvedLocalFolderSourceId<T extends ResolvedLocalFolderSource>(
  source: T,
  sourceId: SourceInputSourceId | undefined
): T {
  if (sourceId === undefined) {
    return source;
  }

  return {
    ...source,
    sourceId
  };
}

function withOptionalResolvedLocalFolderDisplayName<T extends ResolvedLocalFolderSource>(
  source: T,
  displayName: string | undefined
): T {
  if (displayName === undefined) {
    return source;
  }

  return {
    ...source,
    displayName
  };
}

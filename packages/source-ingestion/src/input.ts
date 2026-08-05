export declare const sourceInputSourceIdBrand: unique symbol;
export declare const localSourcePathBrand: unique symbol;
export declare const gitRepositoryUrlBrand: unique symbol;
export declare const gitReferenceBrand: unique symbol;
export declare const sourceGlobPatternBrand: unique symbol;

export type SourceInputSourceId = string & {
  readonly [sourceInputSourceIdBrand]: 'SourceInputSourceId';
};

export type LocalSourcePath = string & {
  readonly [localSourcePathBrand]: 'LocalSourcePath';
};

export type GitRepositoryUrl = string & {
  readonly [gitRepositoryUrlBrand]: 'GitRepositoryUrl';
};

export type GitReference = string & {
  readonly [gitReferenceBrand]: 'GitReference';
};

export type SourceGlobPattern = string & {
  readonly [sourceGlobPatternBrand]: 'SourceGlobPattern';
};

export const SOURCE_INPUT_SCHEMA_VERSION = 1 as const;

export const SOURCE_INPUT_KINDS = [
  'local-folder',
  'zip-archive',
  'git-repository'
] as const;

export type SourceInputKind = typeof SOURCE_INPUT_KINDS[number];

export const SOURCE_INPUT_GIT_HISTORY_MODES = [
  'none',
  'metadata-only'
] as const;

export type SourceInputGitHistoryMode = typeof SOURCE_INPUT_GIT_HISTORY_MODES[number];

export const SOURCE_INPUT_VALIDATION_ISSUE_CODES = [
  'SOURCE_INPUT_INVALID_SHAPE',
  'SOURCE_INPUT_UNSUPPORTED_SCHEMA_VERSION',
  'SOURCE_INPUT_INVALID_KIND',
  'SOURCE_INPUT_INVALID_FIELD'
] as const;

export type SourceInputValidationIssueCode = typeof SOURCE_INPUT_VALIDATION_ISSUE_CODES[number];

export const SOURCE_INPUT_VALIDATION_SEVERITIES = [
  'error',
  'warning'
] as const;

export type SourceInputValidationSeverity = typeof SOURCE_INPUT_VALIDATION_SEVERITIES[number];

export interface SourceInputSafetyOptions {
  readonly followSymlinks?: false;
  readonly executeRepositoryCode?: false;
  readonly includeGitHistory?: SourceInputGitHistoryMode;
}

export interface SourceInputScanOptions {
  readonly include?: readonly SourceGlobPattern[];
  readonly exclude?: readonly SourceGlobPattern[];
  readonly maxFileSizeBytes?: number;
  readonly maxFiles?: number;
}

export interface SourceInputOptions {
  readonly safety?: SourceInputSafetyOptions;
  readonly scan?: SourceInputScanOptions;
}

export interface SourceInputBase {
  readonly schemaVersion: typeof SOURCE_INPUT_SCHEMA_VERSION;
  readonly kind: SourceInputKind;
  readonly sourceId?: SourceInputSourceId;
  readonly displayName?: string;
  readonly options?: SourceInputOptions;
}

export interface LocalFolderSourceInput extends SourceInputBase {
  readonly kind: 'local-folder';
  readonly path: LocalSourcePath;
}

export interface ZipArchiveSourceInput extends SourceInputBase {
  readonly kind: 'zip-archive';
  readonly archivePath: LocalSourcePath;
  readonly entryRoot?: SourceGlobPattern;
}

export interface GitRepositorySourceInput extends SourceInputBase {
  readonly kind: 'git-repository';
  readonly repositoryUrl: GitRepositoryUrl;
  readonly ref?: GitReference;
  readonly depth?: number;
}

export type SourceInput = LocalFolderSourceInput | ZipArchiveSourceInput | GitRepositorySourceInput;

export interface SourceInputValidationIssue {
  readonly code: SourceInputValidationIssueCode;
  readonly severity: SourceInputValidationSeverity;
  readonly message: string;
  readonly path?: string;
}

export interface SourceInputValidationResult {
  readonly valid: boolean;
  readonly issues: readonly SourceInputValidationIssue[];
}

const SOURCE_ID_PATTERN = /^source:[A-Za-z0-9][A-Za-z0-9._~/-]{0,179}$/;
const LOCAL_SOURCE_PATH_MAX_LENGTH = 2000;
const GIT_REPOSITORY_URL_MAX_LENGTH = 2000;
const GIT_REFERENCE_MAX_LENGTH = 160;
const SOURCE_GLOB_PATTERN_MAX_LENGTH = 240;
const SOURCE_DISPLAY_NAME_MAX_LENGTH = 120;
const MIN_SOURCE_FILE_SIZE_BYTES = 1;
const MAX_SOURCE_FILE_SIZE_BYTES = 100 * 1024 * 1024;
const MIN_SOURCE_FILE_COUNT = 1;
const MAX_SOURCE_FILE_COUNT = 200000;
const MIN_GIT_CLONE_DEPTH = 1;
const MAX_GIT_CLONE_DEPTH = 500;

const DEFAULT_INCLUDE_PATTERNS = ['**/*'] as const;
const DEFAULT_EXCLUDE_PATTERNS = [
  '.git/**',
  '.next/**',
  '.turbo/**',
  'coverage/**',
  'dist/**',
  'node_modules/**',
  'out/**'
] as const;

export function parseLocalSourcePath(value: string): LocalSourcePath {
  const normalized = normalizeLocalPath(value);
  assertSafeLocalPath(normalized);
  return normalized as LocalSourcePath;
}

export function isLocalSourcePath(value: unknown): value is LocalSourcePath {
  return typeof value === 'string' && validateLocalSourcePath(value);
}

export function validateLocalSourcePath(value: string): boolean {
  try {
    parseLocalSourcePath(value);
    return true;
  } catch {
    return false;
  }
}

export function parseGitRepositoryUrl(value: string): GitRepositoryUrl {
  const normalized = normalizeGitRepositoryUrl(value);
  return normalized as GitRepositoryUrl;
}

export function isGitRepositoryUrl(value: unknown): value is GitRepositoryUrl {
  return typeof value === 'string' && validateGitRepositoryUrl(value);
}

export function validateGitRepositoryUrl(value: string): boolean {
  try {
    parseGitRepositoryUrl(value);
    return true;
  } catch {
    return false;
  }
}

export function parseGitReference(value: string): GitReference {
  const normalized = normalizeGitReference(value);
  return normalized as GitReference;
}

export function isGitReference(value: unknown): value is GitReference {
  return typeof value === 'string' && validateGitReference(value);
}

export function validateGitReference(value: string): boolean {
  try {
    parseGitReference(value);
    return true;
  } catch {
    return false;
  }
}

export function parseSourceGlobPattern(value: string): SourceGlobPattern {
  const normalized = normalizeSourceGlobPattern(value);
  return normalized as SourceGlobPattern;
}

export function isSourceGlobPattern(value: unknown): value is SourceGlobPattern {
  return typeof value === 'string' && validateSourceGlobPattern(value);
}

export function validateSourceGlobPattern(value: string): boolean {
  try {
    parseSourceGlobPattern(value);
    return true;
  } catch {
    return false;
  }
}

export function isSourceInputKind(value: unknown): value is SourceInputKind {
  return typeof value === 'string' && SOURCE_INPUT_KINDS.includes(value as SourceInputKind);
}

export function isSourceInputGitHistoryMode(value: unknown): value is SourceInputGitHistoryMode {
  return typeof value === 'string'
    && SOURCE_INPUT_GIT_HISTORY_MODES.includes(value as SourceInputGitHistoryMode);
}

export function isSourceInputValidationIssueCode(
  value: unknown
): value is SourceInputValidationIssueCode {
  return typeof value === 'string'
    && SOURCE_INPUT_VALIDATION_ISSUE_CODES.includes(value as SourceInputValidationIssueCode);
}

export function isSourceInputValidationSeverity(value: unknown): value is SourceInputValidationSeverity {
  return typeof value === 'string'
    && SOURCE_INPUT_VALIDATION_SEVERITIES.includes(value as SourceInputValidationSeverity);
}

export function isSourceInput(value: unknown): value is SourceInput {
  return validateSourceInput(value).valid;
}

export function assertSourceInput(value: unknown): asserts value is SourceInput {
  const result = validateSourceInput(value);

  if (!result.valid) {
    throw new RangeError(formatSourceInputValidationError(result.issues));
  }
}

export function validateSourceInput(value: unknown): SourceInputValidationResult {
  const issues: SourceInputValidationIssue[] = [];

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    issues.push(createSourceInputIssue(
      'SOURCE_INPUT_INVALID_SHAPE',
      'Source input must be a plain object.'
    ));
    return toSourceInputValidationResult(issues);
  }

  const candidate = value as Partial<SourceInput>;

  if (candidate.schemaVersion !== SOURCE_INPUT_SCHEMA_VERSION) {
    issues.push(createSourceInputIssue(
      'SOURCE_INPUT_UNSUPPORTED_SCHEMA_VERSION',
      'Source input schema version is unsupported.',
      'schemaVersion'
    ));
  }

  if (!isSourceInputKind(candidate.kind)) {
    issues.push(createSourceInputIssue(
      'SOURCE_INPUT_INVALID_KIND',
      'Source input kind is unsupported.',
      'kind'
    ));
    return toSourceInputValidationResult(issues);
  }

  try {
    toSerializableSourceInput(candidate as SourceInput);
  } catch (error) {
    issues.push(createSourceInputIssue(
      'SOURCE_INPUT_INVALID_FIELD',
      formatUnknownError(error),
      undefined
    ));
  }

  return toSourceInputValidationResult(issues);
}

export function toSerializableSourceInput(input: SourceInput): SourceInput {
  assertSourceInputShape(input);

  switch (input.kind) {
    case 'local-folder':
      return {
        ...toSerializableSourceInputBase(input),
        kind: 'local-folder',
        path: parseLocalSourcePath(input.path)
      };
    case 'zip-archive':
      return withOptionalEntryRoot({
        ...toSerializableSourceInputBase(input),
        kind: 'zip-archive',
        archivePath: parseLocalSourcePath(input.archivePath)
      }, input.entryRoot);
    case 'git-repository':
      return withOptionalGitFields({
        ...toSerializableSourceInputBase(input),
        kind: 'git-repository',
        repositoryUrl: parseGitRepositoryUrl(input.repositoryUrl)
      }, input.ref, input.depth);
  }
}

export function defaultSourceInputOptions(): SerializableSourceInputOptions {
  return {
    safety: {
      followSymlinks: false,
      executeRepositoryCode: false,
      includeGitHistory: 'metadata-only'
    },
    scan: {
      include: DEFAULT_INCLUDE_PATTERNS.map(parseSourceGlobPattern),
      exclude: DEFAULT_EXCLUDE_PATTERNS.map(parseSourceGlobPattern),
      maxFileSizeBytes: MAX_SOURCE_FILE_SIZE_BYTES,
      maxFiles: MAX_SOURCE_FILE_COUNT
    }
  };
}

function toSerializableSourceInputBase(input: SourceInputBase): SourceInputBase {
  const base: SourceInputBase = {
    schemaVersion: SOURCE_INPUT_SCHEMA_VERSION,
    kind: input.kind,
    options: toSerializableSourceInputOptions(input.options)
  };

  return withOptionalDisplayName(withOptionalSourceId(base, input.sourceId), input.displayName);
}

export interface SerializableSourceInputSafetyOptions {
  readonly followSymlinks: false;
  readonly executeRepositoryCode: false;
  readonly includeGitHistory: SourceInputGitHistoryMode;
}

export interface SerializableSourceInputScanOptions {
  readonly include: readonly SourceGlobPattern[];
  readonly exclude: readonly SourceGlobPattern[];
  readonly maxFileSizeBytes: number;
  readonly maxFiles: number;
}

export interface SerializableSourceInputOptions {
  readonly safety: SerializableSourceInputSafetyOptions;
  readonly scan: SerializableSourceInputScanOptions;
}

function toSerializableSourceInputOptions(options: SourceInputOptions | undefined): SerializableSourceInputOptions {
  const defaults = defaultSourceInputOptions();
  const safety = options?.safety ?? {};
  const scan = options?.scan ?? {};

  if (safety.followSymlinks !== undefined && safety.followSymlinks !== false) {
    throw new RangeError('Source input must not follow symlinks in MVP 1.');
  }

  if (safety.executeRepositoryCode !== undefined && safety.executeRepositoryCode !== false) {
    throw new RangeError('Source input must not execute repository code.');
  }

  if (safety.includeGitHistory !== undefined && !isSourceInputGitHistoryMode(safety.includeGitHistory)) {
    throw new RangeError('Source input git history mode is unsupported.');
  }

  return {
    safety: {
      followSymlinks: false,
      executeRepositoryCode: false,
      includeGitHistory: safety.includeGitHistory ?? defaults.safety.includeGitHistory
    },
    scan: toSerializableScanOptions(scan, defaults.scan)
  };
}

function toSerializableScanOptions(
  scan: SourceInputScanOptions,
  defaults: SerializableSourceInputScanOptions
): Required<SourceInputScanOptions> {
  const maxFileSizeBytes = scan.maxFileSizeBytes ?? MAX_SOURCE_FILE_SIZE_BYTES;
  const maxFiles = scan.maxFiles ?? MAX_SOURCE_FILE_COUNT;

  assertIntegerInRange(
    maxFileSizeBytes,
    MIN_SOURCE_FILE_SIZE_BYTES,
    MAX_SOURCE_FILE_SIZE_BYTES,
    'Source input maxFileSizeBytes is out of range.'
  );
  assertIntegerInRange(
    maxFiles,
    MIN_SOURCE_FILE_COUNT,
    MAX_SOURCE_FILE_COUNT,
    'Source input maxFiles is out of range.'
  );

  return {
    include: normalizePatternList(scan.include ?? defaults.include),
    exclude: normalizePatternList(scan.exclude ?? defaults.exclude),
    maxFileSizeBytes,
    maxFiles
  };
}

function normalizePatternList(patterns: readonly SourceGlobPattern[]): readonly SourceGlobPattern[] {
  if (patterns.length === 0) {
    throw new RangeError('Source input glob pattern list must not be empty.');
  }

  return [...new Set(patterns.map((pattern) => parseSourceGlobPattern(pattern)))].sort();
}

function assertSourceInputShape(value: unknown): asserts value is SourceInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RangeError('Source input must be a plain object.');
  }

  const candidate = value as Partial<SourceInput>;

  if (candidate.schemaVersion !== SOURCE_INPUT_SCHEMA_VERSION) {
    throw new RangeError('Source input schema version is unsupported.');
  }

  if (!isSourceInputKind(candidate.kind)) {
    throw new RangeError('Source input kind is unsupported.');
  }

  if (candidate.sourceId !== undefined) {
    assertSourceId(candidate.sourceId);
  }

  if (candidate.displayName !== undefined) {
    normalizeDisplayName(candidate.displayName);
  }
}

function parseOptionalGitDepth(depth: number | undefined): number | undefined {
  if (depth === undefined) {
    return undefined;
  }

  assertIntegerInRange(
    depth,
    MIN_GIT_CLONE_DEPTH,
    MAX_GIT_CLONE_DEPTH,
    'Git clone depth is out of range.'
  );

  return depth;
}

function normalizeLocalPath(value: string): string {
  if (typeof value !== 'string') {
    throw new RangeError('Local source path must be a string.');
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new RangeError('Local source path must not be empty.');
  }

  return normalizeLocalPathSegments(trimmed.replaceAll('\\', '/').replace(/\/+/g, '/').replace(/\/$/, ''));
}

function assertSafeLocalPath(value: string): void {
  assertTextIsSafe(value, LOCAL_SOURCE_PATH_MAX_LENGTH, 'Local source path');

  if (value === '..') {
    throw new RangeError('Local source path must not escape the current working directory.');
  }

  if (value === '/' || /^[A-Za-z]:\/?$/.test(value)) {
    throw new RangeError('Local source path must not be a filesystem root.');
  }

  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value) && !/^[A-Za-z]:\//.test(value)) {
    throw new RangeError('Local source path must not be a URL.');
  }

  assertNoTraversalSegments(value, 'Local source path', true);
}

function normalizeGitRepositoryUrl(value: string): string {
  if (typeof value !== 'string') {
    throw new RangeError('Git repository URL must be a string.');
  }

  const trimmed = value.trim();
  assertTextIsSafe(trimmed, GIT_REPOSITORY_URL_MAX_LENGTH, 'Git repository URL');

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    throw new RangeError('Git repository URL must be an absolute HTTPS URL.');
  }

  if (url.protocol !== 'https:') {
    throw new RangeError('Git repository URL must use HTTPS.');
  }

  if (url.username || url.password) {
    throw new RangeError('Git repository URL must not embed credentials.');
  }

  if (url.search || url.hash) {
    throw new RangeError('Git repository URL must not include query strings or fragments.');
  }

  if (isBlockedGitHost(url.hostname)) {
    throw new RangeError('Git repository URL host is not allowed for public repository ingestion.');
  }

  const path = url.pathname.replace(/\/+$|\/+$/g, '');

  if (path === '' || path === '/') {
    throw new RangeError('Git repository URL must include an owner and repository path.');
  }

  assertNoTraversalSegments(path, 'Git repository URL path');

  url.pathname = path;
  return url.toString();
}

function normalizeGitReference(value: string): string {
  if (typeof value !== 'string') {
    throw new RangeError('Git reference must be a string.');
  }

  const trimmed = value.trim();
  assertTextIsSafe(trimmed, GIT_REFERENCE_MAX_LENGTH, 'Git reference');

  if (!/^[A-Za-z0-9][A-Za-z0-9._~/-]{0,159}$/.test(trimmed)) {
    throw new RangeError('Git reference must be URL-safe and start with an alphanumeric character.');
  }

  if (trimmed.includes('//') || trimmed.includes('..')) {
    throw new RangeError('Git reference must not contain ambiguous segments.');
  }

  assertNoTraversalSegments(trimmed, 'Git reference');

  return trimmed;
}

function normalizeSourceGlobPattern(value: string): string {
  if (typeof value !== 'string') {
    throw new RangeError('Source glob pattern must be a string.');
  }

  const normalized = value.trim().replaceAll('\\', '/').replace(/\/+/g, '/');
  assertTextIsSafe(normalized, SOURCE_GLOB_PATTERN_MAX_LENGTH, 'Source glob pattern');

  if (normalized.length === 0) {
    throw new RangeError('Source glob pattern must not be empty.');
  }

  if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) {
    throw new RangeError('Source glob pattern must be repository-relative.');
  }

  assertNoTraversalSegments(normalized, 'Source glob pattern');

  return normalized;
}

function normalizeDisplayName(value: string): string {
  if (typeof value !== 'string') {
    throw new RangeError('Source input displayName must be a string.');
  }

  const trimmed = value.trim();
  assertTextIsSafe(trimmed, SOURCE_DISPLAY_NAME_MAX_LENGTH, 'Source input displayName');

  if (trimmed.length === 0) {
    throw new RangeError('Source input displayName must not be empty.');
  }

  return trimmed;
}

function assertSourceId(value: string): void {
  if (!SOURCE_ID_PATTERN.test(value)) {
    throw new RangeError('Source input sourceId must be a valid source identifier.');
  }

  assertNoTraversalSegments(value.slice('source:'.length), 'Source input sourceId');
}

function assertTextIsSafe(value: string, maxLength: number, label: string): void {
  if (value.length === 0) {
    throw new RangeError(`${label} must not be empty.`);
  }

  if (value.length > maxLength) {
    throw new RangeError(`${label} is too long.`);
  }

  if (/[\u0000-\u001F\u007F]/.test(value)) {
    throw new RangeError(`${label} must not include control characters.`);
  }
}

function normalizeLocalPathSegments(value: string): string {
  if (value === '.') {
    return value;
  }

  const isAbsolute = value.startsWith('/');
  const segments = value.split('/').filter((segment) => segment.length > 0 && segment !== '.');
  const normalized = `${isAbsolute ? '/' : ''}${segments.join('/')}`;

  return normalized.length === 0 ? '.' : normalized;
}

function assertNoTraversalSegments(value: string, label: string, allowCurrentDirectory = false): void {
  const segments = value.split('/').filter((segment) => segment.length > 0);

  for (const segment of segments) {
    if (segment === '..' || (!allowCurrentDirectory && segment === '.')) {
      throw new RangeError(`${label} must not contain traversal segments.`);
    }
  }
}

function assertIntegerInRange(value: number, min: number, max: number, message: string): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(message);
  }
}

function isBlockedGitHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  return normalized === 'localhost'
    || normalized.endsWith('.local')
    || normalized === '127.0.0.1'
    || normalized.startsWith('127.')
    || normalized === '0.0.0.0'
    || normalized === '[::1]';
}

function withOptionalSourceId<T extends SourceInputBase>(input: T, sourceId: SourceInputSourceId | undefined): T {
  if (sourceId === undefined) {
    return input;
  }

  assertSourceId(sourceId);
  return {
    ...input,
    sourceId
  };
}

function withOptionalDisplayName<T extends SourceInputBase>(input: T, displayName: string | undefined): T {
  if (displayName === undefined) {
    return input;
  }

  return {
    ...input,
    displayName: normalizeDisplayName(displayName)
  };
}

function withOptionalEntryRoot<T extends ZipArchiveSourceInput>(
  input: Omit<T, 'entryRoot'>,
  entryRoot: SourceGlobPattern | undefined
): T {
  if (entryRoot === undefined) {
    return input as T;
  }

  return {
    ...input,
    entryRoot: parseSourceGlobPattern(entryRoot)
  } as T;
}

function withOptionalGitFields<T extends GitRepositorySourceInput>(
  input: Omit<T, 'ref' | 'depth'>,
  ref: GitReference | undefined,
  depth: number | undefined
): T {
  const serializable = { ...input } as GitRepositorySourceInput;
  const parsedDepth = parseOptionalGitDepth(depth);

  return {
    ...serializable,
    ...(ref === undefined ? {} : { ref: parseGitReference(ref) }),
    ...(parsedDepth === undefined ? {} : { depth: parsedDepth })
  } as T;
}

function createSourceInputIssue(
  code: SourceInputValidationIssueCode,
  message: string,
  path?: string
): SourceInputValidationIssue {
  return path === undefined
    ? {
        code,
        severity: 'error',
        message
      }
    : {
        code,
        severity: 'error',
        message,
        path
      };
}

function toSourceInputValidationResult(
  issues: readonly SourceInputValidationIssue[]
): SourceInputValidationResult {
  return {
    valid: issues.length === 0,
    issues: [...issues]
  };
}

function formatSourceInputValidationError(issues: readonly SourceInputValidationIssue[]): string {
  return issues.map((issue) => `${issue.code}: ${issue.message}`).join('; ');
}

function formatUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

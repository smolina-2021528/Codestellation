export declare const codestellationIdBrand: unique symbol;

export type BrandedIdentifier<TBrand extends string> = string & {
  readonly [codestellationIdBrand]: TBrand;
};

export const CODESTELLATION_ID_FORMAT_VERSION = 1 as const;

export const CODESTELLATION_ID_PREFIXES = {
  project: 'project',
  source: 'source',
  sourceFile: 'file',
  sourceRevision: 'revision',
  snapshot: 'snapshot'
} as const;

export type CodestellationIdPrefix = typeof CODESTELLATION_ID_PREFIXES[keyof typeof CODESTELLATION_ID_PREFIXES];

export type ProjectId = BrandedIdentifier<'ProjectId'>;
export type SourceId = BrandedIdentifier<'SourceId'>;
export type SourceFileId = BrandedIdentifier<'SourceFileId'>;
export type SourceRevisionId = BrandedIdentifier<'SourceRevisionId'>;
export type SnapshotId = BrandedIdentifier<'SnapshotId'>;

export type CodestellationId = ProjectId | SourceId | SourceFileId | SourceRevisionId | SnapshotId;

export const PROJECT_SOURCE_KINDS = [
  'local-folder',
  'zip-archive',
  'git-repository'
] as const;

export type ProjectSourceKind = typeof PROJECT_SOURCE_KINDS[number];

export interface ProjectIdentity {
  readonly id: ProjectId;
  readonly displayName: string;
}

export interface ProjectSourceIdentity {
  readonly id: SourceId;
  readonly projectId: ProjectId;
  readonly kind: ProjectSourceKind;
  readonly displayName: string;
}

export interface SourceRevisionIdentity {
  readonly id: SourceRevisionId;
  readonly sourceId: SourceId;
  readonly label: string;
}

export interface ProjectSnapshotIdentity {
  readonly id: SnapshotId;
  readonly projectId: ProjectId;
  readonly sourceId: SourceId;
  readonly revisionId: SourceRevisionId;
}

const IDENTIFIER_TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._~/-]{0,179}$/;

export function createProjectId(token: string): ProjectId {
  return createIdentifier(CODESTELLATION_ID_PREFIXES.project, token) as ProjectId;
}

export function createSourceId(token: string): SourceId {
  return createIdentifier(CODESTELLATION_ID_PREFIXES.source, token) as SourceId;
}

export function createSourceFileId(token: string): SourceFileId {
  return createIdentifier(CODESTELLATION_ID_PREFIXES.sourceFile, token) as SourceFileId;
}

export function createSourceRevisionId(token: string): SourceRevisionId {
  return createIdentifier(CODESTELLATION_ID_PREFIXES.sourceRevision, token) as SourceRevisionId;
}

export function createSnapshotId(token: string): SnapshotId {
  return createIdentifier(CODESTELLATION_ID_PREFIXES.snapshot, token) as SnapshotId;
}

export function parseProjectId(value: string): ProjectId {
  return parseIdentifier(CODESTELLATION_ID_PREFIXES.project, value) as ProjectId;
}

export function parseSourceId(value: string): SourceId {
  return parseIdentifier(CODESTELLATION_ID_PREFIXES.source, value) as SourceId;
}

export function parseSourceFileId(value: string): SourceFileId {
  return parseIdentifier(CODESTELLATION_ID_PREFIXES.sourceFile, value) as SourceFileId;
}

export function parseSourceRevisionId(value: string): SourceRevisionId {
  return parseIdentifier(CODESTELLATION_ID_PREFIXES.sourceRevision, value) as SourceRevisionId;
}

export function parseSnapshotId(value: string): SnapshotId {
  return parseIdentifier(CODESTELLATION_ID_PREFIXES.snapshot, value) as SnapshotId;
}

export function isProjectId(value: unknown): value is ProjectId {
  return isIdentifier(CODESTELLATION_ID_PREFIXES.project, value);
}

export function isSourceId(value: unknown): value is SourceId {
  return isIdentifier(CODESTELLATION_ID_PREFIXES.source, value);
}

export function isSourceFileId(value: unknown): value is SourceFileId {
  return isIdentifier(CODESTELLATION_ID_PREFIXES.sourceFile, value);
}

export function isSourceRevisionId(value: unknown): value is SourceRevisionId {
  return isIdentifier(CODESTELLATION_ID_PREFIXES.sourceRevision, value);
}

export function isSnapshotId(value: unknown): value is SnapshotId {
  return isIdentifier(CODESTELLATION_ID_PREFIXES.snapshot, value);
}

export function isProjectSourceKind(value: unknown): value is ProjectSourceKind {
  return typeof value === 'string' && PROJECT_SOURCE_KINDS.includes(value as ProjectSourceKind);
}

export function toSerializableId(id: CodestellationId): string {
  return id;
}

export function validateIdentifierToken(token: string): boolean {
  try {
    assertValidIdentifierToken(token);
    return true;
  } catch {
    return false;
  }
}

function createIdentifier(prefix: CodestellationIdPrefix, token: string): string {
  assertValidIdentifierToken(token);
  return `${prefix}:${token}`;
}

function parseIdentifier(prefix: CodestellationIdPrefix, value: string): string {
  const expectedPrefix = `${prefix}:`;

  if (!value.startsWith(expectedPrefix)) {
    throw new RangeError(`Expected ${prefix} identifier prefix.`);
  }

  const token = value.slice(expectedPrefix.length);
  assertValidIdentifierToken(token);

  return value;
}

function isIdentifier(prefix: CodestellationIdPrefix, value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    parseIdentifier(prefix, value);
    return true;
  } catch {
    return false;
  }
}

function assertValidIdentifierToken(token: string): void {
  if (token.length === 0) {
    throw new RangeError('Identifier token must not be empty.');
  }

  if (token.trim() !== token) {
    throw new RangeError('Identifier token must not have leading or trailing whitespace.');
  }

  if (!IDENTIFIER_TOKEN_PATTERN.test(token)) {
    throw new RangeError('Identifier token must be URL-safe and start with an alphanumeric character.');
  }

  if (token.includes('\\')) {
    throw new RangeError('Identifier token must use forward slashes only.');
  }

  if (token.includes('//')) {
    throw new RangeError('Identifier token must not contain empty path segments.');
  }

  const segments = token.split('/');

  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw new RangeError('Identifier token must not contain traversal segments.');
  }
}

export declare const graphNodeIdBrand: unique symbol;
export declare const repositoryPathBrand: unique symbol;

export type GraphNodeId = string & {
  readonly [graphNodeIdBrand]: 'GraphNodeId';
};

export type RepositoryPath = string & {
  readonly [repositoryPathBrand]: 'RepositoryPath';
};

export const GRAPH_NODE_SCHEMA_VERSION = 1 as const;

export const GRAPH_NODE_ID_PREFIX = 'node' as const;

export const GRAPH_NODE_KINDS = [
  'project',
  'package',
  'folder',
  'file',
  'symbol'
] as const;

export type GraphNodeKind = typeof GRAPH_NODE_KINDS[number];

export const PACKAGE_MANAGERS = [
  'npm',
  'pnpm',
  'yarn',
  'bun',
  'unknown'
] as const;

export type PackageManager = typeof PACKAGE_MANAGERS[number];

export const SOURCE_LANGUAGES = [
  'typescript',
  'javascript',
  'json',
  'markdown',
  'css',
  'html',
  'text',
  'unknown'
] as const;

export type SourceLanguage = typeof SOURCE_LANGUAGES[number];

export const GRAPH_SYMBOL_KINDS = [
  'class',
  'component',
  'constant',
  'enum',
  'function',
  'hook',
  'interface',
  'method',
  'module',
  'route',
  'type',
  'variable',
  'unknown'
] as const;

export type GraphSymbolKind = typeof GRAPH_SYMBOL_KINDS[number];

export const GRAPH_SYMBOL_EXPORT_KINDS = [
  'default',
  'named',
  'namespace',
  'none',
  'unknown'
] as const;

export type GraphSymbolExportKind = typeof GRAPH_SYMBOL_EXPORT_KINDS[number];

export interface GraphNodeDisplay {
  readonly label: string;
  readonly subtitle?: string;
  readonly description?: string;
}

export interface GraphNodeFacet {
  readonly key: string;
  readonly value: string;
}

export interface GraphNodeAnalysisMetadata {
  readonly tags: readonly string[];
  readonly facets: readonly GraphNodeFacet[];
}

export interface SourceRangePosition {
  readonly line: number;
  readonly column: number;
}

export interface SourceRange {
  readonly start: SourceRangePosition;
  readonly end: SourceRangePosition;
}

export interface GraphNodeBase {
  readonly schemaVersion: typeof GRAPH_NODE_SCHEMA_VERSION;
  readonly id: GraphNodeId;
  readonly kind: GraphNodeKind;
  readonly parentId?: GraphNodeId;
  readonly display: GraphNodeDisplay;
  readonly analysis: GraphNodeAnalysisMetadata;
}

export interface ProjectGraphNode extends GraphNodeBase {
  readonly kind: 'project';
  readonly project: {
    readonly name: string;
    readonly rootPath?: RepositoryPath;
  };
}

export interface PackageGraphNode extends GraphNodeBase {
  readonly kind: 'package';
  readonly package: {
    readonly name: string;
    readonly manager: PackageManager;
    readonly manifestPath?: RepositoryPath;
  };
}

export interface FolderGraphNode extends GraphNodeBase {
  readonly kind: 'folder';
  readonly folder: {
    readonly path: RepositoryPath;
  };
}

export interface FileGraphNode extends GraphNodeBase {
  readonly kind: 'file';
  readonly file: {
    readonly path: RepositoryPath;
    readonly language: SourceLanguage;
    readonly extension?: string;
    readonly lineCount?: number;
  };
}

export interface SymbolGraphNode extends GraphNodeBase {
  readonly kind: 'symbol';
  readonly symbol: {
    readonly name: string;
    readonly symbolKind: GraphSymbolKind;
    readonly exportKind: GraphSymbolExportKind;
    readonly path: RepositoryPath;
    readonly range?: SourceRange;
  };
}

export type CanonicalGraphNode =
  | ProjectGraphNode
  | PackageGraphNode
  | FolderGraphNode
  | FileGraphNode
  | SymbolGraphNode;

const GRAPH_NODE_ID_TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._~/-]{0,219}$/;
const GRAPH_TEXT_FIELD_MAX_LENGTH = 240;
const GRAPH_DESCRIPTION_MAX_LENGTH = 1200;
const GRAPH_TAG_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._~:-]{0,63}$/;
const GRAPH_FACET_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9._:-]{0,79}$/;
const GRAPH_EXTENSION_PATTERN = /^\.[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/;

export function createGraphNodeId(token: string): GraphNodeId {
  assertValidGraphNodeIdToken(token);
  return `${GRAPH_NODE_ID_PREFIX}:${token}` as GraphNodeId;
}

export function parseGraphNodeId(value: string): GraphNodeId {
  const expectedPrefix = `${GRAPH_NODE_ID_PREFIX}:`;

  if (!value.startsWith(expectedPrefix)) {
    throw new RangeError('Expected graph node identifier prefix.');
  }

  assertValidGraphNodeIdToken(value.slice(expectedPrefix.length));
  return value as GraphNodeId;
}

export function isGraphNodeId(value: unknown): value is GraphNodeId {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    parseGraphNodeId(value);
    return true;
  } catch {
    return false;
  }
}

export function parseRepositoryPath(value: string): RepositoryPath {
  assertValidRepositoryPath(value);
  return value as RepositoryPath;
}

export function isRepositoryPath(value: unknown): value is RepositoryPath {
  return typeof value === 'string' && validateRepositoryPath(value);
}

export function isGraphNodeKind(value: unknown): value is GraphNodeKind {
  return typeof value === 'string' && GRAPH_NODE_KINDS.includes(value as GraphNodeKind);
}

export function isPackageManager(value: unknown): value is PackageManager {
  return typeof value === 'string' && PACKAGE_MANAGERS.includes(value as PackageManager);
}

export function isSourceLanguage(value: unknown): value is SourceLanguage {
  return typeof value === 'string' && SOURCE_LANGUAGES.includes(value as SourceLanguage);
}

export function isGraphSymbolKind(value: unknown): value is GraphSymbolKind {
  return typeof value === 'string' && GRAPH_SYMBOL_KINDS.includes(value as GraphSymbolKind);
}

export function isGraphSymbolExportKind(value: unknown): value is GraphSymbolExportKind {
  return typeof value === 'string' && GRAPH_SYMBOL_EXPORT_KINDS.includes(value as GraphSymbolExportKind);
}

export function toSerializableGraphNode(node: CanonicalGraphNode): CanonicalGraphNode {
  assertCanonicalGraphNode(node);

  switch (node.kind) {
    case 'project':
      return toSerializableProjectGraphNode(node);
    case 'package':
      return toSerializablePackageGraphNode(node);
    case 'folder':
      return toSerializableFolderGraphNode(node);
    case 'file':
      return toSerializableFileGraphNode(node);
    case 'symbol':
      return toSerializableSymbolGraphNode(node);
  }
}

export function isCanonicalGraphNode(value: unknown): value is CanonicalGraphNode {
  try {
    assertCanonicalGraphNode(value);
    return true;
  } catch {
    return false;
  }
}

export function assertCanonicalGraphNode(value: unknown): asserts value is CanonicalGraphNode {
  if (!value || typeof value !== 'object') {
    throw new RangeError('Graph node must be an object.');
  }

  const candidate = value as Partial<CanonicalGraphNode>;

  assertGraphNodeBase(candidate);

  switch (candidate.kind) {
    case 'project':
      assertProjectGraphNode(candidate);
      return;
    case 'package':
      assertPackageGraphNode(candidate);
      return;
    case 'folder':
      assertFolderGraphNode(candidate);
      return;
    case 'file':
      assertFileGraphNode(candidate);
      return;
    case 'symbol':
      assertSymbolGraphNode(candidate);
      return;
    default:
      throw new RangeError('Unsupported graph node kind.');
  }
}

export function validateGraphNodeIdToken(token: string): boolean {
  try {
    assertValidGraphNodeIdToken(token);
    return true;
  } catch {
    return false;
  }
}

export function validateRepositoryPath(path: string): boolean {
  try {
    assertValidRepositoryPath(path);
    return true;
  } catch {
    return false;
  }
}

function toSerializableProjectGraphNode(node: ProjectGraphNode): ProjectGraphNode {
  return {
    ...toSerializableGraphNodeBase(node),
    kind: 'project',
    project: withOptionalRootPath({
      name: normalizeTextField(node.project.name, 'project.name')
    }, node.project.rootPath)
  };
}

function toSerializablePackageGraphNode(node: PackageGraphNode): PackageGraphNode {
  return {
    ...toSerializableGraphNodeBase(node),
    kind: 'package',
    package: withOptionalManifestPath({
      name: normalizeTextField(node.package.name, 'package.name'),
      manager: node.package.manager
    }, node.package.manifestPath)
  };
}

function toSerializableFolderGraphNode(node: FolderGraphNode): FolderGraphNode {
  return {
    ...toSerializableGraphNodeBase(node),
    kind: 'folder',
    folder: {
      path: parseRepositoryPath(node.folder.path)
    }
  };
}

function toSerializableFileGraphNode(node: FileGraphNode): FileGraphNode {
  const fileBase = {
    path: parseRepositoryPath(node.file.path),
    language: node.file.language
  };

  return {
    ...toSerializableGraphNodeBase(node),
    kind: 'file',
    file: withOptionalLineCount(
      withOptionalExtension(fileBase, node.file.extension),
      node.file.lineCount
    )
  };
}

function toSerializableSymbolGraphNode(node: SymbolGraphNode): SymbolGraphNode {
  const symbolBase = {
    name: normalizeTextField(node.symbol.name, 'symbol.name'),
    symbolKind: node.symbol.symbolKind,
    exportKind: node.symbol.exportKind,
    path: parseRepositoryPath(node.symbol.path)
  };

  return {
    ...toSerializableGraphNodeBase(node),
    kind: 'symbol',
    symbol: withOptionalRange(symbolBase, node.symbol.range)
  };
}

function toSerializableGraphNodeBase(node: GraphNodeBase): GraphNodeBase {
  const base = {
    schemaVersion: GRAPH_NODE_SCHEMA_VERSION,
    id: parseGraphNodeId(node.id),
    kind: node.kind,
    display: toSerializableDisplay(node.display),
    analysis: toSerializableAnalysis(node.analysis)
  };

  return withOptionalParentId(base, node.parentId);
}

function toSerializableDisplay(display: GraphNodeDisplay): GraphNodeDisplay {
  return withOptionalDescription(
    withOptionalSubtitle({
      label: normalizeTextField(display.label, 'display.label')
    }, display.subtitle),
    display.description
  );
}

function toSerializableAnalysis(analysis: GraphNodeAnalysisMetadata): GraphNodeAnalysisMetadata {
  return {
    tags: [...analysis.tags].map(normalizeTag).sort(),
    facets: [...analysis.facets].map(toSerializableFacet).sort(compareFacets)
  };
}

function toSerializableFacet(facet: GraphNodeFacet): GraphNodeFacet {
  const key = normalizeFacetKey(facet.key);
  const value = normalizeTextField(facet.value, `analysis.facets.${key}`);

  return { key, value };
}

function compareFacets(left: GraphNodeFacet, right: GraphNodeFacet): number {
  const keyComparison = left.key.localeCompare(right.key);
  return keyComparison === 0 ? left.value.localeCompare(right.value) : keyComparison;
}

function assertGraphNodeBase(candidate: Partial<CanonicalGraphNode>): void {
  if (candidate.schemaVersion !== GRAPH_NODE_SCHEMA_VERSION) {
    throw new RangeError('Unsupported graph node schema version.');
  }

  if (!isGraphNodeId(candidate.id)) {
    throw new RangeError('Graph node id is invalid.');
  }

  if (!isGraphNodeKind(candidate.kind)) {
    throw new RangeError('Graph node kind is invalid.');
  }

  if (candidate.kind === 'project' && candidate.parentId !== undefined) {
    throw new RangeError('Project graph nodes must not have a parent node.');
  }

  if (candidate.kind !== 'project' && !isGraphNodeId(candidate.parentId)) {
    throw new RangeError('Non-project graph nodes must have a valid parent node id.');
  }

  assertGraphNodeDisplay(candidate.display);
  assertGraphNodeAnalysis(candidate.analysis);
}

function assertGraphNodeDisplay(value: unknown): asserts value is GraphNodeDisplay {
  if (!value || typeof value !== 'object') {
    throw new RangeError('Graph node display must be an object.');
  }

  const display = value as Partial<GraphNodeDisplay>;

  normalizeTextField(display.label, 'display.label');

  if (display.subtitle !== undefined) {
    normalizeTextField(display.subtitle, 'display.subtitle');
  }

  if (display.description !== undefined) {
    normalizeDescription(display.description);
  }
}

function assertGraphNodeAnalysis(value: unknown): asserts value is GraphNodeAnalysisMetadata {
  if (!value || typeof value !== 'object') {
    throw new RangeError('Graph node analysis metadata must be an object.');
  }

  const analysis = value as Partial<GraphNodeAnalysisMetadata>;

  if (!Array.isArray(analysis.tags)) {
    throw new RangeError('Graph node analysis tags must be an array.');
  }

  for (const tag of analysis.tags) {
    if (typeof tag !== 'string') {
      throw new RangeError('Graph node analysis tags must be strings.');
    }
    normalizeTag(tag);
  }

  if (!Array.isArray(analysis.facets)) {
    throw new RangeError('Graph node analysis facets must be an array.');
  }

  for (const facet of analysis.facets) {
    assertGraphNodeFacet(facet);
  }
}

function assertGraphNodeFacet(value: unknown): asserts value is GraphNodeFacet {
  if (!value || typeof value !== 'object') {
    throw new RangeError('Graph node facet must be an object.');
  }

  const facet = value as Partial<GraphNodeFacet>;

  normalizeFacetKey(facet.key);
  normalizeTextField(facet.value, `analysis.facets.${String(facet.key)}`);
}

function assertProjectGraphNode(node: Partial<ProjectGraphNode>): void {
  if (!node.project || typeof node.project !== 'object') {
    throw new RangeError('Project graph node payload is required.');
  }

  normalizeTextField(node.project.name, 'project.name');

  if (node.project.rootPath !== undefined) {
    parseRepositoryPath(node.project.rootPath);
  }
}

function assertPackageGraphNode(node: Partial<PackageGraphNode>): void {
  if (!node.package || typeof node.package !== 'object') {
    throw new RangeError('Package graph node payload is required.');
  }

  normalizeTextField(node.package.name, 'package.name');

  if (!isPackageManager(node.package.manager)) {
    throw new RangeError('Package graph node manager is invalid.');
  }

  if (node.package.manifestPath !== undefined) {
    parseRepositoryPath(node.package.manifestPath);
  }
}

function assertFolderGraphNode(node: Partial<FolderGraphNode>): void {
  if (!node.folder || typeof node.folder !== 'object') {
    throw new RangeError('Folder graph node payload is required.');
  }

  parseRepositoryPath(node.folder.path);
}

function assertFileGraphNode(node: Partial<FileGraphNode>): void {
  if (!node.file || typeof node.file !== 'object') {
    throw new RangeError('File graph node payload is required.');
  }

  parseRepositoryPath(node.file.path);

  if (!isSourceLanguage(node.file.language)) {
    throw new RangeError('File graph node language is invalid.');
  }

  if (node.file.extension !== undefined && !GRAPH_EXTENSION_PATTERN.test(node.file.extension)) {
    throw new RangeError('File graph node extension must start with a dot and be URL-safe.');
  }

  if (node.file.lineCount !== undefined && !isPositiveInteger(node.file.lineCount)) {
    throw new RangeError('File graph node line count must be a positive integer.');
  }
}

function assertSymbolGraphNode(node: Partial<SymbolGraphNode>): void {
  if (!node.symbol || typeof node.symbol !== 'object') {
    throw new RangeError('Symbol graph node payload is required.');
  }

  normalizeTextField(node.symbol.name, 'symbol.name');
  parseRepositoryPath(node.symbol.path);

  if (!isGraphSymbolKind(node.symbol.symbolKind)) {
    throw new RangeError('Symbol graph node symbol kind is invalid.');
  }

  if (!isGraphSymbolExportKind(node.symbol.exportKind)) {
    throw new RangeError('Symbol graph node export kind is invalid.');
  }

  if (node.symbol.range !== undefined) {
    assertSourceRange(node.symbol.range);
  }
}

function assertSourceRange(value: unknown): asserts value is SourceRange {
  if (!value || typeof value !== 'object') {
    throw new RangeError('Source range must be an object.');
  }

  const range = value as Partial<SourceRange>;

  assertSourceRangePosition(range.start, 'range.start');
  assertSourceRangePosition(range.end, 'range.end');

  if (range.start.line > range.end.line) {
    throw new RangeError('Source range start line must be before end line.');
  }

  if (range.start.line === range.end.line && range.start.column > range.end.column) {
    throw new RangeError('Source range start column must be before end column.');
  }
}

function assertSourceRangePosition(value: unknown, fieldName: string): asserts value is SourceRangePosition {
  if (!value || typeof value !== 'object') {
    throw new RangeError(`${fieldName} must be an object.`);
  }

  const position = value as Partial<SourceRangePosition>;

  if (!isPositiveInteger(position.line)) {
    throw new RangeError(`${fieldName}.line must be a positive integer.`);
  }

  if (!isPositiveInteger(position.column)) {
    throw new RangeError(`${fieldName}.column must be a positive integer.`);
  }
}

function withOptionalParentId<T extends Omit<GraphNodeBase, 'parentId'>>(
  base: T,
  parentId: GraphNodeId | undefined
): T | T & { readonly parentId: GraphNodeId } {
  return parentId === undefined ? base : { ...base, parentId: parseGraphNodeId(parentId) };
}

function withOptionalSubtitle<T extends { readonly label: string }>(
  base: T,
  subtitle: string | undefined
): T | T & { readonly subtitle: string } {
  return subtitle === undefined ? base : { ...base, subtitle: normalizeTextField(subtitle, 'display.subtitle') };
}

function withOptionalDescription<T extends { readonly label: string }>(
  base: T,
  description: string | undefined
): T | T & { readonly description: string } {
  return description === undefined ? base : { ...base, description: normalizeDescription(description) };
}

function withOptionalRootPath<T extends { readonly name: string }>(
  base: T,
  rootPath: RepositoryPath | undefined
): T | T & { readonly rootPath: RepositoryPath } {
  return rootPath === undefined ? base : { ...base, rootPath: parseRepositoryPath(rootPath) };
}

function withOptionalManifestPath<T extends { readonly name: string; readonly manager: PackageManager }>(
  base: T,
  manifestPath: RepositoryPath | undefined
): T | T & { readonly manifestPath: RepositoryPath } {
  return manifestPath === undefined ? base : { ...base, manifestPath: parseRepositoryPath(manifestPath) };
}

function withOptionalExtension<T extends { readonly path: RepositoryPath; readonly language: SourceLanguage }>(
  base: T,
  extension: string | undefined
): T | T & { readonly extension: string } {
  return extension === undefined ? base : { ...base, extension };
}

function withOptionalLineCount<T extends { readonly path: RepositoryPath; readonly language: SourceLanguage }>(
  base: T,
  lineCount: number | undefined
): T | T & { readonly lineCount: number } {
  return lineCount === undefined ? base : { ...base, lineCount };
}

function withOptionalRange<T extends {
  readonly name: string;
  readonly symbolKind: GraphSymbolKind;
  readonly exportKind: GraphSymbolExportKind;
  readonly path: RepositoryPath;
}>(base: T, range: SourceRange | undefined): T | T & { readonly range: SourceRange } {
  return range === undefined ? base : { ...base, range: toSerializableSourceRange(range) };
}

function toSerializableSourceRange(range: SourceRange): SourceRange {
  assertSourceRange(range);

  return {
    start: {
      line: range.start.line,
      column: range.start.column
    },
    end: {
      line: range.end.line,
      column: range.end.column
    }
  };
}

function normalizeTextField(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new RangeError(`${fieldName} must be a string.`);
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new RangeError(`${fieldName} must not be empty.`);
  }

  if (normalized.length > GRAPH_TEXT_FIELD_MAX_LENGTH) {
    throw new RangeError(`${fieldName} is too long.`);
  }

  return normalized;
}

function normalizeDescription(value: unknown): string {
  if (typeof value !== 'string') {
    throw new RangeError('display.description must be a string.');
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new RangeError('display.description must not be empty.');
  }

  if (normalized.length > GRAPH_DESCRIPTION_MAX_LENGTH) {
    throw new RangeError('display.description is too long.');
  }

  return normalized;
}

function normalizeTag(value: string): string {
  const normalized = value.trim();

  if (!GRAPH_TAG_PATTERN.test(normalized)) {
    throw new RangeError('Graph node tags must be stable URL-safe tokens.');
  }

  return normalized;
}

function normalizeFacetKey(value: unknown): string {
  if (typeof value !== 'string') {
    throw new RangeError('Graph node facet key must be a string.');
  }

  const normalized = value.trim();

  if (!GRAPH_FACET_KEY_PATTERN.test(normalized)) {
    throw new RangeError('Graph node facet key must be stable and namespaced.');
  }

  return normalized;
}

function assertValidGraphNodeIdToken(token: string): void {
  if (token.length === 0) {
    throw new RangeError('Graph node id token must not be empty.');
  }

  if (token.trim() !== token) {
    throw new RangeError('Graph node id token must not have leading or trailing whitespace.');
  }

  if (!GRAPH_NODE_ID_TOKEN_PATTERN.test(token)) {
    throw new RangeError('Graph node id token must be URL-safe and start with an alphanumeric character.');
  }

  if (token.includes('\\')) {
    throw new RangeError('Graph node id token must use forward slashes only.');
  }

  if (token.includes('//')) {
    throw new RangeError('Graph node id token must not contain empty path segments.');
  }

  assertNoTraversalSegments(token, 'Graph node id token');
}

function assertValidRepositoryPath(path: string): void {
  if (path.length === 0) {
    throw new RangeError('Repository path must not be empty.');
  }

  if (path.trim() !== path) {
    throw new RangeError('Repository path must not have leading or trailing whitespace.');
  }

  if (path.startsWith('/') || path.startsWith('~')) {
    throw new RangeError('Repository path must be relative to the source root.');
  }

  if (path.includes('\\')) {
    throw new RangeError('Repository path must use forward slashes only.');
  }

  if (path.includes('//')) {
    throw new RangeError('Repository path must not contain empty segments.');
  }

  if (path.includes('\0')) {
    throw new RangeError('Repository path must not contain null bytes.');
  }

  assertNoTraversalSegments(path, 'Repository path');
}

function assertNoTraversalSegments(value: string, fieldName: string): void {
  const segments = value.split('/');

  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw new RangeError(`${fieldName} must not contain traversal segments.`);
  }
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && Number.isSafeInteger(value)
    && value > 0;
}

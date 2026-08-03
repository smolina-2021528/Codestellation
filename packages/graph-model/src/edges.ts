import {
  isGraphNodeId,
  parseGraphNodeId,
  parseRepositoryPath,
  type GraphNodeId,
  type RepositoryPath,
  type SourceRange,
  type SourceRangePosition
} from './nodes.js';
import {
  assertGraphConfidence,
  assertGraphProvenance,
  toSerializableGraphConfidence,
  toSerializableGraphProvenance,
  type GraphConfidence,
  type GraphProvenanceRecord
} from './provenance.js';

export declare const graphEdgeIdBrand: unique symbol;

export type GraphEdgeId = string & {
  readonly [graphEdgeIdBrand]: 'GraphEdgeId';
};

export const GRAPH_EDGE_SCHEMA_VERSION = 1 as const;

export const GRAPH_EDGE_ID_PREFIX = 'edge' as const;

export const GRAPH_EDGE_KINDS = [
  'contains',
  'imports',
  'exports',
  'declares',
  'calls',
  'references',
  'depends-on'
] as const;

export type GraphEdgeKind = typeof GRAPH_EDGE_KINDS[number];

export const GRAPH_EDGE_DIRECTIONS = [
  'directed',
  'undirected'
] as const;

export type GraphEdgeDirection = typeof GRAPH_EDGE_DIRECTIONS[number];

export type GraphEdgeAttributePrimitive = string | number | boolean | null;

export type GraphEdgeAttributeValue = GraphEdgeAttributePrimitive
  | readonly GraphEdgeAttributeValue[]
  | { readonly [key: string]: GraphEdgeAttributeValue };

export type GraphEdgeAttributes = {
  readonly [key: string]: GraphEdgeAttributeValue;
};

export interface GraphEdgeSourceLocation {
  readonly path: RepositoryPath;
  readonly range?: SourceRange;
}

export interface GraphEdgeBase {
  readonly schemaVersion: typeof GRAPH_EDGE_SCHEMA_VERSION;
  readonly id: GraphEdgeId;
  readonly kind: GraphEdgeKind;
  readonly fromNodeId: GraphNodeId;
  readonly toNodeId: GraphNodeId;
  readonly direction: GraphEdgeDirection;
  readonly attributes: GraphEdgeAttributes;
  readonly confidence: GraphConfidence;
  readonly provenance: readonly GraphProvenanceRecord[];
  readonly source?: GraphEdgeSourceLocation;
}

export interface ContainsGraphEdge extends GraphEdgeBase {
  readonly kind: 'contains';
  readonly direction: 'directed';
}

export interface ImportsGraphEdge extends GraphEdgeBase {
  readonly kind: 'imports';
  readonly direction: 'directed';
}

export interface ExportsGraphEdge extends GraphEdgeBase {
  readonly kind: 'exports';
  readonly direction: 'directed';
}

export interface DeclaresGraphEdge extends GraphEdgeBase {
  readonly kind: 'declares';
  readonly direction: 'directed';
}

export interface CallsGraphEdge extends GraphEdgeBase {
  readonly kind: 'calls';
  readonly direction: 'directed';
}

export interface ReferencesGraphEdge extends GraphEdgeBase {
  readonly kind: 'references';
  readonly direction: 'directed';
}

export interface DependsOnGraphEdge extends GraphEdgeBase {
  readonly kind: 'depends-on';
  readonly direction: 'directed';
}

export type CanonicalGraphEdge = ContainsGraphEdge
  | ImportsGraphEdge
  | ExportsGraphEdge
  | DeclaresGraphEdge
  | CallsGraphEdge
  | ReferencesGraphEdge
  | DependsOnGraphEdge;

const GRAPH_EDGE_ID_TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._~/-]{0,219}$/;
const GRAPH_EDGE_ATTRIBUTE_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9._:-]{0,79}$/;
const GRAPH_EDGE_ATTRIBUTE_STRING_MAX_LENGTH = 2000;
const GRAPH_EDGE_ATTRIBUTE_ARRAY_MAX_LENGTH = 200;
const GRAPH_EDGE_ATTRIBUTE_DEPTH_MAX = 8;

export function createGraphEdgeId(token: string): GraphEdgeId {
  assertValidGraphEdgeIdToken(token);
  return `${GRAPH_EDGE_ID_PREFIX}:${token}` as GraphEdgeId;
}

export function parseGraphEdgeId(value: string): GraphEdgeId {
  const expectedPrefix = `${GRAPH_EDGE_ID_PREFIX}:`;

  if (!value.startsWith(expectedPrefix)) {
    throw new RangeError('Expected graph edge identifier prefix.');
  }

  assertValidGraphEdgeIdToken(value.slice(expectedPrefix.length));
  return value as GraphEdgeId;
}

export function isGraphEdgeId(value: unknown): value is GraphEdgeId {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    parseGraphEdgeId(value);
    return true;
  } catch {
    return false;
  }
}

export function isGraphEdgeKind(value: unknown): value is GraphEdgeKind {
  return typeof value === 'string' && GRAPH_EDGE_KINDS.includes(value as GraphEdgeKind);
}

export function isGraphEdgeDirection(value: unknown): value is GraphEdgeDirection {
  return typeof value === 'string' && GRAPH_EDGE_DIRECTIONS.includes(value as GraphEdgeDirection);
}

export function validateGraphEdgeIdToken(token: string): boolean {
  try {
    assertValidGraphEdgeIdToken(token);
    return true;
  } catch {
    return false;
  }
}

export function toSerializableGraphEdge(edge: CanonicalGraphEdge): CanonicalGraphEdge {
  assertCanonicalGraphEdge(edge);

  const base = {
    schemaVersion: GRAPH_EDGE_SCHEMA_VERSION,
    id: parseGraphEdgeId(edge.id),
    kind: edge.kind,
    fromNodeId: parseGraphNodeId(edge.fromNodeId),
    toNodeId: parseGraphNodeId(edge.toNodeId),
    direction: edge.direction,
    attributes: toSerializableGraphEdgeAttributes(edge.attributes),
    confidence: toSerializableGraphConfidence(edge.confidence),
    provenance: toSerializableGraphProvenance(edge.provenance)
  };

  return withOptionalSource(base, edge.source) as CanonicalGraphEdge;
}

export function isCanonicalGraphEdge(value: unknown): value is CanonicalGraphEdge {
  try {
    assertCanonicalGraphEdge(value);
    return true;
  } catch {
    return false;
  }
}

export function assertCanonicalGraphEdge(value: unknown): asserts value is CanonicalGraphEdge {
  if (!value || typeof value !== 'object') {
    throw new RangeError('Graph edge must be an object.');
  }

  const candidate = value as Partial<CanonicalGraphEdge>;

  if (candidate.schemaVersion !== GRAPH_EDGE_SCHEMA_VERSION) {
    throw new RangeError('Unsupported graph edge schema version.');
  }

  if (!isGraphEdgeId(candidate.id)) {
    throw new RangeError('Graph edge id is invalid.');
  }

  if (!isGraphEdgeKind(candidate.kind)) {
    throw new RangeError('Graph edge kind is invalid.');
  }

  if (!isGraphNodeId(candidate.fromNodeId)) {
    throw new RangeError('Graph edge source node id is invalid.');
  }

  if (!isGraphNodeId(candidate.toNodeId)) {
    throw new RangeError('Graph edge target node id is invalid.');
  }

  if (candidate.fromNodeId === candidate.toNodeId) {
    throw new RangeError('Graph edge must connect two different nodes.');
  }

  if (!isGraphEdgeDirection(candidate.direction)) {
    throw new RangeError('Graph edge direction is invalid.');
  }

  assertDirectedInitialEdge(candidate.kind, candidate.direction);
  assertGraphEdgeAttributes(candidate.attributes);
  assertGraphConfidence(candidate.confidence);
  assertGraphProvenance(candidate.provenance);

  if (candidate.source !== undefined) {
    assertGraphEdgeSourceLocation(candidate.source);
  }
}

export function toSerializableGraphEdgeAttributes(attributes: GraphEdgeAttributes): GraphEdgeAttributes {
  assertGraphEdgeAttributes(attributes);
  return normalizeAttributeObject(attributes, 0);
}

function withOptionalSource<T extends Omit<GraphEdgeBase, 'source'>>(
  base: T,
  source: GraphEdgeSourceLocation | undefined
): T | T & { readonly source: GraphEdgeSourceLocation } {
  return source === undefined ? base : { ...base, source: toSerializableGraphEdgeSourceLocation(source) };
}

function toSerializableGraphEdgeSourceLocation(source: GraphEdgeSourceLocation): GraphEdgeSourceLocation {
  assertGraphEdgeSourceLocation(source);

  const base = {
    path: parseRepositoryPath(source.path)
  };

  return source.range === undefined
    ? base
    : { ...base, range: toSerializableSourceRange(source.range) };
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

function assertGraphEdgeSourceLocation(value: unknown): asserts value is GraphEdgeSourceLocation {
  if (!value || typeof value !== 'object') {
    throw new RangeError('Graph edge source location must be an object.');
  }

  const source = value as Partial<GraphEdgeSourceLocation>;

  parseRepositoryPath(source.path as string);

  if (source.range !== undefined) {
    assertSourceRange(source.range);
  }
}

function assertDirectedInitialEdge(kind: GraphEdgeKind, direction: GraphEdgeDirection): void {
  if (direction !== 'directed') {
    throw new RangeError(`Graph edge kind ${kind} must be directed in the initial schema.`);
  }
}

function assertGraphEdgeAttributes(value: unknown): asserts value is GraphEdgeAttributes {
  if (!isPlainRecord(value)) {
    throw new RangeError('Graph edge attributes must be a plain object.');
  }

  normalizeAttributeObject(value as GraphEdgeAttributes, 0);
}

function normalizeAttributeObject(value: GraphEdgeAttributes, depth: number): GraphEdgeAttributes {
  if (depth > GRAPH_EDGE_ATTRIBUTE_DEPTH_MAX) {
    throw new RangeError('Graph edge attribute nesting is too deep.');
  }

  const normalized: Record<string, GraphEdgeAttributeValue> = {};

  for (const key of Object.keys(value).sort()) {
    if (!GRAPH_EDGE_ATTRIBUTE_KEY_PATTERN.test(key)) {
      throw new RangeError('Graph edge attribute keys must be stable and namespaced.');
    }

    normalized[key] = normalizeAttributeValue(value[key], depth + 1);
  }

  return normalized;
}

function normalizeAttributeValue(value: unknown, depth: number): GraphEdgeAttributeValue {
  if (typeof value === 'string') {
    if (value.length > GRAPH_EDGE_ATTRIBUTE_STRING_MAX_LENGTH) {
      throw new RangeError('Graph edge string attribute is too long.');
    }

    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new RangeError('Graph edge numeric attributes must be finite.');
    }

    return value;
  }

  if (typeof value === 'boolean' || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length > GRAPH_EDGE_ATTRIBUTE_ARRAY_MAX_LENGTH) {
      throw new RangeError('Graph edge array attribute is too long.');
    }

    return value.map((item) => normalizeAttributeValue(item, depth + 1));
  }

  if (isPlainRecord(value)) {
    return normalizeAttributeObject(value as GraphEdgeAttributes, depth + 1);
  }

  throw new RangeError('Graph edge attributes must be JSON-serializable values.');
}

function assertSourceRange(value: unknown): asserts value is SourceRange {
  if (!value || typeof value !== 'object') {
    throw new RangeError('Graph edge source range must be an object.');
  }

  const range = value as Partial<SourceRange>;

  assertSourceRangePosition(range.start, 'source.range.start');
  assertSourceRangePosition(range.end, 'source.range.end');

  if (range.start.line > range.end.line) {
    throw new RangeError('Graph edge source range start line must be before end line.');
  }

  if (range.start.line === range.end.line && range.start.column > range.end.column) {
    throw new RangeError('Graph edge source range start column must be before end column.');
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

function assertValidGraphEdgeIdToken(token: string): void {
  if (token.length === 0) {
    throw new RangeError('Graph edge id token must not be empty.');
  }

  if (token.trim() !== token) {
    throw new RangeError('Graph edge id token must not have leading or trailing whitespace.');
  }

  if (!GRAPH_EDGE_ID_TOKEN_PATTERN.test(token)) {
    throw new RangeError('Graph edge id token must be URL-safe and start with an alphanumeric character.');
  }

  if (token.includes('\\')) {
    throw new RangeError('Graph edge id token must use forward slashes only.');
  }

  if (token.includes('//')) {
    throw new RangeError('Graph edge id token must not contain empty path segments.');
  }

  assertNoTraversalSegments(token, 'Graph edge id token');
}

function assertNoTraversalSegments(value: string, fieldName: string): void {
  const segments = value.split('/');

  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw new RangeError(`${fieldName} must not contain traversal segments.`);
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && Number.isSafeInteger(value)
    && value > 0;
}

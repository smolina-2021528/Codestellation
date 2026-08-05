import {
  assertCanonicalGraphEdge,
  isGraphEdgeId,
  toSerializableGraphEdge,
  type CanonicalGraphEdge,
  type GraphEdgeId
} from './edges.js';
import {
  assertCanonicalGraphNode,
  isGraphNodeId,
  parseGraphNodeId,
  toSerializableGraphNode,
  type CanonicalGraphNode,
  type GraphNodeId
} from './nodes.js';

export const CANONICAL_GRAPH_SCHEMA_VERSION = 1 as const;

export const GRAPH_VALIDATION_SEVERITIES = [
  'error',
  'warning'
] as const;

export type GraphValidationSeverity = typeof GRAPH_VALIDATION_SEVERITIES[number];

export const GRAPH_VALIDATION_ISSUE_CODES = [
  'GRAPH_INVALID_SHAPE',
  'GRAPH_UNSUPPORTED_SCHEMA_VERSION',
  'GRAPH_ROOT_NODE_INVALID',
  'GRAPH_ROOT_NODE_MISSING',
  'GRAPH_ROOT_NODE_NOT_PROJECT',
  'GRAPH_PROJECT_ROOT_COUNT_INVALID',
  'GRAPH_NODES_INVALID',
  'GRAPH_EDGES_INVALID',
  'GRAPH_NODE_INVALID',
  'GRAPH_EDGE_INVALID',
  'GRAPH_NODE_ID_DUPLICATE',
  'GRAPH_EDGE_ID_DUPLICATE',
  'GRAPH_PARENT_NODE_MISSING',
  'GRAPH_PARENT_NODE_SELF_REFERENCE',
  'GRAPH_EDGE_SOURCE_NODE_MISSING',
  'GRAPH_EDGE_TARGET_NODE_MISSING'
] as const;

export type GraphValidationIssueCode = typeof GRAPH_VALIDATION_ISSUE_CODES[number];

export interface CanonicalGraphSnapshot {
  readonly schemaVersion: typeof CANONICAL_GRAPH_SCHEMA_VERSION;
  readonly rootNodeId: GraphNodeId;
  readonly nodes: readonly CanonicalGraphNode[];
  readonly edges: readonly CanonicalGraphEdge[];
}

export interface GraphValidationIssue {
  readonly code: GraphValidationIssueCode;
  readonly severity: GraphValidationSeverity;
  readonly message: string;
  readonly path?: string;
  readonly nodeId?: GraphNodeId;
  readonly edgeId?: GraphEdgeId;
}

export interface GraphValidationResult {
  readonly valid: boolean;
  readonly issues: readonly GraphValidationIssue[];
}

interface GraphValidationContext {
  readonly issues: GraphValidationIssue[];
  readonly nodesById: Map<GraphNodeId, CanonicalGraphNode>;
  readonly edgesById: Map<GraphEdgeId, CanonicalGraphEdge>;
  readonly validNodes: CanonicalGraphNode[];
  readonly validEdges: CanonicalGraphEdge[];
}

export function isCanonicalGraphSnapshot(value: unknown): value is CanonicalGraphSnapshot {
  return validateCanonicalGraphSnapshot(value).valid;
}

export function assertCanonicalGraphSnapshot(value: unknown): asserts value is CanonicalGraphSnapshot {
  const result = validateCanonicalGraphSnapshot(value);

  if (!result.valid) {
    throw new RangeError(formatGraphValidationError(result.issues));
  }
}

export function validateCanonicalGraphSnapshot(value: unknown): GraphValidationResult {
  const context: GraphValidationContext = {
    issues: [],
    nodesById: new Map(),
    edgesById: new Map(),
    validNodes: [],
    validEdges: []
  };

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    context.issues.push(createIssue(
      'GRAPH_INVALID_SHAPE',
      'Graph snapshot must be a plain object.'
    ));
    return toValidationResult(context.issues);
  }

  const snapshot = value as Partial<CanonicalGraphSnapshot>;

  if (snapshot.schemaVersion !== CANONICAL_GRAPH_SCHEMA_VERSION) {
    context.issues.push(createIssue(
      'GRAPH_UNSUPPORTED_SCHEMA_VERSION',
      'Graph snapshot schema version is unsupported.',
      'schemaVersion'
    ));
  }

  validateRootNodeId(snapshot.rootNodeId, context);
  validateNodeCollection(snapshot.nodes, context);
  validateEdgeCollection(snapshot.edges, context);
  validateRootNode(snapshot.rootNodeId, context);
  validateProjectRootCount(context);
  validateParentReferences(context);
  validateEdgeEndpoints(context);

  return toValidationResult(context.issues);
}

export function toSerializableCanonicalGraphSnapshot(
  snapshot: CanonicalGraphSnapshot
): CanonicalGraphSnapshot {
  assertCanonicalGraphSnapshot(snapshot);

  return {
    schemaVersion: CANONICAL_GRAPH_SCHEMA_VERSION,
    rootNodeId: parseGraphNodeId(snapshot.rootNodeId),
    nodes: [...snapshot.nodes]
      .map(toSerializableGraphNode)
      .sort(compareGraphNodes),
    edges: [...snapshot.edges]
      .map(toSerializableGraphEdge)
      .sort(compareGraphEdges)
  };
}

export function isGraphValidationIssueCode(value: unknown): value is GraphValidationIssueCode {
  return typeof value === 'string'
    && GRAPH_VALIDATION_ISSUE_CODES.includes(value as GraphValidationIssueCode);
}

export function isGraphValidationSeverity(value: unknown): value is GraphValidationSeverity {
  return typeof value === 'string'
    && GRAPH_VALIDATION_SEVERITIES.includes(value as GraphValidationSeverity);
}

function validateRootNodeId(
  rootNodeId: CanonicalGraphSnapshot['rootNodeId'] | undefined,
  context: GraphValidationContext
): void {
  if (!isGraphNodeId(rootNodeId)) {
    context.issues.push(createIssue(
      'GRAPH_ROOT_NODE_INVALID',
      'Graph snapshot rootNodeId must be a valid graph node id.',
      'rootNodeId'
    ));
  }
}

function validateNodeCollection(
  nodes: CanonicalGraphSnapshot['nodes'] | undefined,
  context: GraphValidationContext
): void {
  if (!Array.isArray(nodes)) {
    context.issues.push(createIssue(
      'GRAPH_NODES_INVALID',
      'Graph snapshot nodes must be an array.',
      'nodes'
    ));
    return;
  }

  if (nodes.length === 0) {
    context.issues.push(createIssue(
      'GRAPH_NODES_INVALID',
      'Graph snapshot must include at least one node.',
      'nodes'
    ));
    return;
  }

  nodes.forEach((node, index) => {
    try {
      assertCanonicalGraphNode(node);
    } catch (error) {
      context.issues.push(createIssue(
        'GRAPH_NODE_INVALID',
        `Graph node at index ${index} is invalid: ${formatUnknownError(error)}`,
        `nodes[${index}]`,
        getNodeId(node)
      ));
      return;
    }

    const canonicalNode = node;
    const existingNode = context.nodesById.get(canonicalNode.id);

    if (existingNode !== undefined) {
      context.issues.push(createIssue(
        'GRAPH_NODE_ID_DUPLICATE',
        `Graph node id ${canonicalNode.id} is duplicated.`,
        `nodes[${index}].id`,
        canonicalNode.id
      ));
      return;
    }

    context.nodesById.set(canonicalNode.id, canonicalNode);
    context.validNodes.push(canonicalNode);
  });
}

function validateEdgeCollection(
  edges: CanonicalGraphSnapshot['edges'] | undefined,
  context: GraphValidationContext
): void {
  if (!Array.isArray(edges)) {
    context.issues.push(createIssue(
      'GRAPH_EDGES_INVALID',
      'Graph snapshot edges must be an array.',
      'edges'
    ));
    return;
  }

  edges.forEach((edge, index) => {
    try {
      assertCanonicalGraphEdge(edge);
    } catch (error) {
      context.issues.push(createIssue(
        'GRAPH_EDGE_INVALID',
        `Graph edge at index ${index} is invalid: ${formatUnknownError(error)}`,
        `edges[${index}]`,
        undefined,
        getEdgeId(edge)
      ));
      return;
    }

    const canonicalEdge = edge;
    const existingEdge = context.edgesById.get(canonicalEdge.id);

    if (existingEdge !== undefined) {
      context.issues.push(createIssue(
        'GRAPH_EDGE_ID_DUPLICATE',
        `Graph edge id ${canonicalEdge.id} is duplicated.`,
        `edges[${index}].id`,
        undefined,
        canonicalEdge.id
      ));
      return;
    }

    context.edgesById.set(canonicalEdge.id, canonicalEdge);
    context.validEdges.push(canonicalEdge);
  });
}

function validateRootNode(
  rootNodeId: CanonicalGraphSnapshot['rootNodeId'] | undefined,
  context: GraphValidationContext
): void {
  if (!isGraphNodeId(rootNodeId)) {
    return;
  }

  const rootNode = context.nodesById.get(rootNodeId);

  if (rootNode === undefined) {
    context.issues.push(createIssue(
      'GRAPH_ROOT_NODE_MISSING',
      `Graph root node ${rootNodeId} does not exist in nodes.`,
      'rootNodeId',
      rootNodeId
    ));
    return;
  }

  if (rootNode.kind !== 'project') {
    context.issues.push(createIssue(
      'GRAPH_ROOT_NODE_NOT_PROJECT',
      'Graph root node must be a project node.',
      'rootNodeId',
      rootNodeId
    ));
  }
}

function validateProjectRootCount(context: GraphValidationContext): void {
  const projectNodes = context.validNodes.filter((node) => node.kind === 'project');

  if (projectNodes.length !== 1) {
    context.issues.push(createIssue(
      'GRAPH_PROJECT_ROOT_COUNT_INVALID',
      `Graph snapshot must include exactly one project root node; found ${projectNodes.length}.`,
      'nodes'
    ));
  }
}

function validateParentReferences(context: GraphValidationContext): void {
  for (const node of context.validNodes) {
    if (node.kind === 'project') {
      continue;
    }

    const parentId = node.parentId;

    if (parentId === undefined) {
      context.issues.push(createIssue(
        'GRAPH_PARENT_NODE_MISSING',
        `Graph node ${node.id} does not declare a parent node.`,
        'nodes[].parentId',
        node.id
      ));
      continue;
    }

    if (parentId === node.id) {
      context.issues.push(createIssue(
        'GRAPH_PARENT_NODE_SELF_REFERENCE',
        `Graph node ${node.id} cannot be its own parent.`,
        'nodes[].parentId',
        node.id
      ));
      continue;
    }

    if (!context.nodesById.has(parentId)) {
      context.issues.push(createIssue(
        'GRAPH_PARENT_NODE_MISSING',
        `Graph node ${node.id} references missing parent ${parentId}.`,
        'nodes[].parentId',
        node.id
      ));
    }
  }
}

function validateEdgeEndpoints(context: GraphValidationContext): void {
  for (const edge of context.validEdges) {
    if (!context.nodesById.has(edge.fromNodeId)) {
      context.issues.push(createIssue(
        'GRAPH_EDGE_SOURCE_NODE_MISSING',
        `Graph edge ${edge.id} references missing source node ${edge.fromNodeId}.`,
        'edges[].fromNodeId',
        undefined,
        edge.id
      ));
    }

    if (!context.nodesById.has(edge.toNodeId)) {
      context.issues.push(createIssue(
        'GRAPH_EDGE_TARGET_NODE_MISSING',
        `Graph edge ${edge.id} references missing target node ${edge.toNodeId}.`,
        'edges[].toNodeId',
        undefined,
        edge.id
      ));
    }
  }
}

function createIssue(
  code: GraphValidationIssueCode,
  message: string,
  path?: string,
  nodeId?: GraphNodeId,
  edgeId?: GraphEdgeId
): GraphValidationIssue {
  const base = {
    code,
    severity: 'error' as const,
    message
  };

  return {
    ...base,
    ...(path === undefined ? {} : { path }),
    ...(nodeId === undefined ? {} : { nodeId }),
    ...(edgeId === undefined ? {} : { edgeId })
  };
}

function toValidationResult(issues: readonly GraphValidationIssue[]): GraphValidationResult {
  return {
    valid: issues.length === 0,
    issues: [...issues]
  };
}

function compareGraphNodes(left: CanonicalGraphNode, right: CanonicalGraphNode): number {
  return left.id.localeCompare(right.id);
}

function compareGraphEdges(left: CanonicalGraphEdge, right: CanonicalGraphEdge): number {
  return left.id.localeCompare(right.id);
}

function formatGraphValidationError(issues: readonly GraphValidationIssue[]): string {
  const firstIssues = issues.slice(0, 5).map((issue) => `${issue.code}: ${issue.message}`);
  const suffix = issues.length > firstIssues.length
    ? `; and ${issues.length - firstIssues.length} more issue(s)`
    : '';

  return `Canonical graph snapshot is invalid: ${firstIssues.join('; ')}${suffix}`;
}

function formatUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown validation error.';
}

function getNodeId(value: unknown): GraphNodeId | undefined {
  if (!value || typeof value !== 'object' || !('id' in value)) {
    return undefined;
  }

  const id = (value as { readonly id?: unknown }).id;
  return isGraphNodeId(id) ? id : undefined;
}

function getEdgeId(value: unknown): GraphEdgeId | undefined {
  if (!value || typeof value !== 'object' || !('id' in value)) {
    return undefined;
  }

  const id = (value as { readonly id?: unknown }).id;
  return isGraphEdgeId(id) ? id : undefined;
}

import {
  CANONICAL_GRAPH_SCHEMA_VERSION,
  GRAPH_EDGE_SCHEMA_VERSION,
  GRAPH_NODE_SCHEMA_VERSION,
  GRAPH_PROVENANCE_SCHEMA_VERSION,
  createGraphEdgeId,
  createGraphNodeId,
  parseRepositoryPath,
  toSerializableCanonicalGraphSnapshot,
  toSerializableGraphEdge,
  toSerializableGraphNode,
  type CanonicalGraphEdge,
  type CanonicalGraphSnapshot,
  type ContainsGraphEdge,
  type DependsOnGraphEdge,
  type FileGraphNode,
  type FolderGraphNode,
  type GraphConfidence,
  type GraphEdgeAttributes,
  type GraphNodeAnalysisMetadata,
  type GraphNodeDisplay,
  type GraphNodeFacet,
  type GraphNodeId,
  type GraphProvenanceRecord,
  type PackageGraphNode,
  type PackageManager,
  type ProjectGraphNode
} from '@codestellation/graph-model';
import {
  toSerializableGraphBuilderProjectFileGraphResult,
  type GraphBuilderDiagnostic,
  type GraphBuilderProjectFileGraphResult,
  type GraphBuilderStatus
} from './project-file-nodes.js';
import type {
  RepositoryScanInventoryPath,
  RepositoryScanSourceInventoryEntry,
  RepositoryStructurePackageRootSummary
} from '@codestellation/repository-scanner';

export const GRAPH_BUILDER_PACKAGE_DEPENDENCY_GRAPH_RESULT_SCHEMA_VERSION = 1 as const;
export const GRAPH_BUILDER_PACKAGE_DEPENDENCY_RULESET_VERSION = 1 as const;
const GRAPH_BUILDER_PACKAGE_DEPENDENCY_PRODUCER_NAME = 'graph-builder' as const;
const GRAPH_BUILDER_PACKAGE_DEPENDENCY_PRODUCER_VERSION = '0.1.0' as const;

export interface GraphBuilderPackageDependencyGraphSummary {
  readonly projectNodeCount: number;
  readonly folderNodeCount: number;
  readonly fileNodeCount: number;
  readonly packageNodeCount: number;
  readonly totalNodeCount: number;
  readonly containsEdgeCount: number;
  readonly packageManifestEdgeCount: number;
  readonly dependencyEdgeCount: number;
  readonly totalEdgeCount: number;
  readonly warningCount: number;
  readonly errorCount: number;
}

export interface GraphBuilderPackageDependencyGraphResult {
  readonly schemaVersion: typeof GRAPH_BUILDER_PACKAGE_DEPENDENCY_GRAPH_RESULT_SCHEMA_VERSION;
  readonly status: GraphBuilderStatus;
  readonly sourceGraph: GraphBuilderProjectFileGraphResult;
  readonly snapshot: CanonicalGraphSnapshot;
  readonly projectNode: ProjectGraphNode;
  readonly folderNodes: readonly FolderGraphNode[];
  readonly fileNodes: readonly FileGraphNode[];
  readonly packageNodes: readonly PackageGraphNode[];
  readonly containsEdges: readonly ContainsGraphEdge[];
  readonly dependencyEdges: readonly DependsOnGraphEdge[];
  readonly warnings: readonly GraphBuilderDiagnostic[];
  readonly errors: readonly GraphBuilderDiagnostic[];
  readonly summary: GraphBuilderPackageDependencyGraphSummary;
}

interface PackageNodeContext {
  readonly packageRoot: RepositoryStructurePackageRootSummary;
  readonly node: PackageGraphNode;
}

const GRAPH_ID_HASH_LENGTH = 16;
const GRAPH_ID_MAX_TOKEN_LENGTH = 220;
const GRAPH_ID_SAFE_CHARACTER_PATTERN = /^[A-Za-z0-9._-]$/;
const TEXT_FIELD_MAX_LENGTH = 240;
const DESCRIPTION_MAX_LENGTH = 1200;

export function buildPackageDependencyGraphFromProjectFileGraph(
  projectFileGraph: GraphBuilderProjectFileGraphResult
): GraphBuilderPackageDependencyGraphResult {
  const sourceGraph = toSerializableGraphBuilderProjectFileGraphResult(projectFileGraph);
  const observedAt = sourceGraph.sourceStructure.packageManifestDetection.sourceScan.metadata.completedAt;
  const inventoryFiles = sourceGraph.sourceStructure.packageManifestDetection.sourceScan.inventory.files;
  const folderNodesByPath = new Map(sourceGraph.folderNodes.map((node) => [node.folder.path, node]));
  const fileNodesByPath = new Map(sourceGraph.fileNodes.map((node) => [node.file.path, node]));
  const packageContexts = createPackageNodeContexts(
    sourceGraph.sourceStructure.packageRoots,
    inventoryFiles,
    sourceGraph.projectNode,
    folderNodesByPath,
    observedAt
  );
  const packageNodes = packageContexts.map((context) => context.node);
  const containsEdges = createContainsEdges(
    sourceGraph,
    packageContexts,
    fileNodesByPath,
    observedAt
  );
  const dependencyEdges: readonly DependsOnGraphEdge[] = [];
  const warnings = sourceGraph.warnings;
  const errors = sourceGraph.errors;
  const snapshot = toSerializableCanonicalGraphSnapshot({
    schemaVersion: CANONICAL_GRAPH_SCHEMA_VERSION,
    rootNodeId: sourceGraph.projectNode.id,
    nodes: [
      sourceGraph.projectNode,
      ...sourceGraph.folderNodes,
      ...packageNodes,
      ...sourceGraph.fileNodes
    ],
    edges: [
      ...containsEdges,
      ...dependencyEdges
    ]
  });
  const summary = createPackageDependencyGraphSummary(
    sourceGraph.projectNode,
    sourceGraph.folderNodes,
    sourceGraph.fileNodes,
    packageNodes,
    containsEdges,
    dependencyEdges,
    warnings.length,
    errors.length
  );

  return toSerializableGraphBuilderPackageDependencyGraphResult({
    schemaVersion: GRAPH_BUILDER_PACKAGE_DEPENDENCY_GRAPH_RESULT_SCHEMA_VERSION,
    status: sourceGraph.status,
    sourceGraph,
    snapshot,
    projectNode: sourceGraph.projectNode,
    folderNodes: sourceGraph.folderNodes,
    fileNodes: sourceGraph.fileNodes,
    packageNodes,
    containsEdges,
    dependencyEdges,
    warnings,
    errors,
    summary
  });
}

export const buildPackageDependencyGraph = buildPackageDependencyGraphFromProjectFileGraph;

export function isGraphBuilderPackageDependencyGraphResult(
  value: unknown
): value is GraphBuilderPackageDependencyGraphResult {
  try {
    toSerializableGraphBuilderPackageDependencyGraphResult(value as GraphBuilderPackageDependencyGraphResult);
    return true;
  } catch {
    return false;
  }
}

export function assertGraphBuilderPackageDependencyGraphResult(
  value: unknown
): asserts value is GraphBuilderPackageDependencyGraphResult {
  toSerializableGraphBuilderPackageDependencyGraphResult(value as GraphBuilderPackageDependencyGraphResult);
}

export function toSerializableGraphBuilderPackageDependencyGraphResult(
  result: GraphBuilderPackageDependencyGraphResult
): GraphBuilderPackageDependencyGraphResult {
  assertPlainObject(result, 'Graph builder package dependency graph result');

  if (result.schemaVersion !== GRAPH_BUILDER_PACKAGE_DEPENDENCY_GRAPH_RESULT_SCHEMA_VERSION) {
    throw new RangeError('Graph builder package dependency graph result schema version is unsupported.');
  }

  const sourceGraph = toSerializableGraphBuilderProjectFileGraphResult(result.sourceGraph);
  const projectNode = toSerializableGraphNode(result.projectNode) as ProjectGraphNode;
  const folderNodes = normalizeFolderNodes(result.folderNodes);
  const fileNodes = normalizeFileNodes(result.fileNodes);
  const packageNodes = normalizePackageNodes(result.packageNodes);
  const containsEdges = normalizeContainsEdges(result.containsEdges);
  const dependencyEdges = normalizeDependencyEdges(result.dependencyEdges);
  const snapshot = toSerializableCanonicalGraphSnapshot(result.snapshot);
  const warnings = sourceGraph.warnings;
  const errors = sourceGraph.errors;
  const summary = normalizePackageDependencyGraphSummary(
    result.summary,
    projectNode,
    folderNodes,
    fileNodes,
    packageNodes,
    containsEdges,
    dependencyEdges,
    warnings.length,
    errors.length
  );

  if (result.status !== sourceGraph.status) {
    throw new RangeError('Graph builder package dependency graph status must match source graph status.');
  }

  assertSourceGraphNodesMatch(sourceGraph, projectNode, folderNodes, fileNodes);
  assertPackageDependencySnapshotShape(
    snapshot,
    projectNode,
    folderNodes,
    fileNodes,
    packageNodes,
    containsEdges,
    dependencyEdges
  );

  return {
    schemaVersion: GRAPH_BUILDER_PACKAGE_DEPENDENCY_GRAPH_RESULT_SCHEMA_VERSION,
    status: result.status,
    sourceGraph,
    snapshot,
    projectNode,
    folderNodes,
    fileNodes,
    packageNodes,
    containsEdges,
    dependencyEdges,
    warnings,
    errors,
    summary
  };
}

function createPackageNodeContexts(
  packageRoots: readonly RepositoryStructurePackageRootSummary[],
  inventoryFiles: readonly RepositoryScanSourceInventoryEntry[],
  projectNode: ProjectGraphNode,
  folderNodesByPath: ReadonlyMap<string, FolderGraphNode>,
  observedAt: string
): readonly PackageNodeContext[] {
  return [...packageRoots]
    .sort((left, right) => compareStableText(left.manifestPath, right.manifestPath))
    .map((packageRoot) => ({
      packageRoot,
      node: createPackageNode(packageRoot, inventoryFiles, projectNode, folderNodesByPath, observedAt)
    }));
}

function createPackageNode(
  packageRoot: RepositoryStructurePackageRootSummary,
  inventoryFiles: readonly RepositoryScanSourceInventoryEntry[],
  projectNode: ProjectGraphNode,
  folderNodesByPath: ReadonlyMap<string, FolderGraphNode>,
  observedAt: string
): PackageGraphNode {
  const packageRootPath = packageRoot.packageRootPath;
  const parentId = packageRootPath === undefined
    ? projectNode.id
    : folderNodesByPath.get(packageRootPath)?.id ?? projectNode.id;
  const manager = inferPackageManager(packageRoot, inventoryFiles);
  const name = derivePackageName(packageRoot, projectNode);
  const packagePathFacet = packageRootPath === undefined
    ? []
    : [facet('package.rootPath', packageRootPath)];

  return toSerializableGraphNode({
    schemaVersion: GRAPH_NODE_SCHEMA_VERSION,
    id: createPackageNodeId(packageRoot),
    kind: 'package',
    parentId,
    display: createDisplay(name, `${packageRoot.ecosystem} package`, packageRoot.manifestPath),
    analysis: createAnalysis([
      'package',
      `ecosystem-${packageRoot.ecosystem}`,
      `package-${packageRoot.kind}`,
      `manager-${manager}`
    ], [
      facet('package.kind', packageRoot.kind),
      facet('package.ecosystem', packageRoot.ecosystem),
      facet('package.manager', manager),
      facet('package.manifestPath', packageRoot.manifestPath),
      facet('package.fileCount', packageRoot.fileCount.toString()),
      facet('package.candidateFileCount', packageRoot.candidateFileCount.toString()),
      facet('package.ignoredFileCount', packageRoot.ignoredFileCount.toString()),
      ...packagePathFacet
    ]),
    confidence: confirmedConfidence('Package node is derived from a package manifest detected by repository-scanner.'),
    provenance: [createPackageProvenance(packageRoot.manifestPath, observedAt)],
    package: {
      name,
      manager,
      manifestPath: parseRepositoryPath(packageRoot.manifestPath)
    }
  }) as PackageGraphNode;
}

function createContainsEdges(
  sourceGraph: GraphBuilderProjectFileGraphResult,
  packageContexts: readonly PackageNodeContext[],
  fileNodesByPath: ReadonlyMap<string, FileGraphNode>,
  observedAt: string
): readonly ContainsGraphEdge[] {
  const hierarchyEdges = [
    ...sourceGraph.folderNodes,
    ...sourceGraph.fileNodes,
    ...packageContexts.map((context) => context.node)
  ].map((node) => createHierarchyContainsEdge(node.parentId ?? sourceGraph.projectNode.id, node.id, observedAt));
  const manifestEdges = packageContexts.flatMap((context) => {
    const manifestNode = fileNodesByPath.get(context.packageRoot.manifestPath);

    return manifestNode === undefined
      ? []
      : [createPackageManifestContainsEdge(context.node, manifestNode, context.packageRoot.manifestPath, observedAt)];
  });

  return [...hierarchyEdges, ...manifestEdges].sort(compareEdges);
}

function createHierarchyContainsEdge(
  fromNodeId: GraphNodeId,
  toNodeId: GraphNodeId,
  observedAt: string
): ContainsGraphEdge {
  return toSerializableGraphEdge({
    schemaVersion: GRAPH_EDGE_SCHEMA_VERSION,
    id: createGraphEdgeId(toGraphEdgeIdToken('contains', fromNodeId, toNodeId, 'hierarchy')),
    kind: 'contains',
    fromNodeId,
    toNodeId,
    direction: 'directed',
    attributes: createEdgeAttributes({
      'relationship.kind': 'hierarchy',
      'relationship.source': 'parentId'
    }),
    confidence: confirmedConfidence('Contains edge is derived from an existing graph node parentId.'),
    provenance: [createSourceScanProvenance('parentId', 'Graph node parentId', observedAt)]
  }) as ContainsGraphEdge;
}

function createPackageManifestContainsEdge(
  packageNode: PackageGraphNode,
  manifestNode: FileGraphNode,
  manifestPath: RepositoryScanInventoryPath,
  observedAt: string
): ContainsGraphEdge {
  return toSerializableGraphEdge({
    schemaVersion: GRAPH_EDGE_SCHEMA_VERSION,
    id: createGraphEdgeId(toGraphEdgeIdToken('contains', packageNode.id, manifestNode.id, 'package-manifest')),
    kind: 'contains',
    fromNodeId: packageNode.id,
    toNodeId: manifestNode.id,
    direction: 'directed',
    attributes: createEdgeAttributes({
      'relationship.kind': 'package-manifest',
      'package.manifestPath': manifestPath
    }),
    confidence: confirmedConfidence('Package-to-manifest edge is derived from detected package manifest metadata.'),
    provenance: [createPackageProvenance(manifestPath, observedAt)],
    source: {
      path: parseRepositoryPath(manifestPath)
    }
  }) as ContainsGraphEdge;
}

function createPackageDependencyGraphSummary(
  projectNode: ProjectGraphNode,
  folderNodes: readonly FolderGraphNode[],
  fileNodes: readonly FileGraphNode[],
  packageNodes: readonly PackageGraphNode[],
  containsEdges: readonly ContainsGraphEdge[],
  dependencyEdges: readonly DependsOnGraphEdge[],
  warningCount: number,
  errorCount: number
): GraphBuilderPackageDependencyGraphSummary {
  const packageManifestEdgeCount = containsEdges.filter((edge) => edge.attributes['relationship.kind'] === 'package-manifest').length;
  const projectNodeCount = projectNode.kind === 'project' ? 1 : 0;

  return {
    projectNodeCount,
    folderNodeCount: folderNodes.length,
    fileNodeCount: fileNodes.length,
    packageNodeCount: packageNodes.length,
    totalNodeCount: projectNodeCount + folderNodes.length + fileNodes.length + packageNodes.length,
    containsEdgeCount: containsEdges.length,
    packageManifestEdgeCount,
    dependencyEdgeCount: dependencyEdges.length,
    totalEdgeCount: containsEdges.length + dependencyEdges.length,
    warningCount,
    errorCount
  };
}

function normalizePackageDependencyGraphSummary(
  summary: GraphBuilderPackageDependencyGraphSummary,
  projectNode: ProjectGraphNode,
  folderNodes: readonly FolderGraphNode[],
  fileNodes: readonly FileGraphNode[],
  packageNodes: readonly PackageGraphNode[],
  containsEdges: readonly ContainsGraphEdge[],
  dependencyEdges: readonly DependsOnGraphEdge[],
  warningCount: number,
  errorCount: number
): GraphBuilderPackageDependencyGraphSummary {
  assertPlainObject(summary, 'Graph builder package dependency graph summary');

  const normalized = {
    projectNodeCount: normalizeNonNegativeInteger(summary.projectNodeCount, 'summary.projectNodeCount'),
    folderNodeCount: normalizeNonNegativeInteger(summary.folderNodeCount, 'summary.folderNodeCount'),
    fileNodeCount: normalizeNonNegativeInteger(summary.fileNodeCount, 'summary.fileNodeCount'),
    packageNodeCount: normalizeNonNegativeInteger(summary.packageNodeCount, 'summary.packageNodeCount'),
    totalNodeCount: normalizeNonNegativeInteger(summary.totalNodeCount, 'summary.totalNodeCount'),
    containsEdgeCount: normalizeNonNegativeInteger(summary.containsEdgeCount, 'summary.containsEdgeCount'),
    packageManifestEdgeCount: normalizeNonNegativeInteger(summary.packageManifestEdgeCount, 'summary.packageManifestEdgeCount'),
    dependencyEdgeCount: normalizeNonNegativeInteger(summary.dependencyEdgeCount, 'summary.dependencyEdgeCount'),
    totalEdgeCount: normalizeNonNegativeInteger(summary.totalEdgeCount, 'summary.totalEdgeCount'),
    warningCount: normalizeNonNegativeInteger(summary.warningCount, 'summary.warningCount'),
    errorCount: normalizeNonNegativeInteger(summary.errorCount, 'summary.errorCount')
  };
  const expected = createPackageDependencyGraphSummary(
    projectNode,
    folderNodes,
    fileNodes,
    packageNodes,
    containsEdges,
    dependencyEdges,
    warningCount,
    errorCount
  );

  if (JSON.stringify(normalized) !== JSON.stringify(expected)) {
    throw new RangeError('Graph builder package dependency graph summary is inconsistent.');
  }

  return normalized;
}

function assertSourceGraphNodesMatch(
  sourceGraph: GraphBuilderProjectFileGraphResult,
  projectNode: ProjectGraphNode,
  folderNodes: readonly FolderGraphNode[],
  fileNodes: readonly FileGraphNode[]
): void {
  if (sourceGraph.projectNode.id !== projectNode.id) {
    throw new RangeError('Graph builder package dependency graph project node must match source graph.');
  }

  if (sourceGraph.folderNodes.length !== folderNodes.length || sourceGraph.fileNodes.length !== fileNodes.length) {
    throw new RangeError('Graph builder package dependency graph source node counts are inconsistent.');
  }

  const sourceFolderIds = sourceGraph.folderNodes.map((node) => node.id).join('\u0000');
  const folderIds = folderNodes.map((node) => node.id).join('\u0000');
  const sourceFileIds = sourceGraph.fileNodes.map((node) => node.id).join('\u0000');
  const fileIds = fileNodes.map((node) => node.id).join('\u0000');

  if (sourceFolderIds !== folderIds || sourceFileIds !== fileIds) {
    throw new RangeError('Graph builder package dependency graph source nodes are inconsistent.');
  }
}

function assertPackageDependencySnapshotShape(
  snapshot: CanonicalGraphSnapshot,
  projectNode: ProjectGraphNode,
  folderNodes: readonly FolderGraphNode[],
  fileNodes: readonly FileGraphNode[],
  packageNodes: readonly PackageGraphNode[],
  containsEdges: readonly ContainsGraphEdge[],
  dependencyEdges: readonly DependsOnGraphEdge[]
): void {
  const expectedNodeIds = new Set([
    projectNode.id,
    ...folderNodes.map((node) => node.id),
    ...fileNodes.map((node) => node.id),
    ...packageNodes.map((node) => node.id)
  ]);
  const expectedEdgeIds = new Set([
    ...containsEdges.map((edge) => edge.id),
    ...dependencyEdges.map((edge) => edge.id)
  ]);

  if (snapshot.rootNodeId !== projectNode.id) {
    throw new RangeError('Graph builder package dependency graph snapshot root must be the project node.');
  }

  if (snapshot.nodes.length !== expectedNodeIds.size || snapshot.edges.length !== expectedEdgeIds.size) {
    throw new RangeError('Graph builder package dependency graph snapshot shape is inconsistent.');
  }

  for (const node of snapshot.nodes) {
    if (!expectedNodeIds.has(node.id)) {
      throw new RangeError(`Graph builder package dependency graph snapshot includes unexpected node ${node.id}.`);
    }
  }

  for (const edge of snapshot.edges) {
    if (!expectedEdgeIds.has(edge.id)) {
      throw new RangeError(`Graph builder package dependency graph snapshot includes unexpected edge ${edge.id}.`);
    }
  }
}

function normalizeFolderNodes(folderNodes: readonly FolderGraphNode[]): readonly FolderGraphNode[] {
  if (!Array.isArray(folderNodes)) {
    throw new RangeError('Graph builder package dependency folder nodes must be an array.');
  }

  return folderNodes
    .map((node) => toSerializableGraphNode(node) as FolderGraphNode)
    .sort((left, right) => compareStableText(left.folder.path, right.folder.path));
}

function normalizeFileNodes(fileNodes: readonly FileGraphNode[]): readonly FileGraphNode[] {
  if (!Array.isArray(fileNodes)) {
    throw new RangeError('Graph builder package dependency file nodes must be an array.');
  }

  return fileNodes
    .map((node) => toSerializableGraphNode(node) as FileGraphNode)
    .sort((left, right) => compareStableText(left.file.path, right.file.path));
}

function normalizePackageNodes(packageNodes: readonly PackageGraphNode[]): readonly PackageGraphNode[] {
  if (!Array.isArray(packageNodes)) {
    throw new RangeError('Graph builder package dependency package nodes must be an array.');
  }

  return packageNodes
    .map((node) => toSerializableGraphNode(node) as PackageGraphNode)
    .sort((left, right) => compareStableText(left.package.manifestPath ?? '', right.package.manifestPath ?? ''));
}

function normalizeContainsEdges(containsEdges: readonly ContainsGraphEdge[]): readonly ContainsGraphEdge[] {
  if (!Array.isArray(containsEdges)) {
    throw new RangeError('Graph builder package dependency contains edges must be an array.');
  }

  return containsEdges
    .map((edge) => toSerializableGraphEdge(edge) as ContainsGraphEdge)
    .sort(compareEdges);
}

function normalizeDependencyEdges(dependencyEdges: readonly DependsOnGraphEdge[]): readonly DependsOnGraphEdge[] {
  if (!Array.isArray(dependencyEdges)) {
    throw new RangeError('Graph builder package dependency edges must be an array.');
  }

  return dependencyEdges
    .map((edge) => toSerializableGraphEdge(edge) as DependsOnGraphEdge)
    .sort(compareEdges);
}

function inferPackageManager(
  packageRoot: RepositoryStructurePackageRootSummary,
  inventoryFiles: readonly RepositoryScanSourceInventoryEntry[]
): PackageManager {
  const directFileNames = inventoryFiles
    .filter((file) => isDirectFileInsidePackageRoot(file.path, packageRoot.packageRootPath))
    .map((file) => getBaseName(file.path).toLowerCase());

  if (directFileNames.includes('pnpm-lock.yaml')) {
    return 'pnpm';
  }

  if (directFileNames.includes('yarn.lock')) {
    return 'yarn';
  }

  if (directFileNames.includes('bun.lock') || directFileNames.includes('bun.lockb')) {
    return 'bun';
  }

  if (directFileNames.includes('package-lock.json') || directFileNames.includes('npm-shrinkwrap.json')) {
    return 'npm';
  }

  return 'unknown';
}

function isDirectFileInsidePackageRoot(
  filePath: RepositoryScanInventoryPath,
  packageRootPath: RepositoryScanInventoryPath | undefined
): boolean {
  return getParentPath(filePath) === packageRootPath;
}

function derivePackageName(
  packageRoot: RepositoryStructurePackageRootSummary,
  projectNode: ProjectGraphNode
): string {
  return packageRoot.packageRootPath === undefined
    ? projectNode.project.name
    : getBaseName(packageRoot.packageRootPath);
}

function createPackageNodeId(packageRoot: RepositoryStructurePackageRootSummary): GraphNodeId {
  return createGraphNodeId(toGraphNodeIdToken('package', packageRoot.packageRootPath ?? 'root'));
}

function toGraphNodeIdToken(prefix: 'package', path: string): string {
  const encodedPath = path.split('/').map(encodeGraphIdSegment).join('/');
  const token = `${prefix}/${encodedPath}`;

  return truncateGraphIdToken(token);
}

function toGraphEdgeIdToken(
  kind: 'contains' | 'depends-on',
  fromNodeId: GraphNodeId,
  toNodeId: GraphNodeId,
  relationship: string
): string {
  return truncateGraphIdToken([
    kind,
    encodeGraphIdSegment(stripGraphIdPrefix(fromNodeId)),
    encodeGraphIdSegment(stripGraphIdPrefix(toNodeId)),
    encodeGraphIdSegment(relationship)
  ].join('/'));
}

function truncateGraphIdToken(token: string): string {
  if (token.length <= GRAPH_ID_MAX_TOKEN_LENGTH) {
    return token;
  }

  const digest = createStableTokenHash(token).slice(0, GRAPH_ID_HASH_LENGTH);
  const visiblePrefix = token.slice(0, GRAPH_ID_MAX_TOKEN_LENGTH - GRAPH_ID_HASH_LENGTH - 2).replace(/\/$/, '');

  return `${visiblePrefix}~${digest}`;
}

function stripGraphIdPrefix(value: GraphNodeId): string {
  return value.startsWith('node:') ? value.slice('node:'.length) : value;
}

function encodeGraphIdSegment(segment: string): string {
  let encoded = '';

  for (const character of segment) {
    encoded += GRAPH_ID_SAFE_CHARACTER_PATTERN.test(character)
      ? character
      : encodeUnsafeGraphIdCharacter(character);
  }

  return encoded.length === 0 ? 'empty' : encoded;
}

function encodeUnsafeGraphIdCharacter(character: string): string {
  const codePoint = character.codePointAt(0);

  if (codePoint === undefined) {
    throw new RangeError('Cannot encode empty graph id character.');
  }

  return `~${codePoint.toString(16)}~`;
}

function createStableTokenHash(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0').repeat(2);
}

function createAnalysis(
  tags: readonly string[],
  facets: readonly GraphNodeFacet[]
): GraphNodeAnalysisMetadata {
  const uniqueTags = [...new Set(tags.map(normalizeTag))].sort(compareStableText);
  const normalizedFacets = facets.map(toGraphFacet).sort(compareFacets);

  return {
    tags: uniqueTags,
    facets: normalizedFacets
  };
}

function createDisplay(label: string, subtitle: string, description: string): GraphNodeDisplay {
  return {
    label: normalizeText(label, 'Graph node display label', TEXT_FIELD_MAX_LENGTH),
    subtitle: normalizeText(subtitle, 'Graph node display subtitle', TEXT_FIELD_MAX_LENGTH),
    description: normalizeText(description, 'Graph node display description', DESCRIPTION_MAX_LENGTH)
  };
}

function createEdgeAttributes(attributes: GraphEdgeAttributes): GraphEdgeAttributes {
  return attributes;
}

function facet(key: string, value: string): GraphNodeFacet {
  return {
    key,
    value
  };
}

function toGraphFacet(facetValue: GraphNodeFacet): GraphNodeFacet {
  return {
    key: normalizeFacetKey(facetValue.key),
    value: normalizeText(facetValue.value, `Graph node facet ${facetValue.key}`, TEXT_FIELD_MAX_LENGTH)
  };
}

function confirmedConfidence(rationale: string): GraphConfidence {
  return {
    level: 'confirmed',
    score: 1,
    rationale
  };
}

function createPackageProvenance(
  manifestPath: RepositoryScanInventoryPath,
  observedAt: string
): GraphProvenanceRecord {
  return {
    schemaVersion: GRAPH_PROVENANCE_SCHEMA_VERSION,
    type: 'source-scan',
    producer: {
      name: GRAPH_BUILDER_PACKAGE_DEPENDENCY_PRODUCER_NAME,
      version: GRAPH_BUILDER_PACKAGE_DEPENDENCY_PRODUCER_VERSION
    },
    evidence: [
      {
        type: 'manifest',
        value: manifestPath,
        label: 'Detected package manifest'
      }
    ],
    observedAt
  };
}

function createSourceScanProvenance(
  evidenceValue: string,
  evidenceLabel: string,
  observedAt: string
): GraphProvenanceRecord {
  return {
    schemaVersion: GRAPH_PROVENANCE_SCHEMA_VERSION,
    type: 'source-scan',
    producer: {
      name: GRAPH_BUILDER_PACKAGE_DEPENDENCY_PRODUCER_NAME,
      version: GRAPH_BUILDER_PACKAGE_DEPENDENCY_PRODUCER_VERSION
    },
    evidence: [
      {
        type: 'source-location',
        value: evidenceValue,
        label: evidenceLabel
      }
    ],
    observedAt
  };
}

function getParentPath(path: string): RepositoryScanInventoryPath | undefined {
  const index = path.lastIndexOf('/');

  return index === -1 ? undefined : path.slice(0, index) as RepositoryScanInventoryPath;
}

function getBaseName(path: string): string {
  return path.split('/').at(-1) ?? path;
}

function normalizeNonNegativeInteger(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || !Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${fieldName} must be a non-negative safe integer.`);
  }

  return value;
}

function normalizeText(value: unknown, fieldName: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new RangeError(`${fieldName} must be a string.`);
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new RangeError(`${fieldName} must not be empty.`);
  }

  if (normalized.length > maxLength) {
    throw new RangeError(`${fieldName} is too long.`);
  }

  return normalized;
}

function normalizeTag(value: string): string {
  const normalized = value.trim();

  if (!/^[A-Za-z0-9][A-Za-z0-9._~:-]{0,63}$/.test(normalized)) {
    throw new RangeError('Graph builder package dependency tag must be a stable graph-model tag token.');
  }

  return normalized;
}

function normalizeFacetKey(value: string): string {
  const normalized = value.trim();

  if (!/^[A-Za-z][A-Za-z0-9._:-]{0,79}$/.test(normalized)) {
    throw new RangeError('Graph builder package dependency facet key must be a stable graph-model facet key.');
  }

  return normalized;
}

function compareFacets(left: GraphNodeFacet, right: GraphNodeFacet): number {
  return compareStableText(`${left.key}:${left.value}`, `${right.key}:${right.value}`);
}

function compareEdges(left: CanonicalGraphEdge, right: CanonicalGraphEdge): number {
  return compareStableText(left.id, right.id);
}

function compareStableText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function assertPlainObject(value: unknown, fieldName: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RangeError(`${fieldName} must be a plain object.`);
  }
}

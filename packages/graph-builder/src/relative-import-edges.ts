import {
  CANONICAL_GRAPH_SCHEMA_VERSION,
  GRAPH_EDGE_SCHEMA_VERSION,
  GRAPH_PROVENANCE_SCHEMA_VERSION,
  createGraphEdgeId,
  parseRepositoryPath,
  toSerializableCanonicalGraphSnapshot,
  toSerializableGraphEdge,
  toSerializableGraphNode,
  type CanonicalGraphSnapshot,
  type DeclaresGraphEdge,
  type ExportsGraphEdge,
  type FileGraphNode,
  type FolderGraphNode,
  type GraphConfidence,
  type GraphEdgeAttributes,
  type GraphProvenanceRecord,
  type ImportsGraphEdge,
  type PackageGraphNode,
  type ProjectGraphNode,
  type SymbolGraphNode
} from '@codestellation/graph-model';
import {
  toSerializableGraphBuilderSymbolGraphResult,
  type GraphBuilderSymbolGraphResult,
  type GraphBuilderSymbolGraphSummary
} from './symbol-nodes.js';
import type {
  GraphBuilderDiagnostic,
  GraphBuilderStatus
} from './project-file-nodes.js';
import type { GraphBuilderUnresolvedImportReference } from './import-export-edges.js';

export const GRAPH_BUILDER_RELATIVE_IMPORT_GRAPH_RESULT_SCHEMA_VERSION = 1 as const;
export const GRAPH_BUILDER_RELATIVE_IMPORT_RULESET_VERSION = 1 as const;
const GRAPH_BUILDER_RELATIVE_IMPORT_PRODUCER_NAME = 'graph-builder' as const;
const GRAPH_BUILDER_RELATIVE_IMPORT_PRODUCER_VERSION = '0.1.0' as const;

export interface GraphBuilderResolvedRelativeImportReference {
  readonly filePath: string;
  readonly moduleSpecifier: string;
  readonly resolvedFilePath: string;
  readonly importKind: string;
  readonly isTypeOnly: boolean;
  readonly isDynamic: boolean;
}

export interface GraphBuilderRelativeImportGraphSummary extends GraphBuilderSymbolGraphSummary {
  readonly resolvedRelativeImportEdgeCount: number;
  readonly remainingUnresolvedImportReferenceCount: number;
}

export interface GraphBuilderRelativeImportGraphResult {
  readonly schemaVersion: typeof GRAPH_BUILDER_RELATIVE_IMPORT_GRAPH_RESULT_SCHEMA_VERSION;
  readonly status: GraphBuilderStatus;
  readonly sourceGraph: GraphBuilderSymbolGraphResult;
  readonly snapshot: CanonicalGraphSnapshot;
  readonly projectNode: ProjectGraphNode;
  readonly folderNodes: readonly FolderGraphNode[];
  readonly fileNodes: readonly FileGraphNode[];
  readonly packageNodes: readonly PackageGraphNode[];
  readonly symbolNodes: readonly SymbolGraphNode[];
  readonly containsEdges: GraphBuilderSymbolGraphResult['containsEdges'];
  readonly dependencyEdges: GraphBuilderSymbolGraphResult['dependencyEdges'];
  readonly importsEdges: readonly ImportsGraphEdge[];
  readonly exportsEdges: readonly ExportsGraphEdge[];
  readonly declaresEdges: readonly DeclaresGraphEdge[];
  readonly resolvedRelativeImportReferences: readonly GraphBuilderResolvedRelativeImportReference[];
  readonly unresolvedImportReferences: readonly GraphBuilderUnresolvedImportReference[];
  readonly warnings: readonly GraphBuilderDiagnostic[];
  readonly errors: readonly GraphBuilderDiagnostic[];
  readonly summary: GraphBuilderRelativeImportGraphSummary;
}

interface RelativeImportResolutionAccumulator {
  readonly resolvedReferences: GraphBuilderResolvedRelativeImportReference[];
  readonly importsEdges: ImportsGraphEdge[];
  readonly unresolvedImportReferences: GraphBuilderUnresolvedImportReference[];
}

const GRAPH_ID_HASH_LENGTH = 16;
const GRAPH_ID_MAX_TOKEN_LENGTH = 220;
const GRAPH_ID_SAFE_CHARACTER_PATTERN = /^[A-Za-z0-9._-]$/;
const TEXT_FIELD_MAX_LENGTH = 240;
const DESCRIPTION_MAX_LENGTH = 1200;
const SOURCE_FILE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.json'] as const;

export function buildRelativeImportGraphFromSymbolGraph(
  sourceGraph: GraphBuilderSymbolGraphResult
): GraphBuilderRelativeImportGraphResult {
  const normalizedSourceGraph = toSerializableGraphBuilderSymbolGraphResult(sourceGraph);
  const fileNodesByPath = new Map(normalizedSourceGraph.fileNodes.map((node) => [node.file.path, node]));
  const observedAt = normalizedSourceGraph.sourceGraph.sourceGraph.sourceGraph.sourceStructure.packageManifestDetection.sourceScan.metadata.completedAt;
  const resolution = resolveRelativeImportReferences(
    normalizedSourceGraph.unresolvedImportReferences,
    fileNodesByPath,
    observedAt
  );
  const importsEdges = [
    ...normalizedSourceGraph.importsEdges,
    ...resolution.importsEdges
  ].sort(compareEdges);
  const warnings = normalizedSourceGraph.warnings;
  const errors = normalizedSourceGraph.errors;
  const snapshot = toSerializableCanonicalGraphSnapshot({
    schemaVersion: CANONICAL_GRAPH_SCHEMA_VERSION,
    rootNodeId: normalizedSourceGraph.projectNode.id,
    nodes: [
      normalizedSourceGraph.projectNode,
      ...normalizedSourceGraph.folderNodes,
      ...normalizedSourceGraph.packageNodes,
      ...normalizedSourceGraph.fileNodes,
      ...normalizedSourceGraph.symbolNodes
    ],
    edges: [
      ...normalizedSourceGraph.containsEdges,
      ...normalizedSourceGraph.dependencyEdges,
      ...importsEdges,
      ...normalizedSourceGraph.exportsEdges,
      ...normalizedSourceGraph.declaresEdges
    ]
  });
  const summary = createRelativeImportGraphSummary(
    normalizedSourceGraph.summary,
    resolution.importsEdges,
    resolution.resolvedReferences,
    resolution.unresolvedImportReferences,
    warnings.length,
    errors.length
  );

  return toSerializableGraphBuilderRelativeImportGraphResult({
    schemaVersion: GRAPH_BUILDER_RELATIVE_IMPORT_GRAPH_RESULT_SCHEMA_VERSION,
    status: normalizedSourceGraph.status,
    sourceGraph: normalizedSourceGraph,
    snapshot,
    projectNode: normalizedSourceGraph.projectNode,
    folderNodes: normalizedSourceGraph.folderNodes,
    fileNodes: normalizedSourceGraph.fileNodes,
    packageNodes: normalizedSourceGraph.packageNodes,
    symbolNodes: normalizedSourceGraph.symbolNodes,
    containsEdges: normalizedSourceGraph.containsEdges,
    dependencyEdges: normalizedSourceGraph.dependencyEdges,
    importsEdges,
    exportsEdges: normalizedSourceGraph.exportsEdges,
    declaresEdges: normalizedSourceGraph.declaresEdges,
    resolvedRelativeImportReferences: resolution.resolvedReferences,
    unresolvedImportReferences: resolution.unresolvedImportReferences,
    warnings,
    errors,
    summary
  });
}

export const buildRelativeImportGraph = buildRelativeImportGraphFromSymbolGraph;

export function isGraphBuilderRelativeImportGraphResult(
  value: unknown
): value is GraphBuilderRelativeImportGraphResult {
  try {
    toSerializableGraphBuilderRelativeImportGraphResult(value as GraphBuilderRelativeImportGraphResult);
    return true;
  } catch {
    return false;
  }
}

export function assertGraphBuilderRelativeImportGraphResult(
  value: unknown
): asserts value is GraphBuilderRelativeImportGraphResult {
  toSerializableGraphBuilderRelativeImportGraphResult(value as GraphBuilderRelativeImportGraphResult);
}

export function toSerializableGraphBuilderRelativeImportGraphResult(
  result: GraphBuilderRelativeImportGraphResult
): GraphBuilderRelativeImportGraphResult {
  assertPlainObject(result, 'Graph builder relative import graph result');

  if (result.schemaVersion !== GRAPH_BUILDER_RELATIVE_IMPORT_GRAPH_RESULT_SCHEMA_VERSION) {
    throw new RangeError('Graph builder relative import graph result schema version is unsupported.');
  }

  const sourceGraph = toSerializableGraphBuilderSymbolGraphResult(result.sourceGraph);
  const projectNode = toSerializableGraphNode(result.projectNode) as ProjectGraphNode;
  const folderNodes = normalizeFolderNodes(result.folderNodes);
  const fileNodes = normalizeFileNodes(result.fileNodes);
  const packageNodes = normalizePackageNodes(result.packageNodes);
  const symbolNodes = normalizeSymbolNodes(result.symbolNodes);
  const containsEdges = sourceGraph.containsEdges;
  const dependencyEdges = sourceGraph.dependencyEdges;
  const exportsEdges = sourceGraph.exportsEdges;
  const declaresEdges = sourceGraph.declaresEdges;
  const importsEdges = normalizeImportsEdges(result.importsEdges, sourceGraph.importsEdges);
  const resolvedRelativeImportReferences = normalizeResolvedRelativeImportReferences(result.resolvedRelativeImportReferences);
  const unresolvedImportReferences = normalizeUnresolvedImportReferences(result.unresolvedImportReferences);
  const warnings = sourceGraph.warnings;
  const errors = sourceGraph.errors;
  const snapshot = toSerializableCanonicalGraphSnapshot(result.snapshot);
  const relativeImportEdges = importsEdges.filter((edge) => edge.attributes['relationship.source'] === 'relative-import-resolution');
  const summary = normalizeRelativeImportGraphSummary(
    result.summary,
    sourceGraph.summary,
    relativeImportEdges,
    resolvedRelativeImportReferences,
    unresolvedImportReferences,
    warnings.length,
    errors.length
  );

  if (result.status !== sourceGraph.status) {
    throw new RangeError('Graph builder relative import graph status is inconsistent.');
  }

  assertSourceGraphShape(sourceGraph, projectNode, folderNodes, fileNodes, packageNodes, symbolNodes, containsEdges, dependencyEdges, exportsEdges, declaresEdges);
  assertRelativeImportSnapshotShape(
    snapshot,
    projectNode,
    folderNodes,
    fileNodes,
    packageNodes,
    symbolNodes,
    containsEdges,
    dependencyEdges,
    importsEdges,
    exportsEdges,
    declaresEdges
  );

  return {
    schemaVersion: GRAPH_BUILDER_RELATIVE_IMPORT_GRAPH_RESULT_SCHEMA_VERSION,
    status: result.status,
    sourceGraph,
    snapshot,
    projectNode,
    folderNodes,
    fileNodes,
    packageNodes,
    symbolNodes,
    containsEdges,
    dependencyEdges,
    importsEdges,
    exportsEdges,
    declaresEdges,
    resolvedRelativeImportReferences,
    unresolvedImportReferences,
    warnings,
    errors,
    summary
  };
}

function resolveRelativeImportReferences(
  references: readonly GraphBuilderUnresolvedImportReference[],
  fileNodesByPath: ReadonlyMap<string, FileGraphNode>,
  observedAt: string
): RelativeImportResolutionAccumulator {
  const resolvedReferences: GraphBuilderResolvedRelativeImportReference[] = [];
  const importsEdges: ImportsGraphEdge[] = [];
  const unresolvedImportReferences: GraphBuilderUnresolvedImportReference[] = [];

  for (const reference of references) {
    if (reference.specifierKind !== 'relative') {
      unresolvedImportReferences.push(reference);
      continue;
    }

    const sourceFile = fileNodesByPath.get(reference.filePath);
    const resolvedFile = resolveRelativeImportTarget(reference.filePath, reference.moduleSpecifier, fileNodesByPath);

    if (sourceFile === undefined || resolvedFile === undefined) {
      unresolvedImportReferences.push(reference);
      continue;
    }

    const resolvedReference = {
      filePath: reference.filePath,
      moduleSpecifier: reference.moduleSpecifier,
      resolvedFilePath: resolvedFile.file.path,
      importKind: reference.importKind,
      isTypeOnly: reference.isTypeOnly,
      isDynamic: reference.isDynamic
    };
    resolvedReferences.push(resolvedReference);
    importsEdges.push(createRelativeImportEdge(sourceFile, resolvedFile, resolvedReference, importsEdges.length, observedAt));
  }

  return {
    resolvedReferences: resolvedReferences.sort(compareResolvedRelativeImportReferences),
    importsEdges: importsEdges.sort(compareEdges),
    unresolvedImportReferences: unresolvedImportReferences.sort(compareUnresolvedImportReferences)
  };
}

function resolveRelativeImportTarget(
  importerPath: string,
  moduleSpecifier: string,
  fileNodesByPath: ReadonlyMap<string, FileGraphNode>
): FileGraphNode | undefined {
  const basePath = normalizeRepositoryPath(joinRepositoryPaths(dirname(importerPath), moduleSpecifier));
  const candidates = createRelativeImportCandidatePaths(basePath);

  for (const candidate of candidates) {
    const fileNode = fileNodesByPath.get(candidate);

    if (fileNode !== undefined) {
      return fileNode;
    }
  }

  return undefined;
}

function createRelativeImportCandidatePaths(basePath: string): readonly string[] {
  const candidates = [basePath];

  if (!hasKnownSourceExtension(basePath)) {
    candidates.push(...SOURCE_FILE_EXTENSIONS.map((extension) => `${basePath}${extension}`));
    candidates.push(...SOURCE_FILE_EXTENSIONS.map((extension) => `${basePath}/index${extension}`));
  }

  return [...new Set(candidates)];
}

function createRelativeImportEdge(
  sourceFile: FileGraphNode,
  targetFile: FileGraphNode,
  reference: GraphBuilderResolvedRelativeImportReference,
  index: number,
  observedAt: string
): ImportsGraphEdge {
  return toSerializableGraphEdge({
    schemaVersion: GRAPH_EDGE_SCHEMA_VERSION,
    id: createGraphEdgeId(toGraphEdgeIdToken(
      'imports',
      'relative',
      sourceFile.id,
      targetFile.id,
      reference.moduleSpecifier,
      index.toString()
    )),
    kind: 'imports',
    fromNodeId: sourceFile.id,
    toNodeId: targetFile.id,
    direction: 'directed',
    attributes: createEdgeAttributes({
      'relationship.source': 'relative-import-resolution',
      'import.moduleSpecifier': reference.moduleSpecifier,
      'import.kind': reference.importKind,
      'import.isTypeOnly': reference.isTypeOnly,
      'import.isDynamic': reference.isDynamic,
      'import.resolvedFilePath': reference.resolvedFilePath,
      'import.resolution': 'local-file'
    }),
    confidence: probableConfidence('Relative import edge is resolved by matching the module specifier to a known local file path without executing code.'),
    provenance: [createRelativeImportProvenance(reference.filePath, reference.moduleSpecifier, observedAt)],
    source: {
      path: parseRepositoryPath(reference.filePath)
    }
  }) as ImportsGraphEdge;
}

function createRelativeImportGraphSummary(
  sourceSummary: GraphBuilderSymbolGraphSummary,
  relativeImportEdges: readonly ImportsGraphEdge[],
  resolvedReferences: readonly GraphBuilderResolvedRelativeImportReference[],
  unresolvedReferences: readonly GraphBuilderUnresolvedImportReference[],
  warningCount: number,
  errorCount: number
): GraphBuilderRelativeImportGraphSummary {
  if (resolvedReferences.length !== relativeImportEdges.length) {
    throw new RangeError('Graph builder relative import graph resolved reference count must match resolved edge count.');
  }

  return {
    ...sourceSummary,
    importsEdgeCount: sourceSummary.importsEdgeCount + relativeImportEdges.length,
    unresolvedImportReferenceCount: unresolvedReferences.length,
    resolvedRelativeImportEdgeCount: relativeImportEdges.length,
    remainingUnresolvedImportReferenceCount: unresolvedReferences.length,
    totalEdgeCount: sourceSummary.totalEdgeCount + relativeImportEdges.length,
    warningCount,
    errorCount
  };
}

function normalizeRelativeImportGraphSummary(
  summary: GraphBuilderRelativeImportGraphSummary,
  sourceSummary: GraphBuilderSymbolGraphSummary,
  relativeImportEdges: readonly ImportsGraphEdge[],
  resolvedReferences: readonly GraphBuilderResolvedRelativeImportReference[],
  unresolvedReferences: readonly GraphBuilderUnresolvedImportReference[],
  warningCount: number,
  errorCount: number
): GraphBuilderRelativeImportGraphSummary {
  assertPlainObject(summary, 'Graph builder relative import graph summary');

  const normalized = {
    projectNodeCount: normalizeNonNegativeInteger(summary.projectNodeCount, 'summary.projectNodeCount'),
    folderNodeCount: normalizeNonNegativeInteger(summary.folderNodeCount, 'summary.folderNodeCount'),
    fileNodeCount: normalizeNonNegativeInteger(summary.fileNodeCount, 'summary.fileNodeCount'),
    packageNodeCount: normalizeNonNegativeInteger(summary.packageNodeCount, 'summary.packageNodeCount'),
    localPackageNodeCount: normalizeNonNegativeInteger(summary.localPackageNodeCount, 'summary.localPackageNodeCount'),
    externalPackageNodeCount: normalizeNonNegativeInteger(summary.externalPackageNodeCount, 'summary.externalPackageNodeCount'),
    totalNodeCount: normalizeNonNegativeInteger(summary.totalNodeCount, 'summary.totalNodeCount'),
    containsEdgeCount: normalizeNonNegativeInteger(summary.containsEdgeCount, 'summary.containsEdgeCount'),
    packageManifestEdgeCount: normalizeNonNegativeInteger(summary.packageManifestEdgeCount, 'summary.packageManifestEdgeCount'),
    dependencyEdgeCount: normalizeNonNegativeInteger(summary.dependencyEdgeCount, 'summary.dependencyEdgeCount'),
    importsEdgeCount: normalizeNonNegativeInteger(summary.importsEdgeCount, 'summary.importsEdgeCount'),
    exportsEdgeCount: normalizeNonNegativeInteger(summary.exportsEdgeCount, 'summary.exportsEdgeCount'),
    unresolvedImportReferenceCount: normalizeNonNegativeInteger(summary.unresolvedImportReferenceCount, 'summary.unresolvedImportReferenceCount'),
    symbolNodeCount: normalizeNonNegativeInteger(summary.symbolNodeCount, 'summary.symbolNodeCount'),
    declaresEdgeCount: normalizeNonNegativeInteger(summary.declaresEdgeCount, 'summary.declaresEdgeCount'),
    parsedFileCount: normalizeNonNegativeInteger(summary.parsedFileCount, 'summary.parsedFileCount'),
    parserDiagnosticCount: normalizeNonNegativeInteger(summary.parserDiagnosticCount, 'summary.parserDiagnosticCount'),
    resolvedRelativeImportEdgeCount: normalizeNonNegativeInteger(summary.resolvedRelativeImportEdgeCount, 'summary.resolvedRelativeImportEdgeCount'),
    remainingUnresolvedImportReferenceCount: normalizeNonNegativeInteger(summary.remainingUnresolvedImportReferenceCount, 'summary.remainingUnresolvedImportReferenceCount'),
    totalEdgeCount: normalizeNonNegativeInteger(summary.totalEdgeCount, 'summary.totalEdgeCount'),
    warningCount: normalizeNonNegativeInteger(summary.warningCount, 'summary.warningCount'),
    errorCount: normalizeNonNegativeInteger(summary.errorCount, 'summary.errorCount')
  };
  const expected = createRelativeImportGraphSummary(
    sourceSummary,
    relativeImportEdges,
    resolvedReferences,
    unresolvedReferences,
    warningCount,
    errorCount
  );

  if (!relativeImportGraphSummariesEqual(normalized, expected)) {
    throw new RangeError('Graph builder relative import graph summary is inconsistent.');
  }

  return expected;
}

function relativeImportGraphSummariesEqual(
  left: GraphBuilderRelativeImportGraphSummary,
  right: GraphBuilderRelativeImportGraphSummary
): boolean {
  return left.projectNodeCount === right.projectNodeCount
    && left.folderNodeCount === right.folderNodeCount
    && left.fileNodeCount === right.fileNodeCount
    && left.packageNodeCount === right.packageNodeCount
    && left.localPackageNodeCount === right.localPackageNodeCount
    && left.externalPackageNodeCount === right.externalPackageNodeCount
    && left.totalNodeCount === right.totalNodeCount
    && left.containsEdgeCount === right.containsEdgeCount
    && left.packageManifestEdgeCount === right.packageManifestEdgeCount
    && left.dependencyEdgeCount === right.dependencyEdgeCount
    && left.importsEdgeCount === right.importsEdgeCount
    && left.exportsEdgeCount === right.exportsEdgeCount
    && left.unresolvedImportReferenceCount === right.unresolvedImportReferenceCount
    && left.symbolNodeCount === right.symbolNodeCount
    && left.declaresEdgeCount === right.declaresEdgeCount
    && left.parsedFileCount === right.parsedFileCount
    && left.parserDiagnosticCount === right.parserDiagnosticCount
    && left.resolvedRelativeImportEdgeCount === right.resolvedRelativeImportEdgeCount
    && left.remainingUnresolvedImportReferenceCount === right.remainingUnresolvedImportReferenceCount
    && left.totalEdgeCount === right.totalEdgeCount
    && left.warningCount === right.warningCount
    && left.errorCount === right.errorCount;
}

function assertSourceGraphShape(
  sourceGraph: GraphBuilderSymbolGraphResult,
  projectNode: ProjectGraphNode,
  folderNodes: readonly FolderGraphNode[],
  fileNodes: readonly FileGraphNode[],
  packageNodes: readonly PackageGraphNode[],
  symbolNodes: readonly SymbolGraphNode[],
  containsEdges: GraphBuilderSymbolGraphResult['containsEdges'],
  dependencyEdges: GraphBuilderSymbolGraphResult['dependencyEdges'],
  exportsEdges: GraphBuilderSymbolGraphResult['exportsEdges'],
  declaresEdges: GraphBuilderSymbolGraphResult['declaresEdges']
): void {
  if (sourceGraph.projectNode.id !== projectNode.id) {
    throw new RangeError('Graph builder relative import graph project node must match source graph.');
  }

  if (sourceGraph.folderNodes.length !== folderNodes.length
    || sourceGraph.fileNodes.length !== fileNodes.length
    || sourceGraph.packageNodes.length !== packageNodes.length
    || sourceGraph.symbolNodes.length !== symbolNodes.length) {
    throw new RangeError('Graph builder relative import graph source node counts are inconsistent.');
  }

  if (sourceGraph.containsEdges.length !== containsEdges.length
    || sourceGraph.dependencyEdges.length !== dependencyEdges.length
    || sourceGraph.exportsEdges.length !== exportsEdges.length
    || sourceGraph.declaresEdges.length !== declaresEdges.length) {
    throw new RangeError('Graph builder relative import graph source edge counts are inconsistent.');
  }
}

function assertRelativeImportSnapshotShape(
  snapshot: CanonicalGraphSnapshot,
  projectNode: ProjectGraphNode,
  folderNodes: readonly FolderGraphNode[],
  fileNodes: readonly FileGraphNode[],
  packageNodes: readonly PackageGraphNode[],
  symbolNodes: readonly SymbolGraphNode[],
  containsEdges: GraphBuilderSymbolGraphResult['containsEdges'],
  dependencyEdges: GraphBuilderSymbolGraphResult['dependencyEdges'],
  importsEdges: readonly ImportsGraphEdge[],
  exportsEdges: readonly ExportsGraphEdge[],
  declaresEdges: readonly DeclaresGraphEdge[]
): void {
  const expectedNodeIds = new Set([
    projectNode.id,
    ...folderNodes.map((node) => node.id),
    ...fileNodes.map((node) => node.id),
    ...packageNodes.map((node) => node.id),
    ...symbolNodes.map((node) => node.id)
  ]);
  const expectedEdgeIds = new Set([
    ...containsEdges.map((edge) => edge.id),
    ...dependencyEdges.map((edge) => edge.id),
    ...importsEdges.map((edge) => edge.id),
    ...exportsEdges.map((edge) => edge.id),
    ...declaresEdges.map((edge) => edge.id)
  ]);

  if (snapshot.rootNodeId !== projectNode.id) {
    throw new RangeError('Graph builder relative import graph snapshot root must be the project node.');
  }

  if (snapshot.nodes.length !== expectedNodeIds.size || snapshot.edges.length !== expectedEdgeIds.size) {
    throw new RangeError('Graph builder relative import graph snapshot counts are inconsistent.');
  }

  for (const node of snapshot.nodes) {
    if (!expectedNodeIds.has(node.id)) {
      throw new RangeError(`Graph builder relative import graph snapshot includes unexpected node ${node.id}.`);
    }
  }

  for (const edge of snapshot.edges) {
    if (!expectedEdgeIds.has(edge.id)) {
      throw new RangeError(`Graph builder relative import graph snapshot includes unexpected edge ${edge.id}.`);
    }
  }
}

function normalizeFolderNodes(nodes: readonly FolderGraphNode[]): readonly FolderGraphNode[] {
  return requireArray(nodes, 'folderNodes')
    .map((node) => toSerializableGraphNode(node) as FolderGraphNode)
    .sort(compareFolderNodes);
}

function normalizeFileNodes(nodes: readonly FileGraphNode[]): readonly FileGraphNode[] {
  return requireArray(nodes, 'fileNodes')
    .map((node) => toSerializableGraphNode(node) as FileGraphNode)
    .sort(compareFileNodes);
}

function normalizePackageNodes(nodes: readonly PackageGraphNode[]): readonly PackageGraphNode[] {
  return requireArray(nodes, 'packageNodes')
    .map((node) => toSerializableGraphNode(node) as PackageGraphNode)
    .sort(comparePackageNodes);
}

function normalizeSymbolNodes(nodes: readonly SymbolGraphNode[]): readonly SymbolGraphNode[] {
  return requireArray(nodes, 'symbolNodes')
    .map((node) => toSerializableGraphNode(node) as SymbolGraphNode)
    .sort(compareSymbolNodes);
}

function normalizeImportsEdges(
  edges: readonly ImportsGraphEdge[],
  sourceImportsEdges: readonly ImportsGraphEdge[]
): readonly ImportsGraphEdge[] {
  const sourceEdgeIds = new Set(sourceImportsEdges.map((edge) => edge.id));
  const normalizedEdges = requireArray(edges, 'importsEdges')
    .map((edge) => toSerializableGraphEdge(edge) as ImportsGraphEdge);
  const sourceEdgesById = new Map(normalizedEdges.map((edge) => [edge.id, edge]));
  const preservedSourceEdges = sourceImportsEdges.map((sourceEdge) => {
    const matchingEdge = sourceEdgesById.get(sourceEdge.id);

    if (matchingEdge === undefined) {
      throw new RangeError('Graph builder relative import graph imports edges must include every source imports edge.');
    }

    return matchingEdge;
  });
  const relativeEdges = normalizedEdges
    .filter((edge) => !sourceEdgeIds.has(edge.id))
    .sort(compareEdges);

  return [
    ...preservedSourceEdges,
    ...relativeEdges
  ];
}

function normalizeResolvedRelativeImportReferences(
  references: readonly GraphBuilderResolvedRelativeImportReference[]
): readonly GraphBuilderResolvedRelativeImportReference[] {
  return requireArray(references, 'resolvedRelativeImportReferences')
    .map((reference) => ({
      filePath: normalizeText(reference.filePath, 'resolvedRelativeImportReference.filePath', TEXT_FIELD_MAX_LENGTH),
      moduleSpecifier: normalizeText(reference.moduleSpecifier, 'resolvedRelativeImportReference.moduleSpecifier', TEXT_FIELD_MAX_LENGTH),
      resolvedFilePath: normalizeText(reference.resolvedFilePath, 'resolvedRelativeImportReference.resolvedFilePath', TEXT_FIELD_MAX_LENGTH),
      importKind: normalizeText(reference.importKind, 'resolvedRelativeImportReference.importKind', TEXT_FIELD_MAX_LENGTH),
      isTypeOnly: normalizeBoolean(reference.isTypeOnly, 'resolvedRelativeImportReference.isTypeOnly'),
      isDynamic: normalizeBoolean(reference.isDynamic, 'resolvedRelativeImportReference.isDynamic')
    }))
    .sort(compareResolvedRelativeImportReferences);
}

function normalizeUnresolvedImportReferences(
  references: readonly GraphBuilderUnresolvedImportReference[]
): readonly GraphBuilderUnresolvedImportReference[] {
  return requireArray(references, 'unresolvedImportReferences')
    .map((reference) => ({
      filePath: normalizeText(reference.filePath, 'unresolvedImportReference.filePath', TEXT_FIELD_MAX_LENGTH),
      moduleSpecifier: normalizeText(reference.moduleSpecifier, 'unresolvedImportReference.moduleSpecifier', TEXT_FIELD_MAX_LENGTH),
      specifierKind: reference.specifierKind,
      importKind: normalizeText(reference.importKind, 'unresolvedImportReference.importKind', TEXT_FIELD_MAX_LENGTH),
      isTypeOnly: normalizeBoolean(reference.isTypeOnly, 'unresolvedImportReference.isTypeOnly'),
      isDynamic: normalizeBoolean(reference.isDynamic, 'unresolvedImportReference.isDynamic'),
      reason: reference.reason
    }))
    .sort(compareUnresolvedImportReferences);
}

function compareFolderNodes(left: FolderGraphNode, right: FolderGraphNode): number {
  return compareText(left.folder.path, right.folder.path);
}

function compareFileNodes(left: FileGraphNode, right: FileGraphNode): number {
  return compareText(left.file.path, right.file.path);
}

function comparePackageNodes(left: PackageGraphNode, right: PackageGraphNode): number {
  return compareText(left.package.name, right.package.name) || compareText(left.id, right.id);
}

function compareSymbolNodes(left: SymbolGraphNode, right: SymbolGraphNode): number {
  return compareText(left.symbol.path, right.symbol.path)
    || compareText(left.symbol.name, right.symbol.name)
    || compareText(left.id, right.id);
}

function compareEdges(left: { readonly id: string }, right: { readonly id: string }): number {
  return compareText(left.id, right.id);
}

function compareResolvedRelativeImportReferences(
  left: GraphBuilderResolvedRelativeImportReference,
  right: GraphBuilderResolvedRelativeImportReference
): number {
  return compareText(left.filePath, right.filePath)
    || compareText(left.moduleSpecifier, right.moduleSpecifier)
    || compareText(left.resolvedFilePath, right.resolvedFilePath)
    || compareText(left.importKind, right.importKind);
}

function compareUnresolvedImportReferences(
  left: GraphBuilderUnresolvedImportReference,
  right: GraphBuilderUnresolvedImportReference
): number {
  return compareText(left.filePath, right.filePath)
    || compareText(left.moduleSpecifier, right.moduleSpecifier)
    || compareText(left.reason, right.reason)
    || compareText(left.importKind, right.importKind);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function hasKnownSourceExtension(path: string): boolean {
  return SOURCE_FILE_EXTENSIONS.some((extension) => path.endsWith(extension));
}

function dirname(path: string): string {
  const index = path.lastIndexOf('/');

  return index < 0 ? '' : path.slice(0, index);
}

function joinRepositoryPaths(basePath: string, childPath: string): string {
  return basePath.length === 0 ? childPath : `${basePath}/${childPath}`;
}

function normalizeRepositoryPath(path: string): string {
  const segments: string[] = [];

  for (const rawSegment of path.split('/')) {
    if (rawSegment.length === 0 || rawSegment === '.') {
      continue;
    }

    if (rawSegment === '..') {
      segments.pop();
      continue;
    }

    segments.push(rawSegment);
  }

  return segments.join('/');
}

function createRelativeImportProvenance(
  filePath: string,
  importSpecifier: string,
  observedAt: string
): GraphProvenanceRecord {
  return {
    schemaVersion: GRAPH_PROVENANCE_SCHEMA_VERSION,
    type: 'static-analysis',
    producer: {
      name: GRAPH_BUILDER_RELATIVE_IMPORT_PRODUCER_NAME,
      version: GRAPH_BUILDER_RELATIVE_IMPORT_PRODUCER_VERSION
    },
    evidence: [
      {
        type: 'static-rule',
        value: filePath,
        label: importSpecifier
      }
    ],
    observedAt
  };
}

function createEdgeAttributes(attributes: GraphEdgeAttributes): GraphEdgeAttributes {
  return attributes;
}

function probableConfidence(rationale: string): GraphConfidence {
  return {
    level: 'probable',
    score: 0.76,
    rationale: normalizeText(rationale, 'confidence.rationale', DESCRIPTION_MAX_LENGTH)
  };
}

function toGraphEdgeIdToken(...parts: readonly string[]): string {
  return toGraphIdToken(parts.join('/'));
}

function toGraphIdToken(value: string): string {
  const safe = [...value]
    .map((character) => GRAPH_ID_SAFE_CHARACTER_PATTERN.test(character) ? character : '-')
    .join('')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  const prefixed = safe.length === 0 || !/^[A-Za-z0-9]/.test(safe) ? `x-${safe}` : safe;
  const compact = prefixed.length <= GRAPH_ID_MAX_TOKEN_LENGTH
    ? prefixed
    : `${prefixed.slice(0, GRAPH_ID_MAX_TOKEN_LENGTH - GRAPH_ID_HASH_LENGTH - 1)}-${hashText(prefixed)}`;

  return compact.length === 0 ? 'x' : compact;
}

function hashText(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0').slice(0, GRAPH_ID_HASH_LENGTH);
}

function normalizeText(value: string, fieldName: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new RangeError(`${fieldName} must be a string.`);
  }

  if (value.length === 0) {
    throw new RangeError(`${fieldName} must not be empty.`);
  }

  if (value.length > maxLength) {
    throw new RangeError(`${fieldName} is too long.`);
  }

  return value;
}

function normalizeBoolean(value: boolean, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new RangeError(`${fieldName} must be a boolean.`);
  }

  return value;
}

function normalizeNonNegativeInteger(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${fieldName} must be a non-negative integer.`);
  }

  return value;
}

function assertPlainObject(value: unknown, fieldName: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new RangeError(`${fieldName} must be an object.`);
  }
}

function requireArray<T>(value: readonly T[], fieldName: string): readonly T[] {
  if (!Array.isArray(value)) {
    throw new RangeError(`${fieldName} must be an array.`);
  }

  return value;
}

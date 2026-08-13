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
  type ReferencesGraphEdge,
  type SourceRange,
  type SymbolGraphNode
} from '@codestellation/graph-model';
import {
  toSerializableGraphBuilderReferenceGraphResult,
  type GraphBuilderReferenceGraphResult,
  type GraphBuilderReferenceGraphSummary,
  type GraphBuilderResolvedSymbolReference,
  type GraphBuilderUnresolvedSymbolReference
} from './reference-edges.js';
import type {
  GraphBuilderDiagnostic,
  GraphBuilderStatus
} from './project-file-nodes.js';
import type { GraphBuilderUnresolvedImportReference } from './import-export-edges.js';

export const GRAPH_BUILDER_IMPORTED_SYMBOL_GRAPH_RESULT_SCHEMA_VERSION = 1 as const;
export const GRAPH_BUILDER_IMPORTED_SYMBOL_RULESET_VERSION = 1 as const;
const GRAPH_BUILDER_IMPORTED_SYMBOL_PRODUCER_NAME = 'graph-builder' as const;
const GRAPH_BUILDER_IMPORTED_SYMBOL_PRODUCER_VERSION = '0.1.0' as const;

export interface GraphBuilderResolvedImportedSymbolReference {
  readonly filePath: string;
  readonly targetName: string;
  readonly referenceKind: GraphBuilderUnresolvedSymbolReference['referenceKind'];
  readonly importedFromFilePath: string;
  readonly resolvedSymbolNodeId: string;
  readonly resolvedSymbolName: string;
  readonly resolution: 'relative-import-exported-symbol-name';
  readonly range?: SourceRange;
}

export interface GraphBuilderImportedSymbolGraphSummary extends GraphBuilderReferenceGraphSummary {
  readonly importedSymbolReferenceEdgeCount: number;
  readonly resolvedImportedSymbolReferenceCount: number;
  readonly remainingUnresolvedSymbolReferenceCount: number;
}

export interface GraphBuilderImportedSymbolGraphResult {
  readonly schemaVersion: typeof GRAPH_BUILDER_IMPORTED_SYMBOL_GRAPH_RESULT_SCHEMA_VERSION;
  readonly status: GraphBuilderStatus;
  readonly sourceGraph: GraphBuilderReferenceGraphResult;
  readonly snapshot: CanonicalGraphSnapshot;
  readonly projectNode: ProjectGraphNode;
  readonly folderNodes: readonly FolderGraphNode[];
  readonly fileNodes: readonly FileGraphNode[];
  readonly packageNodes: readonly PackageGraphNode[];
  readonly symbolNodes: readonly SymbolGraphNode[];
  readonly containsEdges: GraphBuilderReferenceGraphResult['containsEdges'];
  readonly dependencyEdges: GraphBuilderReferenceGraphResult['dependencyEdges'];
  readonly importsEdges: readonly ImportsGraphEdge[];
  readonly exportsEdges: readonly ExportsGraphEdge[];
  readonly declaresEdges: readonly DeclaresGraphEdge[];
  readonly referencesEdges: readonly ReferencesGraphEdge[];
  readonly resolvedRelativeImportReferences: GraphBuilderReferenceGraphResult['resolvedRelativeImportReferences'];
  readonly unresolvedImportReferences: readonly GraphBuilderUnresolvedImportReference[];
  readonly resolvedSymbolReferences: readonly GraphBuilderResolvedSymbolReference[];
  readonly resolvedImportedSymbolReferences: readonly GraphBuilderResolvedImportedSymbolReference[];
  readonly unresolvedSymbolReferences: readonly GraphBuilderUnresolvedSymbolReference[];
  readonly warnings: readonly GraphBuilderDiagnostic[];
  readonly errors: readonly GraphBuilderDiagnostic[];
  readonly summary: GraphBuilderImportedSymbolGraphSummary;
}

interface ImportedSymbolResolutionContext {
  readonly unresolvedReference: GraphBuilderUnresolvedSymbolReference;
  readonly fileNode: FileGraphNode;
  readonly symbolNode: SymbolGraphNode;
  readonly resolved: GraphBuilderResolvedImportedSymbolReference;
}

interface ImportedSymbolResolutionAccumulator {
  readonly resolvedContexts: ImportedSymbolResolutionContext[];
  readonly unresolvedSymbolReferences: GraphBuilderUnresolvedSymbolReference[];
}

const GRAPH_ID_HASH_LENGTH = 16;
const GRAPH_ID_MAX_TOKEN_LENGTH = 220;
const GRAPH_ID_SAFE_CHARACTER_PATTERN = /^[A-Za-z0-9._-]$/;
const TEXT_FIELD_MAX_LENGTH = 240;
const DESCRIPTION_MAX_LENGTH = 1200;

export function buildImportedSymbolReferenceGraphFromReferenceGraph(
  sourceGraph: GraphBuilderReferenceGraphResult
): GraphBuilderImportedSymbolGraphResult {
  const normalizedSourceGraph = toSerializableGraphBuilderReferenceGraphResult(sourceGraph);
  const fileNodesByPath = new Map(normalizedSourceGraph.fileNodes.map((node) => [node.file.path, node]));
  const exportedSymbolNodesByPathAndName = createExportedSymbolNodesByPathAndName(normalizedSourceGraph.symbolNodes);
  const importedFilePathsBySourcePath = createImportedFilePathsBySourcePath(
    normalizedSourceGraph.resolvedRelativeImportReferences
  );
  const observedAt = normalizedSourceGraph.sourceGraph.sourceGraph.sourceGraph.sourceGraph.sourceGraph.sourceStructure.packageManifestDetection.sourceScan.metadata.completedAt;
  const resolution = resolveImportedSymbolReferences(
    normalizedSourceGraph.unresolvedSymbolReferences,
    fileNodesByPath,
    exportedSymbolNodesByPathAndName,
    importedFilePathsBySourcePath
  );
  const importedReferencesEdges = createImportedSymbolReferenceEdges(resolution.resolvedContexts, observedAt);
  const referencesEdges = [
    ...normalizedSourceGraph.referencesEdges,
    ...importedReferencesEdges
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
      ...normalizedSourceGraph.importsEdges,
      ...normalizedSourceGraph.exportsEdges,
      ...normalizedSourceGraph.declaresEdges,
      ...referencesEdges
    ]
  });
  const resolvedImportedSymbolReferences = resolution.resolvedContexts.map((context) => context.resolved);
  const summary = createImportedSymbolGraphSummary(
    normalizedSourceGraph.summary,
    importedReferencesEdges,
    resolvedImportedSymbolReferences,
    resolution.unresolvedSymbolReferences,
    warnings.length,
    errors.length
  );

  return toSerializableGraphBuilderImportedSymbolGraphResult({
    schemaVersion: GRAPH_BUILDER_IMPORTED_SYMBOL_GRAPH_RESULT_SCHEMA_VERSION,
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
    importsEdges: normalizedSourceGraph.importsEdges,
    exportsEdges: normalizedSourceGraph.exportsEdges,
    declaresEdges: normalizedSourceGraph.declaresEdges,
    referencesEdges,
    resolvedRelativeImportReferences: normalizedSourceGraph.resolvedRelativeImportReferences,
    unresolvedImportReferences: normalizedSourceGraph.unresolvedImportReferences,
    resolvedSymbolReferences: normalizedSourceGraph.resolvedSymbolReferences,
    resolvedImportedSymbolReferences,
    unresolvedSymbolReferences: resolution.unresolvedSymbolReferences,
    warnings,
    errors,
    summary
  });
}

export const buildImportedSymbolReferenceGraph = buildImportedSymbolReferenceGraphFromReferenceGraph;
export const buildImportedSymbolGraph = buildImportedSymbolReferenceGraphFromReferenceGraph;

export function isGraphBuilderImportedSymbolGraphResult(
  value: unknown
): value is GraphBuilderImportedSymbolGraphResult {
  try {
    toSerializableGraphBuilderImportedSymbolGraphResult(value as GraphBuilderImportedSymbolGraphResult);
    return true;
  } catch {
    return false;
  }
}

export function assertGraphBuilderImportedSymbolGraphResult(
  value: unknown
): asserts value is GraphBuilderImportedSymbolGraphResult {
  toSerializableGraphBuilderImportedSymbolGraphResult(value as GraphBuilderImportedSymbolGraphResult);
}

export function toSerializableGraphBuilderImportedSymbolGraphResult(
  result: GraphBuilderImportedSymbolGraphResult
): GraphBuilderImportedSymbolGraphResult {
  assertPlainObject(result, 'Graph builder imported symbol graph result');

  if (result.schemaVersion !== GRAPH_BUILDER_IMPORTED_SYMBOL_GRAPH_RESULT_SCHEMA_VERSION) {
    throw new RangeError('Graph builder imported symbol graph result schema version is unsupported.');
  }

  const sourceGraph = toSerializableGraphBuilderReferenceGraphResult(result.sourceGraph);
  const projectNode = toSerializableGraphNode(result.projectNode) as ProjectGraphNode;
  const folderNodes = normalizeFolderNodes(result.folderNodes);
  const fileNodes = normalizeFileNodes(result.fileNodes);
  const packageNodes = normalizePackageNodes(result.packageNodes);
  const symbolNodes = normalizeSymbolNodes(result.symbolNodes);
  const containsEdges = sourceGraph.containsEdges;
  const dependencyEdges = sourceGraph.dependencyEdges;
  const importsEdges = sourceGraph.importsEdges;
  const exportsEdges = sourceGraph.exportsEdges;
  const declaresEdges = sourceGraph.declaresEdges;
  const referencesEdges = normalizeReferencesEdges(result.referencesEdges, sourceGraph.referencesEdges);
  const resolvedRelativeImportReferences = sourceGraph.resolvedRelativeImportReferences;
  const unresolvedImportReferences = sourceGraph.unresolvedImportReferences;
  const resolvedSymbolReferences = sourceGraph.resolvedSymbolReferences;
  const resolvedImportedSymbolReferences = normalizeResolvedImportedSymbolReferences(result.resolvedImportedSymbolReferences);
  const unresolvedSymbolReferences = normalizeUnresolvedSymbolReferences(result.unresolvedSymbolReferences);
  const warnings = sourceGraph.warnings;
  const errors = sourceGraph.errors;
  const snapshot = toSerializableCanonicalGraphSnapshot(result.snapshot);
  const importedReferencesEdges = referencesEdges.filter((edge) => edge.attributes['relationship.source'] === 'imported-symbol-resolution');
  const summary = normalizeImportedSymbolGraphSummary(
    result.summary,
    sourceGraph.summary,
    importedReferencesEdges,
    resolvedImportedSymbolReferences,
    unresolvedSymbolReferences,
    warnings.length,
    errors.length
  );

  if (result.status !== sourceGraph.status) {
    throw new RangeError('Graph builder imported symbol graph status is inconsistent.');
  }

  assertSourceGraphShape(sourceGraph, projectNode, folderNodes, fileNodes, packageNodes, symbolNodes, containsEdges, dependencyEdges, importsEdges, exportsEdges, declaresEdges);
  assertImportedSymbolSnapshotShape(
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
    referencesEdges
  );

  return {
    schemaVersion: GRAPH_BUILDER_IMPORTED_SYMBOL_GRAPH_RESULT_SCHEMA_VERSION,
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
    referencesEdges,
    resolvedRelativeImportReferences,
    unresolvedImportReferences,
    resolvedSymbolReferences,
    resolvedImportedSymbolReferences,
    unresolvedSymbolReferences,
    warnings,
    errors,
    summary
  };
}

function createImportedFilePathsBySourcePath(
  references: GraphBuilderReferenceGraphResult['resolvedRelativeImportReferences']
): ReadonlyMap<string, readonly string[]> {
  const map = new Map<string, string[]>();

  for (const reference of references) {
    const existing = map.get(reference.filePath) ?? [];
    existing.push(reference.resolvedFilePath);
    map.set(reference.filePath, existing);
  }

  for (const [path, importedPaths] of map) {
    map.set(path, [...new Set(importedPaths)].sort(compareText));
  }

  return map;
}

function createExportedSymbolNodesByPathAndName(
  symbolNodes: readonly SymbolGraphNode[]
): ReadonlyMap<string, readonly SymbolGraphNode[]> {
  const map = new Map<string, SymbolGraphNode[]>();

  for (const symbolNode of symbolNodes) {
    if (symbolNode.symbol.exportKind === 'none') {
      continue;
    }

    const key = toSymbolLookupKey(symbolNode.symbol.path, symbolNode.symbol.name);
    const existing = map.get(key) ?? [];
    existing.push(symbolNode);
    map.set(key, existing);
  }

  for (const [key, nodes] of map) {
    map.set(key, nodes.sort(compareSymbolNodes));
  }

  return map;
}

function resolveImportedSymbolReferences(
  unresolvedReferences: readonly GraphBuilderUnresolvedSymbolReference[],
  fileNodesByPath: ReadonlyMap<string, FileGraphNode>,
  exportedSymbolNodesByPathAndName: ReadonlyMap<string, readonly SymbolGraphNode[]>,
  importedFilePathsBySourcePath: ReadonlyMap<string, readonly string[]>
): ImportedSymbolResolutionAccumulator {
  const resolvedContexts: ImportedSymbolResolutionContext[] = [];
  const remainingUnresolvedReferences: GraphBuilderUnresolvedSymbolReference[] = [];

  for (const unresolvedReference of unresolvedReferences) {
    const fileNode = fileNodesByPath.get(unresolvedReference.filePath);
    const importedFilePaths = importedFilePathsBySourcePath.get(unresolvedReference.filePath) ?? [];
    const matchingSymbols = importedFilePaths.flatMap((importedFilePath) => (
      exportedSymbolNodesByPathAndName.get(toSymbolLookupKey(importedFilePath, unresolvedReference.targetName)) ?? []
    ));

    if (unresolvedReference.reason !== 'no-local-symbol-match'
      || fileNode === undefined
      || matchingSymbols.length !== 1) {
      remainingUnresolvedReferences.push(unresolvedReference);
      continue;
    }

    const symbolNode = matchingSymbols[0];

    if (symbolNode === undefined) {
      remainingUnresolvedReferences.push(unresolvedReference);
      continue;
    }

    resolvedContexts.push({
      unresolvedReference,
      fileNode,
      symbolNode,
      resolved: createResolvedImportedSymbolReference(unresolvedReference, symbolNode)
    });
  }

  return {
    resolvedContexts: resolvedContexts.sort(compareImportedSymbolResolutionContexts),
    unresolvedSymbolReferences: remainingUnresolvedReferences.sort(compareUnresolvedSymbolReferences)
  };
}

function createResolvedImportedSymbolReference(
  unresolvedReference: GraphBuilderUnresolvedSymbolReference,
  symbolNode: SymbolGraphNode
): GraphBuilderResolvedImportedSymbolReference {
  return {
    filePath: unresolvedReference.filePath,
    targetName: unresolvedReference.targetName,
    referenceKind: unresolvedReference.referenceKind,
    importedFromFilePath: symbolNode.symbol.path,
    resolvedSymbolNodeId: symbolNode.id,
    resolvedSymbolName: symbolNode.symbol.name,
    resolution: 'relative-import-exported-symbol-name',
    ...(unresolvedReference.range === undefined ? {} : { range: unresolvedReference.range })
  };
}

function createImportedSymbolReferenceEdges(
  contexts: readonly ImportedSymbolResolutionContext[],
  observedAt: string
): readonly ReferencesGraphEdge[] {
  return contexts
    .map((context, index) => createImportedSymbolReferenceEdge(context, index, observedAt))
    .sort(compareEdges);
}

function createImportedSymbolReferenceEdge(
  context: ImportedSymbolResolutionContext,
  index: number,
  observedAt: string
): ReferencesGraphEdge {
  return toSerializableGraphEdge({
    schemaVersion: GRAPH_EDGE_SCHEMA_VERSION,
    id: createGraphEdgeId(toGraphEdgeIdToken(
      'references',
      'imported-symbol',
      context.fileNode.id,
      context.symbolNode.id,
      context.unresolvedReference.targetName,
      context.unresolvedReference.referenceKind,
      context.unresolvedReference.range?.start.line.toString() ?? `index-${index}`,
      context.unresolvedReference.range?.start.column.toString() ?? `index-${index}`
    )),
    kind: 'references',
    fromNodeId: context.fileNode.id,
    toNodeId: context.symbolNode.id,
    direction: 'directed',
    attributes: createEdgeAttributes({
      'relationship.source': 'imported-symbol-resolution',
      'reference.targetName': context.unresolvedReference.targetName,
      'reference.kind': context.unresolvedReference.referenceKind,
      'reference.resolution': context.resolved.resolution,
      'reference.importedFromFilePath': context.resolved.importedFromFilePath
    }),
    confidence: probableConfidence('Reference edge is derived from parser references and a previously resolved relative import to an exported symbol with the same name.'),
    provenance: [createImportedSymbolProvenance(
      context.unresolvedReference.filePath,
      context.unresolvedReference.targetName,
      context.resolved.importedFromFilePath,
      observedAt
    )],
    source: {
      path: parseRepositoryPath(context.unresolvedReference.filePath),
      ...(context.unresolvedReference.range === undefined ? {} : { range: context.unresolvedReference.range })
    }
  }) as ReferencesGraphEdge;
}

function createImportedSymbolGraphSummary(
  sourceSummary: GraphBuilderReferenceGraphSummary,
  importedReferencesEdges: readonly ReferencesGraphEdge[],
  resolvedReferences: readonly GraphBuilderResolvedImportedSymbolReference[],
  unresolvedReferences: readonly GraphBuilderUnresolvedSymbolReference[],
  warningCount: number,
  errorCount: number
): GraphBuilderImportedSymbolGraphSummary {
  if (importedReferencesEdges.length !== resolvedReferences.length) {
    throw new RangeError('Graph builder imported symbol graph resolved reference count must match imported reference edge count.');
  }

  return {
    ...sourceSummary,
    referenceEdgeCount: sourceSummary.referenceEdgeCount + importedReferencesEdges.length,
    resolvedSymbolReferenceCount: sourceSummary.resolvedSymbolReferenceCount + resolvedReferences.length,
    unresolvedSymbolReferenceCount: unresolvedReferences.length,
    importedSymbolReferenceEdgeCount: importedReferencesEdges.length,
    resolvedImportedSymbolReferenceCount: resolvedReferences.length,
    remainingUnresolvedSymbolReferenceCount: unresolvedReferences.length,
    totalEdgeCount: sourceSummary.totalEdgeCount + importedReferencesEdges.length,
    warningCount,
    errorCount
  };
}

function normalizeImportedSymbolGraphSummary(
  summary: GraphBuilderImportedSymbolGraphSummary,
  sourceSummary: GraphBuilderReferenceGraphSummary,
  importedReferencesEdges: readonly ReferencesGraphEdge[],
  resolvedReferences: readonly GraphBuilderResolvedImportedSymbolReference[],
  unresolvedReferences: readonly GraphBuilderUnresolvedSymbolReference[],
  warningCount: number,
  errorCount: number
): GraphBuilderImportedSymbolGraphSummary {
  assertPlainObject(summary, 'Graph builder imported symbol graph summary');

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
    referenceEdgeCount: normalizeNonNegativeInteger(summary.referenceEdgeCount, 'summary.referenceEdgeCount'),
    resolvedSymbolReferenceCount: normalizeNonNegativeInteger(summary.resolvedSymbolReferenceCount, 'summary.resolvedSymbolReferenceCount'),
    unresolvedSymbolReferenceCount: normalizeNonNegativeInteger(summary.unresolvedSymbolReferenceCount, 'summary.unresolvedSymbolReferenceCount'),
    parserReferenceCount: normalizeNonNegativeInteger(summary.parserReferenceCount, 'summary.parserReferenceCount'),
    importedSymbolReferenceEdgeCount: normalizeNonNegativeInteger(summary.importedSymbolReferenceEdgeCount, 'summary.importedSymbolReferenceEdgeCount'),
    resolvedImportedSymbolReferenceCount: normalizeNonNegativeInteger(summary.resolvedImportedSymbolReferenceCount, 'summary.resolvedImportedSymbolReferenceCount'),
    remainingUnresolvedSymbolReferenceCount: normalizeNonNegativeInteger(summary.remainingUnresolvedSymbolReferenceCount, 'summary.remainingUnresolvedSymbolReferenceCount'),
    totalEdgeCount: normalizeNonNegativeInteger(summary.totalEdgeCount, 'summary.totalEdgeCount'),
    warningCount: normalizeNonNegativeInteger(summary.warningCount, 'summary.warningCount'),
    errorCount: normalizeNonNegativeInteger(summary.errorCount, 'summary.errorCount')
  };
  const expected = createImportedSymbolGraphSummary(
    sourceSummary,
    importedReferencesEdges,
    resolvedReferences,
    unresolvedReferences,
    warningCount,
    errorCount
  );

  if (!importedSymbolGraphSummariesEqual(normalized, expected)) {
    throw new RangeError('Graph builder imported symbol graph summary is inconsistent.');
  }

  return expected;
}

function importedSymbolGraphSummariesEqual(
  left: GraphBuilderImportedSymbolGraphSummary,
  right: GraphBuilderImportedSymbolGraphSummary
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
    && left.referenceEdgeCount === right.referenceEdgeCount
    && left.resolvedSymbolReferenceCount === right.resolvedSymbolReferenceCount
    && left.unresolvedSymbolReferenceCount === right.unresolvedSymbolReferenceCount
    && left.parserReferenceCount === right.parserReferenceCount
    && left.importedSymbolReferenceEdgeCount === right.importedSymbolReferenceEdgeCount
    && left.resolvedImportedSymbolReferenceCount === right.resolvedImportedSymbolReferenceCount
    && left.remainingUnresolvedSymbolReferenceCount === right.remainingUnresolvedSymbolReferenceCount
    && left.totalEdgeCount === right.totalEdgeCount
    && left.warningCount === right.warningCount
    && left.errorCount === right.errorCount;
}

function assertSourceGraphShape(
  sourceGraph: GraphBuilderReferenceGraphResult,
  projectNode: ProjectGraphNode,
  folderNodes: readonly FolderGraphNode[],
  fileNodes: readonly FileGraphNode[],
  packageNodes: readonly PackageGraphNode[],
  symbolNodes: readonly SymbolGraphNode[],
  containsEdges: GraphBuilderReferenceGraphResult['containsEdges'],
  dependencyEdges: GraphBuilderReferenceGraphResult['dependencyEdges'],
  importsEdges: readonly ImportsGraphEdge[],
  exportsEdges: readonly ExportsGraphEdge[],
  declaresEdges: readonly DeclaresGraphEdge[]
): void {
  if (sourceGraph.projectNode.id !== projectNode.id) {
    throw new RangeError('Graph builder imported symbol graph project node must match source graph.');
  }

  if (sourceGraph.folderNodes.length !== folderNodes.length
    || sourceGraph.fileNodes.length !== fileNodes.length
    || sourceGraph.packageNodes.length !== packageNodes.length
    || sourceGraph.symbolNodes.length !== symbolNodes.length) {
    throw new RangeError('Graph builder imported symbol graph source node counts are inconsistent.');
  }

  if (sourceGraph.containsEdges.length !== containsEdges.length
    || sourceGraph.dependencyEdges.length !== dependencyEdges.length
    || sourceGraph.importsEdges.length !== importsEdges.length
    || sourceGraph.exportsEdges.length !== exportsEdges.length
    || sourceGraph.declaresEdges.length !== declaresEdges.length) {
    throw new RangeError('Graph builder imported symbol graph source edge counts are inconsistent.');
  }
}

function assertImportedSymbolSnapshotShape(
  snapshot: CanonicalGraphSnapshot,
  projectNode: ProjectGraphNode,
  folderNodes: readonly FolderGraphNode[],
  fileNodes: readonly FileGraphNode[],
  packageNodes: readonly PackageGraphNode[],
  symbolNodes: readonly SymbolGraphNode[],
  containsEdges: GraphBuilderReferenceGraphResult['containsEdges'],
  dependencyEdges: GraphBuilderReferenceGraphResult['dependencyEdges'],
  importsEdges: readonly ImportsGraphEdge[],
  exportsEdges: readonly ExportsGraphEdge[],
  declaresEdges: readonly DeclaresGraphEdge[],
  referencesEdges: readonly ReferencesGraphEdge[]
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
    ...declaresEdges.map((edge) => edge.id),
    ...referencesEdges.map((edge) => edge.id)
  ]);

  if (snapshot.rootNodeId !== projectNode.id) {
    throw new RangeError('Graph builder imported symbol graph snapshot root must be the project node.');
  }

  if (snapshot.nodes.length !== expectedNodeIds.size || snapshot.edges.length !== expectedEdgeIds.size) {
    throw new RangeError('Graph builder imported symbol graph snapshot counts are inconsistent.');
  }

  for (const node of snapshot.nodes) {
    if (!expectedNodeIds.has(node.id)) {
      throw new RangeError(`Graph builder imported symbol graph snapshot includes unexpected node ${node.id}.`);
    }
  }

  for (const edge of snapshot.edges) {
    if (!expectedEdgeIds.has(edge.id)) {
      throw new RangeError(`Graph builder imported symbol graph snapshot includes unexpected edge ${edge.id}.`);
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

function normalizeReferencesEdges(
  edges: readonly ReferencesGraphEdge[],
  sourceEdges: readonly ReferencesGraphEdge[]
): readonly ReferencesGraphEdge[] {
  const normalized = requireArray(edges, 'referencesEdges')
    .map((edge) => toSerializableGraphEdge(edge) as ReferencesGraphEdge)
    .sort(compareEdges);
  const sourceEdgeIds = new Set(sourceEdges.map((edge) => edge.id));

  for (const sourceEdge of sourceEdges) {
    if (!normalized.some((edge) => edge.id === sourceEdge.id)) {
      throw new RangeError(`Graph builder imported symbol graph must preserve source reference edge ${sourceEdge.id}.`);
    }
  }

  const importedEdgeCount = normalized.filter((edge) => !sourceEdgeIds.has(edge.id)).length;
  const explicitImportedEdgeCount = normalized.filter((edge) => edge.attributes['relationship.source'] === 'imported-symbol-resolution').length;

  if (importedEdgeCount !== explicitImportedEdgeCount) {
    throw new RangeError('Graph builder imported symbol graph new reference edges must be imported-symbol-resolution edges.');
  }

  return normalized;
}

function normalizeResolvedImportedSymbolReferences(
  references: readonly GraphBuilderResolvedImportedSymbolReference[]
): readonly GraphBuilderResolvedImportedSymbolReference[] {
  return requireArray(references, 'resolvedImportedSymbolReferences')
    .map((reference): GraphBuilderResolvedImportedSymbolReference => ({
      filePath: normalizeText(reference.filePath, 'resolvedImportedSymbolReference.filePath', TEXT_FIELD_MAX_LENGTH),
      targetName: normalizeText(reference.targetName, 'resolvedImportedSymbolReference.targetName', TEXT_FIELD_MAX_LENGTH),
      referenceKind: normalizeReferenceKind(reference.referenceKind, 'resolvedImportedSymbolReference.referenceKind'),
      importedFromFilePath: normalizeText(reference.importedFromFilePath, 'resolvedImportedSymbolReference.importedFromFilePath', TEXT_FIELD_MAX_LENGTH),
      resolvedSymbolNodeId: normalizeText(reference.resolvedSymbolNodeId, 'resolvedImportedSymbolReference.resolvedSymbolNodeId', TEXT_FIELD_MAX_LENGTH),
      resolvedSymbolName: normalizeText(reference.resolvedSymbolName, 'resolvedImportedSymbolReference.resolvedSymbolName', TEXT_FIELD_MAX_LENGTH),
      resolution: reference.resolution,
      ...(reference.range === undefined ? {} : { range: reference.range })
    }))
    .sort(compareResolvedImportedSymbolReferences);
}

function normalizeUnresolvedSymbolReferences(
  references: readonly GraphBuilderUnresolvedSymbolReference[]
): readonly GraphBuilderUnresolvedSymbolReference[] {
  return requireArray(references, 'unresolvedSymbolReferences')
    .map((reference) => ({
      filePath: normalizeText(reference.filePath, 'unresolvedSymbolReference.filePath', TEXT_FIELD_MAX_LENGTH),
      targetName: normalizeText(reference.targetName, 'unresolvedSymbolReference.targetName', TEXT_FIELD_MAX_LENGTH),
      referenceKind: reference.referenceKind,
      reason: reference.reason,
      ...(reference.range === undefined ? {} : { range: reference.range })
    }))
    .sort(compareUnresolvedSymbolReferences);
}

function createImportedSymbolProvenance(
  filePath: string,
  targetName: string,
  importedFromFilePath: string,
  observedAt: string
): GraphProvenanceRecord {
  return {
    schemaVersion: GRAPH_PROVENANCE_SCHEMA_VERSION,
    type: 'static-analysis',
    producer: {
      name: GRAPH_BUILDER_IMPORTED_SYMBOL_PRODUCER_NAME,
      version: GRAPH_BUILDER_IMPORTED_SYMBOL_PRODUCER_VERSION
    },
    evidence: [
      {
        type: 'source-location',
        value: filePath,
        label: targetName
      },
      {
        type: 'source-location',
        value: importedFromFilePath,
        label: 'relative import target'
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
    level: 'possible',
    score: 0.6,
    rationale: normalizeText(rationale, 'confidence.rationale', DESCRIPTION_MAX_LENGTH)
  };
}

function toSymbolLookupKey(path: string, name: string): string {
  return `${path}\u0000${name}`;
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

function compareImportedSymbolResolutionContexts(
  left: ImportedSymbolResolutionContext,
  right: ImportedSymbolResolutionContext
): number {
  return compareText(left.unresolvedReference.filePath, right.unresolvedReference.filePath)
    || compareText(left.unresolvedReference.targetName, right.unresolvedReference.targetName)
    || compareText(left.unresolvedReference.referenceKind, right.unresolvedReference.referenceKind)
    || compareText(left.resolved.importedFromFilePath, right.resolved.importedFromFilePath)
    || compareText(left.symbolNode.id, right.symbolNode.id);
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

function compareResolvedImportedSymbolReferences(
  left: GraphBuilderResolvedImportedSymbolReference,
  right: GraphBuilderResolvedImportedSymbolReference
): number {
  return compareText(left.filePath, right.filePath)
    || compareText(left.targetName, right.targetName)
    || compareText(left.referenceKind, right.referenceKind)
    || compareText(left.importedFromFilePath, right.importedFromFilePath)
    || compareText(left.resolvedSymbolNodeId, right.resolvedSymbolNodeId);
}

function compareUnresolvedSymbolReferences(
  left: GraphBuilderUnresolvedSymbolReference,
  right: GraphBuilderUnresolvedSymbolReference
): number {
  return compareText(left.filePath, right.filePath)
    || compareText(left.targetName, right.targetName)
    || compareText(left.referenceKind, right.referenceKind)
    || compareText(left.reason, right.reason);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function normalizeReferenceKind(
  value: GraphBuilderUnresolvedSymbolReference['referenceKind'],
  fieldName: string
): GraphBuilderUnresolvedSymbolReference['referenceKind'] {
  const normalized = normalizeText(value, fieldName, TEXT_FIELD_MAX_LENGTH);

  if (
    normalized !== 'call'
    && normalized !== 'decorator'
    && normalized !== 'identifier'
    && normalized !== 'jsx'
    && normalized !== 'type'
    && normalized !== 'unknown'
  ) {
    throw new RangeError(`${fieldName} must be a valid parser reference kind.`);
  }

  return normalized as GraphBuilderUnresolvedSymbolReference['referenceKind'];
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

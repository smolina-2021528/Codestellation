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
  toSerializableParserCoreParseBatchResult,
  type ParserCoreParseBatchResult,
  type ParserCoreParseUnitResult,
  type ParserCoreReferenceKind,
  type ParserCoreReferenceRecord,
  type ParserCoreTextRange
} from '@codestellation/parser-core';
import {
  toSerializableGraphBuilderRelativeImportGraphResult,
  type GraphBuilderRelativeImportGraphResult,
  type GraphBuilderRelativeImportGraphSummary
} from './relative-import-edges.js';
import type {
  GraphBuilderDiagnostic,
  GraphBuilderStatus
} from './project-file-nodes.js';
import type { GraphBuilderUnresolvedImportReference } from './import-export-edges.js';

export const GRAPH_BUILDER_REFERENCE_GRAPH_RESULT_SCHEMA_VERSION = 1 as const;
export const GRAPH_BUILDER_REFERENCE_RULESET_VERSION = 1 as const;
const GRAPH_BUILDER_REFERENCE_PRODUCER_NAME = 'graph-builder' as const;
const GRAPH_BUILDER_REFERENCE_PRODUCER_VERSION = '0.1.0' as const;

export interface GraphBuilderResolvedSymbolReference {
  readonly filePath: string;
  readonly targetName: string;
  readonly referenceKind: ParserCoreReferenceKind;
  readonly resolvedSymbolNodeId: string;
  readonly resolvedSymbolName: string;
  readonly resolution: 'same-file-symbol-name';
  readonly range?: SourceRange;
}

export interface GraphBuilderUnresolvedSymbolReference {
  readonly filePath: string;
  readonly targetName: string;
  readonly referenceKind: ParserCoreReferenceKind;
  readonly reason: 'missing-file-node' | 'no-local-symbol-match' | 'ambiguous-local-symbol-match';
  readonly range?: SourceRange;
}

export interface GraphBuilderReferenceGraphSummary extends GraphBuilderRelativeImportGraphSummary {
  readonly referenceEdgeCount: number;
  readonly resolvedSymbolReferenceCount: number;
  readonly unresolvedSymbolReferenceCount: number;
  readonly parserReferenceCount: number;
}

export interface GraphBuilderReferenceGraphResult {
  readonly schemaVersion: typeof GRAPH_BUILDER_REFERENCE_GRAPH_RESULT_SCHEMA_VERSION;
  readonly status: GraphBuilderStatus;
  readonly sourceGraph: GraphBuilderRelativeImportGraphResult;
  readonly sourceParseBatch: ParserCoreParseBatchResult;
  readonly snapshot: CanonicalGraphSnapshot;
  readonly projectNode: ProjectGraphNode;
  readonly folderNodes: readonly FolderGraphNode[];
  readonly fileNodes: readonly FileGraphNode[];
  readonly packageNodes: readonly PackageGraphNode[];
  readonly symbolNodes: readonly SymbolGraphNode[];
  readonly containsEdges: GraphBuilderRelativeImportGraphResult['containsEdges'];
  readonly dependencyEdges: GraphBuilderRelativeImportGraphResult['dependencyEdges'];
  readonly importsEdges: readonly ImportsGraphEdge[];
  readonly exportsEdges: readonly ExportsGraphEdge[];
  readonly declaresEdges: readonly DeclaresGraphEdge[];
  readonly referencesEdges: readonly ReferencesGraphEdge[];
  readonly resolvedRelativeImportReferences: GraphBuilderRelativeImportGraphResult['resolvedRelativeImportReferences'];
  readonly unresolvedImportReferences: readonly GraphBuilderUnresolvedImportReference[];
  readonly resolvedSymbolReferences: readonly GraphBuilderResolvedSymbolReference[];
  readonly unresolvedSymbolReferences: readonly GraphBuilderUnresolvedSymbolReference[];
  readonly warnings: readonly GraphBuilderDiagnostic[];
  readonly errors: readonly GraphBuilderDiagnostic[];
  readonly summary: GraphBuilderReferenceGraphSummary;
}

interface ResolvedReferenceContext {
  readonly parseUnit: ParserCoreParseUnitResult;
  readonly reference: ParserCoreReferenceRecord;
  readonly fileNode: FileGraphNode;
  readonly symbolNode: SymbolGraphNode;
  readonly resolved: GraphBuilderResolvedSymbolReference;
}

interface ReferenceResolutionAccumulator {
  readonly resolvedContexts: ResolvedReferenceContext[];
  readonly unresolvedReferences: GraphBuilderUnresolvedSymbolReference[];
}

const GRAPH_ID_HASH_LENGTH = 16;
const GRAPH_ID_MAX_TOKEN_LENGTH = 220;
const GRAPH_ID_SAFE_CHARACTER_PATTERN = /^[A-Za-z0-9._-]$/;
const TEXT_FIELD_MAX_LENGTH = 240;
const DESCRIPTION_MAX_LENGTH = 1200;

export function buildReferenceGraphFromParserResults(
  sourceGraph: GraphBuilderRelativeImportGraphResult
): GraphBuilderReferenceGraphResult {
  const normalizedSourceGraph = toSerializableGraphBuilderRelativeImportGraphResult(sourceGraph);
  const sourceParseBatch = toSerializableParserCoreParseBatchResult(normalizedSourceGraph.sourceGraph.sourceParseBatch);
  const fileNodesByPath = new Map(normalizedSourceGraph.fileNodes.map((node) => [node.file.path, node]));
  const symbolNodesByPathAndName = createSymbolNodesByPathAndName(normalizedSourceGraph.symbolNodes);
  const observedAt = normalizedSourceGraph.sourceGraph.sourceGraph.sourceGraph.sourceGraph.sourceStructure.packageManifestDetection.sourceScan.metadata.completedAt;
  const resolution = resolveParserReferences(
    sourceParseBatch.files,
    fileNodesByPath,
    symbolNodesByPathAndName
  );
  const referencesEdges = createReferencesEdges(resolution.resolvedContexts, observedAt);
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
  const summary = createReferenceGraphSummary(
    normalizedSourceGraph.summary,
    referencesEdges,
    resolution.resolvedContexts.map((context) => context.resolved),
    resolution.unresolvedReferences,
    sourceParseBatch,
    warnings.length,
    errors.length
  );

  return toSerializableGraphBuilderReferenceGraphResult({
    schemaVersion: GRAPH_BUILDER_REFERENCE_GRAPH_RESULT_SCHEMA_VERSION,
    status: determineReferenceGraphStatus(normalizedSourceGraph.status, sourceParseBatch.status, errors.length, warnings.length),
    sourceGraph: normalizedSourceGraph,
    sourceParseBatch,
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
    resolvedSymbolReferences: resolution.resolvedContexts.map((context) => context.resolved),
    unresolvedSymbolReferences: resolution.unresolvedReferences,
    warnings,
    errors,
    summary
  });
}

export const buildReferenceGraph = buildReferenceGraphFromParserResults;

export function isGraphBuilderReferenceGraphResult(
  value: unknown
): value is GraphBuilderReferenceGraphResult {
  try {
    toSerializableGraphBuilderReferenceGraphResult(value as GraphBuilderReferenceGraphResult);
    return true;
  } catch {
    return false;
  }
}

export function assertGraphBuilderReferenceGraphResult(
  value: unknown
): asserts value is GraphBuilderReferenceGraphResult {
  toSerializableGraphBuilderReferenceGraphResult(value as GraphBuilderReferenceGraphResult);
}

export function toSerializableGraphBuilderReferenceGraphResult(
  result: GraphBuilderReferenceGraphResult
): GraphBuilderReferenceGraphResult {
  assertPlainObject(result, 'Graph builder reference graph result');

  if (result.schemaVersion !== GRAPH_BUILDER_REFERENCE_GRAPH_RESULT_SCHEMA_VERSION) {
    throw new RangeError('Graph builder reference graph result schema version is unsupported.');
  }

  const sourceGraph = toSerializableGraphBuilderRelativeImportGraphResult(result.sourceGraph);
  const sourceParseBatch = toSerializableParserCoreParseBatchResult(result.sourceParseBatch);
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
  const referencesEdges = normalizeReferencesEdges(result.referencesEdges);
  const resolvedRelativeImportReferences = sourceGraph.resolvedRelativeImportReferences;
  const unresolvedImportReferences = sourceGraph.unresolvedImportReferences;
  const resolvedSymbolReferences = normalizeResolvedSymbolReferences(result.resolvedSymbolReferences);
  const unresolvedSymbolReferences = normalizeUnresolvedSymbolReferences(result.unresolvedSymbolReferences);
  const warnings = sourceGraph.warnings;
  const errors = sourceGraph.errors;
  const snapshot = toSerializableCanonicalGraphSnapshot(result.snapshot);
  const summary = normalizeReferenceGraphSummary(
    result.summary,
    sourceGraph.summary,
    referencesEdges,
    resolvedSymbolReferences,
    unresolvedSymbolReferences,
    sourceParseBatch,
    warnings.length,
    errors.length
  );
  const expectedStatus = determineReferenceGraphStatus(sourceGraph.status, sourceParseBatch.status, errors.length, warnings.length);

  if (result.status !== expectedStatus) {
    throw new RangeError('Graph builder reference graph status is inconsistent.');
  }

  assertSourceGraphShape(sourceGraph, projectNode, folderNodes, fileNodes, packageNodes, symbolNodes, containsEdges, dependencyEdges, importsEdges, exportsEdges, declaresEdges);
  assertReferenceSnapshotShape(
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
    schemaVersion: GRAPH_BUILDER_REFERENCE_GRAPH_RESULT_SCHEMA_VERSION,
    status: result.status,
    sourceGraph,
    sourceParseBatch,
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
    unresolvedSymbolReferences,
    warnings,
    errors,
    summary
  };
}

function createSymbolNodesByPathAndName(
  symbolNodes: readonly SymbolGraphNode[]
): ReadonlyMap<string, readonly SymbolGraphNode[]> {
  const map = new Map<string, SymbolGraphNode[]>();

  for (const symbolNode of symbolNodes) {
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

function resolveParserReferences(
  parseUnits: readonly ParserCoreParseUnitResult[],
  fileNodesByPath: ReadonlyMap<string, FileGraphNode>,
  symbolNodesByPathAndName: ReadonlyMap<string, readonly SymbolGraphNode[]>
): ReferenceResolutionAccumulator {
  const resolvedContexts: ResolvedReferenceContext[] = [];
  const unresolvedReferences: GraphBuilderUnresolvedSymbolReference[] = [];

  for (const parseUnit of parseUnits) {
    if (parseUnit.status === 'failed' || parseUnit.status === 'skipped') {
      continue;
    }

    const fileNode = fileNodesByPath.get(parseUnit.file.path);

    for (const reference of parseUnit.references) {
      if (fileNode === undefined) {
        unresolvedReferences.push(createUnresolvedSymbolReference(parseUnit, reference, 'missing-file-node'));
        continue;
      }

      const matchingSymbols = symbolNodesByPathAndName.get(toSymbolLookupKey(parseUnit.file.path, reference.targetName)) ?? [];

      if (matchingSymbols.length === 0) {
        unresolvedReferences.push(createUnresolvedSymbolReference(parseUnit, reference, 'no-local-symbol-match'));
        continue;
      }

      if (matchingSymbols.length > 1) {
        unresolvedReferences.push(createUnresolvedSymbolReference(parseUnit, reference, 'ambiguous-local-symbol-match'));
        continue;
      }

      const symbolNode = matchingSymbols[0];

      if (symbolNode === undefined) {
        unresolvedReferences.push(createUnresolvedSymbolReference(parseUnit, reference, 'no-local-symbol-match'));
        continue;
      }

      const resolved = createResolvedSymbolReference(parseUnit, reference, symbolNode);

      resolvedContexts.push({
        parseUnit,
        reference,
        fileNode,
        symbolNode,
        resolved
      });
    }
  }

  return {
    resolvedContexts: resolvedContexts.sort(compareResolvedReferenceContexts),
    unresolvedReferences: unresolvedReferences.sort(compareUnresolvedSymbolReferences)
  };
}

function createResolvedSymbolReference(
  parseUnit: ParserCoreParseUnitResult,
  reference: ParserCoreReferenceRecord,
  symbolNode: SymbolGraphNode
): GraphBuilderResolvedSymbolReference {
  return {
    filePath: parseUnit.file.path,
    targetName: reference.targetName,
    referenceKind: reference.kind,
    resolvedSymbolNodeId: symbolNode.id,
    resolvedSymbolName: symbolNode.symbol.name,
    resolution: 'same-file-symbol-name',
    ...(reference.range === undefined ? {} : { range: toGraphSourceRange(reference.range) })
  };
}

function createUnresolvedSymbolReference(
  parseUnit: ParserCoreParseUnitResult,
  reference: ParserCoreReferenceRecord,
  reason: GraphBuilderUnresolvedSymbolReference['reason']
): GraphBuilderUnresolvedSymbolReference {
  return {
    filePath: parseUnit.file.path,
    targetName: reference.targetName,
    referenceKind: reference.kind,
    reason,
    ...(reference.range === undefined ? {} : { range: toGraphSourceRange(reference.range) })
  };
}

function createReferencesEdges(
  contexts: readonly ResolvedReferenceContext[],
  observedAt: string
): readonly ReferencesGraphEdge[] {
  return contexts
    .map((context, index) => createReferencesEdge(context, index, observedAt))
    .sort(compareEdges);
}

function createReferencesEdge(
  context: ResolvedReferenceContext,
  index: number,
  observedAt: string
): ReferencesGraphEdge {
  return toSerializableGraphEdge({
    schemaVersion: GRAPH_EDGE_SCHEMA_VERSION,
    id: createGraphEdgeId(toGraphEdgeIdToken(
      'references',
      context.fileNode.id,
      context.symbolNode.id,
      context.reference.targetName,
      context.reference.kind,
      context.reference.range?.start.offset.toString() ?? `index-${index}`
    )),
    kind: 'references',
    fromNodeId: context.fileNode.id,
    toNodeId: context.symbolNode.id,
    direction: 'directed',
    attributes: createEdgeAttributes({
      'relationship.source': 'parser-core',
      'reference.targetName': context.reference.targetName,
      'reference.kind': context.reference.kind,
      'reference.resolution': context.resolved.resolution
    }),
    confidence: probableConfidence('Reference edge is derived from parser-core reference metadata and resolved by same-file symbol name only.'),
    provenance: [createReferenceProvenance(context.parseUnit.file.path, context.reference.targetName, observedAt)],
    source: {
      path: parseRepositoryPath(context.parseUnit.file.path),
      ...(context.reference.range === undefined ? {} : { range: toGraphSourceRange(context.reference.range) })
    }
  }) as ReferencesGraphEdge;
}

function createReferenceGraphSummary(
  sourceSummary: GraphBuilderRelativeImportGraphSummary,
  referencesEdges: readonly ReferencesGraphEdge[],
  resolvedReferences: readonly GraphBuilderResolvedSymbolReference[],
  unresolvedReferences: readonly GraphBuilderUnresolvedSymbolReference[],
  parseBatch: ParserCoreParseBatchResult,
  warningCount: number,
  errorCount: number
): GraphBuilderReferenceGraphSummary {
  if (referencesEdges.length !== resolvedReferences.length) {
    throw new RangeError('Graph builder reference graph resolved reference count must match reference edge count.');
  }

  return {
    ...sourceSummary,
    referenceEdgeCount: referencesEdges.length,
    resolvedSymbolReferenceCount: resolvedReferences.length,
    unresolvedSymbolReferenceCount: unresolvedReferences.length,
    parserReferenceCount: parseBatch.summary.referenceCount,
    totalEdgeCount: sourceSummary.totalEdgeCount + referencesEdges.length,
    warningCount,
    errorCount
  };
}

function normalizeReferenceGraphSummary(
  summary: GraphBuilderReferenceGraphSummary,
  sourceSummary: GraphBuilderRelativeImportGraphSummary,
  referencesEdges: readonly ReferencesGraphEdge[],
  resolvedReferences: readonly GraphBuilderResolvedSymbolReference[],
  unresolvedReferences: readonly GraphBuilderUnresolvedSymbolReference[],
  parseBatch: ParserCoreParseBatchResult,
  warningCount: number,
  errorCount: number
): GraphBuilderReferenceGraphSummary {
  assertPlainObject(summary, 'Graph builder reference graph summary');

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
    totalEdgeCount: normalizeNonNegativeInteger(summary.totalEdgeCount, 'summary.totalEdgeCount'),
    warningCount: normalizeNonNegativeInteger(summary.warningCount, 'summary.warningCount'),
    errorCount: normalizeNonNegativeInteger(summary.errorCount, 'summary.errorCount')
  };
  const expected = createReferenceGraphSummary(
    sourceSummary,
    referencesEdges,
    resolvedReferences,
    unresolvedReferences,
    parseBatch,
    warningCount,
    errorCount
  );

  if (!referenceGraphSummariesEqual(normalized, expected)) {
    throw new RangeError('Graph builder reference graph summary is inconsistent.');
  }

  return expected;
}

function referenceGraphSummariesEqual(
  left: GraphBuilderReferenceGraphSummary,
  right: GraphBuilderReferenceGraphSummary
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
    && left.totalEdgeCount === right.totalEdgeCount
    && left.warningCount === right.warningCount
    && left.errorCount === right.errorCount;
}

function determineReferenceGraphStatus(
  sourceGraphStatus: GraphBuilderStatus,
  parseBatchStatus: string,
  errorCount: number,
  warningCount: number
): GraphBuilderStatus {
  if (sourceGraphStatus === 'failed' || parseBatchStatus === 'failed' || errorCount > 0) {
    return 'failed';
  }

  if (sourceGraphStatus === 'partial' || parseBatchStatus === 'partial' || parseBatchStatus === 'skipped' || warningCount > 0) {
    return 'partial';
  }

  return 'completed';
}

function assertSourceGraphShape(
  sourceGraph: GraphBuilderRelativeImportGraphResult,
  projectNode: ProjectGraphNode,
  folderNodes: readonly FolderGraphNode[],
  fileNodes: readonly FileGraphNode[],
  packageNodes: readonly PackageGraphNode[],
  symbolNodes: readonly SymbolGraphNode[],
  containsEdges: GraphBuilderRelativeImportGraphResult['containsEdges'],
  dependencyEdges: GraphBuilderRelativeImportGraphResult['dependencyEdges'],
  importsEdges: readonly ImportsGraphEdge[],
  exportsEdges: readonly ExportsGraphEdge[],
  declaresEdges: readonly DeclaresGraphEdge[]
): void {
  if (sourceGraph.projectNode.id !== projectNode.id) {
    throw new RangeError('Graph builder reference graph project node must match source graph.');
  }

  if (sourceGraph.folderNodes.length !== folderNodes.length
    || sourceGraph.fileNodes.length !== fileNodes.length
    || sourceGraph.packageNodes.length !== packageNodes.length
    || sourceGraph.symbolNodes.length !== symbolNodes.length) {
    throw new RangeError('Graph builder reference graph source node counts are inconsistent.');
  }

  if (sourceGraph.containsEdges.length !== containsEdges.length
    || sourceGraph.dependencyEdges.length !== dependencyEdges.length
    || sourceGraph.importsEdges.length !== importsEdges.length
    || sourceGraph.exportsEdges.length !== exportsEdges.length
    || sourceGraph.declaresEdges.length !== declaresEdges.length) {
    throw new RangeError('Graph builder reference graph source edge counts are inconsistent.');
  }
}

function assertReferenceSnapshotShape(
  snapshot: CanonicalGraphSnapshot,
  projectNode: ProjectGraphNode,
  folderNodes: readonly FolderGraphNode[],
  fileNodes: readonly FileGraphNode[],
  packageNodes: readonly PackageGraphNode[],
  symbolNodes: readonly SymbolGraphNode[],
  containsEdges: GraphBuilderRelativeImportGraphResult['containsEdges'],
  dependencyEdges: GraphBuilderRelativeImportGraphResult['dependencyEdges'],
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
    throw new RangeError('Graph builder reference graph snapshot root must be the project node.');
  }

  if (snapshot.nodes.length !== expectedNodeIds.size || snapshot.edges.length !== expectedEdgeIds.size) {
    throw new RangeError('Graph builder reference graph snapshot counts are inconsistent.');
  }

  for (const node of snapshot.nodes) {
    if (!expectedNodeIds.has(node.id)) {
      throw new RangeError(`Graph builder reference graph snapshot includes unexpected node ${node.id}.`);
    }
  }

  for (const edge of snapshot.edges) {
    if (!expectedEdgeIds.has(edge.id)) {
      throw new RangeError(`Graph builder reference graph snapshot includes unexpected edge ${edge.id}.`);
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

function normalizeReferencesEdges(edges: readonly ReferencesGraphEdge[]): readonly ReferencesGraphEdge[] {
  return requireArray(edges, 'referencesEdges')
    .map((edge) => toSerializableGraphEdge(edge) as ReferencesGraphEdge)
    .sort(compareEdges);
}

function normalizeResolvedSymbolReferences(
  references: readonly GraphBuilderResolvedSymbolReference[]
): readonly GraphBuilderResolvedSymbolReference[] {
  return requireArray(references, 'resolvedSymbolReferences')
    .map((reference) => ({
      filePath: normalizeText(reference.filePath, 'resolvedSymbolReference.filePath', TEXT_FIELD_MAX_LENGTH),
      targetName: normalizeText(reference.targetName, 'resolvedSymbolReference.targetName', TEXT_FIELD_MAX_LENGTH),
      referenceKind: reference.referenceKind,
      resolvedSymbolNodeId: normalizeText(reference.resolvedSymbolNodeId, 'resolvedSymbolReference.resolvedSymbolNodeId', TEXT_FIELD_MAX_LENGTH),
      resolvedSymbolName: normalizeText(reference.resolvedSymbolName, 'resolvedSymbolReference.resolvedSymbolName', TEXT_FIELD_MAX_LENGTH),
      resolution: reference.resolution,
      ...(reference.range === undefined ? {} : { range: reference.range })
    }))
    .sort(compareResolvedSymbolReferences);
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

function toGraphSourceRange(range: ParserCoreTextRange): SourceRange {
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

function toSymbolLookupKey(path: string, name: string): string {
  return `${path}\u0000${name}`;
}

function createReferenceProvenance(
  filePath: string,
  targetName: string,
  observedAt: string
): GraphProvenanceRecord {
  return {
    schemaVersion: GRAPH_PROVENANCE_SCHEMA_VERSION,
    type: 'static-analysis',
    producer: {
      name: GRAPH_BUILDER_REFERENCE_PRODUCER_NAME,
      version: GRAPH_BUILDER_REFERENCE_PRODUCER_VERSION
    },
    evidence: [
      {
        type: 'source-location',
        value: filePath,
        label: targetName
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

function compareResolvedReferenceContexts(
  left: ResolvedReferenceContext,
  right: ResolvedReferenceContext
): number {
  return compareText(left.parseUnit.file.path, right.parseUnit.file.path)
    || compareText(left.reference.targetName, right.reference.targetName)
    || compareText(left.reference.kind, right.reference.kind)
    || compareText(left.reference.range?.start.offset.toString() ?? '', right.reference.range?.start.offset.toString() ?? '')
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

function compareResolvedSymbolReferences(
  left: GraphBuilderResolvedSymbolReference,
  right: GraphBuilderResolvedSymbolReference
): number {
  return compareText(left.filePath, right.filePath)
    || compareText(left.targetName, right.targetName)
    || compareText(left.referenceKind, right.referenceKind)
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

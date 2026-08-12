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
  type DeclaresGraphEdge,
  type FileGraphNode,
  type FolderGraphNode,
  type GraphConfidence,
  type GraphEdgeAttributes,
  type GraphNodeAnalysisMetadata,
  type GraphNodeDisplay,
  type GraphNodeFacet,
  type GraphNodeId,
  type GraphProvenanceRecord,
  type GraphSymbolExportKind,
  type GraphSymbolKind,
  type PackageGraphNode,
  type ProjectGraphNode,
  type SourceRange,
  type SymbolGraphNode
} from '@codestellation/graph-model';
import {
  toSerializableParserCoreParseBatchResult,
  type ParserCoreExportKind,
  type ParserCoreExportRecord,
  type ParserCoreParseBatchResult,
  type ParserCoreParseUnitResult,
  type ParserCoreSymbolKind,
  type ParserCoreSymbolRecord,
  type ParserCoreTextRange
} from '@codestellation/parser-core';
import {
  toSerializableGraphBuilderImportExportGraphResult,
  type GraphBuilderImportExportGraphResult,
  type GraphBuilderImportExportGraphSummary
} from './import-export-edges.js';
import type {
  GraphBuilderDiagnostic,
  GraphBuilderStatus
} from './project-file-nodes.js';

export const GRAPH_BUILDER_SYMBOL_GRAPH_RESULT_SCHEMA_VERSION = 1 as const;
export const GRAPH_BUILDER_SYMBOL_RULESET_VERSION = 1 as const;
const GRAPH_BUILDER_SYMBOL_PRODUCER_NAME = 'graph-builder' as const;
const GRAPH_BUILDER_SYMBOL_PRODUCER_VERSION = '0.1.0' as const;

export interface GraphBuilderSymbolGraphSummary extends GraphBuilderImportExportGraphSummary {
  readonly symbolNodeCount: number;
  readonly declaresEdgeCount: number;
  readonly parsedFileCount: number;
  readonly parserDiagnosticCount: number;
}

export interface GraphBuilderSymbolGraphResult {
  readonly schemaVersion: typeof GRAPH_BUILDER_SYMBOL_GRAPH_RESULT_SCHEMA_VERSION;
  readonly status: GraphBuilderStatus;
  readonly sourceGraph: GraphBuilderImportExportGraphResult;
  readonly sourceParseBatch: ParserCoreParseBatchResult;
  readonly snapshot: CanonicalGraphSnapshot;
  readonly projectNode: ProjectGraphNode;
  readonly folderNodes: readonly FolderGraphNode[];
  readonly fileNodes: readonly FileGraphNode[];
  readonly packageNodes: readonly PackageGraphNode[];
  readonly symbolNodes: readonly SymbolGraphNode[];
  readonly containsEdges: GraphBuilderImportExportGraphResult['containsEdges'];
  readonly dependencyEdges: GraphBuilderImportExportGraphResult['dependencyEdges'];
  readonly importsEdges: GraphBuilderImportExportGraphResult['importsEdges'];
  readonly exportsEdges: GraphBuilderImportExportGraphResult['exportsEdges'];
  readonly declaresEdges: readonly DeclaresGraphEdge[];
  readonly unresolvedImportReferences: GraphBuilderImportExportGraphResult['unresolvedImportReferences'];
  readonly warnings: readonly GraphBuilderDiagnostic[];
  readonly errors: readonly GraphBuilderDiagnostic[];
  readonly summary: GraphBuilderSymbolGraphSummary;
}

interface SymbolNodeContext {
  readonly parseUnit: ParserCoreParseUnitResult;
  readonly symbol: ParserCoreSymbolRecord;
  readonly exportRecord: ParserCoreExportRecord | undefined;
  readonly fileNode: FileGraphNode;
  readonly node: SymbolGraphNode;
}

const GRAPH_ID_HASH_LENGTH = 16;
const GRAPH_ID_MAX_TOKEN_LENGTH = 220;
const GRAPH_ID_SAFE_CHARACTER_PATTERN = /^[A-Za-z0-9._-]$/;
const TEXT_FIELD_MAX_LENGTH = 240;
const DESCRIPTION_MAX_LENGTH = 1200;

export function buildSymbolGraphFromParserResults(
  sourceGraph: GraphBuilderImportExportGraphResult,
  sourceParseBatch: ParserCoreParseBatchResult
): GraphBuilderSymbolGraphResult {
  const normalizedSourceGraph = toSerializableGraphBuilderImportExportGraphResult(sourceGraph);
  const normalizedParseBatch = toSerializableParserCoreParseBatchResult(sourceParseBatch);
  const fileNodesByPath = new Map(normalizedSourceGraph.fileNodes.map((node) => [node.file.path, node]));
  const observedAt = normalizedSourceGraph.sourceGraph.sourceGraph.sourceStructure.packageManifestDetection.sourceScan.metadata.completedAt;
  const symbolContexts = createSymbolNodeContexts(normalizedParseBatch.files, fileNodesByPath, observedAt);
  const symbolNodes = symbolContexts.map((context) => context.node).sort(compareSymbolNodes);
  const declaresEdges = createDeclaresEdges(symbolContexts, observedAt);
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
      ...symbolNodes
    ],
    edges: [
      ...normalizedSourceGraph.containsEdges,
      ...normalizedSourceGraph.dependencyEdges,
      ...normalizedSourceGraph.importsEdges,
      ...normalizedSourceGraph.exportsEdges,
      ...declaresEdges
    ]
  });
  const summary = createSymbolGraphSummary(
    normalizedSourceGraph.summary,
    symbolNodes,
    declaresEdges,
    normalizedParseBatch,
    warnings.length,
    errors.length
  );

  return toSerializableGraphBuilderSymbolGraphResult({
    schemaVersion: GRAPH_BUILDER_SYMBOL_GRAPH_RESULT_SCHEMA_VERSION,
    status: determineSymbolGraphStatus(
      normalizedSourceGraph.status,
      normalizedParseBatch.status,
      errors.length,
      warnings.length
    ),
    sourceGraph: normalizedSourceGraph,
    sourceParseBatch: normalizedParseBatch,
    snapshot,
    projectNode: normalizedSourceGraph.projectNode,
    folderNodes: normalizedSourceGraph.folderNodes,
    fileNodes: normalizedSourceGraph.fileNodes,
    packageNodes: normalizedSourceGraph.packageNodes,
    symbolNodes,
    containsEdges: normalizedSourceGraph.containsEdges,
    dependencyEdges: normalizedSourceGraph.dependencyEdges,
    importsEdges: normalizedSourceGraph.importsEdges,
    exportsEdges: normalizedSourceGraph.exportsEdges,
    declaresEdges,
    unresolvedImportReferences: normalizedSourceGraph.unresolvedImportReferences,
    warnings,
    errors,
    summary
  });
}

export const buildSymbolGraph = buildSymbolGraphFromParserResults;

export function isGraphBuilderSymbolGraphResult(
  value: unknown
): value is GraphBuilderSymbolGraphResult {
  try {
    toSerializableGraphBuilderSymbolGraphResult(value as GraphBuilderSymbolGraphResult);
    return true;
  } catch {
    return false;
  }
}

export function assertGraphBuilderSymbolGraphResult(
  value: unknown
): asserts value is GraphBuilderSymbolGraphResult {
  toSerializableGraphBuilderSymbolGraphResult(value as GraphBuilderSymbolGraphResult);
}

export function toSerializableGraphBuilderSymbolGraphResult(
  result: GraphBuilderSymbolGraphResult
): GraphBuilderSymbolGraphResult {
  assertPlainObject(result, 'Graph builder symbol graph result');

  if (result.schemaVersion !== GRAPH_BUILDER_SYMBOL_GRAPH_RESULT_SCHEMA_VERSION) {
    throw new RangeError('Graph builder symbol graph result schema version is unsupported.');
  }

  const sourceGraph = toSerializableGraphBuilderImportExportGraphResult(result.sourceGraph);
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
  const declaresEdges = normalizeDeclaresEdges(result.declaresEdges);
  const unresolvedImportReferences = sourceGraph.unresolvedImportReferences;
  const warnings = sourceGraph.warnings;
  const errors = sourceGraph.errors;
  const snapshot = toSerializableCanonicalGraphSnapshot(result.snapshot);
  const summary = normalizeSymbolGraphSummary(
    result.summary,
    sourceGraph.summary,
    symbolNodes,
    declaresEdges,
    sourceParseBatch,
    warnings.length,
    errors.length
  );
  const expectedStatus = determineSymbolGraphStatus(
    sourceGraph.status,
    sourceParseBatch.status,
    errors.length,
    warnings.length
  );

  if (result.status !== expectedStatus) {
    throw new RangeError('Graph builder symbol graph status is inconsistent.');
  }

  assertSourceGraphShape(sourceGraph, projectNode, folderNodes, fileNodes, packageNodes, containsEdges, dependencyEdges, importsEdges, exportsEdges);
  assertSymbolSnapshotShape(
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
    schemaVersion: GRAPH_BUILDER_SYMBOL_GRAPH_RESULT_SCHEMA_VERSION,
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
    unresolvedImportReferences,
    warnings,
    errors,
    summary
  };
}

function createSymbolNodeContexts(
  parseUnits: readonly ParserCoreParseUnitResult[],
  fileNodesByPath: ReadonlyMap<string, FileGraphNode>,
  observedAt: string
): readonly SymbolNodeContext[] {
  return parseUnits.flatMap((parseUnit) => {
    const fileNode = fileNodesByPath.get(parseUnit.file.path);

    if (fileNode === undefined || parseUnit.status === 'failed' || parseUnit.status === 'skipped') {
      return [];
    }

    return parseUnit.symbols.map((symbol) => {
      const exportRecord = findSymbolExportRecord(symbol, parseUnit.exports);

      return {
        parseUnit,
        symbol,
        exportRecord,
        fileNode,
        node: createSymbolNode(fileNode, parseUnit, symbol, exportRecord, observedAt)
      };
    });
  }).sort(compareSymbolNodeContexts);
}

function createSymbolNode(
  fileNode: FileGraphNode,
  parseUnit: ParserCoreParseUnitResult,
  symbol: ParserCoreSymbolRecord,
  exportRecord: ParserCoreExportRecord | undefined,
  observedAt: string
): SymbolGraphNode {
  const graphSymbolKind = toGraphSymbolKind(symbol.kind);
  const exportKind = toGraphSymbolExportKind(exportRecord?.kind);
  const qualifiedNameFacets = symbol.qualifiedName === undefined
    ? []
    : [facet('symbol.qualifiedName', symbol.qualifiedName)];
  const exportFacets = exportRecord === undefined
    ? []
    : [
        facet('symbol.exportKind', exportRecord.kind),
        facet('symbol.typeOnlyExport', (exportRecord.kind === 'type-only').toString())
      ];

  return toSerializableGraphNode({
    schemaVersion: GRAPH_NODE_SCHEMA_VERSION,
    id: createGraphNodeId(toGraphNodeIdToken('symbol', parseUnit.file.path, symbol.localId)),
    kind: 'symbol',
    parentId: fileNode.id,
    display: createDisplay(symbol.name, `${graphSymbolKind} symbol`, parseUnit.file.path),
    analysis: createAnalysis([
      'symbol',
      `symbol-${graphSymbolKind}`,
      `parser-${parseUnit.parser.id}`,
      exportRecord === undefined ? 'unexported' : 'exported'
    ], [
      facet('symbol.localId', symbol.localId),
      facet('symbol.parserKind', symbol.kind),
      facet('symbol.parserId', parseUnit.parser.id),
      facet('symbol.parserVersion', parseUnit.parser.version),
      facet('symbol.language', parseUnit.file.language),
      facet('symbol.filePath', parseUnit.file.path),
      ...qualifiedNameFacets,
      ...exportFacets
    ]),
    confidence: probableConfidence('Symbol node is derived from normalized parser-core symbol metadata.'),
    provenance: [createParserProvenance(parseUnit.file.path, symbol.name, observedAt)],
    symbol: {
      name: symbol.name,
      symbolKind: graphSymbolKind,
      exportKind,
      path: parseRepositoryPath(parseUnit.file.path),
      ...(symbol.range === undefined ? {} : { range: toGraphSourceRange(symbol.range) })
    }
  }) as SymbolGraphNode;
}

function createDeclaresEdges(
  symbolContexts: readonly SymbolNodeContext[],
  observedAt: string
): readonly DeclaresGraphEdge[] {
  return symbolContexts
    .map((context, index) => createDeclaresEdge(context, index, observedAt))
    .sort(compareEdges);
}

function createDeclaresEdge(
  context: SymbolNodeContext,
  index: number,
  observedAt: string
): DeclaresGraphEdge {
  return toSerializableGraphEdge({
    schemaVersion: GRAPH_EDGE_SCHEMA_VERSION,
    id: createGraphEdgeId(toGraphEdgeIdToken(
      'declares',
      context.fileNode.id,
      context.node.id,
      createSymbolReferenceToken(context.symbol, index)
    )),
    kind: 'declares',
    fromNodeId: context.fileNode.id,
    toNodeId: context.node.id,
    direction: 'directed',
    attributes: createEdgeAttributes({
      'relationship.source': 'parser-core',
      'symbol.name': context.symbol.name,
      'symbol.localId': context.symbol.localId,
      'symbol.parserKind': context.symbol.kind,
      'symbol.exportKind': context.exportRecord?.kind ?? 'none'
    }),
    confidence: probableConfidence('Declare edge is derived from normalized parser-core symbol metadata.'),
    provenance: [createParserProvenance(context.parseUnit.file.path, context.symbol.name, observedAt)],
    source: {
      path: parseRepositoryPath(context.parseUnit.file.path),
      ...(context.symbol.range === undefined ? {} : { range: toGraphSourceRange(context.symbol.range) })
    }
  }) as DeclaresGraphEdge;
}

function findSymbolExportRecord(
  symbol: ParserCoreSymbolRecord,
  exports: readonly ParserCoreExportRecord[]
): ParserCoreExportRecord | undefined {
  return exports.find((exportRecord) => exportRecord.name === symbol.name);
}

function toGraphSymbolKind(kind: ParserCoreSymbolKind): GraphSymbolKind {
  switch (kind) {
    case 'class':
    case 'component':
    case 'constant':
    case 'enum':
    case 'function':
    case 'hook':
    case 'interface':
    case 'method':
    case 'module':
    case 'type':
    case 'variable':
    case 'unknown':
      return kind;
    case 'property':
      return 'unknown';
  }
}

function toGraphSymbolExportKind(kind: ParserCoreExportKind | undefined): GraphSymbolExportKind {
  switch (kind) {
    case undefined:
      return 'none';
    case 'default':
      return 'default';
    case 'named':
    case 'type-only':
      return 'named';
    case 'namespace':
      return 'namespace';
    case 'unknown':
      return 'unknown';
  }
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

function createSymbolGraphSummary(
  sourceSummary: GraphBuilderImportExportGraphSummary,
  symbolNodes: readonly SymbolGraphNode[],
  declaresEdges: readonly DeclaresGraphEdge[],
  parseBatch: ParserCoreParseBatchResult,
  warningCount: number,
  errorCount: number
): GraphBuilderSymbolGraphSummary {
  return {
    ...sourceSummary,
    symbolNodeCount: symbolNodes.length,
    declaresEdgeCount: declaresEdges.length,
    parsedFileCount: parseBatch.summary.fileCount,
    parserDiagnosticCount: parseBatch.summary.diagnosticCount,
    totalNodeCount: sourceSummary.totalNodeCount + symbolNodes.length,
    totalEdgeCount: sourceSummary.totalEdgeCount + declaresEdges.length,
    warningCount,
    errorCount
  };
}

function normalizeSymbolGraphSummary(
  summary: GraphBuilderSymbolGraphSummary,
  sourceSummary: GraphBuilderImportExportGraphSummary,
  symbolNodes: readonly SymbolGraphNode[],
  declaresEdges: readonly DeclaresGraphEdge[],
  parseBatch: ParserCoreParseBatchResult,
  warningCount: number,
  errorCount: number
): GraphBuilderSymbolGraphSummary {
  assertPlainObject(summary, 'Graph builder symbol graph summary');

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
    totalEdgeCount: normalizeNonNegativeInteger(summary.totalEdgeCount, 'summary.totalEdgeCount'),
    warningCount: normalizeNonNegativeInteger(summary.warningCount, 'summary.warningCount'),
    errorCount: normalizeNonNegativeInteger(summary.errorCount, 'summary.errorCount')
  };
  const expected = createSymbolGraphSummary(
    sourceSummary,
    symbolNodes,
    declaresEdges,
    parseBatch,
    warningCount,
    errorCount
  );

  if (!symbolGraphSummariesEqual(normalized, expected)) {
    throw new RangeError('Graph builder symbol graph summary is inconsistent.');
  }

  return expected;
}


function symbolGraphSummariesEqual(
  left: GraphBuilderSymbolGraphSummary,
  right: GraphBuilderSymbolGraphSummary
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
    && left.totalEdgeCount === right.totalEdgeCount
    && left.warningCount === right.warningCount
    && left.errorCount === right.errorCount;
}

function determineSymbolGraphStatus(
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
  sourceGraph: GraphBuilderImportExportGraphResult,
  projectNode: ProjectGraphNode,
  folderNodes: readonly FolderGraphNode[],
  fileNodes: readonly FileGraphNode[],
  packageNodes: readonly PackageGraphNode[],
  containsEdges: GraphBuilderImportExportGraphResult['containsEdges'],
  dependencyEdges: GraphBuilderImportExportGraphResult['dependencyEdges'],
  importsEdges: GraphBuilderImportExportGraphResult['importsEdges'],
  exportsEdges: GraphBuilderImportExportGraphResult['exportsEdges']
): void {
  if (sourceGraph.projectNode.id !== projectNode.id) {
    throw new RangeError('Graph builder symbol graph project node must match source graph.');
  }

  if (sourceGraph.folderNodes.length !== folderNodes.length || sourceGraph.fileNodes.length !== fileNodes.length) {
    throw new RangeError('Graph builder symbol graph source node counts are inconsistent.');
  }

  if (sourceGraph.packageNodes.length !== packageNodes.length) {
    throw new RangeError('Graph builder symbol graph package node count must match source graph.');
  }

  if (sourceGraph.containsEdges.length !== containsEdges.length
    || sourceGraph.dependencyEdges.length !== dependencyEdges.length
    || sourceGraph.importsEdges.length !== importsEdges.length
    || sourceGraph.exportsEdges.length !== exportsEdges.length) {
    throw new RangeError('Graph builder symbol graph source edge counts are inconsistent.');
  }
}

function assertSymbolSnapshotShape(
  snapshot: CanonicalGraphSnapshot,
  projectNode: ProjectGraphNode,
  folderNodes: readonly FolderGraphNode[],
  fileNodes: readonly FileGraphNode[],
  packageNodes: readonly PackageGraphNode[],
  symbolNodes: readonly SymbolGraphNode[],
  containsEdges: GraphBuilderImportExportGraphResult['containsEdges'],
  dependencyEdges: GraphBuilderImportExportGraphResult['dependencyEdges'],
  importsEdges: GraphBuilderImportExportGraphResult['importsEdges'],
  exportsEdges: GraphBuilderImportExportGraphResult['exportsEdges'],
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
    throw new RangeError('Graph builder symbol graph snapshot root must be the project node.');
  }

  if (snapshot.nodes.length !== expectedNodeIds.size || snapshot.edges.length !== expectedEdgeIds.size) {
    throw new RangeError('Graph builder symbol graph snapshot counts are inconsistent.');
  }

  for (const node of snapshot.nodes) {
    if (!expectedNodeIds.has(node.id)) {
      throw new RangeError(`Graph builder symbol graph snapshot includes unexpected node ${node.id}.`);
    }
  }

  for (const edge of snapshot.edges) {
    if (!expectedEdgeIds.has(edge.id)) {
      throw new RangeError(`Graph builder symbol graph snapshot includes unexpected edge ${edge.id}.`);
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

function normalizeDeclaresEdges(edges: readonly DeclaresGraphEdge[]): readonly DeclaresGraphEdge[] {
  return requireArray(edges, 'declaresEdges')
    .map((edge) => toSerializableGraphEdge(edge) as DeclaresGraphEdge)
    .sort(compareEdges);
}

function createAnalysis(tags: readonly string[], facets: readonly GraphNodeFacet[]): GraphNodeAnalysisMetadata {
  return {
    tags: [...new Set(tags.map(normalizeTag))].sort(compareStableText),
    facets: facets.map(toGraphFacet).sort(compareFacets)
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
  return { key, value };
}

function toGraphFacet(facetValue: GraphNodeFacet): GraphNodeFacet {
  return {
    key: normalizeFacetKey(facetValue.key),
    value: normalizeText(facetValue.value, `Graph node facet ${facetValue.key}`, TEXT_FIELD_MAX_LENGTH)
  };
}

function probableConfidence(rationale: string): GraphConfidence {
  return {
    level: 'probable',
    score: 0.9,
    rationale
  };
}

function createParserProvenance(
  filePath: string,
  symbolName: string,
  observedAt: string
): GraphProvenanceRecord {
  return {
    schemaVersion: GRAPH_PROVENANCE_SCHEMA_VERSION,
    type: 'static-analysis',
    producer: {
      name: GRAPH_BUILDER_SYMBOL_PRODUCER_NAME,
      version: GRAPH_BUILDER_SYMBOL_PRODUCER_VERSION
    },
    evidence: [
      {
        type: 'source-location',
        value: filePath,
        label: symbolName
      }
    ],
    observedAt
  };
}

function toGraphNodeIdToken(prefix: 'symbol', filePath: string, localId: string): string {
  return truncateGraphIdToken([
    prefix,
    filePath,
    localId
  ].map(encodeGraphIdSegment).join('/'));
}

function toGraphEdgeIdToken(
  kind: 'declares',
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

function createSymbolReferenceToken(symbol: ParserCoreSymbolRecord, index: number): string {
  return [
    symbol.localId,
    symbol.kind,
    symbol.range?.start.offset.toString() ?? `index-${index}`
  ].join('#');
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
    throw new RangeError('Graph builder symbol tag must be a stable graph-model tag token.');
  }

  return normalized;
}

function normalizeFacetKey(value: string): string {
  const normalized = value.trim();

  if (!/^[A-Za-z][A-Za-z0-9._:-]{0,79}$/.test(normalized)) {
    throw new RangeError('Graph builder symbol facet key must be a stable graph-model facet key.');
  }

  return normalized;
}

function requireArray<T>(value: readonly T[], label: string): readonly T[] {
  if (!Array.isArray(value)) {
    throw new RangeError(`${label} must be an array.`);
  }

  return value;
}

function assertPlainObject(value: unknown, fieldName: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RangeError(`${fieldName} must be a plain object.`);
  }
}

function compareFolderNodes(left: FolderGraphNode, right: FolderGraphNode): number {
  return compareStableText(left.folder.path, right.folder.path);
}

function compareFileNodes(left: FileGraphNode, right: FileGraphNode): number {
  return compareStableText(left.file.path, right.file.path);
}

function comparePackageNodes(left: PackageGraphNode, right: PackageGraphNode): number {
  return compareStableText(`${left.package.manifestPath ?? ''}:${left.package.name}`, `${right.package.manifestPath ?? ''}:${right.package.name}`);
}

function compareSymbolNodes(left: SymbolGraphNode, right: SymbolGraphNode): number {
  return compareStableText(`${left.symbol.path}:${left.symbol.name}:${left.id}`, `${right.symbol.path}:${right.symbol.name}:${right.id}`);
}

function compareSymbolNodeContexts(left: SymbolNodeContext, right: SymbolNodeContext): number {
  return compareStableText(left.parseUnit.file.path, right.parseUnit.file.path)
    || compareStableText(left.symbol.name, right.symbol.name)
    || compareStableText(left.symbol.localId, right.symbol.localId);
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

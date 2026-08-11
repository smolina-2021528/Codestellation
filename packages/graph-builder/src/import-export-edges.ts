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
  type ExportsGraphEdge,
  type FileGraphNode,
  type FolderGraphNode,
  type GraphConfidence,
  type GraphEdgeAttributes,
  type GraphNodeAnalysisMetadata,
  type GraphNodeDisplay,
  type GraphNodeFacet,
  type GraphNodeId,
  type GraphProvenanceRecord,
  type ImportsGraphEdge,
  type PackageGraphNode,
  type ProjectGraphNode
} from '@codestellation/graph-model';
import {
  toSerializableAnalyzerStaticImportExportAnalysisResult,
  type AnalyzerStaticExportReference,
  type AnalyzerStaticImportExportAnalysisResult,
  type AnalyzerStaticImportReference,
  type AnalyzerStaticModuleSpecifierKind
} from '@codestellation/analyzer-static';
import {
  toSerializableGraphBuilderPackageDependencyGraphResult,
  type GraphBuilderPackageDependencyGraphResult,
  type GraphBuilderPackageDependencyGraphSummary
} from './package-dependency-edges.js';
import type {
  GraphBuilderDiagnostic,
  GraphBuilderStatus
} from './project-file-nodes.js';

export const GRAPH_BUILDER_IMPORT_EXPORT_GRAPH_RESULT_SCHEMA_VERSION = 1 as const;
export const GRAPH_BUILDER_IMPORT_EXPORT_RULESET_VERSION = 1 as const;
const GRAPH_BUILDER_IMPORT_EXPORT_PRODUCER_NAME = 'graph-builder' as const;
const GRAPH_BUILDER_IMPORT_EXPORT_PRODUCER_VERSION = '0.1.0' as const;

export interface GraphBuilderUnresolvedImportReference {
  readonly filePath: string;
  readonly moduleSpecifier: string;
  readonly specifierKind: AnalyzerStaticModuleSpecifierKind;
  readonly importKind: string;
  readonly isTypeOnly: boolean;
  readonly isDynamic: boolean;
  readonly reason: 'relative-module-resolution-deferred' | 'absolute-module-resolution-deferred' | 'unknown-module-specifier-kind';
}

export interface GraphBuilderImportExportGraphSummary extends GraphBuilderPackageDependencyGraphSummary {
  readonly localPackageNodeCount: number;
  readonly externalPackageNodeCount: number;
  readonly importsEdgeCount: number;
  readonly exportsEdgeCount: number;
  readonly unresolvedImportReferenceCount: number;
}

export interface GraphBuilderImportExportGraphResult {
  readonly schemaVersion: typeof GRAPH_BUILDER_IMPORT_EXPORT_GRAPH_RESULT_SCHEMA_VERSION;
  readonly status: GraphBuilderStatus;
  readonly sourceGraph: GraphBuilderPackageDependencyGraphResult;
  readonly sourceAnalysis: AnalyzerStaticImportExportAnalysisResult;
  readonly snapshot: CanonicalGraphSnapshot;
  readonly projectNode: ProjectGraphNode;
  readonly folderNodes: readonly FolderGraphNode[];
  readonly fileNodes: readonly FileGraphNode[];
  readonly packageNodes: readonly PackageGraphNode[];
  readonly containsEdges: GraphBuilderPackageDependencyGraphResult['containsEdges'];
  readonly dependencyEdges: GraphBuilderPackageDependencyGraphResult['dependencyEdges'];
  readonly importsEdges: readonly ImportsGraphEdge[];
  readonly exportsEdges: readonly ExportsGraphEdge[];
  readonly unresolvedImportReferences: readonly GraphBuilderUnresolvedImportReference[];
  readonly warnings: readonly GraphBuilderDiagnostic[];
  readonly errors: readonly GraphBuilderDiagnostic[];
  readonly summary: GraphBuilderImportExportGraphSummary;
}

interface ImportResolutionAccumulator {
  readonly externalPackageNodes: Map<string, PackageGraphNode>;
  readonly importsEdges: ImportsGraphEdge[];
  readonly unresolvedImportReferences: GraphBuilderUnresolvedImportReference[];
}

const GRAPH_ID_HASH_LENGTH = 16;
const GRAPH_ID_MAX_TOKEN_LENGTH = 220;
const GRAPH_ID_SAFE_CHARACTER_PATTERN = /^[A-Za-z0-9._-]$/;
const TEXT_FIELD_MAX_LENGTH = 240;
const DESCRIPTION_MAX_LENGTH = 1200;

export function buildImportExportGraphFromStaticAnalysis(
  sourceGraph: GraphBuilderPackageDependencyGraphResult,
  sourceAnalysis: AnalyzerStaticImportExportAnalysisResult
): GraphBuilderImportExportGraphResult {
  const normalizedSourceGraph = toSerializableGraphBuilderPackageDependencyGraphResult(sourceGraph);
  const normalizedAnalysis = toSerializableAnalyzerStaticImportExportAnalysisResult(sourceAnalysis);
  const fileNodesByPath = new Map(normalizedSourceGraph.fileNodes.map((node) => [node.file.path, node]));
  const observedAt = normalizedSourceGraph.sourceGraph.sourceStructure.packageManifestDetection.sourceScan.metadata.completedAt;
  const importResolution = createImportEdges(normalizedAnalysis.imports, fileNodesByPath, observedAt);
  const localPackageNodes = normalizedSourceGraph.packageNodes;
  const allPackageNodes = [
    ...localPackageNodes,
    ...[...importResolution.externalPackageNodes.values()].sort(comparePackageNodes)
  ];
  const localPackageNodesByRootPath = createLocalPackageNodeRootIndex(localPackageNodes);
  const exportsEdges = createExportEdges(
    normalizedAnalysis.exports,
    fileNodesByPath,
    localPackageNodesByRootPath,
    normalizedSourceGraph.projectNode,
    observedAt
  );
  const warnings = normalizedSourceGraph.warnings;
  const errors = normalizedSourceGraph.errors;
  const snapshot = toSerializableCanonicalGraphSnapshot({
    schemaVersion: CANONICAL_GRAPH_SCHEMA_VERSION,
    rootNodeId: normalizedSourceGraph.projectNode.id,
    nodes: [
      normalizedSourceGraph.projectNode,
      ...normalizedSourceGraph.folderNodes,
      ...allPackageNodes,
      ...normalizedSourceGraph.fileNodes
    ],
    edges: [
      ...normalizedSourceGraph.containsEdges,
      ...normalizedSourceGraph.dependencyEdges,
      ...importResolution.importsEdges,
      ...exportsEdges
    ]
  });
  const summary = createImportExportGraphSummary(
    normalizedSourceGraph.summary,
    localPackageNodes.length,
    importResolution.externalPackageNodes.size,
    importResolution.importsEdges,
    exportsEdges,
    importResolution.unresolvedImportReferences,
    warnings.length,
    errors.length
  );

  return toSerializableGraphBuilderImportExportGraphResult({
    schemaVersion: GRAPH_BUILDER_IMPORT_EXPORT_GRAPH_RESULT_SCHEMA_VERSION,
    status: determineImportExportGraphStatus(
      normalizedSourceGraph.status,
      normalizedAnalysis.status,
      errors.length,
      warnings.length
    ),
    sourceGraph: normalizedSourceGraph,
    sourceAnalysis: normalizedAnalysis,
    snapshot,
    projectNode: normalizedSourceGraph.projectNode,
    folderNodes: normalizedSourceGraph.folderNodes,
    fileNodes: normalizedSourceGraph.fileNodes,
    packageNodes: allPackageNodes,
    containsEdges: normalizedSourceGraph.containsEdges,
    dependencyEdges: normalizedSourceGraph.dependencyEdges,
    importsEdges: importResolution.importsEdges,
    exportsEdges,
    unresolvedImportReferences: importResolution.unresolvedImportReferences,
    warnings,
    errors,
    summary
  });
}

export const buildImportExportGraph = buildImportExportGraphFromStaticAnalysis;

export function isGraphBuilderImportExportGraphResult(
  value: unknown
): value is GraphBuilderImportExportGraphResult {
  try {
    toSerializableGraphBuilderImportExportGraphResult(value as GraphBuilderImportExportGraphResult);
    return true;
  } catch {
    return false;
  }
}

export function assertGraphBuilderImportExportGraphResult(
  value: unknown
): asserts value is GraphBuilderImportExportGraphResult {
  toSerializableGraphBuilderImportExportGraphResult(value as GraphBuilderImportExportGraphResult);
}

export function toSerializableGraphBuilderImportExportGraphResult(
  result: GraphBuilderImportExportGraphResult
): GraphBuilderImportExportGraphResult {
  assertPlainObject(result, 'Graph builder import/export graph result');

  if (result.schemaVersion !== GRAPH_BUILDER_IMPORT_EXPORT_GRAPH_RESULT_SCHEMA_VERSION) {
    throw new RangeError('Graph builder import/export graph result schema version is unsupported.');
  }

  const sourceGraph = toSerializableGraphBuilderPackageDependencyGraphResult(result.sourceGraph);
  const sourceAnalysis = toSerializableAnalyzerStaticImportExportAnalysisResult(result.sourceAnalysis);
  const projectNode = toSerializableGraphNode(result.projectNode) as ProjectGraphNode;
  const folderNodes = normalizeFolderNodes(result.folderNodes);
  const fileNodes = normalizeFileNodes(result.fileNodes);
  const packageNodes = normalizePackageNodes(result.packageNodes);
  const containsEdges = sourceGraph.containsEdges;
  const dependencyEdges = sourceGraph.dependencyEdges;
  const importsEdges = normalizeImportsEdges(result.importsEdges);
  const exportsEdges = normalizeExportsEdges(result.exportsEdges);
  const unresolvedImportReferences = normalizeUnresolvedImportReferences(result.unresolvedImportReferences);
  const warnings = sourceGraph.warnings;
  const errors = sourceGraph.errors;
  const snapshot = toSerializableCanonicalGraphSnapshot(result.snapshot);
  const summary = normalizeImportExportGraphSummary(
    result.summary,
    sourceGraph.summary,
    sourceGraph.packageNodes.length,
    packageNodes.length - sourceGraph.packageNodes.length,
    importsEdges,
    exportsEdges,
    unresolvedImportReferences,
    warnings.length,
    errors.length
  );
  const expectedStatus = determineImportExportGraphStatus(
    sourceGraph.status,
    sourceAnalysis.status,
    errors.length,
    warnings.length
  );

  if (result.status !== expectedStatus) {
    throw new RangeError('Graph builder import/export graph status is inconsistent.');
  }

  assertSourceGraphShape(sourceGraph, projectNode, folderNodes, fileNodes, packageNodes, containsEdges, dependencyEdges);
  assertImportExportSnapshotShape(
    snapshot,
    projectNode,
    folderNodes,
    fileNodes,
    packageNodes,
    containsEdges,
    dependencyEdges,
    importsEdges,
    exportsEdges
  );

  return {
    schemaVersion: GRAPH_BUILDER_IMPORT_EXPORT_GRAPH_RESULT_SCHEMA_VERSION,
    status: result.status,
    sourceGraph,
    sourceAnalysis,
    snapshot,
    projectNode,
    folderNodes,
    fileNodes,
    packageNodes,
    containsEdges,
    dependencyEdges,
    importsEdges,
    exportsEdges,
    unresolvedImportReferences,
    warnings,
    errors,
    summary
  };
}

function createImportEdges(
  imports: readonly AnalyzerStaticImportReference[],
  fileNodesByPath: ReadonlyMap<string, FileGraphNode>,
  observedAt: string
): ImportResolutionAccumulator {
  const accumulator: ImportResolutionAccumulator = {
    externalPackageNodes: new Map(),
    importsEdges: [],
    unresolvedImportReferences: []
  };

  [...imports].sort(compareImportReferences).forEach((importReference, index) => {
    const fromNode = fileNodesByPath.get(importReference.filePath);

    if (fromNode === undefined) {
      return;
    }

    if (importReference.specifierKind === 'package' || importReference.specifierKind === 'builtin') {
      const packageName = getExternalPackageName(importReference.moduleSpecifier, importReference.specifierKind);
      const packageNode = getOrCreateExternalPackageNode(
        accumulator.externalPackageNodes,
        packageName,
        importReference.specifierKind,
        importReference.moduleSpecifier,
        observedAt
      );

      accumulator.importsEdges.push(createImportsEdge(fromNode, packageNode, importReference, index, observedAt));
      return;
    }

    accumulator.unresolvedImportReferences.push({
      filePath: importReference.filePath,
      moduleSpecifier: importReference.moduleSpecifier,
      specifierKind: importReference.specifierKind,
      importKind: importReference.importKind,
      isTypeOnly: importReference.isTypeOnly,
      isDynamic: importReference.isDynamic,
      reason: getUnresolvedImportReason(importReference.specifierKind)
    });
  });

  return {
    externalPackageNodes: accumulator.externalPackageNodes,
    importsEdges: accumulator.importsEdges.sort(compareEdges),
    unresolvedImportReferences: accumulator.unresolvedImportReferences.sort(compareUnresolvedImportReferences)
  };
}

function createExportEdges(
  exports: readonly AnalyzerStaticExportReference[],
  fileNodesByPath: ReadonlyMap<string, FileGraphNode>,
  localPackageNodesByRootPath: ReadonlyMap<string, PackageGraphNode>,
  projectNode: ProjectGraphNode,
  observedAt: string
): readonly ExportsGraphEdge[] {
  return [...exports].sort(compareExportReferences).flatMap((exportReference, index) => {
    const fromNode = fileNodesByPath.get(exportReference.filePath);

    if (fromNode === undefined) {
      return [];
    }

    const packageNode = findOwningPackageNode(exportReference.filePath, localPackageNodesByRootPath);
    const targetNodeId = packageNode?.id ?? projectNode.id;

    if (fromNode.id === targetNodeId) {
      return [];
    }

    return [createExportsEdge(fromNode, targetNodeId, exportReference, index, observedAt)];
  }).sort(compareEdges);
}

function createImportsEdge(
  fromNode: FileGraphNode,
  toNode: PackageGraphNode,
  importReference: AnalyzerStaticImportReference,
  index: number,
  observedAt: string
): ImportsGraphEdge {
  return toSerializableGraphEdge({
    schemaVersion: GRAPH_EDGE_SCHEMA_VERSION,
    id: createGraphEdgeId(toGraphEdgeIdToken(
      'imports',
      fromNode.id,
      toNode.id,
      createReferenceToken(importReference.moduleSpecifier, importReference.importKind, index, importReference.range?.start.offset)
    )),
    kind: 'imports',
    fromNodeId: fromNode.id,
    toNodeId: toNode.id,
    direction: 'directed',
    attributes: createEdgeAttributes({
      'relationship.source': 'static-analysis',
      'import.moduleSpecifier': importReference.moduleSpecifier,
      'import.specifierKind': importReference.specifierKind,
      'import.kind': importReference.importKind,
      'import.isTypeOnly': importReference.isTypeOnly,
      'import.isDynamic': importReference.isDynamic
    }),
    confidence: probableConfidence('Import edge is derived from a normalized static import record; the external target is not resolved against manifests.'),
    provenance: [createStaticAnalysisProvenance(importReference.filePath, importReference.moduleSpecifier, observedAt)],
    source: {
      path: parseRepositoryPath(importReference.filePath),
      ...(importReference.range === undefined ? {} : { range: importReference.range })
    }
  }) as ImportsGraphEdge;
}

function createExportsEdge(
  fromNode: FileGraphNode,
  targetNodeId: GraphNodeId,
  exportReference: AnalyzerStaticExportReference,
  index: number,
  observedAt: string
): ExportsGraphEdge {
  const optionalAttributes: GraphEdgeAttributes = {
    ...(exportReference.name === undefined ? {} : { 'export.name': exportReference.name }),
    ...(exportReference.sourceModuleSpecifier === undefined ? {} : {
      'export.sourceModuleSpecifier': exportReference.sourceModuleSpecifier,
      'export.sourceSpecifierKind': exportReference.sourceSpecifierKind ?? 'unknown'
    })
  };

  return toSerializableGraphEdge({
    schemaVersion: GRAPH_EDGE_SCHEMA_VERSION,
    id: createGraphEdgeId(toGraphEdgeIdToken(
      'exports',
      fromNode.id,
      targetNodeId,
      createReferenceToken(exportReference.name ?? exportReference.exportKind, exportReference.exportKind, index, exportReference.range?.start.offset)
    )),
    kind: 'exports',
    fromNodeId: fromNode.id,
    toNodeId: targetNodeId,
    direction: 'directed',
    attributes: createEdgeAttributes({
      'relationship.source': 'static-analysis',
      'export.kind': exportReference.exportKind,
      'export.isTypeOnly': exportReference.isTypeOnly,
      'export.isReExport': exportReference.isReExport,
      ...optionalAttributes
    }),
    confidence: probableConfidence('Export edge is derived from normalized static export metadata and attached to the owning package or project root.'),
    provenance: [createStaticAnalysisProvenance(exportReference.filePath, exportReference.name ?? exportReference.exportKind, observedAt)],
    source: {
      path: parseRepositoryPath(exportReference.filePath),
      ...(exportReference.range === undefined ? {} : { range: exportReference.range })
    }
  }) as ExportsGraphEdge;
}

function getOrCreateExternalPackageNode(
  packageNodes: Map<string, PackageGraphNode>,
  packageName: string,
  specifierKind: 'package' | 'builtin',
  moduleSpecifier: string,
  observedAt: string
): PackageGraphNode {
  const key = `${specifierKind}:${packageName}`;
  const existing = packageNodes.get(key);

  if (existing !== undefined) {
    return existing;
  }

  const node = toSerializableGraphNode({
    schemaVersion: GRAPH_NODE_SCHEMA_VERSION,
    id: createGraphNodeId(toGraphNodeIdToken('package', 'external', specifierKind, packageName)),
    kind: 'package',
    display: createDisplay(packageName, `${specifierKind} import target`, `External ${specifierKind} target observed in source imports.`),
    analysis: createAnalysis([
      'package',
      'external',
      `specifier-${specifierKind}`
    ], [
      facet('package.external', 'true'),
      facet('package.specifierKind', specifierKind),
      facet('package.observedSpecifier', moduleSpecifier)
    ]),
    confidence: possibleConfidence('External package node is inferred from an import specifier and is not validated against package manifests.'),
    provenance: [createStaticAnalysisProvenance('import-specifier', moduleSpecifier, observedAt)],
    package: {
      name: packageName,
      manager: 'unknown'
    }
  }) as PackageGraphNode;

  packageNodes.set(key, node);
  return node;
}

function createLocalPackageNodeRootIndex(
  packageNodes: readonly PackageGraphNode[]
): ReadonlyMap<string, PackageGraphNode> {
  const index = new Map<string, PackageGraphNode>();

  for (const node of packageNodes) {
    const rootPathFacet = node.analysis.facets.find((candidate: GraphNodeFacet) => candidate.key === 'package.rootPath')?.value;
    index.set(rootPathFacet ?? '', node);
  }

  return index;
}

function findOwningPackageNode(
  filePath: string,
  packageNodesByRootPath: ReadonlyMap<string, PackageGraphNode>
): PackageGraphNode | undefined {
  const sortedRoots = [...packageNodesByRootPath.keys()].sort((left, right) => right.length - left.length);

  for (const rootPath of sortedRoots) {
    if (rootPath.length === 0) {
      continue;
    }

    if (filePath === rootPath || filePath.startsWith(`${rootPath}/`)) {
      return packageNodesByRootPath.get(rootPath);
    }
  }

  return packageNodesByRootPath.get('');
}

function getExternalPackageName(
  moduleSpecifier: string,
  specifierKind: 'package' | 'builtin'
): string {
  if (specifierKind === 'builtin') {
    return moduleSpecifier.startsWith('node:')
      ? moduleSpecifier.slice('node:'.length)
      : moduleSpecifier;
  }

  if (moduleSpecifier.startsWith('@')) {
    const [scope, name] = moduleSpecifier.split('/');
    return name === undefined ? moduleSpecifier : `${scope}/${name}`;
  }

  return moduleSpecifier.split('/')[0] ?? moduleSpecifier;
}

function getUnresolvedImportReason(
  specifierKind: AnalyzerStaticModuleSpecifierKind
): GraphBuilderUnresolvedImportReference['reason'] {
  if (specifierKind === 'relative') {
    return 'relative-module-resolution-deferred';
  }

  if (specifierKind === 'absolute') {
    return 'absolute-module-resolution-deferred';
  }

  return 'unknown-module-specifier-kind';
}

function createImportExportGraphSummary(
  sourceSummary: GraphBuilderPackageDependencyGraphSummary,
  localPackageNodeCount: number,
  externalPackageNodeCount: number,
  importsEdges: readonly ImportsGraphEdge[],
  exportsEdges: readonly ExportsGraphEdge[],
  unresolvedImportReferences: readonly GraphBuilderUnresolvedImportReference[],
  warningCount: number,
  errorCount: number
): GraphBuilderImportExportGraphSummary {
  const packageNodeCount = localPackageNodeCount + externalPackageNodeCount;
  const containsEdgeCount = sourceSummary.containsEdgeCount;
  const dependencyEdgeCount = sourceSummary.dependencyEdgeCount;

  return {
    projectNodeCount: sourceSummary.projectNodeCount,
    folderNodeCount: sourceSummary.folderNodeCount,
    fileNodeCount: sourceSummary.fileNodeCount,
    packageNodeCount,
    localPackageNodeCount,
    externalPackageNodeCount,
    totalNodeCount: sourceSummary.projectNodeCount + sourceSummary.folderNodeCount + sourceSummary.fileNodeCount + packageNodeCount,
    containsEdgeCount,
    packageManifestEdgeCount: sourceSummary.packageManifestEdgeCount,
    dependencyEdgeCount,
    importsEdgeCount: importsEdges.length,
    exportsEdgeCount: exportsEdges.length,
    unresolvedImportReferenceCount: unresolvedImportReferences.length,
    totalEdgeCount: containsEdgeCount + dependencyEdgeCount + importsEdges.length + exportsEdges.length,
    warningCount,
    errorCount
  };
}

function normalizeImportExportGraphSummary(
  summary: GraphBuilderImportExportGraphSummary,
  sourceSummary: GraphBuilderPackageDependencyGraphSummary,
  localPackageNodeCount: number,
  externalPackageNodeCount: number,
  importsEdges: readonly ImportsGraphEdge[],
  exportsEdges: readonly ExportsGraphEdge[],
  unresolvedImportReferences: readonly GraphBuilderUnresolvedImportReference[],
  warningCount: number,
  errorCount: number
): GraphBuilderImportExportGraphSummary {
  assertPlainObject(summary, 'Graph builder import/export graph summary');

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
    totalEdgeCount: normalizeNonNegativeInteger(summary.totalEdgeCount, 'summary.totalEdgeCount'),
    warningCount: normalizeNonNegativeInteger(summary.warningCount, 'summary.warningCount'),
    errorCount: normalizeNonNegativeInteger(summary.errorCount, 'summary.errorCount')
  };
  const expected = createImportExportGraphSummary(
    sourceSummary,
    localPackageNodeCount,
    externalPackageNodeCount,
    importsEdges,
    exportsEdges,
    unresolvedImportReferences,
    warningCount,
    errorCount
  );

  if (JSON.stringify(normalized) !== JSON.stringify(expected)) {
    throw new RangeError('Graph builder import/export graph summary is inconsistent.');
  }

  return normalized;
}

function determineImportExportGraphStatus(
  sourceGraphStatus: GraphBuilderStatus,
  sourceAnalysisStatus: string,
  errorCount: number,
  warningCount: number
): GraphBuilderStatus {
  if (sourceGraphStatus === 'failed' || sourceAnalysisStatus === 'failed' || errorCount > 0) {
    return 'failed';
  }

  if (sourceGraphStatus === 'partial' || sourceAnalysisStatus === 'partial' || sourceAnalysisStatus === 'skipped' || warningCount > 0) {
    return 'partial';
  }

  return 'completed';
}

function assertSourceGraphShape(
  sourceGraph: GraphBuilderPackageDependencyGraphResult,
  projectNode: ProjectGraphNode,
  folderNodes: readonly FolderGraphNode[],
  fileNodes: readonly FileGraphNode[],
  packageNodes: readonly PackageGraphNode[],
  containsEdges: GraphBuilderPackageDependencyGraphResult['containsEdges'],
  dependencyEdges: GraphBuilderPackageDependencyGraphResult['dependencyEdges']
): void {
  if (sourceGraph.projectNode.id !== projectNode.id) {
    throw new RangeError('Graph builder import/export graph project node must match source graph.');
  }

  if (sourceGraph.folderNodes.length !== folderNodes.length || sourceGraph.fileNodes.length !== fileNodes.length) {
    throw new RangeError('Graph builder import/export graph source node counts are inconsistent.');
  }

  if (sourceGraph.packageNodes.some((node, index) => packageNodes[index]?.id !== node.id)) {
    throw new RangeError('Graph builder import/export graph local package nodes must be preserved first.');
  }

  if (sourceGraph.containsEdges.length !== containsEdges.length || sourceGraph.dependencyEdges.length !== dependencyEdges.length) {
    throw new RangeError('Graph builder import/export graph source edge counts are inconsistent.');
  }
}

function assertImportExportSnapshotShape(
  snapshot: CanonicalGraphSnapshot,
  projectNode: ProjectGraphNode,
  folderNodes: readonly FolderGraphNode[],
  fileNodes: readonly FileGraphNode[],
  packageNodes: readonly PackageGraphNode[],
  containsEdges: GraphBuilderPackageDependencyGraphResult['containsEdges'],
  dependencyEdges: GraphBuilderPackageDependencyGraphResult['dependencyEdges'],
  importsEdges: readonly ImportsGraphEdge[],
  exportsEdges: readonly ExportsGraphEdge[]
): void {
  const expectedNodeIds = new Set([
    projectNode.id,
    ...folderNodes.map((node) => node.id),
    ...fileNodes.map((node) => node.id),
    ...packageNodes.map((node) => node.id)
  ]);
  const expectedEdgeIds = new Set([
    ...containsEdges.map((edge) => edge.id),
    ...dependencyEdges.map((edge) => edge.id),
    ...importsEdges.map((edge) => edge.id),
    ...exportsEdges.map((edge) => edge.id)
  ]);

  if (snapshot.rootNodeId !== projectNode.id) {
    throw new RangeError('Graph builder import/export graph snapshot root must be the project node.');
  }

  if (snapshot.nodes.length !== expectedNodeIds.size || snapshot.edges.length !== expectedEdgeIds.size) {
    throw new RangeError('Graph builder import/export graph snapshot counts are inconsistent.');
  }

  for (const node of snapshot.nodes) {
    if (!expectedNodeIds.has(node.id)) {
      throw new RangeError(`Graph builder import/export graph snapshot includes unexpected node ${node.id}.`);
    }
  }

  for (const edge of snapshot.edges) {
    if (!expectedEdgeIds.has(edge.id)) {
      throw new RangeError(`Graph builder import/export graph snapshot includes unexpected edge ${edge.id}.`);
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

function normalizeImportsEdges(edges: readonly ImportsGraphEdge[]): readonly ImportsGraphEdge[] {
  return requireArray(edges, 'importsEdges')
    .map((edge) => toSerializableGraphEdge(edge) as ImportsGraphEdge)
    .sort(compareEdges);
}

function normalizeExportsEdges(edges: readonly ExportsGraphEdge[]): readonly ExportsGraphEdge[] {
  return requireArray(edges, 'exportsEdges')
    .map((edge) => toSerializableGraphEdge(edge) as ExportsGraphEdge)
    .sort(compareEdges);
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
      reason: normalizeUnresolvedImportReason(reference.reason)
    }))
    .sort(compareUnresolvedImportReferences);
}

function normalizeUnresolvedImportReason(
  value: GraphBuilderUnresolvedImportReference['reason']
): GraphBuilderUnresolvedImportReference['reason'] {
  if (value !== 'relative-module-resolution-deferred'
    && value !== 'absolute-module-resolution-deferred'
    && value !== 'unknown-module-specifier-kind') {
    throw new RangeError('Unresolved import reason is unsupported.');
  }

  return value;
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
    score: 0.85,
    rationale
  };
}

function possibleConfidence(rationale: string): GraphConfidence {
  return {
    level: 'possible',
    score: 0.6,
    rationale
  };
}

function createStaticAnalysisProvenance(
  evidenceValue: string,
  evidenceLabel: string,
  observedAt: string
): GraphProvenanceRecord {
  return {
    schemaVersion: GRAPH_PROVENANCE_SCHEMA_VERSION,
    type: 'static-analysis',
    producer: {
      name: GRAPH_BUILDER_IMPORT_EXPORT_PRODUCER_NAME,
      version: GRAPH_BUILDER_IMPORT_EXPORT_PRODUCER_VERSION
    },
    evidence: [
      {
        type: 'static-rule',
        value: evidenceValue,
        label: evidenceLabel
      }
    ],
    observedAt
  };
}

function toGraphNodeIdToken(prefix: 'package', domain: string, specifierKind: string, packageName: string): string {
  return truncateGraphIdToken([
    prefix,
    domain,
    specifierKind,
    packageName
  ].map(encodeGraphIdSegment).join('/'));
}

function toGraphEdgeIdToken(
  kind: 'imports' | 'exports',
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

function createReferenceToken(value: string, kind: string, index: number, offset: number | undefined): string {
  return [value, kind, offset?.toString() ?? `index-${index}`].join('#');
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

function normalizeBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new RangeError(`${fieldName} must be a boolean.`);
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
    throw new RangeError('Graph builder import/export tag must be a stable graph-model tag token.');
  }

  return normalized;
}

function normalizeFacetKey(value: string): string {
  const normalized = value.trim();

  if (!/^[A-Za-z][A-Za-z0-9._:-]{0,79}$/.test(normalized)) {
    throw new RangeError('Graph builder import/export facet key must be a stable graph-model facet key.');
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

function compareImportReferences(left: AnalyzerStaticImportReference, right: AnalyzerStaticImportReference): number {
  return compareStableText(left.filePath, right.filePath)
    || compareStableText(left.moduleSpecifier, right.moduleSpecifier)
    || compareStableText(left.importKind, right.importKind)
    || compareNumbers(left.range?.start.offset ?? -1, right.range?.start.offset ?? -1);
}

function compareExportReferences(left: AnalyzerStaticExportReference, right: AnalyzerStaticExportReference): number {
  return compareStableText(left.filePath, right.filePath)
    || compareStableText(left.name ?? '', right.name ?? '')
    || compareStableText(left.sourceModuleSpecifier ?? '', right.sourceModuleSpecifier ?? '')
    || compareStableText(left.exportKind, right.exportKind)
    || compareNumbers(left.range?.start.offset ?? -1, right.range?.start.offset ?? -1);
}

function compareUnresolvedImportReferences(
  left: GraphBuilderUnresolvedImportReference,
  right: GraphBuilderUnresolvedImportReference
): number {
  return compareStableText(left.filePath, right.filePath)
    || compareStableText(left.moduleSpecifier, right.moduleSpecifier)
    || compareStableText(left.importKind, right.importKind);
}

function compareFacets(left: GraphNodeFacet, right: GraphNodeFacet): number {
  return compareStableText(`${left.key}:${left.value}`, `${right.key}:${right.value}`);
}

function compareEdges(left: CanonicalGraphEdge, right: CanonicalGraphEdge): number {
  return compareStableText(left.id, right.id);
}

function compareNumbers(left: number, right: number): number {
  return left - right;
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

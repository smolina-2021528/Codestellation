import {
  CANONICAL_GRAPH_SCHEMA_VERSION,
  GRAPH_NODE_SCHEMA_VERSION,
  GRAPH_PROVENANCE_SCHEMA_VERSION,
  assertCanonicalGraphSnapshot,
  createGraphNodeId,
  parseRepositoryPath,
  toSerializableCanonicalGraphSnapshot,
  toSerializableGraphNode,
  type CanonicalGraphSnapshot,
  type FileGraphNode,
  type FolderGraphNode,
  type GraphConfidence,
  type GraphNodeAnalysisMetadata,
  type GraphNodeDisplay,
  type GraphNodeFacet,
  type GraphNodeId,
  type GraphProvenanceRecord,
  type ProjectGraphNode,
  type SourceLanguage
} from '@codestellation/graph-model';
import {
  toSerializableRepositoryStructureSummaryResult,
  type RepositoryScanInventoryPath,
  type RepositoryScanIgnoredFileReason,
  type RepositoryScanSourceFileKind,
  type RepositoryStructureSummaryResult
} from '@codestellation/repository-scanner';

export declare const graphBuilderDiagnosticCodeBrand: unique symbol;

export type GraphBuilderDiagnosticCode = string & {
  readonly [graphBuilderDiagnosticCodeBrand]: 'GraphBuilderDiagnosticCode';
};

export const GRAPH_BUILDER_PROJECT_FILE_GRAPH_RESULT_SCHEMA_VERSION = 1 as const;
export const GRAPH_BUILDER_DIAGNOSTIC_SCHEMA_VERSION = 1 as const;
export const GRAPH_BUILDER_PRODUCER_NAME = 'graph-builder' as const;
export const GRAPH_BUILDER_PRODUCER_VERSION = '0.1.0' as const;

export const GRAPH_BUILDER_STATUSES = [
  'completed',
  'partial',
  'failed'
] as const;

export type GraphBuilderStatus = typeof GRAPH_BUILDER_STATUSES[number];

export const GRAPH_BUILDER_DIAGNOSTIC_SEVERITIES = [
  'info',
  'warning',
  'error',
  'fatal'
] as const;

export type GraphBuilderDiagnosticSeverity = typeof GRAPH_BUILDER_DIAGNOSTIC_SEVERITIES[number];

export interface GraphBuilderDiagnostic {
  readonly schemaVersion: typeof GRAPH_BUILDER_DIAGNOSTIC_SCHEMA_VERSION;
  readonly code: GraphBuilderDiagnosticCode;
  readonly severity: GraphBuilderDiagnosticSeverity;
  readonly message: string;
  readonly retryable: boolean;
  readonly path?: RepositoryScanInventoryPath;
}

export interface GraphBuilderProjectFileGraphSummary {
  readonly projectNodeCount: number;
  readonly folderNodeCount: number;
  readonly fileNodeCount: number;
  readonly totalNodeCount: number;
  readonly edgeCount: number;
  readonly candidateFileNodeCount: number;
  readonly ignoredFileNodeCount: number;
  readonly unclassifiedFileNodeCount: number;
  readonly warningCount: number;
  readonly errorCount: number;
}

export interface GraphBuilderProjectFileGraphResult {
  readonly schemaVersion: typeof GRAPH_BUILDER_PROJECT_FILE_GRAPH_RESULT_SCHEMA_VERSION;
  readonly status: GraphBuilderStatus;
  readonly sourceStructure: RepositoryStructureSummaryResult;
  readonly snapshot: CanonicalGraphSnapshot;
  readonly projectNode: ProjectGraphNode;
  readonly folderNodes: readonly FolderGraphNode[];
  readonly fileNodes: readonly FileGraphNode[];
  readonly warnings: readonly GraphBuilderDiagnostic[];
  readonly errors: readonly GraphBuilderDiagnostic[];
  readonly summary: GraphBuilderProjectFileGraphSummary;
}

interface FolderAccumulator {
  readonly path: RepositoryScanInventoryPath;
  readonly childFilePaths: Set<RepositoryScanInventoryPath>;
  readonly directFilePaths: Set<RepositoryScanInventoryPath>;
  readonly sourceKinds: Set<RepositoryScanSourceFileKind>;
  candidateFileCount: number;
  ignoredFileCount: number;
  unclassifiedFileCount: number;
  totalSizeBytes: number;
}

interface FileDisposition {
  readonly kind: 'candidate' | 'ignored' | 'unclassified';
  readonly ignoredReason?: RepositoryScanIgnoredFileReason;
}

const GRAPH_BUILDER_DIAGNOSTIC_CODE_PATTERN = /^GRAPH_BUILDER_[A-Z0-9_]{3,63}$/;
const GRAPH_ID_HASH_LENGTH = 16;
const GRAPH_ID_MAX_TOKEN_LENGTH = 220;
const GRAPH_ID_SAFE_CHARACTER_PATTERN = /^[A-Za-z0-9._-]$/;
const TEXT_FIELD_MAX_LENGTH = 240;
const DESCRIPTION_MAX_LENGTH = 1200;
const GRAPH_EXTENSION_PATTERN = /^\.[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/;

export function buildProjectFileGraphFromRepositoryStructure(
  structure: RepositoryStructureSummaryResult
): GraphBuilderProjectFileGraphResult {
  const sourceStructure = toSerializableRepositoryStructureSummaryResult(structure);
  const sourceScan = sourceStructure.packageManifestDetection.sourceScan;
  const files = sourceStructure.status === 'failed' ? [] : sourceScan.inventory.files;
  const dispositionByPath = createDispositionIndex(
    sourceScan.candidateFiles.map((file) => file.path),
    sourceScan.ignoredFiles.map((file) => ({ path: file.path, reason: file.reason }))
  );
  const observedAt = sourceScan.metadata.completedAt;
  const projectNode = createProjectNode(getProjectName(sourceScan.inventory.root), observedAt);
  const folderNodes = createFolderNodes(files, dispositionByPath, projectNode.id, observedAt);
  const folderNodeIds = new Map(folderNodes.map((node) => [node.folder.path, node.id]));
  const fileNodes = createFileNodes(files, dispositionByPath, folderNodeIds, projectNode.id, observedAt);
  const warnings = sourceStructure.warnings.map((warning) => toGraphBuilderSourceWarning(warning));
  const errors = sourceStructure.errors.map((error) => toGraphBuilderSourceError(error));
  const snapshot = toSerializableCanonicalGraphSnapshot({
    schemaVersion: CANONICAL_GRAPH_SCHEMA_VERSION,
    rootNodeId: projectNode.id,
    nodes: [projectNode, ...folderNodes, ...fileNodes],
    edges: []
  });
  const summary = createProjectFileGraphSummary(
    folderNodes,
    fileNodes,
    dispositionByPath,
    warnings.length,
    errors.length
  );

  return toSerializableGraphBuilderProjectFileGraphResult({
    schemaVersion: GRAPH_BUILDER_PROJECT_FILE_GRAPH_RESULT_SCHEMA_VERSION,
    status: determineGraphBuilderStatus(sourceStructure.status, warnings, errors),
    sourceStructure,
    snapshot,
    projectNode,
    folderNodes,
    fileNodes,
    warnings,
    errors,
    summary
  });
}

export const buildProjectFileGraph = buildProjectFileGraphFromRepositoryStructure;

export function parseGraphBuilderDiagnosticCode(value: string): GraphBuilderDiagnosticCode {
  if (typeof value !== 'string') {
    throw new RangeError('Graph builder diagnostic code must be a string.');
  }

  if (value.trim() !== value) {
    throw new RangeError('Graph builder diagnostic code must not have leading or trailing whitespace.');
  }

  if (!GRAPH_BUILDER_DIAGNOSTIC_CODE_PATTERN.test(value)) {
    throw new RangeError('Graph builder diagnostic code must be uppercase and use the GRAPH_BUILDER_ prefix.');
  }

  return value as GraphBuilderDiagnosticCode;
}

export function isGraphBuilderDiagnosticCode(value: unknown): value is GraphBuilderDiagnosticCode {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    parseGraphBuilderDiagnosticCode(value);
    return true;
  } catch {
    return false;
  }
}

export function isGraphBuilderProjectFileGraphResult(
  value: unknown
): value is GraphBuilderProjectFileGraphResult {
  try {
    toSerializableGraphBuilderProjectFileGraphResult(value as GraphBuilderProjectFileGraphResult);
    return true;
  } catch {
    return false;
  }
}

export function assertGraphBuilderProjectFileGraphResult(
  value: unknown
): asserts value is GraphBuilderProjectFileGraphResult {
  toSerializableGraphBuilderProjectFileGraphResult(value as GraphBuilderProjectFileGraphResult);
}

export function toSerializableGraphBuilderProjectFileGraphResult(
  result: GraphBuilderProjectFileGraphResult
): GraphBuilderProjectFileGraphResult {
  assertPlainObject(result, 'Graph builder project/file graph result');

  if (result.schemaVersion !== GRAPH_BUILDER_PROJECT_FILE_GRAPH_RESULT_SCHEMA_VERSION) {
    throw new RangeError('Graph builder project/file graph result schema version is unsupported.');
  }

  if (!isGraphBuilderStatus(result.status)) {
    throw new RangeError('Graph builder project/file graph result status is unsupported.');
  }

  const sourceStructure = toSerializableRepositoryStructureSummaryResult(result.sourceStructure);
  const projectNode = toSerializableGraphNode(result.projectNode) as ProjectGraphNode;
  const folderNodes = normalizeGraphBuilderFolderNodes(result.folderNodes, projectNode.id);
  const folderNodeIds = new Set(folderNodes.map((folder) => folder.id));
  const fileNodes = normalizeGraphBuilderFileNodes(result.fileNodes, projectNode.id, folderNodeIds);
  const snapshot = toSerializableCanonicalGraphSnapshot(result.snapshot);
  const warnings = normalizeGraphBuilderDiagnostics(result.warnings, 'warning');
  const errors = normalizeGraphBuilderDiagnostics(result.errors, 'error');
  const summary = normalizeProjectFileGraphSummary(
    result.summary,
    folderNodes,
    fileNodes,
    warnings.length,
    errors.length
  );

  assertProjectFileSnapshotShape(snapshot, projectNode, folderNodes, fileNodes);
  assertStatusConsistency(result.status, sourceStructure.status, warnings, errors);

  return {
    schemaVersion: GRAPH_BUILDER_PROJECT_FILE_GRAPH_RESULT_SCHEMA_VERSION,
    status: result.status,
    sourceStructure,
    snapshot,
    projectNode,
    folderNodes,
    fileNodes,
    warnings,
    errors,
    summary
  };
}

function createProjectNode(name: string, observedAt: string): ProjectGraphNode {
  return toSerializableGraphNode({
    schemaVersion: GRAPH_NODE_SCHEMA_VERSION,
    id: createGraphNodeId('project/root'),
    kind: 'project',
    display: createDisplay(name, 'Project root', 'Repository project root derived from scanner metadata.'),
    analysis: createAnalysis(['project', 'repository'], [
      facet('graphBuilder.phase', 'project-file-nodes')
    ]),
    confidence: confirmedConfidence('Project node is derived from the normalized repository structure summary.'),
    provenance: [createSourceScanProvenance('repository-structure-summary', 'Repository structure summary', observedAt)],
    project: {
      name
    }
  }) as ProjectGraphNode;
}

function createFolderNodes(
  files: readonly { readonly path: RepositoryScanInventoryPath; readonly kind: RepositoryScanSourceFileKind; readonly sizeBytes: number }[],
  dispositionByPath: ReadonlyMap<RepositoryScanInventoryPath, FileDisposition>,
  projectNodeId: GraphNodeId,
  observedAt: string
): readonly FolderGraphNode[] {
  const accumulators = createFolderAccumulators(files, dispositionByPath);

  return [...accumulators.values()]
    .sort((left, right) => compareStableText(left.path, right.path))
    .map((accumulator) => createFolderNode(accumulator, projectNodeId, observedAt));
}

function createFolderNode(
  accumulator: FolderAccumulator,
  projectNodeId: GraphNodeId,
  observedAt: string
): FolderGraphNode {
  const parentPath = getParentPath(accumulator.path);
  const parentId = parentPath === undefined ? projectNodeId : createFolderNodeId(parentPath);
  const tags = ['folder', ...getFolderRoleTags(accumulator.sourceKinds)];

  return toSerializableGraphNode({
    schemaVersion: GRAPH_NODE_SCHEMA_VERSION,
    id: createFolderNodeId(accumulator.path),
    kind: 'folder',
    parentId,
    display: createDisplay(getBaseName(accumulator.path), 'Folder', accumulator.path),
    analysis: createAnalysis(tags, [
      facet('path', accumulator.path),
      facet('depth', getPathDepth(accumulator.path).toString()),
      facet('fileCount', accumulator.childFilePaths.size.toString()),
      facet('directFileCount', accumulator.directFilePaths.size.toString()),
      facet('candidateFileCount', accumulator.candidateFileCount.toString()),
      facet('ignoredFileCount', accumulator.ignoredFileCount.toString()),
      facet('unclassifiedFileCount', accumulator.unclassifiedFileCount.toString()),
      facet('totalSizeBytes', accumulator.totalSizeBytes.toString())
    ]),
    confidence: confirmedConfidence('Folder node is derived from repository-relative inventory paths.'),
    provenance: [createSourceScanProvenance(accumulator.path, 'Folder path', observedAt)],
    folder: {
      path: parseRepositoryPath(accumulator.path)
    }
  }) as FolderGraphNode;
}

function createFileNodes(
  files: readonly { readonly path: RepositoryScanInventoryPath; readonly kind: RepositoryScanSourceFileKind; readonly sizeBytes: number; readonly extension?: string }[],
  dispositionByPath: ReadonlyMap<RepositoryScanInventoryPath, FileDisposition>,
  folderNodeIds: ReadonlyMap<RepositoryScanInventoryPath, GraphNodeId>,
  projectNodeId: GraphNodeId,
  observedAt: string
): readonly FileGraphNode[] {
  return [...files]
    .sort((left, right) => compareStableText(left.path, right.path))
    .map((file) => createFileNode(file, dispositionByPath, folderNodeIds, projectNodeId, observedAt));
}

function createFileNode(
  file: { readonly path: RepositoryScanInventoryPath; readonly kind: RepositoryScanSourceFileKind; readonly sizeBytes: number; readonly extension?: string },
  dispositionByPath: ReadonlyMap<RepositoryScanInventoryPath, FileDisposition>,
  folderNodeIds: ReadonlyMap<RepositoryScanInventoryPath, GraphNodeId>,
  projectNodeId: GraphNodeId,
  observedAt: string
): FileGraphNode {
  const directoryPath = getParentPath(file.path);
  const parentId = directoryPath === undefined ? projectNodeId : getRequiredFolderNodeId(directoryPath, folderNodeIds);
  const disposition = getDisposition(file.path, dispositionByPath);
  const extension = normalizeGraphExtension(file.extension);
  const language = inferSourceLanguage(file.path, extension);
  const fileBase = {
    path: parseRepositoryPath(file.path),
    language,
    ...(extension === undefined ? {} : { extension })
  };
  const ignoredFacet = disposition.ignoredReason === undefined
    ? []
    : [facet('scan.ignoredReason', disposition.ignoredReason)];

  return toSerializableGraphNode({
    schemaVersion: GRAPH_NODE_SCHEMA_VERSION,
    id: createFileNodeId(file.path),
    kind: 'file',
    parentId,
    display: createDisplay(getBaseName(file.path), language, file.path),
    analysis: createAnalysis([
      'file',
      `kind-${file.kind}`,
      `disposition-${disposition.kind}`,
      `language-${language}`
    ], [
      facet('path', file.path),
      facet('source.kind', file.kind),
      facet('scan.disposition', disposition.kind),
      facet('file.sizeBytes', file.sizeBytes.toString()),
      ...ignoredFacet
    ]),
    confidence: confirmedConfidence('File node is derived from the normalized source inventory.'),
    provenance: [createSourceScanProvenance(file.path, 'Inventory file path', observedAt)],
    file: fileBase
  }) as FileGraphNode;
}

function createFolderAccumulators(
  files: readonly { readonly path: RepositoryScanInventoryPath; readonly kind: RepositoryScanSourceFileKind; readonly sizeBytes: number }[],
  dispositionByPath: ReadonlyMap<RepositoryScanInventoryPath, FileDisposition>
): Map<RepositoryScanInventoryPath, FolderAccumulator> {
  const accumulators = new Map<RepositoryScanInventoryPath, FolderAccumulator>();

  for (const file of files) {
    const directoryPaths = getDirectoryPaths(file.path);
    const directParentPath = getParentPath(file.path);
    const disposition = getDisposition(file.path, dispositionByPath);

    for (const directoryPath of directoryPaths) {
      const accumulator = getOrCreateFolderAccumulator(directoryPath, accumulators);
      accumulator.childFilePaths.add(file.path);
      accumulator.sourceKinds.add(file.kind);
      accumulator.totalSizeBytes += file.sizeBytes;

      if (directParentPath === directoryPath) {
        accumulator.directFilePaths.add(file.path);
      }

      if (disposition.kind === 'candidate') {
        accumulator.candidateFileCount += 1;
      } else if (disposition.kind === 'ignored') {
        accumulator.ignoredFileCount += 1;
      } else {
        accumulator.unclassifiedFileCount += 1;
      }
    }
  }

  return accumulators;
}

function getOrCreateFolderAccumulator(
  path: RepositoryScanInventoryPath,
  accumulators: Map<RepositoryScanInventoryPath, FolderAccumulator>
): FolderAccumulator {
  const existing = accumulators.get(path);

  if (existing !== undefined) {
    return existing;
  }

  const created: FolderAccumulator = {
    path,
    childFilePaths: new Set(),
    directFilePaths: new Set(),
    sourceKinds: new Set(),
    candidateFileCount: 0,
    ignoredFileCount: 0,
    unclassifiedFileCount: 0,
    totalSizeBytes: 0
  };

  accumulators.set(path, created);
  return created;
}

function createDispositionIndex(
  candidatePaths: readonly RepositoryScanInventoryPath[],
  ignoredFiles: readonly { readonly path: RepositoryScanInventoryPath; readonly reason: RepositoryScanIgnoredFileReason }[]
): ReadonlyMap<RepositoryScanInventoryPath, FileDisposition> {
  const index = new Map<RepositoryScanInventoryPath, FileDisposition>();

  for (const path of candidatePaths) {
    index.set(path, { kind: 'candidate' });
  }

  for (const ignoredFile of ignoredFiles) {
    index.set(ignoredFile.path, { kind: 'ignored', ignoredReason: ignoredFile.reason });
  }

  return index;
}

function getDisposition(
  path: RepositoryScanInventoryPath,
  dispositionByPath: ReadonlyMap<RepositoryScanInventoryPath, FileDisposition>
): FileDisposition {
  return dispositionByPath.get(path) ?? { kind: 'unclassified' };
}

function createProjectFileGraphSummary(
  folderNodes: readonly FolderGraphNode[],
  fileNodes: readonly FileGraphNode[],
  dispositionByPath: ReadonlyMap<RepositoryScanInventoryPath, FileDisposition>,
  warningCount: number,
  errorCount: number
): GraphBuilderProjectFileGraphSummary {
  const candidateFileNodeCount = fileNodes.filter((node) => getDisposition(node.file.path, dispositionByPath).kind === 'candidate').length;
  const ignoredFileNodeCount = fileNodes.filter((node) => getDisposition(node.file.path, dispositionByPath).kind === 'ignored').length;
  const unclassifiedFileNodeCount = fileNodes.length - candidateFileNodeCount - ignoredFileNodeCount;

  return {
    projectNodeCount: 1,
    folderNodeCount: folderNodes.length,
    fileNodeCount: fileNodes.length,
    totalNodeCount: 1 + folderNodes.length + fileNodes.length,
    edgeCount: 0,
    candidateFileNodeCount,
    ignoredFileNodeCount,
    unclassifiedFileNodeCount,
    warningCount,
    errorCount
  };
}

function determineGraphBuilderStatus(
  sourceStatus: string,
  warnings: readonly GraphBuilderDiagnostic[],
  errors: readonly GraphBuilderDiagnostic[]
): GraphBuilderStatus {
  if (sourceStatus === 'failed' || errors.length > 0) {
    return 'failed';
  }

  if (sourceStatus === 'partial' || warnings.length > 0) {
    return 'partial';
  }

  return 'completed';
}

function toGraphBuilderSourceWarning(warning: { readonly message: string; readonly path?: RepositoryScanInventoryPath }): GraphBuilderDiagnostic {
  return toSerializableGraphBuilderDiagnostic({
    schemaVersion: GRAPH_BUILDER_DIAGNOSTIC_SCHEMA_VERSION,
    code: parseGraphBuilderDiagnosticCode('GRAPH_BUILDER_SOURCE_STRUCTURE_WARNING'),
    severity: 'warning',
    message: warning.message,
    retryable: false,
    ...(warning.path === undefined ? {} : { path: warning.path })
  });
}

function toGraphBuilderSourceError(error: { readonly message: string; readonly retryable: boolean; readonly path?: RepositoryScanInventoryPath }): GraphBuilderDiagnostic {
  return toSerializableGraphBuilderDiagnostic({
    schemaVersion: GRAPH_BUILDER_DIAGNOSTIC_SCHEMA_VERSION,
    code: parseGraphBuilderDiagnosticCode('GRAPH_BUILDER_SOURCE_STRUCTURE_ERROR'),
    severity: 'error',
    message: error.message,
    retryable: error.retryable,
    ...(error.path === undefined ? {} : { path: error.path })
  });
}

function toSerializableGraphBuilderDiagnostic(diagnostic: GraphBuilderDiagnostic): GraphBuilderDiagnostic {
  assertPlainObject(diagnostic, 'Graph builder diagnostic');

  if (diagnostic.schemaVersion !== GRAPH_BUILDER_DIAGNOSTIC_SCHEMA_VERSION) {
    throw new RangeError('Graph builder diagnostic schema version is unsupported.');
  }

  if (!isGraphBuilderDiagnosticCode(diagnostic.code)) {
    throw new RangeError('Graph builder diagnostic code is invalid.');
  }

  if (!isGraphBuilderDiagnosticSeverity(diagnostic.severity)) {
    throw new RangeError('Graph builder diagnostic severity is invalid.');
  }

  const base = {
    schemaVersion: GRAPH_BUILDER_DIAGNOSTIC_SCHEMA_VERSION,
    code: parseGraphBuilderDiagnosticCode(diagnostic.code),
    severity: diagnostic.severity,
    message: normalizeText(diagnostic.message, 'Graph builder diagnostic message', DESCRIPTION_MAX_LENGTH),
    retryable: normalizeBoolean(diagnostic.retryable, 'Graph builder diagnostic retryable')
  };

  return diagnostic.path === undefined
    ? base
    : { ...base, path: parseRepositoryPath(diagnostic.path) as RepositoryScanInventoryPath };
}

function normalizeGraphBuilderDiagnostics(
  diagnostics: readonly GraphBuilderDiagnostic[],
  expectedSeverity: 'warning' | 'error'
): readonly GraphBuilderDiagnostic[] {
  if (!Array.isArray(diagnostics)) {
    throw new RangeError('Graph builder diagnostics must be an array.');
  }

  return diagnostics.map((diagnostic) => {
    const serializable = toSerializableGraphBuilderDiagnostic(diagnostic);

    if (serializable.severity !== expectedSeverity) {
      throw new RangeError(`Graph builder ${expectedSeverity}s must use ${expectedSeverity} severity.`);
    }

    return serializable;
  }).sort(compareDiagnostics);
}

function normalizeGraphBuilderFolderNodes(
  folderNodes: readonly FolderGraphNode[],
  projectNodeId: GraphNodeId
): readonly FolderGraphNode[] {
  if (!Array.isArray(folderNodes)) {
    throw new RangeError('Graph builder folder nodes must be an array.');
  }

  const nodeIds = new Set<GraphNodeId>([projectNodeId]);
  const normalized = folderNodes
    .map((node) => toSerializableGraphNode(node) as FolderGraphNode)
    .sort((left, right) => compareStableText(left.folder.path, right.folder.path));

  for (const node of normalized) {
    if (node.kind !== 'folder') {
      throw new RangeError('Graph builder folder nodes must contain only folder nodes.');
    }

    if (nodeIds.has(node.id)) {
      throw new RangeError('Graph builder folder node ids must be unique.');
    }

    nodeIds.add(node.id);
  }

  return normalized;
}

function normalizeGraphBuilderFileNodes(
  fileNodes: readonly FileGraphNode[],
  projectNodeId: GraphNodeId,
  folderNodeIds: ReadonlySet<GraphNodeId>
): readonly FileGraphNode[] {
  if (!Array.isArray(fileNodes)) {
    throw new RangeError('Graph builder file nodes must be an array.');
  }

  const nodeIds = new Set<GraphNodeId>([projectNodeId, ...folderNodeIds]);
  const normalized = fileNodes
    .map((node) => toSerializableGraphNode(node) as FileGraphNode)
    .sort((left, right) => compareStableText(left.file.path, right.file.path));

  for (const node of normalized) {
    if (node.kind !== 'file') {
      throw new RangeError('Graph builder file nodes must contain only file nodes.');
    }

    if (nodeIds.has(node.id)) {
      throw new RangeError('Graph builder file node ids must be unique.');
    }

    nodeIds.add(node.id);
  }

  return normalized;
}

function normalizeProjectFileGraphSummary(
  summary: GraphBuilderProjectFileGraphSummary,
  folderNodes: readonly FolderGraphNode[],
  fileNodes: readonly FileGraphNode[],
  warningCount: number,
  errorCount: number
): GraphBuilderProjectFileGraphSummary {
  assertPlainObject(summary, 'Graph builder project/file graph summary');

  const normalized = {
    projectNodeCount: normalizeNonNegativeInteger(summary.projectNodeCount, 'summary.projectNodeCount'),
    folderNodeCount: normalizeNonNegativeInteger(summary.folderNodeCount, 'summary.folderNodeCount'),
    fileNodeCount: normalizeNonNegativeInteger(summary.fileNodeCount, 'summary.fileNodeCount'),
    totalNodeCount: normalizeNonNegativeInteger(summary.totalNodeCount, 'summary.totalNodeCount'),
    edgeCount: normalizeNonNegativeInteger(summary.edgeCount, 'summary.edgeCount'),
    candidateFileNodeCount: normalizeNonNegativeInteger(summary.candidateFileNodeCount, 'summary.candidateFileNodeCount'),
    ignoredFileNodeCount: normalizeNonNegativeInteger(summary.ignoredFileNodeCount, 'summary.ignoredFileNodeCount'),
    unclassifiedFileNodeCount: normalizeNonNegativeInteger(summary.unclassifiedFileNodeCount, 'summary.unclassifiedFileNodeCount'),
    warningCount: normalizeNonNegativeInteger(summary.warningCount, 'summary.warningCount'),
    errorCount: normalizeNonNegativeInteger(summary.errorCount, 'summary.errorCount')
  };

  if (normalized.projectNodeCount !== 1) {
    throw new RangeError('Graph builder summary must include exactly one project node.');
  }

  if (normalized.folderNodeCount !== folderNodes.length) {
    throw new RangeError('Graph builder summary folder count is inconsistent.');
  }

  if (normalized.fileNodeCount !== fileNodes.length) {
    throw new RangeError('Graph builder summary file count is inconsistent.');
  }

  if (normalized.totalNodeCount !== 1 + folderNodes.length + fileNodes.length) {
    throw new RangeError('Graph builder summary total node count is inconsistent.');
  }

  if (normalized.edgeCount !== 0) {
    throw new RangeError('Graph builder project/file graph must not create edges yet.');
  }

  if (
    normalized.candidateFileNodeCount
      + normalized.ignoredFileNodeCount
      + normalized.unclassifiedFileNodeCount
    !== fileNodes.length
  ) {
    throw new RangeError('Graph builder summary file disposition counts are inconsistent.');
  }

  if (normalized.warningCount !== warningCount || normalized.errorCount !== errorCount) {
    throw new RangeError('Graph builder summary diagnostic counts are inconsistent.');
  }

  return normalized;
}

function assertProjectFileSnapshotShape(
  snapshot: CanonicalGraphSnapshot,
  projectNode: ProjectGraphNode,
  folderNodes: readonly FolderGraphNode[],
  fileNodes: readonly FileGraphNode[]
): void {
  assertCanonicalGraphSnapshot(snapshot);

  if (snapshot.rootNodeId !== projectNode.id) {
    throw new RangeError('Graph builder snapshot root must be the project node.');
  }

  if (snapshot.edges.length !== 0) {
    throw new RangeError('Graph builder project/file graph must not include edges yet.');
  }

  const expectedIds = new Set([projectNode.id, ...folderNodes.map((node) => node.id), ...fileNodes.map((node) => node.id)]);

  if (snapshot.nodes.length !== expectedIds.size) {
    throw new RangeError('Graph builder snapshot node count is inconsistent.');
  }

  for (const node of snapshot.nodes) {
    if (!expectedIds.has(node.id)) {
      throw new RangeError(`Graph builder snapshot includes unexpected node ${node.id}.`);
    }
  }
}

function assertStatusConsistency(
  status: GraphBuilderStatus,
  sourceStatus: string,
  warnings: readonly GraphBuilderDiagnostic[],
  errors: readonly GraphBuilderDiagnostic[]
): void {
  const expectedStatus = determineGraphBuilderStatus(sourceStatus, warnings, errors);

  if (status !== expectedStatus) {
    throw new RangeError('Graph builder status is inconsistent with source status and diagnostics.');
  }
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

function createSourceScanProvenance(
  evidenceValue: string,
  evidenceLabel: string,
  observedAt: string
): GraphProvenanceRecord {
  return {
    schemaVersion: GRAPH_PROVENANCE_SCHEMA_VERSION,
    type: 'source-scan',
    producer: {
      name: GRAPH_BUILDER_PRODUCER_NAME,
      version: GRAPH_BUILDER_PRODUCER_VERSION
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

function createFolderNodeId(path: RepositoryScanInventoryPath): GraphNodeId {
  return createGraphNodeId(toGraphNodeIdToken('folder', path));
}

function createFileNodeId(path: RepositoryScanInventoryPath): GraphNodeId {
  return createGraphNodeId(toGraphNodeIdToken('file', path));
}

function toGraphNodeIdToken(prefix: 'folder' | 'file', path: RepositoryScanInventoryPath): string {
  const encodedPath = path.split('/').map(encodeGraphNodeIdSegment).join('/');
  const token = `${prefix}/${encodedPath}`;

  if (token.length <= GRAPH_ID_MAX_TOKEN_LENGTH) {
    return token;
  }

  const digest = createStableTokenHash(token).slice(0, GRAPH_ID_HASH_LENGTH);
  const visiblePrefix = token.slice(0, GRAPH_ID_MAX_TOKEN_LENGTH - GRAPH_ID_HASH_LENGTH - 2).replace(/\/$/, '');

  return `${visiblePrefix}~${digest}`;
}


function createStableTokenHash(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0').repeat(2);
}

function encodeGraphNodeIdSegment(segment: string): string {
  let encoded = '';

  for (const character of segment) {
    encoded += GRAPH_ID_SAFE_CHARACTER_PATTERN.test(character)
      ? character
      : encodeUnsafeGraphNodeIdCharacter(character);
  }

  return encoded.length === 0 ? 'empty' : encoded;
}

function encodeUnsafeGraphNodeIdCharacter(character: string): string {
  const codePoint = character.codePointAt(0);

  if (codePoint === undefined) {
    throw new RangeError('Cannot encode empty graph node id character.');
  }

  return `~${codePoint.toString(16)}~`;
}

function getDirectoryPaths(path: RepositoryScanInventoryPath): readonly RepositoryScanInventoryPath[] {
  const segments = path.split('/');

  if (segments.length <= 1) {
    return [];
  }

  const directoryPaths: RepositoryScanInventoryPath[] = [];

  for (let index = 1; index < segments.length; index += 1) {
    directoryPaths.push(segments.slice(0, index).join('/') as RepositoryScanInventoryPath);
  }

  return directoryPaths;
}

function getParentPath(path: RepositoryScanInventoryPath): RepositoryScanInventoryPath | undefined {
  const index = path.lastIndexOf('/');

  return index === -1 ? undefined : path.slice(0, index) as RepositoryScanInventoryPath;
}

function getRequiredFolderNodeId(
  path: RepositoryScanInventoryPath,
  folderNodeIds: ReadonlyMap<RepositoryScanInventoryPath, GraphNodeId>
): GraphNodeId {
  const folderNodeId = folderNodeIds.get(path);

  if (folderNodeId === undefined) {
    throw new RangeError(`Missing folder node for ${path}.`);
  }

  return folderNodeId;
}

function getBaseName(path: string): string {
  return path.split('/').at(-1) ?? path;
}

function getPathDepth(path: RepositoryScanInventoryPath): number {
  return path.split('/').length;
}

function getFolderRoleTags(sourceKinds: ReadonlySet<RepositoryScanSourceFileKind>): readonly string[] {
  const tags: string[] = [];

  if (sourceKinds.has('source')) {
    tags.push('source-container');
  }

  if (sourceKinds.has('test')) {
    tags.push('test-container');
  }

  if (sourceKinds.has('config')) {
    tags.push('configuration');
  }

  if (sourceKinds.has('manifest')) {
    tags.push('package-container');
  }

  if (sourceKinds.has('documentation')) {
    tags.push('documentation');
  }

  if (sourceKinds.has('asset')) {
    tags.push('asset');
  }

  return tags;
}

function inferSourceLanguage(path: RepositoryScanInventoryPath, extension: string | undefined): SourceLanguage {
  const normalizedPath = path.toLowerCase();
  const normalizedExtension = extension?.toLowerCase();

  if (normalizedExtension === '.ts' || normalizedExtension === '.tsx' || normalizedExtension === '.mts' || normalizedExtension === '.cts') {
    return 'typescript';
  }

  if (['.js', '.jsx', '.mjs', '.cjs'].includes(normalizedExtension ?? '')) {
    return 'javascript';
  }

  if (normalizedExtension === '.json') {
    return 'json';
  }

  if (normalizedExtension === '.md' || normalizedExtension === '.mdx') {
    return 'markdown';
  }

  if (normalizedExtension === '.css') {
    return 'css';
  }

  if (normalizedExtension === '.html' || normalizedExtension === '.htm') {
    return 'html';
  }

  if (['.txt', '.yaml', '.yml', '.env', '.gitignore', '.editorconfig'].includes(normalizedExtension ?? '')
    || normalizedPath.endsWith('/readme')
    || normalizedPath === 'readme') {
    return 'text';
  }

  return 'unknown';
}

function normalizeGraphExtension(extension: string | undefined): string | undefined {
  if (extension === undefined) {
    return undefined;
  }

  const normalized = extension.trim().toLowerCase();

  return GRAPH_EXTENSION_PATTERN.test(normalized) ? normalized : undefined;
}

function getProjectName(root: unknown): string {
  if (!root || typeof root !== 'object') {
    return 'Project';
  }

  const rootRecord = root as {
    readonly displayName?: unknown;
    readonly directoryName?: unknown;
    readonly requestedPath?: unknown;
  };

  const preferred = firstNonEmptyString([
    rootRecord.displayName,
    rootRecord.directoryName,
    getBaseNameIfString(rootRecord.requestedPath)
  ]);

  return preferred ?? 'Project';
}

function getBaseNameIfString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.replace(/\\/g, '/');
  return getBaseName(normalized);
}

function firstNonEmptyString(values: readonly unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }

    const normalized = value.trim();

    if (normalized.length > 0) {
      return normalizeText(normalized, 'Project name', TEXT_FIELD_MAX_LENGTH);
    }
  }

  return undefined;
}

function isGraphBuilderStatus(value: unknown): value is GraphBuilderStatus {
  return typeof value === 'string' && GRAPH_BUILDER_STATUSES.includes(value as GraphBuilderStatus);
}

function isGraphBuilderDiagnosticSeverity(value: unknown): value is GraphBuilderDiagnosticSeverity {
  return typeof value === 'string'
    && GRAPH_BUILDER_DIAGNOSTIC_SEVERITIES.includes(value as GraphBuilderDiagnosticSeverity);
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
    throw new RangeError('Graph builder tag must be a stable graph-model tag token.');
  }

  return normalized;
}

function normalizeFacetKey(value: string): string {
  const normalized = value.trim();

  if (!/^[A-Za-z][A-Za-z0-9._:-]{0,79}$/.test(normalized)) {
    throw new RangeError('Graph builder facet key must be a stable graph-model facet key.');
  }

  return normalized;
}

function compareFacets(left: GraphNodeFacet, right: GraphNodeFacet): number {
  return compareStableText(`${left.key}:${left.value}`, `${right.key}:${right.value}`);
}

function compareDiagnostics(left: GraphBuilderDiagnostic, right: GraphBuilderDiagnostic): number {
  return compareStableText(`${left.code}:${left.path ?? ''}:${left.message}`, `${right.code}:${right.path ?? ''}:${right.message}`);
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

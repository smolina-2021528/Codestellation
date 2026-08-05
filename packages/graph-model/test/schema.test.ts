import { describe, expect, it } from 'vitest';

import {
  CANONICAL_GRAPH_SCHEMA_VERSION,
  GRAPH_EDGE_SCHEMA_VERSION,
  GRAPH_NODE_SCHEMA_VERSION,
  GRAPH_PROVENANCE_SCHEMA_VERSION,
  assertCanonicalGraphSnapshot,
  createGraphEdgeId,
  createGraphNodeId,
  isCanonicalGraphSnapshot,
  isGraphValidationIssueCode,
  isGraphValidationSeverity,
  parseRepositoryPath,
  toSerializableCanonicalGraphSnapshot,
  validateCanonicalGraphSnapshot,
  type CanonicalGraphEdge,
  type CanonicalGraphNode,
  type CanonicalGraphSnapshot,
  type FileGraphNode,
  type ProjectGraphNode,
  type SymbolGraphNode
} from '../src/index.js';

const projectNodeId = createGraphNodeId('project/codestellation');
const fileNodeId = createGraphNodeId('file/packages/graph-model/src/schema.ts');
const symbolNodeId = createGraphNodeId('symbol/packages/graph-model/src/schema.ts/CanonicalGraphSnapshot');

function graphMetadata() {
  return {
    confidence: {
      level: 'confirmed' as const,
      score: 1,
      rationale: 'Observed from deterministic graph schema test data.'
    },
    provenance: [
      {
        schemaVersion: GRAPH_PROVENANCE_SCHEMA_VERSION,
        type: 'static-analysis' as const,
        producer: {
          name: 'graph-schema-test'
        },
        evidence: [
          {
            type: 'static-rule' as const,
            value: 'unit-test-fixture'
          }
        ]
      }
    ]
  };
}

function projectNode(): ProjectGraphNode {
  return {
    schemaVersion: GRAPH_NODE_SCHEMA_VERSION,
    id: projectNodeId,
    kind: 'project',
    display: {
      label: 'Codestellation'
    },
    analysis: {
      tags: ['mvp1'],
      facets: []
    },
    ...graphMetadata(),
    project: {
      name: 'Codestellation'
    }
  };
}

function fileNode(): FileGraphNode {
  return {
    schemaVersion: GRAPH_NODE_SCHEMA_VERSION,
    id: fileNodeId,
    kind: 'file',
    parentId: projectNodeId,
    display: {
      label: 'schema.ts'
    },
    analysis: {
      tags: ['graph-model'],
      facets: [
        {
          key: 'layer',
          value: 'model'
        }
      ]
    },
    ...graphMetadata(),
    file: {
      path: parseRepositoryPath('packages/graph-model/src/schema.ts'),
      language: 'typescript',
      extension: '.ts',
      lineCount: 220
    }
  };
}

function symbolNode(): SymbolGraphNode {
  return {
    schemaVersion: GRAPH_NODE_SCHEMA_VERSION,
    id: symbolNodeId,
    kind: 'symbol',
    parentId: fileNodeId,
    display: {
      label: 'CanonicalGraphSnapshot'
    },
    analysis: {
      tags: ['contract'],
      facets: []
    },
    ...graphMetadata(),
    symbol: {
      name: 'CanonicalGraphSnapshot',
      symbolKind: 'interface',
      exportKind: 'named',
      path: parseRepositoryPath('packages/graph-model/src/schema.ts')
    }
  };
}

function containsEdge(): CanonicalGraphEdge {
  return {
    schemaVersion: GRAPH_EDGE_SCHEMA_VERSION,
    id: createGraphEdgeId('contains/project/schema-file'),
    kind: 'contains',
    fromNodeId: projectNodeId,
    toNodeId: fileNodeId,
    direction: 'directed',
    attributes: {},
    ...graphMetadata()
  };
}

function declaresEdge(): CanonicalGraphEdge {
  return {
    schemaVersion: GRAPH_EDGE_SCHEMA_VERSION,
    id: createGraphEdgeId('declares/schema-file/canonical-graph-snapshot'),
    kind: 'declares',
    fromNodeId: fileNodeId,
    toNodeId: symbolNodeId,
    direction: 'directed',
    attributes: {
      exportKind: 'named'
    },
    ...graphMetadata(),
    source: {
      path: parseRepositoryPath('packages/graph-model/src/schema.ts')
    }
  };
}

function validSnapshot(): CanonicalGraphSnapshot {
  return {
    schemaVersion: CANONICAL_GRAPH_SCHEMA_VERSION,
    rootNodeId: projectNodeId,
    nodes: [
      projectNode(),
      fileNode(),
      symbolNode()
    ],
    edges: [
      containsEdge(),
      declaresEdge()
    ]
  };
}

describe('graph snapshot validation', () => {
  it('accepts a canonical graph snapshot with one project root and valid endpoints', () => {
    const snapshot = validSnapshot();
    const result = validateCanonicalGraphSnapshot(snapshot);

    expect(result).toEqual({
      valid: true,
      issues: []
    });
    expect(isCanonicalGraphSnapshot(snapshot)).toBe(true);
    expect(() => assertCanonicalGraphSnapshot(snapshot)).not.toThrow();
  });

  it('recognizes validation issue codes and severities', () => {
    expect(isGraphValidationIssueCode('GRAPH_EDGE_TARGET_NODE_MISSING')).toBe(true);
    expect(isGraphValidationIssueCode('GRAPH_DATABASE_WRITE_FAILED')).toBe(false);
    expect(isGraphValidationSeverity('error')).toBe(true);
    expect(isGraphValidationSeverity('fatal')).toBe(false);
  });

  it('returns explicit issues for duplicate ids and missing edge endpoints', () => {
    const duplicateFile = {
      ...fileNode(),
      parentId: projectNodeId
    };
    const edgeToMissingNode: CanonicalGraphEdge = {
      ...declaresEdge(),
      id: createGraphEdgeId('declares/schema-file/missing-symbol'),
      toNodeId: createGraphNodeId('symbol/missing')
    };
    const snapshot: CanonicalGraphSnapshot = {
      ...validSnapshot(),
      nodes: [
        projectNode(),
        fileNode(),
        duplicateFile
      ],
      edges: [
        containsEdge(),
        edgeToMissingNode
      ]
    };

    const result = validateCanonicalGraphSnapshot(snapshot);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      'GRAPH_NODE_ID_DUPLICATE',
      'GRAPH_EDGE_TARGET_NODE_MISSING'
    ]);
  });

  it('rejects snapshots whose root node is missing or not a project node', () => {
    const missingRootResult = validateCanonicalGraphSnapshot({
      ...validSnapshot(),
      rootNodeId: createGraphNodeId('project/missing')
    });

    const fileRootResult = validateCanonicalGraphSnapshot({
      ...validSnapshot(),
      rootNodeId: fileNodeId
    });

    expect(missingRootResult.issues.map((issue) => issue.code)).toContain('GRAPH_ROOT_NODE_MISSING');
    expect(fileRootResult.issues.map((issue) => issue.code)).toContain('GRAPH_ROOT_NODE_NOT_PROJECT');
  });

  it('rejects missing parent references and self-parent references', () => {
    const missingParentNode: CanonicalGraphNode = {
      ...symbolNode(),
      parentId: createGraphNodeId('file/missing')
    };
    const selfParentNode: CanonicalGraphNode = {
      ...fileNode(),
      id: createGraphNodeId('file/self-parent'),
      parentId: createGraphNodeId('file/self-parent'),
      file: {
        path: parseRepositoryPath('src/self-parent.ts'),
        language: 'typescript'
      }
    };

    const result = validateCanonicalGraphSnapshot({
      ...validSnapshot(),
      nodes: [
        projectNode(),
        fileNode(),
        missingParentNode,
        selfParentNode
      ],
      edges: []
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      'GRAPH_PARENT_NODE_MISSING',
      'GRAPH_PARENT_NODE_SELF_REFERENCE'
    ]);
  });

  it('rejects invalid node and edge payloads without stopping cross-collection validation', () => {
    const invalidNode = {
      ...fileNode(),
      file: {
        path: '/absolute/path.ts',
        language: 'typescript'
      }
    };
    const invalidEdge = {
      ...containsEdge(),
      direction: 'undirected'
    };

    const result = validateCanonicalGraphSnapshot({
      ...validSnapshot(),
      nodes: [
        projectNode(),
        invalidNode
      ],
      edges: [
        invalidEdge,
        declaresEdge()
      ]
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      'GRAPH_NODE_INVALID',
      'GRAPH_EDGE_INVALID',
      'GRAPH_EDGE_SOURCE_NODE_MISSING',
      'GRAPH_EDGE_TARGET_NODE_MISSING'
    ]);
  });

  it('normalizes graph snapshots deterministically', () => {
    const snapshot: CanonicalGraphSnapshot = {
      ...validSnapshot(),
      nodes: [
        symbolNode(),
        projectNode(),
        fileNode()
      ],
      edges: [
        declaresEdge(),
        containsEdge()
      ]
    };

    expect(toSerializableCanonicalGraphSnapshot(snapshot)).toEqual({
      schemaVersion: CANONICAL_GRAPH_SCHEMA_VERSION,
      rootNodeId: projectNodeId,
      nodes: [
        fileNode(),
        projectNode(),
        symbolNode()
      ],
      edges: [
        containsEdge(),
        declaresEdge()
      ]
    });
  });

  it('throws a compact error for invalid snapshots', () => {
    expect(() => assertCanonicalGraphSnapshot({
      ...validSnapshot(),
      nodes: []
    })).toThrow(RangeError);
  });
});

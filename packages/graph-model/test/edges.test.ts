import { describe, expect, it } from 'vitest';

import {
  GRAPH_EDGE_SCHEMA_VERSION,
  GRAPH_PROVENANCE_SCHEMA_VERSION,
  assertCanonicalGraphEdge,
  createGraphEdgeId,
  createGraphNodeId,
  isCanonicalGraphEdge,
  isGraphEdgeDirection,
  isGraphEdgeId,
  isGraphEdgeKind,
  parseRepositoryPath,
  toSerializableGraphEdge,
  toSerializableGraphEdgeAttributes,
  validateGraphEdgeIdToken,
  type CanonicalGraphEdge,
  type CallsGraphEdge,
  type ContainsGraphEdge,
  type DeclaresGraphEdge,
  type GraphEdgeAttributes
} from '../src/index.js';

const projectNodeId = createGraphNodeId('project/codestellation');
const fileNodeId = createGraphNodeId('file/packages/graph-model/src/edges.ts');
const symbolNodeId = createGraphNodeId('symbol/packages/graph-model/src/edges.ts/CanonicalGraphEdge');


function graphMetadata() {
  return {
    confidence: {
      level: 'confirmed' as const,
      score: 1,
      rationale: 'Observed from deterministic graph edge test data.'
    },
    provenance: [
      {
        schemaVersion: GRAPH_PROVENANCE_SCHEMA_VERSION,
        type: 'static-analysis' as const,
        producer: {
          name: 'graph-model-test'
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

function baseEdge<const TKind extends CanonicalGraphEdge['kind']>(kind: TKind) {
  return {
    schemaVersion: GRAPH_EDGE_SCHEMA_VERSION,
    id: createGraphEdgeId(`${kind}/project-to-file`),
    kind,
    fromNodeId: projectNodeId,
    toNodeId: fileNodeId,
    direction: 'directed' as const,
    attributes: {},
    ...graphMetadata()
  };
}

describe('graph edge identifiers', () => {
  it('creates and parses serializable graph edge ids', () => {
    const id = createGraphEdgeId('contains/project/file');

    expect(id).toBe('edge:contains/project/file');
    expect(isGraphEdgeId(id)).toBe(true);
    expect(isGraphEdgeId('contains/project/file')).toBe(false);
  });

  it('rejects unsafe graph edge id tokens', () => {
    expect(validateGraphEdgeIdToken('calls/file/symbol')).toBe(true);
    expect(validateGraphEdgeIdToken('../calls/file/symbol')).toBe(false);
    expect(validateGraphEdgeIdToken('calls//symbol')).toBe(false);
    expect(() => createGraphEdgeId(' calls')).toThrow(RangeError);
  });
});

describe('graph edge guards', () => {
  it('recognizes initial relation kinds and directions', () => {
    expect(isGraphEdgeKind('contains')).toBe(true);
    expect(isGraphEdgeKind('depends-on')).toBe(true);
    expect(isGraphEdgeKind('owned-by')).toBe(false);

    expect(isGraphEdgeDirection('directed')).toBe(true);
    expect(isGraphEdgeDirection('undirected')).toBe(true);
    expect(isGraphEdgeDirection('bidirectional')).toBe(false);
  });
});

describe('canonical graph edges', () => {
  it('accepts initial directed relation kinds', () => {
    const edges: readonly CanonicalGraphEdge[] = [
      {
        ...baseEdge('contains'),
        id: createGraphEdgeId('contains/project/file')
      },
      {
        ...baseEdge('imports'),
        id: createGraphEdgeId('imports/file/module'),
        fromNodeId: fileNodeId,
        toNodeId: createGraphNodeId('symbol/external/module'),
        attributes: {
          moduleSpecifier: './nodes.js',
          importKind: 'named'
        }
      },
      {
        ...baseEdge('exports'),
        id: createGraphEdgeId('exports/file/symbol'),
        fromNodeId: fileNodeId,
        toNodeId: symbolNodeId,
        attributes: {
          exportKind: 'named'
        }
      },
      {
        ...baseEdge('declares'),
        id: createGraphEdgeId('declares/file/symbol'),
        fromNodeId: fileNodeId,
        toNodeId: symbolNodeId
      },
      {
        ...baseEdge('calls'),
        id: createGraphEdgeId('calls/symbol/helper'),
        fromNodeId: symbolNodeId,
        toNodeId: createGraphNodeId('symbol/packages/graph-model/src/edges.ts/parseGraphEdgeId'),
        attributes: {
          async: false,
          callCount: 1,
          conditional: false
        }
      },
      {
        ...baseEdge('references'),
        id: createGraphEdgeId('references/symbol/type'),
        fromNodeId: symbolNodeId,
        toNodeId: createGraphNodeId('symbol/packages/graph-model/src/nodes.ts/GraphNodeId')
      },
      {
        ...baseEdge('depends-on'),
        id: createGraphEdgeId('depends-on/package/contracts'),
        fromNodeId: createGraphNodeId('package/graph-model'),
        toNodeId: createGraphNodeId('package/contracts')
      }
    ];

    for (const edge of edges) {
      expect(isCanonicalGraphEdge(edge)).toBe(true);
      expect(toSerializableGraphEdge(edge)).toEqual(edge);
    }
  });

  it('accepts source location for relation evidence without binding to a parser', () => {
    const edge: DeclaresGraphEdge = {
      ...baseEdge('declares'),
      id: createGraphEdgeId('declares/file/canonical-edge'),
      fromNodeId: fileNodeId,
      toNodeId: symbolNodeId,
      source: {
        path: parseRepositoryPath('packages/graph-model/src/edges.ts'),
        range: {
          start: {
            line: 90,
            column: 1
          },
          end: {
            line: 97,
            column: 2
          }
        }
      }
    };

    expect(isCanonicalGraphEdge(edge)).toBe(true);
    expect(toSerializableGraphEdge(edge)).toEqual(edge);
  });

  it('normalizes edge attributes deterministically', () => {
    const attributes: GraphEdgeAttributes = {
      moduleSpecifier: './nodes.js',
      metadata: {
        zeta: true,
        alpha: 'first'
      },
      callCount: 1
    };

    expect(toSerializableGraphEdgeAttributes(attributes)).toEqual({
      callCount: 1,
      metadata: {
        alpha: 'first',
        zeta: true
      },
      moduleSpecifier: './nodes.js'
    });
  });

  it('rejects invalid endpoint ids, self loops, non-directed initial edges and unsafe attributes', () => {
    const invalidSourceNode = {
      ...baseEdge('contains'),
      fromNodeId: 'node-without-prefix'
    };

    const selfLoop: ContainsGraphEdge = {
      ...baseEdge('contains'),
      toNodeId: projectNodeId
    };

    const undirectedInitialEdge = {
      ...baseEdge('references'),
      direction: 'undirected'
    };

    const unsafeAttributes: CallsGraphEdge = {
      ...baseEdge('calls'),
      fromNodeId: symbolNodeId,
      toNodeId: createGraphNodeId('symbol/packages/graph-model/src/edges.ts/helper'),
      attributes: {
        callCount: Number.NaN
      }
    };

    const edgeWithoutProvenance = {
      ...baseEdge('calls'),
      provenance: []
    };

    expect(() => assertCanonicalGraphEdge(invalidSourceNode)).toThrow(RangeError);
    expect(() => assertCanonicalGraphEdge(selfLoop)).toThrow(RangeError);
    expect(() => assertCanonicalGraphEdge(undirectedInitialEdge)).toThrow(RangeError);
    expect(() => assertCanonicalGraphEdge(unsafeAttributes)).toThrow(RangeError);
    expect(() => assertCanonicalGraphEdge(edgeWithoutProvenance)).toThrow(RangeError);
  });

  it('rejects unsafe edge source paths and invalid source ranges', () => {
    const absoluteSource = {
      ...baseEdge('declares'),
      source: {
        path: '/tmp/source.ts'
      }
    };

    const invertedRange = {
      ...baseEdge('declares'),
      source: {
        path: parseRepositoryPath('packages/graph-model/src/edges.ts'),
        range: {
          start: {
            line: 20,
            column: 1
          },
          end: {
            line: 10,
            column: 1
          }
        }
      }
    };

    expect(() => assertCanonicalGraphEdge(absoluteSource)).toThrow(RangeError);
    expect(() => assertCanonicalGraphEdge(invertedRange)).toThrow(RangeError);
  });
});

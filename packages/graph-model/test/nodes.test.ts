import { describe, expect, it } from 'vitest';

import {
  GRAPH_NODE_SCHEMA_VERSION,
  assertCanonicalGraphNode,
  createGraphNodeId,
  isCanonicalGraphNode,
  isGraphNodeId,
  isRepositoryPath,
  parseRepositoryPath,
  toSerializableGraphNode,
  validateGraphNodeIdToken,
  validateRepositoryPath,
  type CanonicalGraphNode,
  type FileGraphNode,
  type ProjectGraphNode,
  type SymbolGraphNode
} from '../src/index.js';

function baseNodeFields<const TKind extends CanonicalGraphNode['kind']>(
  kind: TKind,
  parentId = createGraphNodeId('project/root')
) {
  return {
    schemaVersion: GRAPH_NODE_SCHEMA_VERSION,
    id: createGraphNodeId(`${kind}/example`),
    kind,
    parentId,
    display: {
      label: `Example ${kind}`
    },
    analysis: {
      tags: ['mvp1'],
      facets: [
        {
          key: 'layer',
          value: 'graph-model'
        }
      ]
    }
  };
}

describe('graph node identifiers', () => {
  it('creates and parses serializable graph node ids', () => {
    const id = createGraphNodeId('project/codestellation');

    expect(id).toBe('node:project/codestellation');
    expect(isGraphNodeId(id)).toBe(true);
    expect(isGraphNodeId('project/codestellation')).toBe(false);
  });

  it('rejects unsafe graph node id tokens', () => {
    expect(validateGraphNodeIdToken('project/codestellation')).toBe(true);
    expect(validateGraphNodeIdToken('../codestellation')).toBe(false);
    expect(validateGraphNodeIdToken('project//codestellation')).toBe(false);
    expect(() => createGraphNodeId(' project')).toThrow(RangeError);
  });
});

describe('repository paths', () => {
  it('accepts repository-relative paths only', () => {
    const path = parseRepositoryPath('packages/graph-model/src/nodes.ts');

    expect(path).toBe('packages/graph-model/src/nodes.ts');
    expect(isRepositoryPath(path)).toBe(true);
    expect(validateRepositoryPath('/absolute/path.ts')).toBe(false);
    expect(validateRepositoryPath('packages/../secret.ts')).toBe(false);
    expect(validateRepositoryPath('packages\\graph-model')).toBe(false);
  });
});

describe('canonical graph nodes', () => {
  it('accepts a project node without parent id', () => {
    const node: ProjectGraphNode = {
      schemaVersion: GRAPH_NODE_SCHEMA_VERSION,
      id: createGraphNodeId('project/codestellation'),
      kind: 'project',
      display: {
        label: 'Codestellation',
        subtitle: 'Local-first software knowledge graph'
      },
      analysis: {
        tags: ['product'],
        facets: []
      },
      project: {
        name: 'Codestellation'
      }
    };

    expect(isCanonicalGraphNode(node)).toBe(true);
    expect(toSerializableGraphNode(node)).toEqual(node);
  });

  it('accepts package, folder, file and symbol node payloads', () => {
    const packageNode: CanonicalGraphNode = {
      ...baseNodeFields('package'),
      id: createGraphNodeId('package/graph-model'),
      package: {
        name: '@codestellation/graph-model',
        manager: 'pnpm',
        manifestPath: parseRepositoryPath('packages/graph-model/package.json')
      }
    };

    const folderNode: CanonicalGraphNode = {
      ...baseNodeFields('folder'),
      id: createGraphNodeId('folder/packages/graph-model/src'),
      folder: {
        path: parseRepositoryPath('packages/graph-model/src')
      }
    };

    const fileNode: FileGraphNode = {
      ...baseNodeFields('file'),
      id: createGraphNodeId('file/packages/graph-model/src/nodes.ts'),
      file: {
        path: parseRepositoryPath('packages/graph-model/src/nodes.ts'),
        language: 'typescript',
        extension: '.ts',
        lineCount: 120
      }
    };

    const symbolNode: SymbolGraphNode = {
      ...baseNodeFields('symbol', fileNode.id),
      id: createGraphNodeId('symbol/packages/graph-model/src/nodes.ts/CanonicalGraphNode'),
      symbol: {
        name: 'CanonicalGraphNode',
        symbolKind: 'type',
        exportKind: 'named',
        path: parseRepositoryPath('packages/graph-model/src/nodes.ts'),
        range: {
          start: {
            line: 121,
            column: 1
          },
          end: {
            line: 126,
            column: 2
          }
        }
      }
    };

    expect(isCanonicalGraphNode(packageNode)).toBe(true);
    expect(isCanonicalGraphNode(folderNode)).toBe(true);
    expect(isCanonicalGraphNode(fileNode)).toBe(true);
    expect(isCanonicalGraphNode(symbolNode)).toBe(true);
  });

  it('normalizes serializable analysis data deterministically', () => {
    const node: ProjectGraphNode = {
      schemaVersion: GRAPH_NODE_SCHEMA_VERSION,
      id: createGraphNodeId('project/codestellation'),
      kind: 'project',
      display: {
        label: ' Codestellation '
      },
      analysis: {
        tags: ['zeta', 'alpha'],
        facets: [
          {
            key: 'module',
            value: 'graph'
          },
          {
            key: 'layer',
            value: 'model'
          }
        ]
      },
      project: {
        name: ' Codestellation '
      }
    };

    expect(toSerializableGraphNode(node)).toEqual({
      schemaVersion: GRAPH_NODE_SCHEMA_VERSION,
      id: 'node:project/codestellation',
      kind: 'project',
      display: {
        label: 'Codestellation'
      },
      analysis: {
        tags: ['alpha', 'zeta'],
        facets: [
          {
            key: 'layer',
            value: 'model'
          },
          {
            key: 'module',
            value: 'graph'
          }
        ]
      },
      project: {
        name: 'Codestellation'
      }
    });
  });

  it('rejects invalid hierarchy and payloads', () => {
    const projectWithParent = {
      ...baseNodeFields('project'),
      project: {
        name: 'Codestellation'
      }
    };

    const fileWithoutParent = {
      ...baseNodeFields('file'),
      parentId: undefined,
      file: {
        path: parseRepositoryPath('src/index.ts'),
        language: 'typescript'
      }
    };

    const symbolWithInvalidRange = {
      ...baseNodeFields('symbol'),
      symbol: {
        name: 'broken',
        symbolKind: 'function',
        exportKind: 'named',
        path: parseRepositoryPath('src/index.ts'),
        range: {
          start: {
            line: 10,
            column: 1
          },
          end: {
            line: 2,
            column: 1
          }
        }
      }
    };

    expect(() => assertCanonicalGraphNode(projectWithParent)).toThrow(RangeError);
    expect(() => assertCanonicalGraphNode(fileWithoutParent)).toThrow(RangeError);
    expect(() => assertCanonicalGraphNode(symbolWithInvalidRange)).toThrow(RangeError);
  });
});

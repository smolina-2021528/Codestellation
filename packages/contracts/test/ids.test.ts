import { describe, expect, it } from 'vitest';
import {
  createProjectId,
  createSnapshotId,
  createSourceFileId,
  createSourceId,
  createSourceRevisionId,
  isProjectId,
  isProjectSourceKind,
  isSnapshotId,
  isSourceFileId,
  isSourceId,
  isSourceRevisionId,
  parseProjectId,
  parseSnapshotId,
  parseSourceFileId,
  parseSourceId,
  parseSourceRevisionId,
  toSerializableId,
  validateIdentifierToken,
  type ProjectSnapshotIdentity,
  type SourceRevisionIdentity
} from '../src/index';

describe('codestellation identifiers', () => {
  it('creates stable serializable identifiers with explicit prefixes', () => {
    expect(createProjectId('demo-project')).toBe('project:demo-project');
    expect(createSourceId('local-main')).toBe('source:local-main');
    expect(createSourceFileId('src/index.ts')).toBe('file:src/index.ts');
    expect(createSourceRevisionId('git-main-a1b2c3')).toBe('revision:git-main-a1b2c3');
    expect(createSnapshotId('20260731T182100Z')).toBe('snapshot:20260731T182100Z');
  });

  it('parses identifiers only when the expected prefix and token are valid', () => {
    expect(parseProjectId('project:demo-project')).toBe('project:demo-project');
    expect(parseSourceId('source:local-main')).toBe('source:local-main');
    expect(parseSourceFileId('file:src/index.ts')).toBe('file:src/index.ts');
    expect(parseSourceRevisionId('revision:git-main-a1b2c3')).toBe('revision:git-main-a1b2c3');
    expect(parseSnapshotId('snapshot:20260731T182100Z')).toBe('snapshot:20260731T182100Z');
    expect(() => parseProjectId('source:demo-project')).toThrow('Expected project identifier prefix.');
    expect(() => parseSnapshotId('snapshot:bad token')).toThrow('URL-safe');
  });

  it('narrows identifier strings with runtime guards', () => {
    expect(isProjectId('project:demo-project')).toBe(true);
    expect(isSourceId('source:local-main')).toBe(true);
    expect(isSourceFileId('file:src/index.ts')).toBe(true);
    expect(isSourceRevisionId('revision:git-main-a1b2c3')).toBe(true);
    expect(isSnapshotId('snapshot:20260731T182100Z')).toBe(true);
    expect(isProjectId('source:demo-project')).toBe(false);
    expect(isSnapshotId(undefined)).toBe(false);
  });

  it('rejects unsafe or ambiguous identifier tokens', () => {
    expect(validateIdentifierToken('demo-project')).toBe(true);
    expect(validateIdentifierToken('src/index.ts')).toBe(true);
    expect(validateIdentifierToken('')).toBe(false);
    expect(validateIdentifierToken(' bad')).toBe(false);
    expect(validateIdentifierToken('bad token')).toBe(false);
    expect(validateIdentifierToken('../secret')).toBe(false);
    expect(validateIdentifierToken('src//index.ts')).toBe(false);
    expect(validateIdentifierToken('src\\index.ts')).toBe(false);
  });

  it('keeps source kinds small and explicit for MVP 1 ingestion', () => {
    expect(isProjectSourceKind('local-folder')).toBe(true);
    expect(isProjectSourceKind('zip-archive')).toBe(true);
    expect(isProjectSourceKind('git-repository')).toBe(true);
    expect(isProjectSourceKind('remote-api')).toBe(false);
  });

  it('models snapshot identity without depending on persistence', () => {
    const revision: SourceRevisionIdentity = {
      id: createSourceRevisionId('git-main-a1b2c3'),
      sourceId: createSourceId('public-git-origin'),
      label: 'main@a1b2c3'
    };

    const snapshot: ProjectSnapshotIdentity = {
      id: createSnapshotId('20260731T182100Z'),
      projectId: createProjectId('demo-project'),
      sourceId: revision.sourceId,
      revisionId: revision.id
    };

    expect(toSerializableId(snapshot.id)).toBe('snapshot:20260731T182100Z');
    expect(snapshot.revisionId).toBe(revision.id);
  });
});

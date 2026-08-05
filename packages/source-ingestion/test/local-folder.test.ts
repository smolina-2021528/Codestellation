import { lstat, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';

import {
  LOCAL_FOLDER_RESOLUTION_ISSUE_CODES,
  RESOLVED_LOCAL_FOLDER_SOURCE_SCHEMA_VERSION,
  SOURCE_INPUT_SCHEMA_VERSION,
  isLocalFolderResolutionIssueCode,
  parseLocalSourcePath,
  parseSourceGlobPattern,
  resolveLocalFolderSource,
  toSerializableResolvedLocalFolderSource,
  type LocalFolderSourceInput,
  type SourceInputSourceId
} from '../src/index.js';

async function createTempRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'codestellation-local-folder-'));
}

describe('local folder source resolution', () => {
  it('resolves an existing local folder without scanning its contents', async () => {
    const tempRoot = await createTempRoot();

    try {
      await mkdir(join(tempRoot, 'workspace', 'src'), { recursive: true });
      await writeFile(join(tempRoot, 'workspace', 'src', 'ignored.ts'), 'export const value = 1;\n');

      const input: LocalFolderSourceInput = {
        schemaVersion: SOURCE_INPUT_SCHEMA_VERSION,
        kind: 'local-folder',
        sourceId: 'source:local-folder-demo' as SourceInputSourceId,
        displayName: 'Local Folder Demo',
        path: parseLocalSourcePath('workspace'),
        options: {
          scan: {
            include: [parseSourceGlobPattern('src/**/*.ts')],
            exclude: [parseSourceGlobPattern('dist/**')],
            maxFiles: 25
          }
        }
      };

      const resolved = await resolveLocalFolderSource(input, { cwd: tempRoot });
      const serializable = toSerializableResolvedLocalFolderSource(resolved);

      expect(serializable).toMatchObject({
        schemaVersion: RESOLVED_LOCAL_FOLDER_SOURCE_SCHEMA_VERSION,
        kind: 'local-folder',
        sourceId: 'source:local-folder-demo',
        displayName: 'Local Folder Demo',
        requestedPath: 'workspace',
        directoryName: 'workspace',
        filesystem: {
          exists: true,
          type: 'directory',
          symbolicLink: false
        }
      });
      expect(serializable.absolutePath.endsWith('/workspace')).toBe(true);
      expect(serializable.realPath.endsWith('/workspace')).toBe(true);
      expect(serializable.options.scan.include).toEqual(['src/**/*.ts']);
      expect(serializable.options.scan.exclude).toEqual(['dist/**']);
      expect(serializable.options.scan.maxFiles).toBe(25);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('rejects missing paths and non-directory paths', async () => {
    const tempRoot = await createTempRoot();

    try {
      await writeFile(join(tempRoot, 'README.md'), '# Demo\n');

      const missingInput: LocalFolderSourceInput = {
        schemaVersion: SOURCE_INPUT_SCHEMA_VERSION,
        kind: 'local-folder',
        path: parseLocalSourcePath('missing')
      };
      const fileInput: LocalFolderSourceInput = {
        schemaVersion: SOURCE_INPUT_SCHEMA_VERSION,
        kind: 'local-folder',
        path: parseLocalSourcePath('README.md')
      };

      await expect(resolveLocalFolderSource(missingInput, { cwd: tempRoot })).rejects.toMatchObject({
        code: 'LOCAL_FOLDER_SOURCE_NOT_FOUND'
      });
      await expect(resolveLocalFolderSource(fileInput, { cwd: tempRoot })).rejects.toMatchObject({
        code: 'LOCAL_FOLDER_SOURCE_NOT_DIRECTORY'
      });
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('rejects symbolic link roots when the platform allows creating them', async () => {
    const tempRoot = await createTempRoot();

    try {
      await mkdir(join(tempRoot, 'real-workspace'), { recursive: true });

      const linkPath = join(tempRoot, 'linked-workspace');

      try {
        await symlink(join(tempRoot, 'real-workspace'), linkPath, 'dir');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        return;
      }

      const linkStats = await lstat(linkPath);
      const input: LocalFolderSourceInput = {
        schemaVersion: SOURCE_INPUT_SCHEMA_VERSION,
        kind: 'local-folder',
        path: parseLocalSourcePath(`linked-workspace`.split('/').join(sep))
      };

      expect(linkStats.isSymbolicLink()).toBe(true);
      await expect(resolveLocalFolderSource(input, { cwd: tempRoot })).rejects.toMatchObject({
        code: 'LOCAL_FOLDER_SOURCE_SYMLINK_NOT_ALLOWED'
      });
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('exposes stable local folder resolution issue codes', () => {
    expect(LOCAL_FOLDER_RESOLUTION_ISSUE_CODES).toEqual([
      'LOCAL_FOLDER_SOURCE_INVALID_INPUT',
      'LOCAL_FOLDER_SOURCE_NOT_FOUND',
      'LOCAL_FOLDER_SOURCE_NOT_DIRECTORY',
      'LOCAL_FOLDER_SOURCE_SYMLINK_NOT_ALLOWED',
      'LOCAL_FOLDER_SOURCE_REALPATH_FAILED'
    ]);
    expect(isLocalFolderResolutionIssueCode('LOCAL_FOLDER_SOURCE_NOT_FOUND')).toBe(true);
    expect(isLocalFolderResolutionIssueCode('LOCAL_FOLDER_SOURCE_REMOTE_ONLY')).toBe(false);
  });
});

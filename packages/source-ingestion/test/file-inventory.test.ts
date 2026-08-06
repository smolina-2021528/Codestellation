import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';

import {
  SOURCE_FILE_INVENTORY_ISSUE_CODES,
  SOURCE_FILE_INVENTORY_SCHEMA_VERSION,
  SOURCE_INPUT_SCHEMA_VERSION,
  createNormalizedSourceFileInventory,
  isSourceFileInventoryIssueCode,
  isSourceFileInventoryPath,
  isSourceFileKind,
  parseLocalSourcePath,
  parseSourceFileInventoryPath,
  parseSourceGlobPattern,
  resolveLocalFolderSource,
  toSerializableSourceFileInventory,
  type LocalFolderSourceInput
} from '../src/index.js';

async function createTempRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'codestellation-file-inventory-'));
}

async function createResolvedWorkspace(
  tempRoot: string,
  input?: Partial<LocalFolderSourceInput>
): Promise<Awaited<ReturnType<typeof resolveLocalFolderSource>>> {
  const sourceInput: LocalFolderSourceInput = {
    schemaVersion: SOURCE_INPUT_SCHEMA_VERSION,
    kind: 'local-folder',
    path: parseLocalSourcePath('workspace'),
    ...input
  };

  return resolveLocalFolderSource(sourceInput, { cwd: tempRoot });
}

describe('source file inventory', () => {
  it('creates a deterministic local folder file inventory without reading file contents', async () => {
    const tempRoot = await createTempRoot();

    try {
      await mkdir(join(tempRoot, 'workspace', 'src'), { recursive: true });
      await mkdir(join(tempRoot, 'workspace', 'node_modules', 'ignored'), { recursive: true });
      await mkdir(join(tempRoot, 'workspace', '.git', 'objects'), { recursive: true });
      await mkdir(join(tempRoot, 'workspace', 'dist'), { recursive: true });
      await writeFile(join(tempRoot, 'workspace', 'src', 'index.ts'), 'export const value = 1;\n');
      await writeFile(join(tempRoot, 'workspace', 'src', 'index.test.ts'), 'import { value } from "./index";\n');
      await writeFile(join(tempRoot, 'workspace', 'README.md'), '# Demo\n');
      await writeFile(join(tempRoot, 'workspace', 'package.json'), '{"name":"demo"}\n');
      await writeFile(join(tempRoot, 'workspace', 'node_modules', 'ignored', 'index.js'), 'ignored\n');
      await writeFile(join(tempRoot, 'workspace', '.git', 'HEAD'), 'main\n');
      await writeFile(join(tempRoot, 'workspace', 'dist', 'bundle.js'), 'ignored\n');

      const resolved = await createResolvedWorkspace(tempRoot);
      const inventory = await createNormalizedSourceFileInventory(resolved);
      const serializable = toSerializableSourceFileInventory(inventory);

      expect(serializable.schemaVersion).toBe(SOURCE_FILE_INVENTORY_SCHEMA_VERSION);
      expect(serializable.root).toMatchObject({
        kind: 'local-folder',
        requestedPath: 'workspace',
        directoryName: 'workspace'
      });
      expect(serializable.files.map((file) => file.path)).toEqual([
        'README.md',
        'package.json',
        'src/index.test.ts',
        'src/index.ts'
      ]);
      expect(serializable.files.map((file) => file.kind)).toEqual([
        'documentation',
        'manifest',
        'test',
        'source'
      ]);
      expect(serializable.summary).toMatchObject({
        fileCount: 4,
        skippedDirectoryCount: 3,
        oversizedFileCount: 0,
        symlinkCount: 0
      });
      expect(serializable.files.every((file) => file.sizeBytes > 0)).toBe(true);
      expect(serializable.files.every((file) => Date.parse(file.modifiedAt) > 0)).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('respects include patterns, exclude patterns and maxFileSizeBytes', async () => {
    const tempRoot = await createTempRoot();

    try {
      await mkdir(join(tempRoot, 'workspace', 'src', 'generated'), { recursive: true });
      await writeFile(join(tempRoot, 'workspace', 'src', 'small.ts'), 'small\n');
      await writeFile(join(tempRoot, 'workspace', 'src', 'large.ts'), 'x'.repeat(32));
      await writeFile(join(tempRoot, 'workspace', 'src', 'generated', 'ignored.ts'), 'ignored\n');
      await writeFile(join(tempRoot, 'workspace', 'README.md'), '# Ignored by include\n');

      const resolved = await createResolvedWorkspace(tempRoot, {
        options: {
          scan: {
            include: [parseSourceGlobPattern('src/**/*.ts')],
            exclude: [parseSourceGlobPattern('src/generated/**')],
            maxFileSizeBytes: 12
          }
        }
      });
      const inventory = await createNormalizedSourceFileInventory(resolved);

      expect(inventory.files.map((file) => file.path)).toEqual(['src/small.ts']);
      expect(inventory.summary).toMatchObject({
        fileCount: 1,
        skippedFileCount: 2,
        skippedDirectoryCount: 1,
        oversizedFileCount: 1
      });
      expect(inventory.issues).toEqual([
        expect.objectContaining({
          code: 'SOURCE_FILE_INVENTORY_FILE_TOO_LARGE',
          path: 'src/large.ts'
        })
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('skips symlinks without following them when the platform allows creating them', async () => {
    const tempRoot = await createTempRoot();

    try {
      await mkdir(join(tempRoot, 'workspace', 'src'), { recursive: true });
      await mkdir(join(tempRoot, 'external'), { recursive: true });
      await writeFile(join(tempRoot, 'workspace', 'src', 'index.ts'), 'export {};\n');
      await writeFile(join(tempRoot, 'external', 'secret.ts'), 'export const secret = true;\n');

      try {
        await symlink(join(tempRoot, 'external'), join(tempRoot, 'workspace', 'linked-external'), 'dir');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        return;
      }

      const resolved = await createResolvedWorkspace(tempRoot);
      const inventory = await createNormalizedSourceFileInventory(resolved);

      expect(inventory.files.map((file) => file.path)).toEqual(['src/index.ts']);
      expect(inventory.summary.symlinkCount).toBe(1);
      expect(inventory.issues).toEqual([
        expect.objectContaining({
          code: 'SOURCE_FILE_INVENTORY_SYMLINK_SKIPPED',
          path: 'linked-external'
        })
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('fails when maxFiles is exceeded before traversal completes', async () => {
    const tempRoot = await createTempRoot();

    try {
      await mkdir(join(tempRoot, 'workspace'), { recursive: true });
      await writeFile(join(tempRoot, 'workspace', 'a.ts'), 'export const a = 1;\n');
      await writeFile(join(tempRoot, 'workspace', 'b.ts'), 'export const b = 1;\n');

      const resolved = await createResolvedWorkspace(tempRoot, {
        options: {
          scan: {
            maxFiles: 1
          }
        }
      });

      await expect(createNormalizedSourceFileInventory(resolved)).rejects.toMatchObject({
        code: 'SOURCE_FILE_INVENTORY_MAX_FILES_EXCEEDED',
        path: 'b.ts'
      });
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('exposes stable path, kind and issue guards', () => {
    expect(SOURCE_FILE_INVENTORY_ISSUE_CODES).toEqual([
      'SOURCE_FILE_INVENTORY_ENTRY_READ_FAILED',
      'SOURCE_FILE_INVENTORY_DIRECTORY_READ_FAILED',
      'SOURCE_FILE_INVENTORY_FILE_TOO_LARGE',
      'SOURCE_FILE_INVENTORY_SYMLINK_SKIPPED',
      'SOURCE_FILE_INVENTORY_MAX_FILES_EXCEEDED'
    ]);
    expect(parseSourceFileInventoryPath('src\\index.ts')).toBe('src/index.ts');
    expect(isSourceFileInventoryPath('src/index.ts')).toBe(true);
    expect(isSourceFileInventoryPath('../secret.ts')).toBe(false);
    expect(isSourceFileInventoryIssueCode('SOURCE_FILE_INVENTORY_FILE_TOO_LARGE')).toBe(true);
    expect(isSourceFileInventoryIssueCode('SOURCE_FILE_INVENTORY_REMOTE_ONLY')).toBe(false);
    expect(isSourceFileKind('manifest')).toBe(true);
    expect(isSourceFileKind('controller')).toBe(false);
  });
});

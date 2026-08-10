import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import {
  CODESTELLATION_CLI_LOCAL_FOLDER_GRAPH_EXPORT_SCHEMA_VERSION,
  createLocalFolderGraphExport,
  indexLocalFolderToJson,
  parseCliArguments,
  runCodestellationCli
} from '../src/index.js';

async function withFixture<T>(callback: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), 'codestellation-cli-'));

  try {
    await writeFile(join(root, 'package.json'), '{"name":"demo"}\n', 'utf8');
    await writeFile(join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n', 'utf8');
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src', 'index.ts'), 'export const answer = 42;\n', 'utf8');
    await mkdir(join(root, 'node_modules', 'ignored'), { recursive: true });
    await writeFile(join(root, 'node_modules', 'ignored', 'index.js'), 'module.exports = {};\n', 'utf8');

    return await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe('Codestellation CLI local index flow', () => {
  it('parses index-local arguments deterministically', () => {
    expect(parseCliArguments([
      'index-local',
      './repo',
      '--out',
      'graph.json',
      '--pretty',
      '--max-files',
      '10',
      '--max-file-size-bytes',
      '1000',
      '--include',
      'src/**',
      '--exclude',
      'src/generated/**'
    ])).toEqual({
      command: 'index-local',
      sourcePath: './repo',
      outputPath: 'graph.json',
      pretty: true,
      include: ['src/**'],
      exclude: ['src/generated/**'],
      maxFiles: 10,
      maxFileSizeBytes: 1000
    });
  });

  it('creates a serializable local folder graph export without reading repository code content', async () => {
    await withFixture(async (root) => {
      const result = await createLocalFolderGraphExport({
        sourcePath: root,
        now: () => new Date('2026-08-10T12:00:00.000Z')
      });

      expect(result.schemaVersion).toBe(CODESTELLATION_CLI_LOCAL_FOLDER_GRAPH_EXPORT_SCHEMA_VERSION);
      expect(result.command).toBe('index-local');
      expect(result.generatedAt).toBe('2026-08-10T12:00:00.000Z');
      expect(result.input.resolvedRootName).toMatch(/^codestellation-cli-/);
      expect(result.summary.inventoryFileCount).toBe(3);
      expect(result.summary.packageNodeCount).toBe(1);
      expect(result.summary.totalEdgeCount).toBeGreaterThan(0);
      expect(result.graph.packageNodes.map((node) => node.package.manifestPath)).toEqual(['package.json']);
      expect(result.graph.dependencyEdges).toEqual([]);
    });
  });

  it('returns compact or pretty JSON from the local index flow', async () => {
    await withFixture(async (root) => {
      const compact = await indexLocalFolderToJson({
        sourcePath: root,
        now: () => new Date('2026-08-10T12:00:00.000Z')
      });
      const pretty = await indexLocalFolderToJson({
        sourcePath: root,
        pretty: true,
        now: () => new Date('2026-08-10T12:00:00.000Z')
      });

      expect(compact).not.toContain('\n  "command"');
      expect(pretty).toContain('\n  "command"');
      expect(JSON.parse(compact)).toMatchObject({ command: 'index-local' });
      expect(JSON.parse(pretty)).toMatchObject({ command: 'index-local' });
    });
  });

  it('writes the graph JSON export to --out when requested', async () => {
    await withFixture(async (root) => {
      const outputPath = join(root, 'graph.json');
      const result = await runCodestellationCli({
        argv: ['index-local', root, '--out', outputPath, '--pretty'],
        now: () => new Date('2026-08-10T12:00:00.000Z')
      });
      const written = JSON.parse(await readFile(outputPath, 'utf8')) as { readonly command?: string };

      expect(result).toEqual({ exitCode: 0, stdout: '', stderr: '' });
      expect(written.command).toBe('index-local');
    });
  });

  it('returns clear errors for invalid commands', async () => {
    const result = await runCodestellationCli({ argv: ['unknown'] });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Unsupported command: unknown');
  });
});

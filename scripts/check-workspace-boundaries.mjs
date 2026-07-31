import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

const root = process.cwd();
const workspaceRoots = ['apps', 'packages'];

/** @type {string[]} */
const failures = [];

const packageLayer = new Map([
  ['@codestellation/contracts', 10],
  ['@codestellation/config', 10],
  ['@codestellation/observability', 10],
  ['@codestellation/testing-fixtures', 10],
  ['@codestellation/graph-model', 20],
  ['@codestellation/source-ingestion', 30],
  ['@codestellation/repository-scanner', 30],
  ['@codestellation/parser-core', 30],
  ['@codestellation/parser-typescript', 30],
  ['@codestellation/analyzer-static', 30],
  ['@codestellation/analyzer-frameworks', 30],
  ['@codestellation/analyzer-semantic', 30],
  ['@codestellation/graph-builder', 40],
  ['@codestellation/graph-store', 40],
  ['@codestellation/search-index', 40],
  ['@codestellation/context-engine', 50],
  ['@codestellation/impact-engine', 50],
  ['@codestellation/snapshot-engine', 50],
  ['@codestellation/exporter', 50],
  ['@codestellation/agent-adapter', 60]
]);

const appLayer = 70;

/** @typedef {{ name: string, root: string, manifestPath: string, layer: number, kind: 'app' | 'package' }} Workspace */

/** @type {Workspace[]} */
const workspaces = [];

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function toProjectPath(filePath) {
  return relative(root, filePath).split(sep).join('/');
}

async function discoverWorkspaces() {
  for (const workspaceRoot of workspaceRoots) {
    const absoluteRoot = join(root, workspaceRoot);
    const entries = await readdir(absoluteRoot, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const manifestPath = join(absoluteRoot, entry.name, 'package.json');
      const manifest = await readJson(manifestPath);
      const kind = workspaceRoot === 'apps' ? 'app' : 'package';
      const layer = kind === 'app' ? appLayer : packageLayer.get(manifest.name);

      if (typeof manifest.name !== 'string' || manifest.name.length === 0) {
        failures.push(`${toProjectPath(manifestPath)}: missing package name`);
        continue;
      }

      if (layer === undefined) {
        failures.push(`${toProjectPath(manifestPath)}: missing architecture layer for ${manifest.name}`);
        continue;
      }

      workspaces.push({
        name: manifest.name,
        root: join(absoluteRoot, entry.name),
        manifestPath,
        layer,
        kind
      });
    }
  }
}

function validateUniqueWorkspaceNames() {
  const seen = new Map();

  for (const workspace of workspaces) {
    const previous = seen.get(workspace.name);
    if (previous) {
      failures.push(`${toProjectPath(workspace.manifestPath)}: duplicate workspace name also used by ${toProjectPath(previous.manifestPath)}`);
    }
    seen.set(workspace.name, workspace);
  }
}

async function validateManifestDependencies() {
  const byName = new Map(workspaces.map((workspace) => [workspace.name, workspace]));

  for (const workspace of workspaces) {
    const manifest = await readJson(workspace.manifestPath);
    const dependencyGroups = ['dependencies', 'peerDependencies', 'optionalDependencies'];

    for (const group of dependencyGroups) {
      const dependencies = manifest[group] ?? {};

      for (const dependencyName of Object.keys(dependencies)) {
        const target = byName.get(dependencyName);
        if (!target) {
          continue;
        }

        validateLayerDependency(workspace, target, `${group}.${dependencyName}`);
      }
    }
  }
}

function validateLayerDependency(source, target, context) {
  if (target.kind === 'app') {
    failures.push(`${toProjectPath(source.manifestPath)}: ${context} depends on app workspace ${target.name}`);
    return;
  }

  if (source.layer < target.layer) {
    failures.push(`${toProjectPath(source.manifestPath)}: ${context} points from lower layer ${source.name} to higher layer ${target.name}`);
  }
}

async function validateSourceImports() {
  const byName = new Map(workspaces.map((workspace) => [workspace.name, workspace]));

  for (const workspace of workspaces) {
    const sourceRoot = join(workspace.root, 'src');
    await walkSourceFiles(sourceRoot, async (sourceFile) => {
      const contents = await readFile(sourceFile, 'utf8');
      const imports = collectImportSpecifiers(contents);

      for (const specifier of imports) {
        if (specifier.startsWith('@codestellation/')) {
          const target = byName.get(specifier);
          if (!target) {
            failures.push(`${toProjectPath(sourceFile)}: unknown workspace import ${specifier}`);
            continue;
          }
          validateLayerDependency(workspace, target, `import ${specifier}`);
          continue;
        }

        if (specifier.startsWith('..')) {
          const resolvedImport = resolve(dirname(sourceFile), specifier);
          if (!isInside(resolvedImport, workspace.root)) {
            failures.push(`${toProjectPath(sourceFile)}: relative import escapes workspace root (${specifier})`);
          }
        }
      }
    });
  }
}

async function walkSourceFiles(directory, visitor) {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      await walkSourceFiles(fullPath, visitor);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.ts')) {
      await visitor(fullPath);
    }
  }
}

function collectImportSpecifiers(contents) {
  const specifiers = [];
  const importPattern = /(?:import|export)\s+(?:type\s+)?(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g;
  const dynamicImportPattern = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  for (const match of contents.matchAll(importPattern)) {
    specifiers.push(match[1]);
  }

  for (const match of contents.matchAll(dynamicImportPattern)) {
    specifiers.push(match[1]);
  }

  return specifiers;
}

function isInside(candidatePath, parentPath) {
  const relativePath = relative(parentPath, candidatePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !resolve(relativePath).startsWith('..'));
}

await discoverWorkspaces();
validateUniqueWorkspaceNames();
await validateManifestDependencies();
await validateSourceImports();

if (failures.length > 0) {
  console.error('Workspace boundary check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log('Workspace boundary check passed.');
}

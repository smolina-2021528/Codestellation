import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';

const root = process.cwd();

const ignoredDirectories = new Set([
  '.git',
  '.next',
  '.turbo',
  '.cache',
  'coverage',
  'dist',
  'node_modules',
  'out'
]);

const textExtensions = new Set([
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.mjs',
  '.md',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml'
]);

const textFileNames = new Set([
  '.editorconfig',
  '.gitignore',
  'pnpm-workspace.yaml'
]);

/** @type {string[]} */
const failures = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        await walk(fullPath);
      }
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (shouldCheck(entry.name)) {
      await checkFile(fullPath);
    }
  }
}

function shouldCheck(fileName) {
  return textFileNames.has(fileName) || textExtensions.has(extname(fileName));
}

function toProjectPath(filePath) {
  return relative(root, filePath).split(sep).join('/');
}

async function checkFile(filePath) {
  const contents = await readFile(filePath, 'utf8');
  const projectPath = toProjectPath(filePath);

  if (contents.length > 0 && !contents.endsWith('\n')) {
    failures.push(`${projectPath}: missing final newline`);
  }

  if (contents.includes('\r\n') || contents.includes('\r')) {
    failures.push(`${projectPath}: expected LF line endings`);
  }

  const lines = contents.split('\n');

  for (const [index, line] of lines.entries()) {
    if (line.endsWith(' ') || line.endsWith('\t')) {
      failures.push(`${projectPath}:${index + 1}: trailing whitespace`);
    }
  }
}

await walk(root);

if (failures.length > 0) {
  console.error('Formatting check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log('Formatting check passed.');
}

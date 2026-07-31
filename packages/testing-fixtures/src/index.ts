export interface FixtureFile {
  readonly path: string;
  readonly content: string;
}

export interface FixtureTree {
  readonly files: readonly FixtureFile[];
  readonly directories: readonly string[];
}

export interface RepositoryFixtureInput {
  readonly name: string;
  readonly files: readonly FixtureFile[];
}

export interface RepositoryFixture {
  readonly name: string;
  readonly tree: FixtureTree;
}

export function normalizeFixturePath(path: string): string {
  if (path.trim().length === 0) {
    throw new Error('Fixture path must not be empty.');
  }

  if (path.startsWith('/') || path.startsWith('\\') || /^[a-zA-Z]:/.test(path)) {
    throw new Error(`Fixture path must be relative: ${path}`);
  }

  const normalized = path
    .replaceAll('\\', '/')
    .split('/')
    .filter((segment) => segment.length > 0 && segment !== '.')
    .join('/');

  if (normalized.length === 0) {
    throw new Error('Fixture path must not resolve to an empty path.');
  }

  if (normalized.split('/').includes('..')) {
    throw new Error(`Fixture path must not escape the fixture root: ${path}`);
  }

  return normalized;
}

export function createFixtureFile(path: string, content = ''): FixtureFile {
  return {
    path: normalizeFixturePath(path),
    content
  };
}

export function createFixtureTree(files: readonly FixtureFile[]): FixtureTree {
  const uniqueFiles = new Map<string, FixtureFile>();

  for (const file of files) {
    const normalizedPath = normalizeFixturePath(file.path);
    uniqueFiles.set(normalizedPath, {
      path: normalizedPath,
      content: file.content
    });
  }

  const sortedFiles = [...uniqueFiles.values()].sort((left, right) => left.path.localeCompare(right.path));
  const directories = collectDirectories(sortedFiles.map((file) => file.path));

  return {
    files: sortedFiles,
    directories
  };
}

export function createRepositoryFixture(input: RepositoryFixtureInput): RepositoryFixture {
  const name = input.name.trim();

  if (name.length === 0) {
    throw new Error('Repository fixture name must not be empty.');
  }

  return {
    name,
    tree: createFixtureTree(input.files)
  };
}

function collectDirectories(filePaths: readonly string[]): readonly string[] {
  const directories = new Set<string>();

  for (const filePath of filePaths) {
    const segments = filePath.split('/');

    for (let depth = 1; depth < segments.length; depth += 1) {
      directories.add(segments.slice(0, depth).join('/'));
    }
  }

  return [...directories].sort((left, right) => left.localeCompare(right));
}

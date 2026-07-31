export declare const codestellationDiagnosticCodeBrand: unique symbol;

export type DiagnosticCode = string & {
  readonly [codestellationDiagnosticCodeBrand]: 'DiagnosticCode';
};

export const CODESTELLATION_DIAGNOSTIC_SCHEMA_VERSION = 1 as const;

export const DIAGNOSTIC_SEVERITIES = [
  'debug',
  'info',
  'warning',
  'error',
  'fatal'
] as const;

export type DiagnosticSeverity = typeof DIAGNOSTIC_SEVERITIES[number];

export type DiagnosticContextPrimitive = string | number | boolean | null;
export type DiagnosticContextValue =
  | DiagnosticContextPrimitive
  | readonly DiagnosticContextPrimitive[];
export type DiagnosticContext = Readonly<Record<string, DiagnosticContextValue>>;

export interface CodestellationDiagnostic {
  readonly schemaVersion: typeof CODESTELLATION_DIAGNOSTIC_SCHEMA_VERSION;
  readonly code: DiagnosticCode;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly retryable: boolean;
  readonly context: DiagnosticContext;
  readonly causeCode?: DiagnosticCode;
}

export interface CreateDiagnosticInput {
  readonly code: string;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly retryable?: boolean;
  readonly context?: Readonly<Record<string, unknown>>;
  readonly causeCode?: string;
}

const DIAGNOSTIC_CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,79}$/;
const DIAGNOSTIC_CONTEXT_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_.:-]{0,79}$/;
const MAX_CONTEXT_STRING_LENGTH = 240;
const MAX_CONTEXT_ARRAY_LENGTH = 20;
const REDACTED_CONTEXT_VALUE = '[redacted]';
const TRUNCATED_CONTEXT_SUFFIX = '...';

const SENSITIVE_CONTEXT_KEY_PARTS = [
  'authorization',
  'cookie',
  'credential',
  'password',
  'passphrase',
  'privatekey',
  'secret',
  'token',
  'apikey',
  'api_key'
] as const;

export const CODESTELLATION_DIAGNOSTIC_CODES = {
  invalidArgument: parseDiagnosticCode('CONTRACTS_INVALID_ARGUMENT'),
  validationFailed: parseDiagnosticCode('CONTRACTS_VALIDATION_FAILED'),
  unexpectedError: parseDiagnosticCode('CONTRACTS_UNEXPECTED_ERROR')
} as const;

export function createDiagnostic(input: CreateDiagnosticInput): CodestellationDiagnostic {
  const code = parseDiagnosticCode(input.code);
  const message = input.message.trim();

  if (!isDiagnosticSeverity(input.severity)) {
    throw new RangeError(`Unsupported diagnostic severity: ${String(input.severity)}.`);
  }

  if (message.length === 0) {
    throw new RangeError('Diagnostic message must not be empty.');
  }

  return withOptionalCauseCode({
    schemaVersion: CODESTELLATION_DIAGNOSTIC_SCHEMA_VERSION,
    code,
    severity: input.severity,
    message,
    retryable: input.retryable ?? false,
    context: sanitizeDiagnosticContext(input.context ?? {})
  }, input.causeCode);
}

export function parseDiagnosticCode(value: string): DiagnosticCode {
  const code = value.trim();

  if (code !== value) {
    throw new RangeError('Diagnostic code must not have leading or trailing whitespace.');
  }

  if (!DIAGNOSTIC_CODE_PATTERN.test(code)) {
    throw new RangeError('Diagnostic code must be uppercase, stable and namespaced with underscores.');
  }

  return code as DiagnosticCode;
}

export function isDiagnosticCode(value: unknown): value is DiagnosticCode {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    parseDiagnosticCode(value);
    return true;
  } catch {
    return false;
  }
}

export function isDiagnosticSeverity(value: unknown): value is DiagnosticSeverity {
  return typeof value === 'string' && DIAGNOSTIC_SEVERITIES.includes(value as DiagnosticSeverity);
}

export function isCodestellationDiagnostic(value: unknown): value is CodestellationDiagnostic {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<CodestellationDiagnostic>;

  return candidate.schemaVersion === CODESTELLATION_DIAGNOSTIC_SCHEMA_VERSION
    && isDiagnosticCode(candidate.code)
    && isDiagnosticSeverity(candidate.severity)
    && typeof candidate.message === 'string'
    && candidate.message.trim().length > 0
    && typeof candidate.retryable === 'boolean'
    && isDiagnosticContext(candidate.context)
    && (candidate.causeCode === undefined || isDiagnosticCode(candidate.causeCode));
}

export function sanitizeDiagnosticContext(
  context: Readonly<Record<string, unknown>>
): DiagnosticContext {
  const sanitized: Record<string, DiagnosticContextValue> = {};

  for (const key of Object.keys(context).sort()) {
    if (!isSafeContextKey(key)) {
      continue;
    }

    if (isSensitiveContextKey(key)) {
      sanitized[key] = REDACTED_CONTEXT_VALUE;
      continue;
    }

    const value = sanitizeDiagnosticContextValue(context[key]);

    if (value !== undefined) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function toSerializableDiagnostic(diagnostic: CodestellationDiagnostic): CodestellationDiagnostic {
  if (!isCodestellationDiagnostic(diagnostic)) {
    throw new RangeError('Diagnostic is not a valid Codestellation diagnostic.');
  }

  return withOptionalCauseCode({
    schemaVersion: CODESTELLATION_DIAGNOSTIC_SCHEMA_VERSION,
    code: diagnostic.code,
    severity: diagnostic.severity,
    message: diagnostic.message,
    retryable: diagnostic.retryable,
    context: sanitizeDiagnosticContext(diagnostic.context)
  }, diagnostic.causeCode);
}

function withOptionalCauseCode(
  diagnostic: Omit<CodestellationDiagnostic, 'causeCode'>,
  causeCode: string | undefined
): CodestellationDiagnostic {
  if (causeCode === undefined) {
    return diagnostic;
  }

  return {
    ...diagnostic,
    causeCode: parseDiagnosticCode(causeCode)
  };
}

function isDiagnosticContext(value: unknown): value is DiagnosticContext {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  for (const [key, contextValue] of Object.entries(record)) {
    if (!isSafeContextKey(key) || !isDiagnosticContextValue(contextValue)) {
      return false;
    }
  }

  return true;
}

function isDiagnosticContextValue(value: unknown): value is DiagnosticContextValue {
  if (isDiagnosticContextPrimitive(value)) {
    return true;
  }

  return Array.isArray(value) && value.every(isDiagnosticContextPrimitive);
}

function sanitizeDiagnosticContextValue(value: unknown): DiagnosticContextValue | undefined {
  if (isDiagnosticContextPrimitive(value)) {
    return sanitizeDiagnosticContextPrimitive(value);
  }

  if (Array.isArray(value)) {
    const sanitizedArray = value
      .slice(0, MAX_CONTEXT_ARRAY_LENGTH)
      .map(sanitizeDiagnosticContextPrimitive)
      .filter((item): item is DiagnosticContextPrimitive => item !== undefined);

    return sanitizedArray.length > 0 ? sanitizedArray : undefined;
  }

  return undefined;
}

function sanitizeDiagnosticContextPrimitive(value: unknown): DiagnosticContextPrimitive | undefined {
  if (value === null || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'string') {
    return truncateContextString(value);
  }

  return undefined;
}

function isDiagnosticContextPrimitive(value: unknown): value is DiagnosticContextPrimitive {
  return value === null
    || typeof value === 'boolean'
    || typeof value === 'string'
    || (typeof value === 'number' && Number.isFinite(value));
}

function truncateContextString(value: string): string {
  if (value.length <= MAX_CONTEXT_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_CONTEXT_STRING_LENGTH - TRUNCATED_CONTEXT_SUFFIX.length)}${TRUNCATED_CONTEXT_SUFFIX}`;
}

function isSafeContextKey(key: string): boolean {
  return DIAGNOSTIC_CONTEXT_KEY_PATTERN.test(key);
}

function isSensitiveContextKey(key: string): boolean {
  const normalizedKey = key.replaceAll(/[-_.:]/g, '').toLowerCase();
  return SENSITIVE_CONTEXT_KEY_PARTS.some((part) => normalizedKey.includes(part));
}

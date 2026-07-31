import {
  CODESTELLATION_DIAGNOSTIC_CODES,
  createDiagnostic,
  isCodestellationDiagnostic,
  toSerializableDiagnostic,
  type CodestellationDiagnostic,
  type CreateDiagnosticInput,
  type DiagnosticCode,
  type DiagnosticContext
} from './diagnostics.js';

export interface CreateCodestellationErrorInput extends CreateDiagnosticInput {
  readonly name?: string;
}

export class CodestellationError extends Error {
  public override readonly name: string;
  public readonly diagnostic: CodestellationDiagnostic;
  public readonly code: DiagnosticCode;
  public readonly retryable: boolean;
  public readonly context: DiagnosticContext;

  public constructor(diagnostic: CodestellationDiagnostic, name = 'CodestellationError') {
    super(diagnostic.message);
    this.name = name;
    this.diagnostic = toSerializableDiagnostic(diagnostic);
    this.code = this.diagnostic.code;
    this.retryable = this.diagnostic.retryable;
    this.context = this.diagnostic.context;
  }

  public toJSON(): CodestellationDiagnostic {
    return this.diagnostic;
  }
}

export function createCodestellationError(input: CreateCodestellationErrorInput): CodestellationError {
  return new CodestellationError(createDiagnostic(input), input.name ?? 'CodestellationError');
}

export function isCodestellationError(value: unknown): value is CodestellationError {
  return value instanceof CodestellationError;
}

export function toCodestellationDiagnostic(value: unknown): CodestellationDiagnostic {
  if (isCodestellationError(value)) {
    return value.diagnostic;
  }

  if (isCodestellationDiagnostic(value)) {
    return toSerializableDiagnostic(value);
  }

  return createDiagnostic({
    code: CODESTELLATION_DIAGNOSTIC_CODES.unexpectedError,
    severity: 'error',
    message: 'Unexpected error.',
    retryable: false,
    context: {
      thrownType: describeThrownType(value)
    }
  });
}

export function toCodestellationError(value: unknown): CodestellationError {
  if (isCodestellationError(value)) {
    return value;
  }

  return new CodestellationError(toCodestellationDiagnostic(value));
}

function describeThrownType(value: unknown): string {
  if (value instanceof Error) {
    return value.name;
  }

  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  return typeof value;
}

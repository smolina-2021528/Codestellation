import { describe, expect, it } from 'vitest';
import {
  CODESTELLATION_DIAGNOSTIC_CODES,
  CodestellationError,
  createCodestellationError,
  isCodestellationError,
  toCodestellationDiagnostic,
  toCodestellationError
} from '../src/index';

describe('codestellation structured errors', () => {
  it('wraps diagnostics in serializable error objects', () => {
    const error = createCodestellationError({
      code: 'INGESTION_SOURCE_UNAVAILABLE',
      severity: 'error',
      message: 'Source folder is not available.',
      retryable: true,
      context: {
        sourceKind: 'local-folder'
      }
    });

    expect(error).toBeInstanceOf(CodestellationError);
    expect(error.name).toBe('CodestellationError');
    expect(error.message).toBe('Source folder is not available.');
    expect(error.code).toBe('INGESTION_SOURCE_UNAVAILABLE');
    expect(error.retryable).toBe(true);
    expect(error.context).toEqual({ sourceKind: 'local-folder' });
    expect(JSON.parse(JSON.stringify(error))).toEqual(error.diagnostic);
  });

  it('supports explicit error names without changing the diagnostic schema', () => {
    const error = createCodestellationError({
      name: 'CodestellationValidationError',
      code: CODESTELLATION_DIAGNOSTIC_CODES.validationFailed,
      severity: 'warning',
      message: 'Invalid source metadata.',
      context: {
        field: 'displayName'
      }
    });

    expect(error.name).toBe('CodestellationValidationError');
    expect(error.diagnostic.code).toBe('CONTRACTS_VALIDATION_FAILED');
    expect(error.diagnostic.context).toEqual({ field: 'displayName' });
  });

  it('detects CodestellationError instances', () => {
    const error = createCodestellationError({
      code: CODESTELLATION_DIAGNOSTIC_CODES.invalidArgument,
      severity: 'error',
      message: 'Invalid argument.'
    });

    expect(isCodestellationError(error)).toBe(true);
    expect(isCodestellationError(new Error('plain'))).toBe(false);
  });

  it('converts known and unknown thrown values to safe diagnostics', () => {
    const knownError = createCodestellationError({
      code: CODESTELLATION_DIAGNOSTIC_CODES.invalidArgument,
      severity: 'error',
      message: 'Invalid argument.',
      context: {
        token: 'must-not-leak'
      }
    });

    expect(toCodestellationDiagnostic(knownError)).toEqual(knownError.diagnostic);
    expect(toCodestellationDiagnostic(new Error('raw secret message'))).toEqual({
      schemaVersion: 1,
      code: 'CONTRACTS_UNEXPECTED_ERROR',
      severity: 'error',
      message: 'Unexpected error.',
      retryable: false,
      context: {
        thrownType: 'Error'
      }
    });
    expect(toCodestellationDiagnostic(null).context).toEqual({ thrownType: 'null' });
  });

  it('returns CodestellationError for arbitrary thrown values', () => {
    const error = toCodestellationError(['not', 'an', 'error']);

    expect(error).toBeInstanceOf(CodestellationError);
    expect(error.code).toBe('CONTRACTS_UNEXPECTED_ERROR');
    expect(error.context).toEqual({ thrownType: 'array' });
  });
});
